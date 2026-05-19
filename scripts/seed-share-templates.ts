/**
 * Seed default share distribution templates.
 * Run: npx tsx scripts/seed-share-templates.ts
 */
import { PrismaClient, WorkerRole } from "@prisma/client";

const prisma = new PrismaClient();

const TEMPLATES = [
  {
    name: "Соло (тато сам)",
    description: "Тато виконує всю роботу сам",
    isDefault: false,
    sortOrder: 0,
    rules: [{ role: WorkerRole.PAINTER, percent: 100 }],
  },
  {
    name: "Підготовщик + Маляр",
    description: "Рівний поділ між підготовщиком і маляром",
    isDefault: false,
    sortOrder: 1,
    rules: [
      { role: WorkerRole.PREP, percent: 50 },
      { role: WorkerRole.PAINTER, percent: 50 },
    ],
  },
  {
    name: "Стандарт",
    description: "Підготовщик 30% + Маляр 30% + Власник 40%",
    isDefault: true,
    sortOrder: 2,
    rules: [
      { role: WorkerRole.PREP, percent: 30 },
      { role: WorkerRole.PAINTER, percent: 30 },
      { role: WorkerRole.OWNER, percent: 40 },
    ],
  },
  {
    name: "Складний колір",
    description: "Підготовщик 25% + Маляр 35% + Власник 40%",
    isDefault: false,
    sortOrder: 3,
    rules: [
      { role: WorkerRole.PREP, percent: 25 },
      { role: WorkerRole.PAINTER, percent: 35 },
      { role: WorkerRole.OWNER, percent: 40 },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding share templates...");
  for (const tpl of TEMPLATES) {
    const existing = await prisma.shareTemplate.findFirst({
      where: { name: tpl.name },
    });
    if (existing) {
      console.log(`  ⚠️  Template "${tpl.name}" already exists — skipping.`);
      continue;
    }
    const { rules, ...tplData } = tpl;
    await prisma.shareTemplate.create({
      data: {
        ...tplData,
        rules: { create: rules },
      },
    });
    console.log(`  ✅ Created: ${tpl.name}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
