-- Sample menu for local and staging databases only, never production (D-010).
-- Every item is flagged is_sample and shows a "Sample" label outside production.
-- Prices are made up. Filipino and Korean text are drafts awaiting review (D-008).
-- Some translations are left out on purpose to exercise the English fallback (FR-21).
-- No photos yet, so every item shows the "Photo coming soon" placeholder (FR-03).
-- No staff account is created here: this file may run on staging, which is reachable
-- from the internet (D-028).

insert into public.categories (slug, name_en, name_fil, name_ko, sort_order)
values
  ('snacks-drinks', 'Snacks and Drinks', 'Meryenda at Inumin', '과자와 음료', 1),
  ('instant-noodles', 'Instant Noodles', null, '라면', 2),
  ('beauty-skincare', 'Beauty and Skincare', 'Pampaganda at Skincare', '뷰티와 스킨케어', 3),
  ('household-essentials', 'Household Essentials', 'Gamit sa Bahay', '생활용품', 4);

insert into public.items (
  category_id, name_en, name_fil, name_ko,
  description_en, description_fil, description_ko,
  price_centavos, is_published, is_available, is_sample, sort_order
)
select
  c.id, v.name_en, v.name_fil, v.name_ko,
  v.description_en, v.description_fil, v.description_ko,
  v.price_centavos, v.is_published, v.is_available, true, v.sort_order
from (
  values
    ('snacks-drinks', 'Honey Butter Chip', null::text, '허니버터칩',
      'Sweet and salty potato chips with a honey butter flavor.',
      'Matamis at maalat na potato chips na may lasang honey butter.'::text,
      '달콤하고 고소한 허니버터 맛 감자칩.'::text,
      9500, true, true, 1),
    ('snacks-drinks', 'Pepero Original', null, '빼빼로 오리지널',
      'Crunchy biscuit sticks dipped in chocolate.',
      'Malutong na biscuit stick na may tsokolate.',
      '초콜릿을 입힌 바삭한 과자 스틱.',
      6500, true, true, 2),
    ('snacks-drinks', 'Banana Milk', null, '바나나맛 우유',
      'Sweet banana-flavored milk, 240 ml.',
      'Matamis na gatas na may lasang saging, 240 ml.',
      '달콤한 바나나맛 우유, 240ml.',
      7500, true, false, 3),
    ('snacks-drinks', 'Strawberry Milk', null, '딸기우유',
      'Strawberry-flavored milk, 200 ml.',
      null,
      '딸기맛 우유, 200ml.',
      7000, true, true, 4),
    ('instant-noodles', 'Shin Ramyun', null, '신라면',
      'Spicy beef-flavored instant noodles.',
      'Maanghang na instant noodles na may lasang baka.',
      '매콤한 소고기맛 라면.',
      7000, true, true, 1),
    ('instant-noodles', 'Buldak Hot Chicken Ramen', null, '불닭볶음면',
      'Very spicy stir-fried noodles with a chicken flavor.',
      'Napakaanghang na stir-fried noodles na may lasang manok.',
      '매우 매운 볶음면.',
      8500, true, false, 2),
    ('instant-noodles', 'Jin Ramen Mild', null, null,
      'Mild beef-flavored instant noodles.',
      null,
      null,
      6500, true, true, 3),
    ('beauty-skincare', 'Sheet Mask', null, '마스크팩',
      'One hydrating sheet mask.',
      'Isang hydrating sheet mask.',
      '수분 마스크팩 1매.',
      6000, true, true, 1),
    ('beauty-skincare', 'Lip Sleeping Mask', null, null,
      'Overnight lip mask, 20 g.',
      null,
      null,
      65000, true, true, 2),
    ('beauty-skincare', 'Cushion Foundation', null, '쿠션 파운데이션',
      'Cushion compact with a refill.',
      null,
      '리필 포함 쿠션 팩트.',
      145000, false, true, 3),
    ('household-essentials', 'Dish Sponge, 3 pack', 'Espongha, 3 piraso', '주방 스펀지 3개입',
      'Scrub sponges for washing dishes.',
      'Espongha para sa paghuhugas ng pinggan.',
      '설거지용 스펀지.',
      12000, true, true, 1),
    ('household-essentials', 'Laundry Detergent Sheets', null, '세탁 세제 시트',
      'Pre-measured detergent sheets, 30 pieces.',
      null,
      '계량된 세탁 세제 시트 30매.',
      25000, true, false, 2)
) as v (
  slug, name_en, name_fil, name_ko,
  description_en, description_fil, description_ko,
  price_centavos, is_published, is_available, sort_order
)
join public.categories c on c.slug = v.slug;
