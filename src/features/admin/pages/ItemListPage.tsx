import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';
import { Icon } from '../../../components/Icon';
import { formatPrice } from '../../../lib/format';
import { markAllOutOfStock, reorderItems, updateItem, type AdminItem } from '../adminData';
import { ConfirmModal } from '../components/ConfirmModal';
import { AvailabilitySwitch } from '../components/AvailabilitySwitch';
import { asAdminError, type FailureKind } from '../errors';
import { useAuth } from '../session/authContext';
import { useCatalog } from '../useCatalog';
import { FailureText, LoadFailure } from './failures';

/** Items by category, with the one-tap stock switch and "Mark all out of stock" (FR-39 to FR-41). */
export function ItemListPage() {
  const { t } = useTranslation('admin');
  const { client } = useAuth();
  const { state, setState, reload } = useCatalog();
  const location = useLocation();
  const navigate = useNavigate();
  const [flash, setFlash] = useState<string | null>(
    () => (location.state as { flash?: string } | null)?.flash ?? null,
  );
  const [failure, setFailure] = useState<FailureKind | null>(null);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  // The one-time message is cleared from browser history, so a reload does not repeat it.
  useEffect(() => {
    if (location.state !== null) void navigate('.', { replace: true, state: null });
  }, [location.state, navigate]);

  if (state.status === 'loading') return <p className="admin-loading">{t('loading')}</p>;
  if (state.status === 'error') return <LoadFailure kind={state.kind} onRetry={reload} />;

  const { categories, items } = state;
  const availableCount = items.filter((item) => item.is_available).length;

  function setItem(next: AdminItem) {
    setState((current) =>
      current.status === 'ready'
        ? { ...current, items: current.items.map((i) => (i.id === next.id ? next : i)) }
        : current,
    );
  }

  async function toggle(item: AdminItem) {
    setFailure(null);
    setFlash(null);
    setPending((set) => new Set(set).add(item.id));
    // Shown at once; put back if the save fails.
    setItem({ ...item, is_available: !item.is_available });
    try {
      setItem(await updateItem(client, item.id, { is_available: !item.is_available }));
    } catch (error) {
      setItem(item);
      setFailure(asAdminError(error).kind);
    } finally {
      setPending((set) => {
        const next = new Set(set);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function move(categoryItems: AdminItem[], index: number, offset: -1 | 1) {
    const ids = categoryItems.map((item) => item.id);
    const target = index + offset;
    const [moved] = ids.splice(index, 1);
    if (moved === undefined || target < 0 || target > ids.length) return;
    ids.splice(target, 0, moved);
    setFailure(null);
    try {
      const categoryId = categoryItems[0]?.category_id;
      if (categoryId) await reorderItems(client, categoryId, ids);
      reload();
    } catch (error) {
      setFailure(asAdminError(error).kind);
    }
  }

  async function markAll() {
    setBulkBusy(true);
    setFailure(null);
    try {
      const count = await markAllOutOfStock(client);
      setFlash(count === 0 ? t('items.nothingToMark') : t('items.markAllDone', { count }));
      reload();
    } catch (error) {
      setFailure(asAdminError(error).kind);
    } finally {
      setBulkBusy(false);
      setConfirming(false);
    }
  }

  return (
    <section aria-labelledby="items-title">
      <div className="admin-page-head">
        <h1 id="items-title">{t('items.title')}</h1>
        <div className="admin-page-head__actions">
          <Link className="button button--primary" to="/admin/items/new">
            {t('items.add')}
          </Link>
          <button
            type="button"
            className="button button--secondary"
            disabled={availableCount === 0}
            onClick={() => {
              setConfirming(true);
            }}
          >
            {t('items.markAllOut')}
          </button>
        </div>
      </div>

      <p className="admin-flash" role="status">
        {flash}
      </p>
      {failure && <FailureText kind={failure} />}

      {items.length === 0 && <p className="admin-empty">{t('items.empty')}</p>}

      {categories.map((category) => {
        const categoryItems = items.filter((item) => item.category_id === category.id);
        if (categoryItems.length === 0) return null;
        return (
          <div key={category.id} className="admin-group">
            <h2 className="admin-group__title">{category.name_en}</h2>
            <ul className="admin-rows">
              {categoryItems.map((item, index) => (
                <li key={item.id} className="admin-row">
                  <div className="admin-row__main">
                    <Link className="admin-row__name" to={`/admin/items/${item.id}`}>
                      {item.name_en}
                    </Link>
                    <span className="admin-row__meta">
                      {formatPrice(item.price_centavos, 'en')}
                      {!item.is_published && <span className="tag">{t('items.hidden')}</span>}
                      {item.is_sample && <span className="tag">{t('items.sample')}</span>}
                    </span>
                  </div>
                  <AvailabilitySwitch
                    name={item.name_en}
                    checked={item.is_available}
                    busy={pending.has(item.id)}
                    onToggle={() => void toggle(item)}
                  />
                  <div className="admin-row__order">
                    <button
                      type="button"
                      className="icon-button"
                      disabled={index === 0}
                      onClick={() => void move(categoryItems, index, -1)}
                    >
                      <Icon name="chevronUp" />
                      <span className="visually-hidden">
                        {t('items.moveUp', { name: item.name_en })}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={index === categoryItems.length - 1}
                      onClick={() => void move(categoryItems, index, 1)}
                    >
                      <Icon name="chevronDown" />
                      <span className="visually-hidden">
                        {t('items.moveDown', { name: item.name_en })}
                      </span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <ConfirmModal
        open={confirming}
        title={t('items.markAllTitle')}
        body={t('items.markAllBody', { count: availableCount })}
        confirmLabel={t('items.markAllConfirm')}
        busyLabel={t('form.saving')}
        busy={bulkBusy}
        onConfirm={() => void markAll()}
        onCancel={() => {
          setConfirming(false);
        }}
      />
    </section>
  );
}
