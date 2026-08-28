import { z } from "zod";

export const qualificationSchema = z.object({
  name: z.string().min(1, "נא להזין שם"),
  renewalIntervalDays: z
    .number()
    .int("נא להזין מספר שלם")
    .positive("נא להזין מספר חיובי")
    .nullable(),
});
