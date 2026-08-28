import { describe, expect, test } from "vitest";
import { computeExpiresOn } from "../queries";

/**
 * Unit tests for the expiry formula from docs/technical-plan.md:
 * expiresOn = max(obtainedAt, latest completed renewing shift) + renewalIntervalDays.
 * getLatestRenewalDates() (the DB-querying half that finds which shifts renew which
 * qualification) is covered by the integration suite instead -- it needs a real join across
 * position_renews_qualifications/assignments/shifts, not something worth mocking here.
 */
describe("computeExpiresOn", () => {
  test("returns null when the qualification never expires", () => {
    expect(computeExpiresOn("2026-01-01", null)).toBeNull();
  });

  test("adds the renewal interval to obtainedAt when there's no renewing shift yet", () => {
    expect(computeExpiresOn("2026-01-01", 30)).toBe("2026-01-31");
  });

  test("ignores a renewal date older than obtainedAt (stale/out-of-order data)", () => {
    expect(computeExpiresOn("2026-06-01", 30, "2026-01-01")).toBe("2026-07-01");
  });

  test("extends from the renewal date once a completed shift renews it after obtaining it", () => {
    expect(computeExpiresOn("2026-01-01", 30, "2026-06-01")).toBe("2026-07-01");
  });

  test("uses obtainedAt itself when the renewal date exactly equals it (not '>' obtainedAt)", () => {
    // computeExpiresOn's base-date comparison is a strict `>`, so an equal date falls through
    // to obtainedAt -- same numeric result either way, but exercises that branch explicitly.
    expect(computeExpiresOn("2026-01-01", 30, "2026-01-01")).toBe("2026-01-31");
  });

  test("handles a renewal interval that crosses a month/year boundary", () => {
    expect(computeExpiresOn("2026-12-15", 30)).toBe("2027-01-14");
  });
});
