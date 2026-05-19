/**
 * Seed default team members into the Worker directory.
 * Run: npx tsx scripts/seed-team.ts
 */
import { PrismaClient, WorkerRole } from "@prisma/client";

const prisma = new PrismaClient();

const TEAM = [
  {
    name: "Тато",
    roles: [WorkerRole.PAINTER, WorkerRole.OWNER] as WorkerRole[],
    defaultShare: null, // varies by role
    notes: "Маляр та власник. Частка залежить від ролі у замовленні.",
    sortOrder: 0,
  },
  {
    name: "Ілля",
    roles: [WorkerRole.PREP] as WorkerRole[],
    defaultShare: 30,
    notes: "Підготовщик.",
    sortOrder: 1,
  },
  {
    name: "Вася",
    roles: [WorkerRole.PREP, WorkerRole.POLISHER] as WorkerRole[],
    defaultShare: 30,
    notes: "Підготовщик / полірувальник.",
    sortOrder: 2,
  },
];

async function main() {
  console.log("🌱 Seeding team...");
  for (const member of TEAM) {
    const existing = await prisma.worker.findFirst({
      where: { name: member.name },
    });
    if (existing) {
      console.log(`  ⚠️  Worker "${member.name}" already exists — skipping.`);
      continue;
    }
    await prisma.worker.create({ data: member });
    console.log(`  ✅ Created: ${member.name} [${member.roles.join(", ")}]`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
