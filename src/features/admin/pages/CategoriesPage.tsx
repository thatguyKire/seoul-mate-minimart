import { useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../../components/Icon';
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
  type AdminCategory,
} from '../adminData';
import { ConfirmModal } from '../components/ConfirmModal';
import { BusyButton, ErrorSummary, FailureMessage, TextField } from '../components/fields';
import { asAdminError, type FailureKind } from '../errors';
import {
  categoryFieldMax,
  categoryFormSchema,
  slugify,
  validate,
  type CategoryFormValues,
  type FieldErrors,
} from '../schemas';
import { useAuth } from '../session/authContext';
import { useCatalog } from '../useCatalog';
import { FailureText, LoadFailure } from './failures';

/** Create, rename, reorder and delete categories (FR-42). */
export function CategoriesPage() {
  const { t } = useTranslation('admin');
  const { client } = useAuth();
  const { state, reload } = useCatalog();
  const [editing, setEditing] = useState<AdminCategory | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ kind: FailureKind; name: string } | null>(null);

  if (state.status === 'loading') return <p className="admin-loading">{t('loading')}</p>;
  if (state.status === 'error') return <LoadFailure kind={state.kind} onRetry={reload} />;

  const { categories, items } = state;
  const countFor = (id: string) => items.filter((item) => item.category_id === id).length;

  async function move(index: number, offset: -1 | 1) {
    const ids = categories.map((category) => category.id);
    const [moved] = ids.splice(index, 1);
    if (moved === undefined) return;
    ids.splice(index + offset, 0, moved);
    setFailure(null);
    try {
      await reorderCategories(client, ids);
      reload();
    } catch (error) {
      setFailure({ kind: asAdminError(error).kind, name: '' });
    }
  }

  async function remove(category: AdminCategory) {
    setBusy(true);
    setFailure(null);
    try {
      await deleteCategory(client, category.id);
      setFlash(t('categories.deleted', { name: category.name_en }));
      reload();
    } catch (error) {
      setFailure({ kind: asAdminError(error).kind, name: category.name_en });
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  return (
    <section aria-labelledby="categories-title">
      <div className="admin-page-head">
        <h1 id="categories-title">{t('categories.title')}</h1>
        {editing === null && (
          <div className="admin-page-head__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                setFlash(null);
                setEditing('new');
              }}
            >
              {t('categories.add')}
            </button>
          </div>
        )}
      </div>
      <p className="admin-intro">{t('categories.intro')}</p>
      <p className="admin-flash" role="status">
        {flash}
      </p>
      {failure &&
        (failure.kind === 'categoryInUse' ? (
          <FailureMessage>{t('categories.cannotDelete', { name: failure.name })}</FailureMessage>
        ) : (
          <FailureText kind={failure.kind} />
        ))}

      {editing === 'new' && (
        <CategoryForm
          category={null}
          onDone={(message) => {
            setEditing(null);
            if (message) {
              setFlash(message);
              reload();
            }
          }}
        />
      )}

      {categories.length === 0 && <p className="admin-empty">{t('categories.empty')}</p>}
      <ul className="admin-rows">
        {categories.map((category, index) =>
          editing !== 'new' && editing?.id === category.id ? (
            <li key={category.id} className="admin-row admin-row--editing">
              <CategoryForm
                category={category}
                onDone={(message) => {
                  setEditing(null);
                  if (message) {
                    setFlash(message);
                    reload();
                  }
                }}
              />
            </li>
          ) : (
            <li key={category.id} className="admin-row">
              <div className="admin-row__main">
                <span className="admin-row__name">{category.name_en}</span>
                <span className="admin-row__meta">
                  {[category.name_fil, category.name_ko].filter(Boolean).join(', ')}
                  <span className="tag">
                    {t('categories.inUse', { count: countFor(category.id) })}
                  </span>
                </span>
              </div>
              <div className="admin-row__actions">
                <button
                  type="button"
                  className="button button--small button--secondary"
                  onClick={() => {
                    setFlash(null);
                    setEditing(category);
                  }}
                >
                  <span aria-hidden="true">{t('categories.editShort')}</span>
                  <span className="visually-hidden">
                    {t('categories.edit', { name: category.name_en })}
                  </span>
                </button>
                <button
                  type="button"
                  className="button button--small button--danger-quiet"
                  onClick={() => {
                    setFlash(null);
                    setDeleting(category);
                  }}
                >
                  <span aria-hidden="true">{t('categories.deleteShort')}</span>
                  <span className="visually-hidden">
                    {t('categories.delete', { name: category.name_en })}
                  </span>
                </button>
              </div>
              <div className="admin-row__order">
                <button
                  type="button"
                  className="icon-button"
                  disabled={index === 0}
                  onClick={() => void move(index, -1)}
                >
                  <Icon name="chevronUp" />
                  <span className="visually-hidden">
                    {t('categories.moveUp', { name: category.name_en })}
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={index === categories.length - 1}
                  onClick={() => void move(index, 1)}
                >
                  <Icon name="chevronDown" />
                  <span className="visually-hidden">
                    {t('categories.moveDown', { name: category.name_en })}
                  </span>
                </button>
              </div>
            </li>
          ),
        )}
      </ul>

      <ConfirmModal
        open={deleting !== null}
        title={t('categories.deleteTitle', { name: deleting?.name_en ?? '' })}
        body={t('categories.deleteBody')}
        confirmLabel={t('categories.deleteConfirm')}
        busyLabel={t('categories.saving')}
        busy={busy}
        onConfirm={() => {
          if (deleting) void remove(deleting);
        }}
        onCancel={() => {
          setDeleting(null);
        }}
      />
    </section>
  );
}

