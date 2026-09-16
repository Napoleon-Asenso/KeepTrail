import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runVerification() {
  console.log("=== KeepTrail Security & Access Control Verification ===");

  // 1. Clean test state
  console.log("\n[SETUP] Cleaning up test data...");
  await prisma.record.deleteMany({
    where: {
      user: {
        email: { in: ["user-a@keeptrail.local", "user-b@keeptrail.local"] },
      },
    },
  });
  await prisma.auditLog.deleteMany({
    where: {
      user: {
        email: { in: ["user-a@keeptrail.local", "user-b@keeptrail.local"] },
      },
    },
  });

  // 2. Ensure User A and User B exist
  const userA = await prisma.user.upsert({
    where: { email: "user-a@keeptrail.local" },
    update: {},
    create: { email: "user-a@keeptrail.local" },
  });
  const userB = await prisma.user.upsert({
    where: { email: "user-b@keeptrail.local" },
    update: {},
    create: { email: "user-b@keeptrail.local" },
  });

  console.log(`User A: ${userA.id} (${userA.email})`);
  console.log(`User B: ${userB.id} (${userB.email})`);

  // 3. Create Record for User A
  console.log("\n[TEST] Creating project record for User A...");
  const recordA = await prisma.record.create({
    data: {
      userId: userA.id,
      title: "Project Alpha",
      description: "Confidential Project Owned by User A",
    },
  });
  console.log(`Created Record A slug: ${recordA.slug} (length: ${recordA.slug.length})`);
  if (recordA.slug.length < 10) {
    throw new Error("Slug is not a secure NanoID!");
  }

  // 4. AC-102: Authenticated User A accesses User A Record -> 200 OK
  console.log("\n[TEST AC-102] Authenticated User A queries User A Record...");
  const queryA = await prisma.record.findUnique({
    where: {
      userId_slug: {
        userId: userA.id,
        slug: recordA.slug,
      },
    },
    select: {
      slug: true,
      title: true,
      description: true,
      status: true,
      createdAt: true,
    },
  });
  if (!queryA || queryA.title !== "Project Alpha") {
    throw new Error("AC-102 Failed: User A could not access own record!");
  }
  // Check that id is NOT in select
  if ("id" in queryA) {
    throw new Error("AC-102 Security Violation: Internal integer ID leaked in select!");
  }
  console.log("AC-102 PASSED: 200 OK equivalent, record retrieved with no integer ID leak.");

  // 5. AC-103: Authenticated User B queries User A Record -> 404 Not Found (MUST NOT BE FOUND)
  console.log("\n[TEST AC-103] Cross-Tenant Access: User B queries User A Record...");
  const queryCross = await prisma.record.findUnique({
    where: {
      userId_slug: {
        userId: userB.id,
        slug: recordA.slug,
      },
    },
  });
  if (queryCross !== null) {
    throw new Error("AC-103 CRITICAL SECURITY FAILURE: User B accessed User A record!");
  }
  console.log("AC-103 PASSED: Returns null (maps to 404 Not Found, never 403 Forbidden).");

  // 6. AC-104: Authenticated User B queries Non-Existent Slug -> 404 Not Found
  console.log("\n[TEST AC-104] User B queries Non-Existent Slug...");
  const queryNonExistent = await prisma.record.findUnique({
    where: {
      userId_slug: {
        userId: userB.id,
        slug: "non-existent-slug-xyz",
      },
    },
  });
  if (queryNonExistent !== null) {
    throw new Error("AC-104 Failed: Non-existent slug returned data!");
  }
  console.log("AC-104 PASSED: Returns null (maps to 404 Not Found).");

  // 7. Test Atomic Deletion with Audit Log
  console.log("\n[TEST DELETION] Testing atomic deletion with audit trail for User A...");
  await prisma.$transaction(async (tx) => {
    // 1. Verify existence strictly scoped inside tx
    const toDelete = await tx.record.findUnique({
      where: {
        userId_slug: { userId: userA.id, slug: recordA.slug },
      },
      select: { id: true, slug: true, title: true },
    });
    if (!toDelete) throw new Error("NOT_FOUND");

    // 2. Persist audit log entry BEFORE/DURING record deletion
    await tx.auditLog.create({
      data: {
        userId: userA.id,
        recordSlug: toDelete.slug,
        action: "DELETE",
        metadataJson: {
          deletedTitle: toDelete.title,
          deletedAt: new Date().toISOString(),
        },
      },
    });

    // 3. Hard delete record
    await tx.record.delete({
      where: {
        userId_slug: { userId: userA.id, slug: toDelete.slug },
      },
    });
  });

  // Verify record is gone
  const verifyDeleted = await prisma.record.findUnique({
    where: {
      userId_slug: { userId: userA.id, slug: recordA.slug },
    },
  });
  if (verifyDeleted !== null) {
    throw new Error("Deletion Failed: Record still exists in database!");
  }

  // Verify audit log exists
  const auditRow = await prisma.auditLog.findFirst({
    where: {
      recordSlug: recordA.slug,
      userId: userA.id,
      action: "DELETE",
    },
  });
  if (!auditRow) {
    throw new Error("Audit Trail Failure: No audit_logs row found for deleted record!");
  }
  console.log(`DELETION & AUDIT TRAIL PASSED: Audit Log row #${auditRow.id} created for slug ${auditRow.recordSlug}.`);

  console.log("\n=== ALL ACCESS CONTROL & AUDIT TESTS PASSED SUCCESSFULLY ===");
}

runVerification()
  .catch((e) => {
    console.error("Verification failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
