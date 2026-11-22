import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

/**
 * Builds a throwaway SQLite file for the suite from the versioned migrations.
 * Only prisma/test.db is touched; the development database is never used.
 */
export default function setup() {
  const file = path.join(__dirname, "..", "prisma", "test.db");
  rmSync(file, { force: true });
  rmSync(`${file}-journal`, { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
  });
}
