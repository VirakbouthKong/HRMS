import React, { useEffect, useState } from 'react';
import { PencilSimple, CircleNotch, Phone, House, FirstAid } from '@phosphor-icons/react';
import { employeeApi, MyContactDetails } from '../../api';
import { useI18n } from '../../i18n/useI18n';
import { DashboardCard } from '../dashboard/DashboardCard';

const EMPTY: Required<{ [K in keyof MyContactDetails]: string }> = {
  phoneNumber: '',
  address: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
};
const PHONE = /^$|^[+0-9 ()-]{6,30}$/; // same rule as the backend

const fromServer = (raw: any) => ({
  phoneNumber: raw?.phoneNumber ?? '',
  address: raw?.address ?? '',
  emergencyContactName: raw?.emergencyContactName ?? '',
  emergencyContactPhone: raw?.emergencyContactPhone ?? '',
  emergencyContactRelation: raw?.emergencyContactRelation ?? '',
});

const inputCls =
  'w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500';
const labelCls = 'block text-sm font-semibold text-slate-800 mb-1.5';

/** Self-service contact details (GET /api/employees/me, PATCH /api/employees/me/contact). */
export const ContactDetailsCard: React.FC = () => {
  const { t } = useI18n();
  const [saved, setSaved] = useState(EMPTY);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    employeeApi
      .getMyProfile()
      .then((raw) => !cancelled && setSaved(fromServer(raw)))
      .catch(() => !cancelled && setError(t('ctLoadFailed')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [t]);

  const startEdit = () => {
    setForm(saved);
    setError(null);
    setMessage(null);
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!PHONE.test(form.phoneNumber.trim()) || !PHONE.test(form.emergencyContactPhone.trim())) {
      setError(t('ctPhoneInvalid'));
      return;
    }
    setSaving(true);
    try {
      const updated = await employeeApi.updateMyContact({
        phoneNumber: form.phoneNumber.trim(),
        address: form.address.trim(),
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
        emergencyContactRelation: form.emergencyContactRelation.trim(),
      });
      setSaved(fromServer(updated));
      setEditing(false);
      setMessage(t('ctSaved'));
    } catch (err: any) {
      const data = err?.response?.data;
      setError(data?.message || (data?.errors && Object.values(data.errors).join(' ')) || err?.message || '');
    } finally {
      setSaving(false);
    }
  };

  const rows: { key: keyof typeof EMPTY; label: string; icon: React.ElementType; type?: string }[] = [
    { key: 'phoneNumber', label: t('ctPhone'), icon: Phone, type: 'tel' },
    { key: 'address', label: t('ctAddress'), icon: House },
    { key: 'emergencyContactName', label: t('ctEmergencyName'), icon: FirstAid },
    { key: 'emergencyContactPhone', label: t('ctEmergencyPhone'), icon: Phone, type: 'tel' },
    { key: 'emergencyContactRelation', label: t('ctEmergencyRelation'), icon: FirstAid },
  ];

  return (
    <DashboardCard
      title={t('ctTitle')}
      subtitle={t('ctSub')}
      action={
        !editing && !loading ? (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-sm font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          >
            <PencilSimple weight="bold" className="w-4 h-4" />
            {t('ctEdit')}
          </button>
        ) : undefined
      }
    >
      {error && (
        <p role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </p>
      )}
      {message && !editing && (
        <p role="status" className="p-3 rounded-lg bg-brand-50 border border-brand-200 text-sm text-brand-800">
          {message}
        </p>
      )}

      {loading ? (
        <div className="py-6 text-center text-slate-500">
          <CircleNotch weight="bold" className="inline w-5 h-5 animate-spin" aria-label="Loading" />
        </div>
      ) : editing ? (
        <form onSubmit={save} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rows.map((r) => (
              <div key={r.key} className={r.key === 'address' ? 'sm:col-span-2' : ''}>
                <label htmlFor={`ct-${r.key}`} className={labelCls}>
                  {r.label}
                </label>
                <input
                  id={`ct-${r.key}`}
                  type={r.type || 'text'}
                  autoComplete={r.key === 'phoneNumber' ? 'tel' : r.key === 'address' ? 'street-address' : 'off'}
                  value={form[r.key]}
                  onChange={(e) => setForm((f) => ({ ...f, [r.key]: e.target.value }))}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-sm font-semibold cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {saving && <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />}
              {t('ctSave')}
            </button>
          </div>
        </form>
      ) : (
        <dl className="flex flex-col -mt-1">
          {rows.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex flex-wrap items-center gap-3 py-3 border-t border-slate-100 first:border-0">
              <Icon weight="regular" aria-hidden="true" className="w-5 h-5 text-slate-500 shrink-0" />
              <dt className="w-52 shrink-0 text-sm text-slate-500">{label}</dt>
              <dd className="flex-1 min-w-0 text-sm font-semibold text-slate-900 break-words">
                {saved[key] || <span className="font-normal text-slate-500">{t('ctNotSet')}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </DashboardCard>
  );
};
