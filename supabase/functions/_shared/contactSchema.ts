// The contact form's rules (SDD 3.2), shared by the browser, for quick feedback, and the
// `contact` Edge Function, which is what enforces them (NFR-SEC-09). Unknown fields are
// refused. Imported with a ".ts" extension so Deno can load it as well as Vite.
import { z } from 'zod';

export const contactLimits = {
  /** Larger request bodies are refused with 413 before they are read as JSON. */
  maxBodyBytes: 8 * 1024,
  /** Messages per IP address per window (NFR-SEC-16). */
  perWindow: 5,
  windowSeconds: 10 * 60,
} as const;

export type ContactField = 'name' | 'contact' | 'message';

// Control characters, except tab and line breaks where a field allows them.
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const lineBreaks = /[\r\n\t]/;

const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A Philippine mobile number: 09 or +639, then 9 digits; spaces allowed (SDD 3.2).
const mobile = /^(09|\+639)\d{9}$/;

export function isEmailOrMobile(value: string): boolean {
  return email.test(value) || mobile.test(value.replace(/\s/g, ''));
}

const utmValue = z.string().regex(/^[\p{L}\p{N} ._+-]{1,100}$/u);

export const contactSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine((value) => !controlCharacters.test(value) && !lineBreaks.test(value)),
  contact: z.string().trim().min(5).max(120).refine(isEmailOrMobile),
  message: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .refine((value) => !controlCharacters.test(value)),
  locale: z.enum(['en', 'fil', 'ko']),
  /** Hidden from people. Bots fill it; the function then answers "ok" and stores nothing (NFR-SEC-17). */
  website: z.string().max(200),
  utm: z
    .strictObject({
      utm_source: utmValue.optional(),
      utm_medium: utmValue.optional(),
      utm_campaign: utmValue.optional(),
      utm_term: utmValue.optional(),
      utm_content: utmValue.optional(),
    })
    .optional(),
});

export type ContactRequest = z.input<typeof contactSchema>;
export type ContactMessage = z.output<typeof contactSchema>;

/** The fields that failed, by name. Anything else that failed is reported as no field. */
export function invalidFields(error: z.ZodError): ContactField[] {
  const fields = new Set<ContactField>();
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field === 'name' || field === 'contact' || field === 'message') fields.add(field);
  }
  return [...fields];
}
