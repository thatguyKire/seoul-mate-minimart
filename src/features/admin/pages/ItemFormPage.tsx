import { useEffect, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import {
  deleteItem,
  loadCatalog,
  saveItem,
  type AdminCategory,
  type AdminItem,
  type PhotoChange,
} from '../adminData';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  BusyButton,
  CheckboxField,
  ErrorSummary,
  SelectField,
  TextAreaField,
  TextField,
} from '../components/fields';
import { asAdminError, type FailureKind } from '../errors';
import { PhotoField } from '../photos/PhotoField';
import {
  itemFieldMax,
  itemFormSchema,
  pesosInput,
  validate,
  type FieldErrors,
  type ItemFormValues,
} from '../schemas';
import { useAuth } from '../session/authContext';
import { FailureText, LoadFailure } from './failures';

type Load =
  | { status: 'loading' }
  | { status: 'error'; kind: FailureKind }
  | { status: 'ready'; categories: AdminCategory[]; item: AdminItem | null };

const emptyValues: ItemFormValues = {
  name_en: '',
  name_fil: '',
  name_ko: '',
  description_en: '',
  description_fil: '',
  description_ko: '',
  category_id: '',
  price_centavos: '',
  // New items start hidden, so staff can finish them before publishing (SDD 4).
  is_published: false,
  is_available: true,
};

function valuesOf(item: AdminItem): ItemFormValues {
  return {
    name_en: item.name_en,
    name_fil: item.name_fil ?? '',
    name_ko: item.name_ko ?? '',
    description_en: item.description_en,
    description_fil: item.description_fil ?? '',
    description_ko: item.description_ko ?? '',
    category_id: item.category_id,
    price_centavos: pesosInput(item.price_centavos),
    is_published: item.is_published,
    is_available: item.is_available,
  };
}

/** Field ids, so the error summary can link to them. */
const fieldId: Record<keyof ItemFormValues, string> = {
  name_en: 'item-name-en',
  name_fil: 'item-name-fil',
  name_ko: 'item-name-ko',
  description_en: 'item-description-en',
  description_fil: 'item-description-fil',
  description_ko: 'item-description-ko',
  category_id: 'item-category',
  price_centavos: 'item-price',
  is_published: 'item-published',
  is_available: 'item-available',
};

