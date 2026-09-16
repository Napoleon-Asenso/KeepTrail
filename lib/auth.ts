import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export interface SessionUser {
  id: string;
  email: string;
  createdAt: Date;
}

const DEFAULT_USER_A_EMAIL = "user-a@keeptrail.local";
const DEFAULT_USER_B_EMAIL = "user-b@keeptrail.local";

/**
 * Server-side authentication helper.
 * Resolves the authenticated user from session cookies or request headers.
 * Supports multi-tenant testing for User A, User B, and unauthenticated sessions (AC-101 to AC-104).
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  let email: string | null = null;
  let isExplicitlyUnauthenticated = false;

  try {
    const reqHeaders = headers();
    const explicitUnauth = reqHeaders.get("x-unauthenticated");
    if (explicitUnauth === "true" || explicitUnauth === "1") {
      return null;
    }

    const headerEmail = reqHeaders.get("x-user-email");
    if (headerEmail) {
      email = headerEmail.trim().toLowerCase();
    }
  } catch {
    // Headers may not be available in all execution contexts
  }

  try {
    const cookieStore = cookies();
    const unauthCookie = cookieStore.get("session_unauthenticated");
    if (unauthCookie?.value === "true") {
      isExplicitlyUnauthenticated = true;
    }

    const cookieEmail = cookieStore.get("session_email")?.value;
    if (cookieEmail && !email) {
      email = cookieEmail.trim().toLowerCase();
    }
  } catch {
    // Cookies may not be available in all execution contexts
  }

  if (isExplicitlyUnauthenticated) {
    return null;
  }

  // Default to User A for normal interactive browser usage if not explicitly overridden
  const activeEmail = email || DEFAULT_USER_A_EMAIL;

  try {
    let user = await prisma.user.findUnique({
      where: { email: activeEmail },
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { email: activeEmail },
        select: { id: true, email: true, createdAt: true },
      });
    }

    return user;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

export { DEFAULT_USER_A_EMAIL, DEFAULT_USER_B_EMAIL };
