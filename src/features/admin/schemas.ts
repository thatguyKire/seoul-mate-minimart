// Form validation for the staff panel (FR-45). In the browser this is for quick feedback
// only; the database's column types and check constraints are what enforce the rules
// (SDD 5.6, BACKEND-SCHEMA 2).
import { z } from 'zod';

// Before any schema exists: Zod's fast parsers use `new Function`, which the
// Content-Security-Policy forbids, and even its check for that is reported (D-039).
z.config({ jitless: true });

export type ErrorCode =
  | 'required'
  | 'nameRequired'
  | 'nameTooLong'
  | 'descriptionTooLong'
  | 'categoryRequired'
  | 'price'
  | 'priceRange'
  | 'slugFormat';

/** Pesos as typed, such as "95", "95.5" or "1,450.00", to whole centavos. Null if not a price. */
export function parsePesos(text: string): number | null {
  const cleaned = text.replace(/[\s,]/g, '');
  const match = /^(\d{1,6})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const [, whole = '0', fraction = ''] = match;
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Centavos back to the form's text, such as "95" or "95.50". */
export function pesosInput(centavos: number): string {
  const whole = Math.floor(centavos / 100);
  const rest = centavos % 100;
  return rest === 0 ? String(whole) : `${String(whole)}.${String(rest).padStart(2, '0')}`;
}

/** A category's web address name from its English name, such as "instant-noodles". */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

function text(max: number, tooLong: ErrorCode) {
  return z.string().trim().max(max, { error: tooLong });
}

/** Empty means "not translated": stored as null, so visitors see the English text (FR-21). */
function optionalText(max: number, tooLong: ErrorCode) {
  return text(max, tooLong).transform((value) => (value === '' ? null : value));
}

export const itemFormSchema = z.object({
  name_en: z.string().trim().min(1, { error: 'nameRequired' }).max(80, { error: 'nameTooLong' }),
  name_fil: optionalText(80, 'nameTooLong'),
  name_ko: optionalText(80, 'nameTooLong'),
  description_en: text(500, 'descriptionTooLong'),
  description_fil: optionalText(500, 'descriptionTooLong'),
  description_ko: optionalText(500, 'descriptionTooLong'),
  category_id: z.string().min(1, { error: 'categoryRequired' }),
  price_centavos: z.string().transform((value, ctx) => {
    const centavos = parsePesos(value);
    if (centavos === null) {
      ctx.addIssue({ code: 'custom', message: 'price' });
      return z.NEVER;
    }
    if (centavos > 10_000_000) {
      ctx.addIssue({ code: 'custom', message: 'priceRange' });
      return z.NEVER;
    }
    return centavos;
  }),
  is_published: z.boolean(),
  is_available: z.boolean(),
});

export type ItemFormValues = z.input<typeof itemFormSchema>;
export type ItemFields = z.output<typeof itemFormSchema>;

/** Longest allowed text per field, for the "Use N characters or fewer" message. */
export const itemFieldMax: Partial<Record<keyof ItemFormValues, number>> = {
  name_en: 80,
  name_fil: 80,
  name_ko: 80,
};

export const categoryFormSchema = z.object({
  name_en: z.string().trim().min(1, { error: 'nameRequired' }).max(60, { error: 'nameTooLong' }),
  name_fil: optionalText(60, 'nameTooLong'),
  name_ko: optionalText(60, 'nameTooLong'),
  slug: z
    .string()
    .trim()
    .max(40, { error: 'slugFormat' })
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { error: 'slugFormat' }),
});

export type CategoryFormValues = z.input<typeof categoryFormSchema>;
export type CategoryFields = z.output<typeof categoryFormSchema>;

export const categoryFieldMax: Partial<Record<keyof CategoryFormValues, number>> = {
  name_en: 60,
  name_fil: 60,
  name_ko: 60,
};

export type FieldErrors<T> = Partial<Record<keyof T & string, ErrorCode>>;

/** Runs a schema; returns the parsed value, or the first error code for each field. */
export function validate<S extends z.ZodType>(
  schema: S,
  values: z.input<S>,
): { ok: true; value: z.output<S> } | { ok: false; errors: FieldErrors<z.input<S>> } {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, value: result.data };
  const errors: Record<string, ErrorCode> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in errors)) errors[field] = issue.message as ErrorCode;
  }
  return { ok: false, errors: errors as FieldErrors<z.input<S>> };
}
