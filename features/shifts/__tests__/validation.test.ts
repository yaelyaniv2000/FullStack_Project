import { describe, expect, test } from "vitest";
import { shiftSchema } from "../actions";

const valid = {
  name: null,
  date: "2026-09-10",
  startTime: "08:00",
  endTime: "16:00",
  location: null,
  availabilityWindowId: null,
};

describe("shiftSchema (invalid input)", () => {
  test("accepts a valid shift", () => {
    expect(shiftSchema.safeParse(valid).success).toBe(true);
  });

  test("rejects a missing date", () => {
    const result = shiftSchema.safeParse({ ...valid, date: "" });
    expect(result.success).toBe(false);
  });

  test("rejects an end time equal to the start time", () => {
    const result = shiftSchema.safeParse({ ...valid, startTime: "08:00", endTime: "08:00" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["endTime"]);
    }
  });

  test("rejects an end time before the start time", () => {
    const result = shiftSchema.safeParse({ ...valid, startTime: "16:00", endTime: "08:00" });
    expect(result.success).toBe(false);
  });
});
