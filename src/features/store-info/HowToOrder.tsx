import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { store } from '../../config/store';
import { reveal, revealEach } from '../motion/motion';

/** Order on Messenger, pick up in store, pay with cash or GCash, no delivery (FR-26, D-011). */
export function HowToOrder() {
  const { t } = useTranslation();
  const steps = [
    { title: t('howToOrder.step1Title'), body: t('howToOrder.step1') },
    { title: t('howToOrder.step2Title'), body: t('howToOrder.step2') },
    { title: t('howToOrder.step3Title'), body: t('howToOrder.step3') },
  ];

  return (
    <section
      id="how-to-order"
      className="section how-to-order"
      aria-labelledby="how-to-order-title"
    >
      <div className="container">
        <h2 ref={reveal} id="how-to-order-title">
          {t('howToOrder.title')}
        </h2>
        <ol ref={revealEach} className="steps">
          {steps.map((step) => (
            <li key={step.title} className="steps__item">
              <h3 className="steps__title">{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <p ref={reveal} className="how-to-order__note">
          {t('howToOrder.noDelivery')}
        </p>
        <a ref={reveal} className="button button--primary" href={store.messengerUrl}>
          <Icon name="chat" />
          {t('hero.order')}
        </a>
      </div>
    </section>
  );
}
