import { z } from "zod";

export const createWorkerSchema = z.object({
  fullName: z.string().min(1, "נא להזין שם מלא"),
  email: z.string().email("נא להזין אימייל תקין"),
  password: z.string().min(8, "הסיסמה חייבת להכיל לפחות 8 תווים"),
});
