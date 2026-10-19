import { describe, expect, it } from 'vitest';
import {
  categoryFormSchema,
  itemFormSchema,
  parsePesos,
  pesosInput,
  slugify,
  validate,
  type ItemFormValues,
} from './schemas';

const valid: ItemFormValues = {
  name_en: '  Banana Milk ',
  name_fil: '',
  name_ko: '바나나맛 우유',
  description_en: 'Sweet banana-flavored milk.',
  description_fil: '   ',
  description_ko: '',
  category_id: 'c0000000-0000-4000-8000-000000000001',
  price_centavos: '75',
  is_published: true,
  is_available: false,
};

describe('parsePesos and pesosInput', () => {
  it('reads pesos as staff type them, to whole centavos', () => {
    expect(parsePesos('95')).toBe(9500);
    expect(parsePesos('95.5')).toBe(9550);
    expect(parsePesos('95.50')).toBe(9550);
    expect(parsePesos(' 1,450.00 ')).toBe(145000);
    expect(parsePesos('0')).toBe(0);
    expect(parsePesos('19.99')).toBe(1999);
  });

  it('refuses anything that is not a price', () => {
    for (const text of ['', '-5', '9.999', 'abc', '₱95', '1e3', '1234567']) {
      expect(parsePesos(text), text).toBeNull();
    }
  });

  it('writes centavos back without needless decimals', () => {
    expect(pesosInput(9500)).toBe('95');
    expect(pesosInput(9550)).toBe('95.50');
    expect(pesosInput(1999)).toBe('19.99');
    expect(pesosInput(5)).toBe('0.05');
  });
});

describe('slugify', () => {
  it('makes a web address name from an English name', () => {
    expect(slugify('Instant Noodles')).toBe('instant-noodles');
    expect(slugify('  Snacks & Drinks!  ')).toBe('snacks-drinks');
    expect(slugify('Crème Brûlée')).toBe('creme-brulee');
    expect(slugify('x'.repeat(39) + ' long')).toBe('x'.repeat(39));
  });
});

describe('item form (FR-38, FR-45)', () => {
  it('trims text and stores empty translations as null, so visitors see English (FR-21)', () => {
    const result = validate(itemFormSchema, valid);
    expect(result).toEqual({
      ok: true,
      value: {
        name_en: 'Banana Milk',
        name_fil: null,
        name_ko: '바나나맛 우유',
        description_en: 'Sweet banana-flavored milk.',
        description_fil: null,
        description_ko: null,
        category_id: 'c0000000-0000-4000-8000-000000000001',
        price_centavos: 7500,
        is_published: true,
        is_available: false,
      },
    });
  });

  it('reports one error per field, matching the database rules', () => {
    const result = validate(itemFormSchema, {
      ...valid,
      name_en: '   ',
      name_ko: 'x'.repeat(81),
      description_en: 'x'.repeat(501),
      category_id: '',
      price_centavos: '95.999',
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        name_en: 'nameRequired',
        name_ko: 'nameTooLong',
        description_en: 'descriptionTooLong',
        category_id: 'categoryRequired',
        price_centavos: 'price',
      },
    });
  });

  it('caps the price at 100,000 pesos', () => {
    expect(validate(itemFormSchema, { ...valid, price_centavos: '100000' }).ok).toBe(true);
    expect(validate(itemFormSchema, { ...valid, price_centavos: '100000.01' })).toEqual({
      ok: false,
      errors: { price_centavos: 'priceRange' },
    });
  });
});

describe('category form (FR-42)', () => {
  it('accepts a good category and refuses a bad web address name', () => {
    const good = { name_en: 'Snacks', name_fil: '', name_ko: '과자', slug: 'snacks' };
    expect(validate(categoryFormSchema, good).ok).toBe(true);
    for (const slug of [
      'Snacks',
      'snacks drinks',
      'snacks--drinks',
      '-snacks',
      '',
      'x'.repeat(41),
    ]) {
      expect(validate(categoryFormSchema, { ...good, slug }), slug).toEqual({
        ok: false,
        errors: { slug: 'slugFormat' },
      });
    }
  });
});
