import { z } from "zod";

export const shiftSchema = z
  .object({
    name: z.string().nullable(),
    date: z.string().min(1, "נא לבחור תאריך"),
    startTime: z.string().min(1, "נא לבחור שעת התחלה"),
    endTime: z.string().min(1, "נא לבחור שעת סיום"),
    location: z.string().nullable(),
    availabilityWindowId: z.string().nullable(),
  })
  .refine((v) => v.endTime > v.startTime, {
    message: "שעת הסיום חייבת להיות אחרי שעת ההתחלה",
    path: ["endTime"],
  });
