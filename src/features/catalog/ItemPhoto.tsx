import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { env } from '../../lib/env';
import { isPhotoPath, photoSrcSet, photoUrl, type PhotoFormat } from './photos';

/**
 * The item's photo, or a neutral "Photo coming soon" placeholder (FR-03). Tries WebP, then
 * JPEG, then shows the placeholder if neither exists (E15). The parent keys this on the
 * photo path, so a new photo starts again from WebP.
 */
export function ItemPhoto({ path }: { path: string | null }) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<PhotoFormat | 'none'>('webp');

  if (!isPhotoPath(path) || format === 'none' || !env.supabaseUrl) {
    return (
      <div className="item-photo item-photo--placeholder">
        <Icon name="bag" />
        <span>{t('menu.photoComingSoon')}</span>
      </div>
    );
  }

  return (
    <img
      className="item-photo"
      src={photoUrl(path, 640, format)}
      srcSet={photoSrcSet(path, format)}
      sizes="(min-width: 64rem) 17rem, (min-width: 40rem) 30vw, 50vw"
      width={640}
      height={480}
      // The item name is the heading right below, so the photo needs no text of its own.
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => {
        setFormat((current) => (current === 'webp' ? 'jpg' : 'none'));
      }}
    />
  );
}
