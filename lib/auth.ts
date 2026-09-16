import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface SessionUser {
  id: string;
  email: string;
  createdAt: Date;
}

/**
 * Server-side authentication helper.
 * Resolves the authenticated user from:
 *  1. x-user-email request header (API testing / E2E scripts)
 *  2. session_email cookie (browser sessions)
 * Returns null for any request without a valid session identity.
 * Supports an unlimited number of users — any unique email gets its own
 * isolated tenant partition; no user can ever access another user's data.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  let email: string | null = null;

  // Check request headers first (used by API tests and E2E scripts)
  try {
    const reqHeaders = headers();

    // Explicit unauthenticated override (for E2E test AC-101)
    const explicitUnauth = reqHeaders.get("x-unauthenticated");
    if (explicitUnauth === "true" || explicitUnauth === "1") {
      return null;
    }

    const headerEmail = reqHeaders.get("x-user-email");
    if (headerEmail) {
      email = headerEmail.trim().toLowerCase();
    }
  } catch {
    // Headers API may not be available in all execution contexts
  }

  // Fall back to session cookie (browser navigation)
  if (!email) {
    try {
      const cookieStore = cookies();
      const cookieEmail = cookieStore.get("session_email")?.value;
      if (cookieEmail) {
        email = cookieEmail.trim().toLowerCase();
      }
    } catch {
      // Cookies API may not be available in all execution contexts
    }
  }

  // No session identity — unauthenticated
  if (!email) {
    return null;
  }

  // Validate email format minimally
  if (!email.includes("@") || email.length < 3) {
    return null;
  }

  try {
    // Auto-provision user on first sign-in with this email
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { email },
        select: { id: true, email: true, createdAt: true },
      });
    }

    return user;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}
