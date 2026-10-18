// The published part of supabase/seed.sql, as the database API returns it to visitors.
// Shared by unit tests and the mocked end-to-end tests. The hidden seed item (Cushion
// Foundation) is absent, as RLS leaves it out (FR-07).
import type { Category, Item, Menu } from '../features/catalog/types';

const snacks = 'c0000000-0000-4000-8000-000000000001';
const noodles = 'c0000000-0000-4000-8000-000000000002';
const beauty = 'c0000000-0000-4000-8000-000000000003';
const household = 'c0000000-0000-4000-8000-000000000004';

export const fixtureCategories: Category[] = [
  {
    id: snacks,
    slug: 'snacks-drinks',
    name_en: 'Snacks and Drinks',
    name_fil: 'Meryenda at Inumin',
    name_ko: '과자와 음료',
    sort_order: 1,
  },
  {
    id: noodles,
    slug: 'instant-noodles',
    name_en: 'Instant Noodles',
    name_fil: null,
    name_ko: '라면',
    sort_order: 2,
  },
  {
    id: beauty,
    slug: 'beauty-skincare',
    name_en: 'Beauty and Skincare',
    name_fil: 'Pampaganda at Skincare',
    name_ko: '뷰티와 스킨케어',
    sort_order: 3,
  },
  {
    id: household,
    slug: 'household-essentials',
    name_en: 'Household Essentials',
    name_fil: 'Gamit sa Bahay',
    name_ko: '생활용품',
    sort_order: 4,
  },
];

let next = 0;

function item(
  categoryId: string,
  sortOrder: number,
  fields: Pick<Item, 'name_en' | 'description_en' | 'price_centavos'> & Partial<Item>,
): Item {
  next += 1;
  return {
    id: `a0000000-0000-4000-8000-${String(next).padStart(12, '0')}`,
    category_id: categoryId,
    name_fil: null,
    name_ko: null,
    description_fil: null,
    description_ko: null,
    photo_path: null,
    is_available: true,
    is_sample: true,
    sort_order: sortOrder,
    availability_changed_at: '2026-10-18T04:00:00.000Z',
    ...fields,
  };
}

export const fixtureItems: Item[] = [
  item(snacks, 1, {
    name_en: 'Honey Butter Chip',
    name_ko: '허니버터칩',
    description_en: 'Sweet and salty potato chips with a honey butter flavor.',
    description_fil: 'Matamis at maalat na potato chips na may lasang honey butter.',
    description_ko: '달콤하고 고소한 허니버터 맛 감자칩.',
    price_centavos: 9500,
  }),
  item(snacks, 2, {
    name_en: 'Pepero Original',
    name_ko: '빼빼로 오리지널',
    description_en: 'Crunchy biscuit sticks dipped in chocolate.',
    description_fil: 'Malutong na biscuit stick na may tsokolate.',
    description_ko: '초콜릿을 입힌 바삭한 과자 스틱.',
    price_centavos: 6500,
  }),
  item(snacks, 3, {
    name_en: 'Banana Milk',
    name_ko: '바나나맛 우유',
    description_en: 'Sweet banana-flavored milk, 240 ml.',
    description_fil: 'Matamis na gatas na may lasang saging, 240 ml.',
    description_ko: '달콤한 바나나맛 우유, 240ml.',
    price_centavos: 7500,
    is_available: false,
    // The most recent availability change in the fixture: 8:05 PM Philippine time.
    availability_changed_at: '2026-10-18T12:05:00.000Z',
  }),
  item(snacks, 4, {
    name_en: 'Strawberry Milk',
    name_ko: '딸기우유',
    description_en: 'Strawberry-flavored milk, 200 ml.',
    description_ko: '딸기맛 우유, 200ml.',
    price_centavos: 7000,
  }),
  item(noodles, 1, {
    name_en: 'Shin Ramyun',
    name_ko: '신라면',
    description_en: 'Spicy beef-flavored instant noodles.',
    description_fil: 'Maanghang na instant noodles na may lasang baka.',
    description_ko: '매콤한 소고기맛 라면.',
    price_centavos: 7000,
  }),
  item(noodles, 2, {
    name_en: 'Buldak Hot Chicken Ramen',
    name_ko: '불닭볶음면',
    description_en: 'Very spicy stir-fried noodles with a chicken flavor.',
    description_fil: 'Napakaanghang na stir-fried noodles na may lasang manok.',
    description_ko: '매우 매운 볶음면.',
    price_centavos: 8500,
    is_available: false,
  }),
  item(noodles, 3, {
    name_en: 'Jin Ramen Mild',
    description_en: 'Mild beef-flavored instant noodles.',
    price_centavos: 6500,
  }),
  item(beauty, 1, {
    name_en: 'Sheet Mask',
    name_ko: '마스크팩',
    description_en: 'One hydrating sheet mask.',
    description_fil: 'Isang hydrating sheet mask.',
    description_ko: '수분 마스크팩 1매.',
    price_centavos: 6000,
  }),
  item(beauty, 2, {
    name_en: 'Lip Sleeping Mask',
    description_en: 'Overnight lip mask, 20 g.',
    price_centavos: 65000,
  }),
  item(household, 1, {
    name_en: 'Dish Sponge, 3 pack',
    name_fil: 'Espongha, 3 piraso',
    name_ko: '주방 스펀지 3개입',
    description_en: 'Scrub sponges for washing dishes.',
    description_fil: 'Espongha para sa paghuhugas ng pinggan.',
    description_ko: '설거지용 스펀지.',
    price_centavos: 12000,
  }),
  item(household, 2, {
    name_en: 'Laundry Detergent Sheets',
    name_ko: '세탁 세제 시트',
    description_en: 'Pre-measured detergent sheets, 30 pieces.',
    description_ko: '계량된 세탁 세제 시트 30매.',
    price_centavos: 25000,
    is_available: false,
  }),
];

export function fixtureMenu(version = 1): Menu {
  return { version, categories: fixtureCategories, items: fixtureItems };
}
