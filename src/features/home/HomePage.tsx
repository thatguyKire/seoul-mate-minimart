import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { ScrollProgress } from '../../components/ScrollProgress';
import { usePageTitle } from '../../components/usePageTitle';
import { store } from '../../config/store';
import { MenuSection } from '../catalog/MenuSection';
import { FaqSection } from '../faq/FaqSection';
import { HowToOrder } from '../store-info/HowToOrder';
import { StoreInfo } from '../store-info/StoreInfo';

export function HomePage() {
  const { t } = useTranslation();
  usePageTitle();

  // A link such as /en/#visit arrives before the page exists, so scroll once it does.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <>
      <ScrollProgress />
      {/* The hero says what the store sells, where it is, and how to order (BRIEF 5). */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero__inner">
          <h1 id="hero-title" className="hero__title">
            {t('hero.title')}
          </h1>
          <p className="hero__lead">{t('hero.lead')}</p>
          <div className="hero__actions">
            <a className="button button--primary button--large" href={store.messengerUrl}>
              <Icon name="chat" />
              {t('hero.order')}
            </a>
            <a className="button button--secondary button--large" href="#menu">
              {t('hero.seeMenu')}
            </a>
          </div>
          <p className="hero__where">
            <Icon name="pin" />
            <a href="#visit" lang="en">
              {store.addressLines[0]}, {store.addressLines[1]}
            </a>
          </p>
        </div>
      </section>
      <MenuSection />
      <HowToOrder />
      <FaqSection />
      <StoreInfo />
    </>
  );
}
