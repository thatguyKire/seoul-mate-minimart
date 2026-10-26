import { Fragment, useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { store } from '../../config/store';
import { showSampleLabels } from '../../lib/env';
import { formatDateTime } from '../../lib/format';
import { useLocale } from '../i18n/localeContext';
import { langAttribute, localizedText } from '../i18n/localizedText';
import { reveal } from '../motion/motion';
import { buildSearchIndex, normalize } from '../search/searchIndex';
import { ItemCard, SkeletonCard } from './ItemCard';
import { buildMenuView, lastAvailabilityChange } from './menuView';
import type { Category, Menu } from './types';
import { useLiveMenu } from './useLiveMenu';

/** The live menu: search, category filter, items by category (FR-01 to FR-15). */
export function MenuSection() {
  const { t } = useTranslation();
  const { state, retry } = useLiveMenu();
  const [query, setQuery] = useState('');
  const ready = state.status === 'ready';

  return (
    <section
      id="menu"
      className="section menu"
      aria-labelledby="menu-title"
      aria-busy={state.status === 'loading'}
    >
      <div className="container">
        <div className="menu__head">
          <h2 id="menu-title">{t('menu.title')}</h2>
          {ready && <LastUpdated menu={state.menu} />}
        </div>
        {/* Always present, so the paused notice is announced when it appears (FR-09). */}
        <p className="menu__live" role="status">
          {ready && state.paused && t('menu.paused')}
        </p>

        <div className="search">
          <label className="search__label" htmlFor="menu-search">
            {t('menu.searchLabel')}
          </label>
          <div className="search__field">
            <Icon name="search" />
            <input
              id="menu-search"
              className="search__input"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder={t('menu.searchPlaceholder')}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              maxLength={100}
              disabled={!ready}
            />
          </div>
        </div>

        {state.status === 'loading' && <MenuSkeleton />}
        {state.status === 'error' && <MenuError onRetry={retry} />}
        {ready && <MenuItems menu={state.menu} query={query} />}
      </div>
    </section>
  );
}

function LastUpdated({ menu }: { menu: Menu }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const changedAt = lastAvailabilityChange(menu.items);
  if (!changedAt) return null;
  return (
    <p className="menu__updated">
      <Icon name="clock" />
      {t('menu.lastUpdated')} <time dateTime={changedAt}>{formatDateTime(changedAt, locale)}</time>
    </p>
  );
}

function MenuItems({ menu, query }: { menu: Menu; query: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get('category');
  // Typing stays responsive while results catch up on slow phones (NFR-PERF-05).
  const deferredQuery = useDeferredValue(query);
  const index = useMemo(() => buildSearchIndex(menu, locale), [menu, locale]);
  const view = useMemo(
    () => buildMenuView(menu, categorySlug, deferredQuery, index),
    [menu, categorySlug, deferredQuery, index],
  );
  const searching = normalize(deferredQuery) !== '';
  const hasSamples = showSampleLabels && menu.items.some((item) => item.is_sample);

  return (
    <>
      <CategoryFilter categories={view.filterCategories} selected={view.selected} />
      <p className="menu__results" role="status">
        {searching && t('menu.results', { count: view.matchCount })}
      </p>
      {hasSamples && <p className="notice">{t('menu.sampleNotice')}</p>}

      {menu.items.length === 0 && <p className="menu__empty">{t('menu.empty')}</p>}
      {menu.items.length > 0 && view.groups.length === 0 && !searching && (
        <p className="menu__empty">{t('menu.emptyCategory')}</p>
      )}
      {searching && view.matchCount === 0 && (
        <div className="no-results">
          <p className="no-results__title">
            {t('menu.noResults', { query: deferredQuery.trim() })}
          </p>
          <p>{t('menu.noResultsHelp')}</p>
          <p className="no-results__actions">
            <a className="button button--primary" href={store.messengerUrl}>
              <Icon name="chat" />
              {t('menu.askOnMessenger')}
            </a>
            {view.selected && (
              <Link className="button button--secondary" to={{ search: '' }}>
                {t('menu.searchAllCategories')}
              </Link>
            )}
          </p>
        </div>
      )}

      {/* Keyed by category, so choosing one brings its cards in afresh (D-038). */}
      <Fragment key={categorySlug ?? ''}>
        {view.groups.map((group) => {
          const name = localizedText(group.category, 'name', locale);
          return (
            <div key={group.category.id} className="menu__group">
              <h3 ref={reveal} className="menu__category" {...langAttribute(name, locale)}>
                {name.text}
              </h3>
              <ul className="item-grid">
                {group.items.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </ul>
            </div>
          );
        })}
      </Fragment>
    </>
  );
}

function CategoryFilter({
  categories,
  selected,
}: {
  categories: Category[];
  selected: Category | undefined;
}) {
  const { t } = useTranslation();
  const locale = useLocale();

  return (
    <nav className="filter" aria-label={t('menu.filterLabel')}>
      <ul className="filter__list">
        <li>
          <Link
            className="filter__link"
            to={{ search: '' }}
            aria-current={selected ? undefined : 'true'}
          >
            {t('menu.all')}
          </Link>
        </li>
        {categories.map((category) => {
          const name = localizedText(category, 'name', locale);
          return (
            <li key={category.id}>
              <Link
                className="filter__link"
                to={{ search: `?category=${encodeURIComponent(category.slug)}` }}
                aria-current={selected?.id === category.id ? 'true' : undefined}
                {...langAttribute(name, locale)}
              >
                {name.text}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MenuSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="menu__loading">
      <p className="visually-hidden">{t('menu.loading')}</p>
      <ul className="item-grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </ul>
    </div>
  );
}

/** Plain words and the ways to reach the store, never technical details (FR-11, NFR-REL-01). */
function MenuError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="menu-error" role="alert">
      <p className="menu-error__title">
        <Icon name="alert" />
        {t('menu.errorTitle')}
      </p>
      <p>{t('menu.errorHelp', { phone: store.phone.display })}</p>
      <p className="menu-error__actions">
        <a className="button button--primary" href={store.messengerUrl}>
          <Icon name="chat" />
          {t('menu.askOnMessenger')}
        </a>
        <a className="button button--secondary" href={store.phone.href}>
          <Icon name="phone" />
          {store.phone.display}
        </a>
        <button type="button" className="button button--quiet" onClick={onRetry}>
          {t('menu.retry')}
        </button>
      </p>
    </div>
  );
}
