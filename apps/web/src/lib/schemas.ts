import { z } from "zod";

// Client-side checks that mirror the API's, so people see a problem before they submit. The server checks again.

const email = z.string().trim().toLowerCase().max(254).email("Enter a valid email address.");
const password = z.string().min(8, "Use at least 8 characters.").max(128, "That's too long. Use 128 characters or fewer.");
const name = z.string().trim().min(1, "Enter your name.").max(80, "Keep it under 80 characters.");

export const signupSchema = z.object({ name, email, password });
export const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password.") });
export const emailSchema = z.object({ email });
export const resetSchema = z.object({ email, code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."), password });
export const profileSchema = z.object({ name });
export const contactSchema = z.object({
  name,
  email,
  topic: z.enum(["question", "feedback", "partnership", "press", "bug", "other"]),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(5000),
});

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** Validates and returns either the parsed values or the first message for each field. */
export function check<T extends z.ZodTypeAny>(schema: T, values: unknown): { data: z.infer<T>; errors: null } | { data: null; errors: FieldErrors<z.infer<T>> } {
  const result = schema.safeParse(values);
  if (result.success) return { data: result.data, errors: null };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return { data: null, errors: errors as FieldErrors<z.infer<T>> };
}

/** 0–4: length, mixed case, digits and symbols. A nudge, not a rule; the server only requires 8 characters. */
export function passwordStrength(value: string): number {
  if (!value) return 0;
  let score = value.length >= 8 ? 1 : 0;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
}
