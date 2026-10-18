import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';
import { store } from '../../config/store';
import { formatWeekday } from '../../lib/format';
import { useLocale } from '../i18n/localeContext';
import { CopyButton } from './CopyButton';
import { formatHours } from './hours';

/** "Visit us": hours for each day, address and phone, with copy buttons (FR-22 to FR-25). */
export function StoreInfo() {
  const { t } = useTranslation();
  const locale = useLocale();
  const text = {
    range: (values: { opens: string; closes: string }) => t('visit.range', values),
    nextDay: (values: { time: string }) => t('visit.nextDay', values),
  };

  return (
    <section id="visit" className="section visit" aria-labelledby="visit-title">
      <div className="container">
        <h2 id="visit-title">{t('visit.title')}</h2>
        <div className="visit__grid">
          <div className="visit__block">
            <h3 id="hours-title" className="visit__heading">
              <Icon name="clock" />
              {t('visit.hoursTitle')}
            </h3>
            <table className="hours" aria-labelledby="hours-title">
              <thead className="visually-hidden">
                <tr>
                  <th scope="col">{t('visit.day')}</th>
                  <th scope="col">{t('visit.hours')}</th>
                </tr>
              </thead>
              <tbody>
                {store.hours.map((day, index) => (
                  <tr key={day.day}>
                    <th scope="row">{formatWeekday(index, locale)}</th>
                    <td>{formatHours(day, locale, text)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="visit__note">{t('visit.hoursNote')}</p>
          </div>

          <div className="visit__block">
            <h3 className="visit__heading">
              <Icon name="pin" />
              {t('visit.addressTitle')}
            </h3>
            {/* The address is a proper name and stays the same in every language. */}
            <address id="store-address" className="visit__address" lang="en">
              {store.addressLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>
            <CopyButton
              text={store.address}
              label={t('visit.copyAddress')}
              targetId="store-address"
            />

            <h3 className="visit__heading">
              <Icon name="phone" />
              {t('visit.phoneTitle')}
            </h3>
            <p className="visit__phone">
              <a id="store-phone" href={store.phone.href}>
                {store.phone.display}
              </a>
            </p>
            <CopyButton
              text={store.phone.display}
              label={t('visit.copyPhone')}
              targetId="store-phone"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
