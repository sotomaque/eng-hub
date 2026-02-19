import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const members = await db.teamMember.findMany();
  console.log(`Found ${members.length} team members`);

  // Group by email — each unique email becomes one Person
  const byEmail = new Map<
    string,
    (typeof members)[number][]
  >();
  for (const m of members) {
    const group = byEmail.get(m.email) ?? [];
    group.push(m);
    byEmail.set(m.email, group);
  }

  console.log(`Found ${byEmail.size} unique emails`);

  let created = 0;
  let linked = 0;

  for (const [email, group] of byEmail) {
    // Use the first record as canonical source of identity data
    const canonical = group[0]!;

    // Warn if same email has different names
    for (const m of group.slice(1)) {
      if (m.firstName !== canonical.firstName || m.lastName !== canonical.lastName) {
        console.warn(
          `  WARNING: email "${email}" has conflicting names: ` +
          `"${canonical.firstName} ${canonical.lastName}" vs "${m.firstName} ${m.lastName}". ` +
          `Using "${canonical.firstName} ${canonical.lastName}".`
        );
      }
    }

    const person = await db.person.create({
      data: {
        firstName: canonical.firstName,
        lastName: canonical.lastName,
        email: canonical.email,
        githubUsername: canonical.githubUsername,
        gitlabUsername: canonical.gitlabUsername,
        imageUrl: canonical.imageUrl,
      },
    });
    created++;

    // Link all TeamMember records with this email to the Person
    for (const m of group) {
      await db.teamMember.update({
        where: { id: m.id },
        data: { personId: person.id },
      });
      linked++;
    }
  }

  console.log(`Created ${created} Person records`);
  console.log(`Linked ${linked} TeamMember records`);

  // Verify no orphans
  const orphans = await db.teamMember.count({
    where: { personId: null },
  });
  if (orphans > 0) {
    console.error(`ERROR: ${orphans} TeamMember records still have no personId!`);
    process.exit(1);
  }

  console.log("Migration complete — all TeamMember records linked to a Person.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
