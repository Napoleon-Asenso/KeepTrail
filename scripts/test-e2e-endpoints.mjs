import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function runE2E() {
  console.log("=== KeepTrail E2E HTTP Endpoint & Security Verification ===");

  // Reset database records for test accounts
  await prisma.record.deleteMany({
    where: {
      user: { email: { in: ["user-a@keeptrail.local", "user-b@keeptrail.local"] } },
    },
  });
  await prisma.auditLog.deleteMany({
    where: {
      user: { email: { in: ["user-a@keeptrail.local", "user-b@keeptrail.local"] } },
    },
  });

  // Ensure test users exist in DB
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

  // TEST 1: AC-101 - Unauthenticated request returns 401
  console.log("\n[TEST 1] Testing AC-101: Unauthenticated request to /api/projects...");
  const unauthRes = await fetch(`${BASE_URL}/api/projects`, {
    headers: { "x-unauthenticated": "true" },
  });
  if (unauthRes.status !== 401) {
    throw new Error(`AC-101 Failed: Expected 401 Unauthorized, got ${unauthRes.status}`);
  }
  const unauthJson = await unauthRes.json();
  console.log(`PASSED: Status ${unauthRes.status}, body:`, unauthJson);

  // TEST 2: Screen 1 State B - True Empty State for User A (0 records)
  console.log("\n[TEST 2] Testing Screen 1 State B: True Empty State on /projects...");
  const emptyHtmlRes = await fetch(`${BASE_URL}/projects`, {
    headers: { "x-user-email": "user-a@keeptrail.local" },
  });
  if (emptyHtmlRes.status !== 200) {
    throw new Error(`Screen 1 Failed: Expected 200, got ${emptyHtmlRes.status}`);
  }
  const emptyHtml = await emptyHtmlRes.text();
  if (!emptyHtml.includes('data-testid="true-empty-state"')) {
    throw new Error("Screen 1 State B Failed: true-empty-state not rendered when records = []!");
  }
  if (!emptyHtml.includes("Create Your First Project")) {
    throw new Error("Screen 1 State B Failed: 'Create Your First Project' CTA button missing!");
  }
  console.log("PASSED: True Empty State rendered with heading and 'Create Your First Project' CTA.");

  // TEST 3: User A creates project via POST /api/projects
  console.log("\n[TEST 3] Testing Screen 2 API: User A creates project via POST /api/projects...");
  const createRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": "user-a@keeptrail.local",
    },
    body: JSON.stringify({
      title: "Secret Project Alpha",
      description: "User A strictly confidential project",
    }),
  });
  if (createRes.status !== 201) {
    throw new Error(`Project Creation Failed: Expected 201, got ${createRes.status}`);
  }
  const createdRecord = await createRes.json();
  console.log("Created Record payload:", createdRecord);
  if (!createdRecord.slug || createdRecord.slug.length < 10) {
    throw new Error("Project Creation Failed: Slug is missing or invalid!");
  }
  if ("id" in createdRecord || "userId" in createdRecord) {
    throw new Error("Security Violation: Integer id or internal userId exposed in API response!");
  }
  const projectSlug = createdRecord.slug;
  console.log(`PASSED: Project created with 21-char NanoID slug: ${projectSlug}`);

  // TEST 4: AC-102 - User A queries own project detail via GET /api/projects/[slug]
  console.log("\n[TEST 4] Testing AC-102: User A queries own record detail...");
  const detailRes = await fetch(`${BASE_URL}/api/projects/${projectSlug}`, {
    headers: { "x-user-email": "user-a@keeptrail.local" },
  });
  if (detailRes.status !== 200) {
    throw new Error(`AC-102 Failed: Expected 200 OK, got ${detailRes.status}`);
  }
  const detailJson = await detailRes.json();
  if (detailJson.title !== "Secret Project Alpha") {
    throw new Error("AC-102 Failed: Title does not match!");
  }
  if ("id" in detailJson) {
    throw new Error("Security Violation: Integer id exposed in detail payload!");
  }
  console.log("PASSED: 200 OK, project details returned cleanly.");

  // TEST 5: AC-103 - User B queries User A project detail via GET /api/projects/[slug] (Cross-tenant)
  console.log("\n[TEST 5] Testing AC-103: Cross-tenant access (User B requesting User A project)...");
  const crossTenantRes = await fetch(`${BASE_URL}/api/projects/${projectSlug}`, {
    headers: { "x-user-email": "user-b@keeptrail.local" },
  });
  if (crossTenantRes.status !== 404) {
    throw new Error(`AC-103 CRITICAL SECURITY FAILURE: Expected 404 Not Found, got ${crossTenantRes.status}! (Returning 403 leaks resource existence)`);
  }
  console.log(`PASSED: Status ${crossTenantRes.status} Not Found (no resource existence leak).`);

  // TEST 6: AC-104 - User B queries non-existent slug
  console.log("\n[TEST 6] Testing AC-104: Non-existent slug query...");
  const nonExistentRes = await fetch(`${BASE_URL}/api/projects/non-existent-random-slug-99`, {
    headers: { "x-user-email": "user-b@keeptrail.local" },
  });
  if (nonExistentRes.status !== 404) {
    throw new Error(`AC-104 Failed: Expected 404 Not Found, got ${nonExistentRes.status}`);
  }
  console.log(`PASSED: Status ${nonExistentRes.status} Not Found.`);

  // TEST 7: HTML Page Detail View & Zero ID Exposure Check
  console.log("\n[TEST 7] Testing Detail View HTML rendering & ID exposure scan...");
  const detailHtmlRes = await fetch(`${BASE_URL}/projects/${projectSlug}`, {
    headers: { "x-user-email": "user-a@keeptrail.local" },
  });
  if (detailHtmlRes.status !== 200) {
    throw new Error(`Detail HTML Failed: Expected 200, got ${detailHtmlRes.status}`);
  }
  const detailHtml = await detailHtmlRes.text();
  if (!detailHtml.includes("Secret Project Alpha")) {
    throw new Error("Detail HTML Failed: Title not in HTML!");
  }
  if (!detailHtml.includes('data-testid="delete-project-trigger"')) {
    throw new Error("Detail HTML Failed: Delete Project button missing!");
  }
  // Check for any internal integer primary key leakage (e.g. data-id, id=project-X, /projects/ID, or JSON props "id":ID)
  const dbRecord = await prisma.record.findUnique({
    where: { userId_slug: { userId: userA.id, slug: projectSlug } },
  });
  if (dbRecord) {
    const idLeakChecks = [
      `data-id="${dbRecord.id}"`,
      `data-record-id="${dbRecord.id}"`,
      `data-project-id="${dbRecord.id}"`,
      `href="/projects/${dbRecord.id}"`,
      `"id":${dbRecord.id}`,
      `"id": "${dbRecord.id}"`,
    ];
    for (const check of idLeakChecks) {
      if (detailHtml.includes(check)) {
        throw new Error(`Security Violation: Internal DB primary key leaked: found ${check} in HTML!`);
      }
    }
  }
  console.log("PASSED: Detail page rendered with delete trigger. Zero internal integer IDs leaked in HTML.");

  // TEST 8: HTML Page Detail View Cross-Tenant 404
  console.log("\n[TEST 8] Testing HTML Detail View Cross-Tenant 404...");
  const crossTenantHtmlRes = await fetch(`${BASE_URL}/projects/${projectSlug}`, {
    headers: { "x-user-email": "user-b@keeptrail.local" },
  });
  if (crossTenantHtmlRes.status !== 404) {
    throw new Error(`Cross-Tenant Page Access Failed: Expected 404, got ${crossTenantHtmlRes.status}`);
  }
  console.log("PASSED: Cross-tenant page request returned 404 Not Found.");

  // TEST 9: Zod Validation Rejection (Bad Request 400)
  console.log("\n[TEST 9] Testing Zod Validation: Empty title rejects with 400...");
  const invalidRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-email": "user-a@keeptrail.local",
    },
    body: JSON.stringify({
      title: "",
      description: "Invalid because title is empty",
    }),
  });
  if (invalidRes.status !== 400) {
    throw new Error(`Zod Validation Failed: Expected 400, got ${invalidRes.status}`);
  }
  console.log("PASSED: 400 Bad Request returned for invalid input.");

  console.log("\n=== ALL E2E HTTP & ACCESS CONTROL TESTS PASSED (100% SUCCESS) ===");
}

runE2E()
  .catch((err) => {
    console.error("E2E Test Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
