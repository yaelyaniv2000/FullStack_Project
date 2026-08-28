import { describe, expect, test } from "vitest";
import { windowSchema } from "../schema";

const valid = {
  label: "ספטמבר שבוע 1",
  opensAt: "2026-09-01T00:00:00.000Z",
  closesAt: "2026-09-05T00:00:00.000Z",
};

describe("windowSchema (invalid input)", () => {
  test("accepts a valid window", () => {
    expect(windowSchema.safeParse(valid).success).toBe(true);
  });

  test("rejects a missing label", () => {
    expect(windowSchema.safeParse({ ...valid, label: "" }).success).toBe(false);
  });

  test("rejects closesAt equal to opensAt", () => {
    expect(windowSchema.safeParse({ ...valid, closesAt: valid.opensAt }).success).toBe(false);
  });

  test("rejects closesAt before opensAt", () => {
    expect(
      windowSchema.safeParse({ ...valid, opensAt: valid.closesAt, closesAt: valid.opensAt }).success,
    ).toBe(false);
  });
});
