import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "@memeradar/core";
import { TABLES, USER_OWNED_TABLES } from "./tables";

const dir = join(import.meta.dirname, "..", "supabase", "migrations");
const sql = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(dir, f), "utf8"))
  .join("\n");

describe("migrations", () => {
  it("create every table the code refers to", () => {
    for (const table of Object.values(TABLES)) {
      expect(sql, table).toMatch(new RegExp(`create table public\\.${table} \\(`));
    }
  });

  it("enable RLS on every table", () => {
    for (const table of Object.values(TABLES)) {
      const direct = new RegExp(`alter table public\\.${table} enable row level security`);
      const looped = new RegExp(`'${table}'`);
      expect(direct.test(sql) || looped.test(sql), table).toBe(true);
    }
  });

  it("scope user-owned tables to auth.uid()", () => {
    for (const table of USER_OWNED_TABLES) {
      const policy = new RegExp(
        `create policy "[^"]+" on public\\.${table}\\b[^;]*user_id = \\(select auth\\.uid\\(\\)\\)`,
      );
      expect(sql, table).toMatch(policy);
    }
  });

  it("seed the same v1 rules as DEFAULT_RULES", () => {
    const match = sql.match(/insert into public\.rules \(json, active, notes\)\s*values \(\s*'([\s\S]*?)'::jsonb/);
    expect(match).not.toBeNull();
    expect(JSON.parse(match![1]!)).toEqual(DEFAULT_RULES);
  });
});
