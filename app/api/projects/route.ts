import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { projectCreateSchema } from "@/lib/validations/project";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects
 * Fetches max 50 project records strictly scoped to the active session user.
 * Returns only public fields (slug, title, description, status, createdAt).
 * Never exposes internal primary key integer IDs.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const records = await prisma.record.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    select: {
      slug: true,
      title: true,
      description: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json(records, { status: 200 });
}

/**
 * POST /api/projects
 * Creates a new project record scoped to the active session user.
 * Validates payload using Zod. Returns 201 Created with the new record.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const validated = projectCreateSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: validated.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const newRecord = await prisma.record.create({
    data: {
      userId: user.id,
      title: validated.data.title,
      description: validated.data.description,
    },
    select: {
      slug: true,
      title: true,
      description: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json(newRecord, { status: 201 });
}
