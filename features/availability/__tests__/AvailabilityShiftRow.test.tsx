// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AvailabilityShiftRow } from "../components/AvailabilityShiftRow";
import type { AvailabilitySlot } from "../queries";

vi.mock("../actions", () => ({
  submitAvailability: vi.fn().mockResolvedValue({ success: true, data: undefined }),
}));

const { submitAvailability } = await import("../actions");

const baseSlot: AvailabilitySlot = {
  shiftIds: ["shift-1"],
  date: "2026-09-10",
  startTime: "08:00:00",
  endTime: "16:00:00",
  locations: ["בסיס"],
  isAvailable: null,
  mayRenewExpiringQualification: false,
};

describe("AvailabilityShiftRow", () => {
  test("renders the date/time in an ltr span (RTL bidi safety, per CLAUDE.md)", () => {
    render(<AvailabilityShiftRow slot={baseSlot} />);
    const dateSpan = screen.getByText("2026-09-10 · 08:00–16:00");
    expect(dateSpan).toHaveAttribute("dir", "ltr");
  });

  test("shows the renewing-qualification badge only when flagged", () => {
    render(<AvailabilityShiftRow slot={{ ...baseSlot, mayRenewExpiringQualification: true }} />);
    expect(screen.getByText("מחדשת כשירות שעומדת לפוג")).toBeInTheDocument();
  });

  test("omits the badge when not flagged", () => {
    render(<AvailabilityShiftRow slot={baseSlot} />);
    expect(screen.queryByText("מחדשת כשירות שעומדת לפוג")).not.toBeInTheDocument();
  });

  test("clicking 'זמין/ה' optimistically highlights the button and submits availability for all grouped shifts", async () => {
    const user = userEvent.setup();
    render(<AvailabilityShiftRow slot={{ ...baseSlot, shiftIds: ["shift-1", "shift-2"] }} />);

    await user.click(screen.getByRole("button", { name: "זמין/ה" }));

    expect(submitAvailability).toHaveBeenCalledWith(["shift-1", "shift-2"], true);
  });

  test("clicking 'לא זמין/ה' submits false", async () => {
    const user = userEvent.setup();
    render(<AvailabilityShiftRow slot={baseSlot} />);

    await user.click(screen.getByRole("button", { name: "לא זמין/ה" }));

    expect(submitAvailability).toHaveBeenCalledWith(["shift-1"], false);
  });
});
