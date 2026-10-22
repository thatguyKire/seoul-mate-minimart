import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { showSampleLabels } from '../../lib/env';
import { formatPrice } from '../../lib/format';
import { useLocale } from '../i18n/localeContext';
import { langAttribute, localizedText } from '../i18n/localizedText';
import { reveal } from '../motion/motion';
import { ItemPhoto } from './ItemPhoto';
import type { Item } from './types';

/**
 * One item, drawn like a shelf price tag: details on top, price and stock on a strip at the
 * bottom (FR-02). Out of stock is always written out, never shown by color alone (FR-04).
 */
export function ItemCard({ item }: { item: Item }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const name = localizedText(item, 'name', locale);
  const description = localizedText(item, 'description', locale);

  return (
    <li ref={reveal} className={item.is_available ? 'item-card' : 'item-card item-card--out'}>
      <ItemPhoto
        key={item.photo_path ?? 'none'}
        path={item.photo_path}
        format={item.photo_format}
      />
      <div className="item-card__body">
        <h4 className="item-card__name" {...langAttribute(name, locale)}>
          {name.text}
        </h4>
        {description.text && (
          <p className="item-card__description" {...langAttribute(description, locale)}>
            {description.text}
          </p>
        )}
        {showSampleLabels && item.is_sample && <span className="tag">{t('menu.sample')}</span>}
      </div>
      <p className="item-card__strip">
        <span className="item-card__price">{formatPrice(item.price_centavos, locale)}</span>
        <span className="item-card__stock">
          <Icon name={item.is_available ? 'inStock' : 'outOfStock'} />
          {item.is_available ? t('menu.inStock') : t('menu.outOfStock')}
        </span>
      </p>
    </li>
  );
}

export function SkeletonCard() {
  return (
    <li className="item-card item-card--skeleton">
      <div className="item-photo skeleton" />
      <div className="item-card__body">
        <div className="skeleton skeleton--line" />
        <div className="skeleton skeleton--line skeleton--short" />
      </div>
      <div className="item-card__strip skeleton--strip" />
    </li>
  );
}
