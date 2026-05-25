/**
 * Seeds the database with test data (upsert-safe, non-destructive).
 * Uses the regular .env DATABASE_URL — no separate test DB needed.
 *
 * Usage:
 *   npm run test:db:reset          — seed only (safe, upsert)
 *   npm run test:db:reset -- --hard — also wipes & rebuilds schema first
 */
import { execSync } from "child_process";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL is not set in .env");
  process.exit(1);
}

const hardReset = process.argv.includes("--hard");

console.log("🔄 Preparing database for E2E tests...");
console.log("   URL:", url.replace(/:[^@]+@/, ":***@"));

try {
  if (hardReset) {
    console.log("\n📐 Hard reset — pushing schema (--force-reset)...");
    execSync("npx prisma db push --force-reset --accept-data-loss", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
    });
  }

  console.log("\n🌱 Seeding test data (upsert, non-destructive)...");
  execSync("npx tsx prisma/seed-test.ts", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });

  console.log("\n✅ Database ready for E2E tests!");
} catch (e) {
  console.error("\n❌ Failed:", e);
  process.exit(1);
}
