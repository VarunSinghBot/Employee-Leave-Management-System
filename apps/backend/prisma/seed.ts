// Seeds departments, a reporting hierarchy (HOD -> Manager -> Employees) and sample leaves.
// Run with: pnpm db:seed   (safe to re-run: it wipes and recreates demo data)
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcrypt";
import { PrismaClient, type LeaveStatus, type LeaveType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { countLeaveDays, parseDateOnly, toDateKey } from "@elms/shared";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const PASSWORD = "Password@123";
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

// Date offset from today, as YYYY-MM-DD
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toDateKey(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
};

// Tiny valid PDF used as a sample medical certificate
const SAMPLE_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 60>>stream
BT /F1 16 Tf 30 80 Td (Sample medical certificate) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

async function main() {
  console.log("Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.leaveComment.deleteMany();
  await prisma.leaveDocument.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.user.updateMany({ data: { managerId: null } });
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const password = await bcrypt.hash(PASSWORD, 10);
  const [engineering, design, hr] = await Promise.all([
    prisma.department.create({ data: { name: "Engineering" } }),
    prisma.department.create({ data: { name: "Design" } }),
    prisma.department.create({ data: { name: "Human Resources" } }),
  ]);

  const createUser = (name: string, email: string, role: "EMPLOYEE" | "MANAGER" | "HOD", departmentId: string, managerId?: string) =>
    prisma.user.create({ data: { name, email, password, role, departmentId, managerId } });

  // Engineering hierarchy
  const hod = await createUser("Priya Sharma", "hod@elms.dev", "HOD", engineering.id);
  const manager = await createUser("Rahul Verma", "manager@elms.dev", "MANAGER", engineering.id, hod.id);
  const john = await createUser("John Carter", "john@elms.dev", "EMPLOYEE", engineering.id, manager.id);
  const emma = await createUser("Emma Wilson", "emma@elms.dev", "EMPLOYEE", engineering.id, manager.id);

  // Design hierarchy
  const designHod = await createUser("Ananya Iyer", "design.hod@elms.dev", "HOD", design.id);
  const designManager = await createUser("Kabir Singh", "design.manager@elms.dev", "MANAGER", design.id, designHod.id);
  await createUser("Sara Khan", "sara@elms.dev", "EMPLOYEE", design.id, designManager.id);

  // Human Resources hierarchy (every department needs an approver for new sign-ups)
  const hrHod = await createUser("Meera Nair", "hr.hod@elms.dev", "HOD", hr.id);
  await createUser("Arjun Rao", "hr.manager@elms.dev", "MANAGER", hr.id, hrHod.id);

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, "seed-medical-certificate.pdf"), SAMPLE_PDF);

  interface SeedLeave {
    employeeId: string;
    type: LeaveType;
    from: string;
    to: string;
    reason: string;
    status: LeaveStatus;
    withDocument?: boolean;
    managerComment?: string;
    hodComment?: string;
  }

  const leaves: SeedLeave[] = [
    { employeeId: john.id, type: "SICK", from: day(-40), to: day(-39), reason: "Fever and doctor visit", status: "APPROVED", managerComment: "Get well soon" },
    { employeeId: john.id, type: "CASUAL", from: day(5), to: day(5), reason: "Bank paperwork", status: "PENDING" },
    { employeeId: john.id, type: "EARNED", from: day(20), to: day(24), reason: "Family vacation to Goa", status: "PENDING_HOD", withDocument: true, managerComment: "Fine from my side" },
    { employeeId: emma.id, type: "SICK", from: day(2), to: day(6), reason: "Minor surgery and recovery", status: "PENDING", withDocument: true },
    { employeeId: emma.id, type: "CASUAL", from: day(-15), to: day(-15), reason: "Moving to a new apartment", status: "REJECTED", managerComment: "Release week, please pick another day" },
    { employeeId: manager.id, type: "EARNED", from: day(30), to: day(31), reason: "Attending a wedding", status: "PENDING" },
  ];

  for (const l of leaves) {
    const days = countLeaveDays(l.from, l.to);
    const reviewed = l.status !== "PENDING";
    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: l.employeeId,
        type: l.type,
        fromDate: parseDateOnly(l.from),
        toDate: parseDateOnly(l.to),
        days,
        reason: l.reason,
        status: l.status,
        requiresHodApproval: days > 3,
        managerId: reviewed ? manager.id : null,
        managerComment: l.managerComment ?? null,
        managerActionAt: reviewed ? new Date() : null,
        documents: l.withDocument
          ? {
              create: {
                uploadedById: l.employeeId,
                originalName: "medical-certificate.pdf",
                storedName: "seed-medical-certificate.pdf",
                mimeType: "application/pdf",
                size: Buffer.byteLength(SAMPLE_PDF),
              },
            }
          : undefined,
        comments: {
          create: [
            { authorId: l.employeeId, kind: "SYSTEM", message: `Request submitted for ${days} day(s).` },
            ...(reviewed && l.managerComment
              ? [{ authorId: manager.id, kind: l.status === "REJECTED" ? ("REJECTION" as const) : ("APPROVAL" as const), message: l.managerComment }]
              : []),
          ],
        },
      },
    });
    await prisma.auditLog.create({
      data: { action: "LEAVE_CREATED", entity: "LeaveRequest", entityId: leave.id, actorId: l.employeeId, subjectId: l.employeeId, details: { type: l.type, days } },
    });
  }

  console.log("\nSeed complete. All accounts use the password:", PASSWORD);
  console.table([
    { role: "HOD (Engineering)", email: "hod@elms.dev" },
    { role: "Manager (Engineering)", email: "manager@elms.dev" },
    { role: "Employee", email: "john@elms.dev" },
    { role: "Employee", email: "emma@elms.dev" },
    { role: "HOD (Design)", email: "design.hod@elms.dev" },
    { role: "Manager (Design)", email: "design.manager@elms.dev" },
    { role: "Employee (Design)", email: "sara@elms.dev" },
    { role: "HOD (Human Resources)", email: "hr.hod@elms.dev" },
    { role: "Manager (Human Resources)", email: "hr.manager@elms.dev" },
  ]);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
