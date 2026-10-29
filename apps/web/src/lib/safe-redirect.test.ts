import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";
import { isPublicPath } from "./supabase/proxy";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/journal?day=2026-01-01")).toBe("/journal?day=2026-01-01");
  });

  it("rejects external and protocol-relative targets", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });
});

describe("isPublicPath", () => {
  it("allows only the auth pages without a session", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/confirm")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/reset-password")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
  });
});