const fieldId: Record<keyof CategoryFormValues, string> = {
  name_en: 'category-name-en',
  name_fil: 'category-name-fil',
  name_ko: 'category-name-ko',
  slug: 'category-slug',
};

function CategoryForm({
  category,
  onDone,
}: {
  category: AdminCategory | null;
  onDone: (message: string | null) => void;
}) {
  const { t } = useTranslation('admin');
  const { client } = useAuth();
  const [values, setValues] = useState<CategoryFormValues>({
    name_en: category?.name_en ?? '',
    name_fil: category?.name_fil ?? '',
    name_ko: category?.name_ko ?? '',
    slug: category?.slug ?? '',
  });
  // A new category's web address name follows its English name until edited by hand.
  const [slugEdited, setSlugEdited] = useState(category !== null);
  const [errors, setErrors] = useState<FieldErrors<CategoryFormValues>>({});
  const [failure, setFailure] = useState<FailureKind | null>(null);
  const [busy, setBusy] = useState(false);

  function errorText(key: keyof CategoryFormValues) {
    const code = errors[key];
    return code ? t(`errors.${code}`, { max: categoryFieldMax[key] ?? 0 }) : undefined;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    setFailure(null);
    const result = validate(categoryFormSchema, values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const saved = category
        ? await updateCategory(client, category.id, result.value)
        : await createCategory(client, result.value);
      onDone(t('categories.saved', { name: saved.name_en }));
    } catch (error) {
      setFailure(asAdminError(error).kind);
      setBusy(false);
    }
  }

  const summary = (Object.keys(fieldId) as (keyof CategoryFormValues)[]).flatMap((key) => {
    const message = errorText(key);
    return message ? [{ id: fieldId[key], message }] : [];
  });
  const title = category
    ? t('categories.editTitle', { name: category.name_en })
    : t('categories.addTitle');

  return (
    <form
      className="admin-form admin-subform"
      noValidate
      aria-label={title}
      onSubmit={(event) => void submit(event)}
    >
      <h2 className="admin-subform__title">{title}</h2>
      <ErrorSummary title={t('categories.errorSummary')} errors={summary} />
      {failure && <FailureText kind={failure} />}
      <TextField
        id={fieldId.name_en}
        label={t('categories.nameEnglish')}
        value={values.name_en}
        error={errorText('name_en')}
        onChange={(event) => {
          const name_en = event.target.value;
          setValues((current) => ({
            ...current,
            name_en,
            slug: slugEdited ? current.slug : slugify(name_en),
          }));
        }}
      />
      <TextField
        id={fieldId.name_fil}
        label={t('categories.nameFilipino')}
        lang="fil"
        value={values.name_fil}
        error={errorText('name_fil')}
        onChange={(event) => {
          setValues((current) => ({ ...current, name_fil: event.target.value }));
        }}
      />
      <TextField
        id={fieldId.name_ko}
        label={t('categories.nameKorean')}
        lang="ko"
        value={values.name_ko}
        error={errorText('name_ko')}
        onChange={(event) => {
          setValues((current) => ({ ...current, name_ko: event.target.value }));
        }}
      />
      <TextField
        id={fieldId.slug}
        label={t('categories.slug')}
        hint={t('categories.slugHint')}
        autoCapitalize="none"
        spellCheck={false}
        value={values.slug}
        error={errorText('slug')}
        onChange={(event) => {
          setSlugEdited(true);
          setValues((current) => ({ ...current, slug: event.target.value }));
        }}
      />
      <div className="admin-form__actions">
        <BusyButton type="submit" busy={busy} busyLabel={t('categories.saving')}>
          {t('categories.save')}
        </BusyButton>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => {
            onDone(null);
          }}
        >
          {t('categories.cancel')}
        </button>
      </div>
    </form>
  );
}
