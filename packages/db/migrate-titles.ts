import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const TITLE_RENAMES: Record<string, string> = {
  "Sr. Data Engineer": "Senior Data Engineer",
  "Sr. Engineering Manager": "Senior Engineering Manager",
  "Sr. Group Product Manager": "Senior Group Product Manager",
  "Sr. Principal Software Engineer": "Senior Principal Software Engineer",
};

const DEPARTMENT_CONFIG: {
  name: string;
  sortOrder: number;
  color: string;
}[] = [
  { name: "Engineering", sortOrder: 0, color: "#3b82f6" },
  { name: "Product", sortOrder: 1, color: "#10b981" },
  { name: "DevOps", sortOrder: 2, color: "#f59e0b" },
  { name: "Design", sortOrder: 3, color: "#8b5cf6" },
];

const TITLE_ASSIGNMENTS: {
  name: string;
  department: string;
  sortOrder: number;
}[] = [
  // Engineering titles (highest → lowest)
  { name: "Senior Vice President of DOD Engineering", department: "Engineering", sortOrder: 0 },
  { name: "Senior Principal Solutions Architect", department: "Engineering", sortOrder: 1 },
  { name: "Director of DOD Architecture", department: "Engineering", sortOrder: 2 },
  { name: "Senior Principal Software Engineer", department: "Engineering", sortOrder: 3 },
  { name: "Principal Software Engineer", department: "Engineering", sortOrder: 4 },
  { name: "Senior Staff Software Engineer", department: "Engineering", sortOrder: 5 },
  { name: "Staff Software Engineer", department: "Engineering", sortOrder: 6 },
  { name: "Managing Dev Lead", department: "Engineering", sortOrder: 7 },
  { name: "Senior Engineering Manager", department: "Engineering", sortOrder: 8 },
  { name: "Engineering Manager", department: "Engineering", sortOrder: 9 },
  { name: "Lead Data Engineer", department: "Engineering", sortOrder: 10 },
  { name: "Lead Full Stack Developer", department: "Engineering", sortOrder: 11 },
  { name: "Lead Front End Developer", department: "Engineering", sortOrder: 12 },
  { name: "Senior Data Engineer", department: "Engineering", sortOrder: 13 },
  { name: "Senior Front End Developer", department: "Engineering", sortOrder: 14 },
  { name: "Senior Software Engineer", department: "Engineering", sortOrder: 15 },
  { name: "Front End Developer", department: "Engineering", sortOrder: 16 },
  // Product titles
  { name: "Senior Group Product Manager", department: "Product", sortOrder: 17 },
  { name: "Group Product Manager", department: "Product", sortOrder: 18 },
  { name: "Lead Product Manager", department: "Product", sortOrder: 19 },
  { name: "Lead Product Owner", department: "Product", sortOrder: 20 },
  // DevOps titles
  { name: "Director of DevOps", department: "DevOps", sortOrder: 21 },
];

async function main() {
  console.log("=== Step 1: Normalize Sr. → Senior ===");
  for (const [oldName, newName] of Object.entries(TITLE_RENAMES)) {
    const result = await db.title.updateMany({
      where: { name: oldName },
      data: { name: newName },
    });
    if (result.count > 0) {
      console.log(`  Renamed "${oldName}" → "${newName}"`);
    } else {
      console.log(`  Skipped "${oldName}" (not found)`);
    }
  }

  console.log("\n=== Step 2: Set department sortOrder + color ===");
  for (const dept of DEPARTMENT_CONFIG) {
    const result = await db.department.updateMany({
      where: { name: dept.name },
      data: { sortOrder: dept.sortOrder, color: dept.color },
    });
    if (result.count > 0) {
      console.log(`  ${dept.name}: sortOrder=${dept.sortOrder}, color=${dept.color}`);
    } else {
      console.log(`  Skipped "${dept.name}" (not found)`);
    }
  }

  console.log("\n=== Step 3: Assign titles to departments + set sortOrder ===");
  const departments = await db.department.findMany();
  const deptMap = new Map(departments.map((d) => [d.name, d.id]));

  for (const assignment of TITLE_ASSIGNMENTS) {
    const deptId = deptMap.get(assignment.department);
    if (!deptId) {
      console.log(`  Skipped "${assignment.name}" — department "${assignment.department}" not found`);
      continue;
    }
    const result = await db.title.updateMany({
      where: { name: assignment.name },
      data: { departmentId: deptId, sortOrder: assignment.sortOrder },
    });
    if (result.count > 0) {
      console.log(`  ${assignment.name} → ${assignment.department} (sortOrder=${assignment.sortOrder})`);
    } else {
      console.log(`  Skipped "${assignment.name}" (title not found)`);
    }
  }

  console.log("\n=== Migration complete ===");

  // Verify
  const titles = await db.title.findMany({
    orderBy: { sortOrder: "asc" },
    include: { department: true, _count: { select: { people: true } } },
  });
  console.log("\nFinal state:");
  for (const t of titles) {
    console.log(
      `  [${t.sortOrder}] ${t.name} → ${t.department?.name ?? "(unassigned)"} (${t._count.people} people)`,
    );
  }
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
