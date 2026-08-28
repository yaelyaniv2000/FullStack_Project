import { z } from "zod";

export const windowSchema = z
  .object({
    label: z.string().min(1, "נא להזין שם"),
    opensAt: z.string().min(1, "נא לבחור תאריך פתיחה"),
    closesAt: z.string().min(1, "נא לבחור תאריך סגירה"),
  })
  .refine((v) => v.closesAt > v.opensAt, {
    message: "תאריך הסגירה חייב להיות אחרי תאריך הפתיחה",
    path: ["closesAt"],
  });
