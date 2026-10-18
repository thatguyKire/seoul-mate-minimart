// Store facts: the one place the site reads the address, phone, hours and links from
// (TRD 6, SDD 2.1). docs/BRIEF.md points here. Change a fact here and every page follows.

export const weekdays = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type Weekday = (typeof weekdays)[number];

export interface DayHours {
  day: Weekday;
  /** 24-hour time, "HH:MM", Philippine time. */
  opens: string;
  /** 24-hour time. Earlier than `opens` means early the next morning (FR-23). */
  closes: string;
}

export const store = {
  name: 'Seoul-Mate Minimart',
  /** All store times are Philippine time (UTC+8, no daylight saving). */
  timeZone: 'Asia/Manila',
  /** Copied by the address copy button (FR-25). */
  address: 'Quezon St., Legaspi Compound, Masbate City, Masbate, Philippines',
  addressLines: ['Quezon St., Legaspi Compound', 'Masbate City, Masbate', 'Philippines'],
  phone: {
    /** Shown and copied (FR-25). */
    display: '0939 126 5349',
    international: '+63 939 126 5349',
    /** Tap-to-call link (FR-24). */
    href: 'tel:+639391265349',
  },
  /** Every contact link opens this (FR-28). Uses the Page ID until the Page has a username (D-014). */
  messengerUrl: 'https://m.me/61594474910928',
  facebookUrl: 'https://www.facebook.com/profile.php?id=61594474910928',
  hours: [
    { day: 'monday', opens: '09:00', closes: '02:00' },
    { day: 'tuesday', opens: '09:00', closes: '02:00' },
    { day: 'wednesday', opens: '09:00', closes: '02:00' },
    { day: 'thursday', opens: '09:00', closes: '02:00' },
    // Friday and Saturday close at 2:00 PM, confirmed by the owner (PRD Q2).
    { day: 'friday', opens: '09:00', closes: '14:00' },
    { day: 'saturday', opens: '09:00', closes: '14:00' },
    { day: 'sunday', opens: '09:00', closes: '02:00' },
  ] satisfies readonly DayHours[],
} as const;
