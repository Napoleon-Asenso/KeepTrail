import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    slug: string;
  };
}

/**
 * GET /api/projects/[slug]
 * Fetches record details strictly scoped to { userId, slug }.
 * Returns 401 if unauthenticated.
 * Returns 404 if record doesn't exist OR belongs to another user (never 403).
 */
export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const record = await prisma.record.findUnique({
    where: {
      userId_slug: {
        userId: user.id,
        slug: params.slug,
      },
    },
    select: {
      slug: true,
      title: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!record) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(record, { status: 200 });
}
