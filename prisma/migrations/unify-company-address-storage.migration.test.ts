import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const MIGRATION_PATH = resolve(
  process.cwd(),
  "prisma/migrations/20260410183000_unify_company_address_storage/migration.sql",
);

test("migration contains post-address backfill and invariant guards", async () => {
  const sql = await readFile(MIGRATION_PATH, "utf8");

  assert.match(sql, /ADD COLUMN "addressType"/);
  assert.match(sql, /SET "addressType" = 'delivery'/);
  assert.match(sql, /INSERT INTO "CompanySharedAddress"/);
  assert.match(sql, /'post'/);
  assert.match(sql, /CREATE UNIQUE INDEX "CompanySharedAddress_companyId_post_unique"/);
  assert.match(sql, /DROP COLUMN "companyAddress"/);
});
