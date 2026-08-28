import { describe, expect, test } from "vitest";
import { createWorkerSchema } from "../actions";

const valid = { fullName: "עידן כהן", email: "idan@example.com", password: "password123" };

describe("createWorkerSchema (invalid input)", () => {
  test("accepts valid worker details", () => {
    expect(createWorkerSchema.safeParse(valid).success).toBe(true);
  });

  test("rejects an empty full name", () => {
    expect(createWorkerSchema.safeParse({ ...valid, fullName: "" }).success).toBe(false);
  });

  test("rejects a malformed email", () => {
    expect(createWorkerSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  test("rejects a password shorter than 8 characters", () => {
    expect(createWorkerSchema.safeParse({ ...valid, password: "short1" }).success).toBe(false);
  });
});
