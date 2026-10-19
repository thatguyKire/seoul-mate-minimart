import { afterEach, describe, expect, it } from 'vitest';
import { chooseConsent, consentChoice, reopenBanner, startConsent } from './consent';
import { consentedUtm, utmFromSearch } from './utm';

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

const landing = '?utm_source=facebook&utm_medium=social&utm_campaign=Buldak+week&fbclid=abc123';

describe('utmFromSearch (FR-57)', () => {
  it('keeps only the five UTM values', () => {
    expect(utmFromSearch(landing)).toEqual({
      utm_source: 'facebook',
      utm_medium: 'social',
      utm_campaign: 'Buldak week',
    });
  });

  it('drops values with characters the contact function would refuse', () => {
    expect(
      utmFromSearch('?utm_source=<script>&utm_medium=a%22b&utm_term=' + 'x'.repeat(101)),
    ).toEqual({});
  });
});

describe('consent and UTM storage (FR-55 to FR-57, NFR-PRIV-04)', () => {
  it('stores nothing before the visitor chooses', () => {
    startConsent(landing);
    expect(consentChoice()).toBeNull();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(consentedUtm(false)).toBeNull();
  });

  it('saves the campaign details for the session once the visitor accepts', () => {
    startConsent(landing);
    chooseConsent('accepted');
    expect(localStorage.getItem('seoul-mate.consent')).toBe('accepted');
    expect(JSON.parse(sessionStorage.getItem('seoul-mate.utm') ?? '{}')).toMatchObject({
      utm_source: 'facebook',
    });
    expect(consentedUtm(true)).toMatchObject({ utm_campaign: 'Buldak week' });
  });

  it('discards them when the visitor declines, also after accepting earlier (FR-56)', () => {
    startConsent(landing);
    chooseConsent('accepted');
    reopenBanner();
    chooseConsent('declined');
    expect(sessionStorage.getItem('seoul-mate.utm')).toBeNull();
    expect(consentedUtm(false)).toBeNull();
  });

  it('saves straight away on a later visit by someone who accepted before', () => {
    localStorage.setItem('seoul-mate.consent', 'accepted');
    startConsent('?utm_source=messenger');
    expect(consentedUtm(true)).toEqual({ utm_source: 'messenger' });
  });
});
