import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isStaff, isSuperadmin, resolveAdminRole } from "./roles.ts";

const ENV = {
  SUPERADMIN_EMAILS: "boss@example.com, Owner@Example.com",
  DEVELOPER_EMAILS: "dev1@example.com,dev2@example.com",
};

describe("resolveAdminRole", () => {
  it("returns superadmin for an email in SUPERADMIN_EMAILS", () => {
    assert.equal(resolveAdminRole("boss@example.com", ENV), "superadmin");
  });

  it("is case-insensitive and trims whitespace", () => {
    assert.equal(resolveAdminRole(" OWNER@example.com ", ENV), "superadmin");
    assert.equal(resolveAdminRole("DEV1@EXAMPLE.COM", ENV), "developer");
  });

  it("returns developer for an email in DEVELOPER_EMAILS", () => {
    assert.equal(resolveAdminRole("dev2@example.com", ENV), "developer");
  });

  it("returns null for an email in neither list", () => {
    assert.equal(resolveAdminRole("random@example.com", ENV), null);
  });

  it("returns null for null/undefined/empty email", () => {
    assert.equal(resolveAdminRole(null, ENV), null);
    assert.equal(resolveAdminRole(undefined, ENV), null);
    assert.equal(resolveAdminRole("", ENV), null);
    assert.equal(resolveAdminRole("   ", ENV), null);
  });

  it("returns null when no env vars are configured", () => {
    assert.equal(resolveAdminRole("boss@example.com", {}), null);
  });

  it("superadmin wins if the same email is (misconfigured) in both lists", () => {
    const env = { SUPERADMIN_EMAILS: "both@example.com", DEVELOPER_EMAILS: "both@example.com" };
    assert.equal(resolveAdminRole("both@example.com", env), "superadmin");
  });
});

describe("isStaff / isSuperadmin", () => {
  it("isStaff is true for both roles, false otherwise", () => {
    assert.equal(isStaff("boss@example.com", ENV), true);
    assert.equal(isStaff("dev1@example.com", ENV), true);
    assert.equal(isStaff("random@example.com", ENV), false);
  });

  it("isSuperadmin is true only for superadmin", () => {
    assert.equal(isSuperadmin("boss@example.com", ENV), true);
    assert.equal(isSuperadmin("dev1@example.com", ENV), false);
  });
});
