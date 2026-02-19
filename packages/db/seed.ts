import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const roles = ["Engineering", "Design", "Product"];
  for (const name of roles) {
    await db.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  const all = await db.role.findMany();
  console.log("Roles:", all.map((r) => r.name).join(", "));
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
