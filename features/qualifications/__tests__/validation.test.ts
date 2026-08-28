import { describe, expect, test } from "vitest";
import { qualificationSchema } from "../schema";

describe("qualificationSchema (invalid input)", () => {
  test("accepts a name with no renewal interval (never expires)", () => {
    expect(qualificationSchema.safeParse({ name: "כשירות טיסה", renewalIntervalDays: null }).success).toBe(
      true,
    );
  });

  test("accepts a positive integer renewal interval", () => {
    expect(qualificationSchema.safeParse({ name: "כשירות טיסה", renewalIntervalDays: 180 }).success).toBe(
      true,
    );
  });

  test("rejects an empty name", () => {
    expect(qualificationSchema.safeParse({ name: "", renewalIntervalDays: null }).success).toBe(false);
  });

  test("rejects a negative renewal interval", () => {
    expect(
      qualificationSchema.safeParse({ name: "כשירות טיסה", renewalIntervalDays: -5 }).success,
    ).toBe(false);
  });

  test("rejects a non-integer renewal interval", () => {
    expect(
      qualificationSchema.safeParse({ name: "כשירות טיסה", renewalIntervalDays: 1.5 }).success,
    ).toBe(false);
  });
});