/** Add or edit an item (FR-38, FR-43 to FR-45). Delete asks first (FR-41). */
export function ItemFormPage() {
  const { t } = useTranslation('admin');
  const { client } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [values, setValues] = useState<ItemFormValues>(emptyValues);
  const [errors, setErrors] = useState<FieldErrors<ItemFormValues>>({});
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'keep' });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<FailureKind | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadCatalog(client).then(
      ({ categories, items }) => {
        if (!active) return;
        const item = id ? (items.find((i) => i.id === id) ?? null) : null;
        if (id && !item) {
          setLoad({ status: 'error', kind: 'notFound' });
          return;
        }
        setValues(item ? valuesOf(item) : emptyValues);
        setLoad({ status: 'ready', categories, item });
      },
      (error: unknown) => {
        if (active) setLoad({ status: 'error', kind: asAdminError(error).kind });
      },
    );
    return () => {
      active = false;
    };
  }, [client, id, attempt]);

  if (load.status === 'loading') return <p className="admin-loading">{t('loading')}</p>;
  if (load.status === 'error') {
    return (
      <LoadFailure
        kind={load.kind}
        onRetry={() => {
          setLoad({ status: 'loading' });
          setAttempt((value) => value + 1);
        }}
      />
    );
  }

  const { categories, item } = load;

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function errorText(key: keyof ItemFormValues): string | undefined {
    const code = errors[key];
    return code ? t(`errors.${code}`, { max: itemFieldMax[key] ?? 0 }) : undefined;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    setFailure(null);
    const result = validate(itemFormSchema, values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const saved = await saveItem(client, item, result.value, photo);
      const name = saved.item.name_en;
      await navigate('/admin', {
        state: {
          flash: saved.photoFailed
            ? t('form.photoSaveFailed', { name })
            : t('form.saved', { name }),
        },
      });
    } catch (error) {
      setFailure(asAdminError(error).kind);
      setSaving(false);
    }
  }

  async function remove() {
    if (!item) return;
    setDeleting(true);
    setFailure(null);
    try {
      await deleteItem(client, item);
      await navigate('/admin', { state: { flash: t('form.deleted', { name: item.name_en }) } });
    } catch (error) {
      setFailure(asAdminError(error).kind);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const summary = (Object.keys(fieldId) as (keyof ItemFormValues)[]).flatMap((key) => {
    const message = errorText(key);
    return message ? [{ id: fieldId[key], message }] : [];
  });

  const languages = [
    { legend: t('form.english'), name: 'name_en', description: 'description_en', hint: undefined },
    {
      legend: t('form.filipino'),
      name: 'name_fil',
      description: 'description_fil',
      hint: t('form.translationHint'),
    },
    {
      legend: t('form.korean'),
      name: 'name_ko',
      description: 'description_ko',
      hint: t('form.translationHint'),
    },
  ] as const;

  return (
    <section aria-labelledby="item-form-title">
      <p>
        <Link to="/admin">{t('form.back')}</Link>
      </p>
      <h1 id="item-form-title">
        {item ? t('form.editTitle', { name: item.name_en }) : t('form.newTitle')}
      </h1>
      {failure && <FailureText kind={failure} />}

      <form
        className="admin-form admin-form--wide"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <ErrorSummary title={t('form.errorSummary')} errors={summary} />

        {languages.map((language) => (
          <fieldset key={language.name} className="admin-fieldset">
            <legend>{language.legend}</legend>
            <TextField
              id={fieldId[language.name]}
              label={t('form.name')}
              hint={language.hint}
              value={values[language.name]}
              error={errorText(language.name)}
              lang={
                language.name === 'name_ko' ? 'ko' : language.name === 'name_fil' ? 'fil' : 'en'
              }
              onChange={(event) => {
                set(language.name, event.target.value);
              }}
            />
            <TextAreaField
              id={fieldId[language.description]}
              label={t('form.description')}
              rows={3}
              value={values[language.description]}
              error={errorText(language.description)}
              lang={
                language.name === 'name_ko' ? 'ko' : language.name === 'name_fil' ? 'fil' : 'en'
              }
              onChange={(event) => {
                set(language.description, event.target.value);
              }}
            />
          </fieldset>
        ))}

        <SelectField
          id={fieldId.category_id}
          label={t('form.category')}
          value={values.category_id}
          error={errorText('category_id')}
          onChange={(event) => {
            set('category_id', event.target.value);
          }}
        >
          <option value="">{t('form.chooseCategory')}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name_en}
            </option>
          ))}
        </SelectField>

        <TextField
          id={fieldId.price_centavos}
          label={t('form.price')}
          hint={t('form.priceHint')}
          inputMode="decimal"
          autoComplete="off"
          value={values.price_centavos}
          error={errorText('price_centavos')}
          onChange={(event) => {
            set('price_centavos', event.target.value);
          }}
        />

        <PhotoField
          id="item-photo"
          current={
            item?.photo_path && item.photo_format
              ? { path: item.photo_path, format: item.photo_format }
              : null
          }
          change={photo}
          onChange={setPhoto}
          onBusyChange={setPhotoBusy}
        />

        <fieldset className="admin-fieldset">
          <legend>{t('form.visibility')}</legend>
          <CheckboxField
            id={fieldId.is_published}
            label={t('form.published')}
            hint={t('form.publishedHint')}
            checked={values.is_published}
            onChange={(event) => {
              set('is_published', event.target.checked);
            }}
          />
          <CheckboxField
            id={fieldId.is_available}
            label={t('form.available')}
            checked={values.is_available}
            onChange={(event) => {
              set('is_available', event.target.checked);
            }}
          />
        </fieldset>

        <div className="admin-form__actions">
          <BusyButton type="submit" busy={saving} busyLabel={t('form.saving')} disabled={photoBusy}>
            {t('form.save')}
          </BusyButton>
          <Link className="button button--secondary" to="/admin">
            {t('form.cancel')}
          </Link>
          {item && (
            <button
              type="button"
              className="button button--danger-quiet"
              onClick={() => {
                setConfirmDelete(true);
              }}
            >
              {t('form.delete')}
            </button>
          )}
        </div>
      </form>

      {item && (
        <ConfirmModal
          open={confirmDelete}
          title={t('form.deleteTitle', { name: item.name_en })}
          body={t('form.deleteBody')}
          confirmLabel={t('form.deleteConfirm')}
          busyLabel={t('form.saving')}
          busy={deleting}
          onConfirm={() => void remove()}
          onCancel={() => {
            setConfirmDelete(false);
          }}
        />
      )}
    </section>
  );
}
