import { describe, expect, test } from "vitest";
import { cn } from "@/lib/utils";

/** Smoke test for the Vitest setup itself (config, @/ path alias) -- not meant to be exhaustive
 * coverage of cn(), just confirms the test runner actually works end to end. */
describe("cn", () => {
  test("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  test("lets a later Tailwind class win over a conflicting earlier one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  test("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
