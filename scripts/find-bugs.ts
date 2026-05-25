/**
 * Bug finder script.
 * Runs vitest unit tests + playwright E2E (if server is running),
 * then writes a BUGS.md report.
 *
 * Usage: npm run find:bugs
 */
import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const BUGS_FILE = path.resolve(process.cwd(), "BUGS.md");
const now = new Date().toISOString().slice(0, 10);

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  failures: string[];
  duration: string;
}

function runCommand(cmd: string): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync(cmd, { shell: true, encoding: "utf-8", timeout: 180_000 });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}

function parseVitestOutput(output: string): TestResult {
  const result: TestResult = {
    suite: "Unit tests (vitest)",
    passed: 0,
    failed: 0,
    skipped: 0,
    failures: [],
    duration: "",
  };

  // Parse summary line: "Tests  94 passed (94)"
  const summaryMatch = output.match(/Tests\s+(\d+)\s+passed/);
  if (summaryMatch) result.passed = parseInt(summaryMatch[1]);

  const failMatch = output.match(/(\d+)\s+failed/);
  if (failMatch) result.failed = parseInt(failMatch[1]);

  const durationMatch = output.match(/Duration\s+([\d.]+s)/);
  if (durationMatch) result.duration = durationMatch[1];

  // Extract failure descriptions
  const failLines = output.split("\n").filter((l) => l.includes("×") || l.includes("FAIL"));
  result.failures = failLines.slice(0, 20);

  return result;
}

function parsePlaywrightOutput(output: string): TestResult {
  const result: TestResult = {
    suite: "E2E tests (Playwright)",
    passed: 0,
    failed: 0,
    skipped: 0,
    failures: [],
    duration: "",
  };

  const passMatch = output.match(/(\d+)\s+passed/);
  if (passMatch) result.passed = parseInt(passMatch[1]);

  const failMatch = output.match(/(\d+)\s+failed/);
  if (failMatch) result.failed = parseInt(failMatch[1]);

  const skipMatch = output.match(/(\d+)\s+skipped/);
  if (skipMatch) result.skipped = parseInt(skipMatch[1]);

  const failLines = output.split("\n").filter(
    (l) => l.includes("●") || l.includes("FAILED") || l.includes("✕")
  );
  result.failures = failLines.slice(0, 20);

  return result;
}

// ── Run tests ─────────────────────────────────────────────────────────────────
console.log("🔍 Running unit tests...");
const unitRun = runCommand("npx vitest run --reporter=verbose");
const unitResult = parseVitestOutput(unitRun.stdout + unitRun.stderr);

console.log("🎭 Running E2E tests (chromium only for speed)...");
const e2eRun = runCommand("npx playwright test --project=chromium-desktop --reporter=list");
const e2eResult = parsePlaywrightOutput(e2eRun.stdout + e2eRun.stderr);

// ── Generate BUGS.md ──────────────────────────────────────────────────────────
const totalTests = unitResult.passed + unitResult.failed + e2eResult.passed + e2eResult.failed;
const totalFailed = unitResult.failed + e2eResult.failed;
const health = totalFailed === 0 ? "🟢 All tests passing" : `🔴 ${totalFailed} test(s) failing`;

const lines: string[] = [
  `# BUGS.md — Auto-CRM Test Report`,
  ``,
  `**Generated:** ${now}  `,
  `**Status:** ${health}  `,
  `**Total tests:** ${totalTests} | **Failed:** ${totalFailed}`,
  ``,
  `---`,
  ``,
  `## Unit Tests (vitest)`,
  ``,
  `| Metric | Value |`,
  `|--------|-------|`,
  `| ✅ Passed | ${unitResult.passed} |`,
  `| ❌ Failed | ${unitResult.failed} |`,
  `| ⏱ Duration | ${unitResult.duration || "—"} |`,
  ``,
];

if (unitResult.failed > 0) {
  lines.push(`### Unit Test Failures`, ``);
  lines.push("```");
  lines.push(...unitResult.failures);
  lines.push("```", "");

  // Full output
  lines.push(`<details>`, `<summary>Full unit test output</summary>`, ``, "```");
  lines.push(unitRun.stdout.slice(0, 8000));
  lines.push("```", `</details>`, ``);
} else {
  lines.push(`> All unit tests passing ✅`, ``);
}

lines.push(
  `---`,
  ``,
  `## E2E Tests (Playwright)`,
  ``,
  `| Metric | Value |`,
  `|--------|-------|`,
  `| ✅ Passed | ${e2eResult.passed} |`,
  `| ❌ Failed | ${e2eResult.failed} |`,
  `| ⏭ Skipped | ${e2eResult.skipped} |`,
  ``
);

if (e2eResult.failed > 0) {
  lines.push(`### E2E Failures`, ``);
  lines.push("```");
  lines.push(...e2eResult.failures);
  lines.push("```", "");

  lines.push(`<details>`, `<summary>Full E2E output</summary>`, ``, "```");
  lines.push(e2eRun.stdout.slice(0, 8000));
  lines.push("```", `</details>`, ``);
} else if (e2eResult.passed === 0) {
  lines.push(
    `> ⚠️ No E2E tests ran — is the dev server running on localhost:3000?`,
    `> Start it with \`npm run dev\` then re-run \`npm run find:bugs\``,
    ``
  );
} else {
  lines.push(`> All E2E tests passing ✅`, ``);
}

lines.push(
  `---`,
  ``,
  `## Known Issues & Notes`,
  ``,
  `- E2E tests require dev server on \`localhost:3000\` (run \`npm run dev\` first)`,
  `- E2E tests require test DB — run \`npm run test:db:reset\` before E2E`,
  `- Mobile tests run in \`webkit-mobile\` project (iPhone 13 viewport)`,
  `- For detailed Playwright report: \`npm run test:e2e:ui\``,
  ``
);

const content = lines.join("\n");
fs.writeFileSync(BUGS_FILE, content, "utf-8");

console.log(`\n📄 Report written to BUGS.md`);
console.log(`   Unit:  ${unitResult.passed} passed, ${unitResult.failed} failed`);
console.log(`   E2E:   ${e2eResult.passed} passed, ${e2eResult.failed} failed, ${e2eResult.skipped} skipped`);

if (totalFailed > 0) {
  console.log(`\n❌ ${totalFailed} test(s) failed — see BUGS.md for details`);
  process.exit(1);
} else {
  console.log(`\n✅ All tests passing!`);
}
