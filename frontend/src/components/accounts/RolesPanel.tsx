import React, { useState } from 'react';
import { Plus, PencilSimple, Trash, CircleNotch, WarningCircle, LockSimple } from '@phosphor-icons/react';
import { roleApi, RoleSummary, UserAccountSummary } from '../../api';
import { useI18n } from '../../i18n/useI18n';
import { Modal } from '../ui/modal';
import { DashboardCard, StatusChip } from '../dashboard/DashboardCard';

/** Roles the gateway and services authorise by name; the backend refuses to rename or delete them. */
export const SYSTEM_ROLES = ['ADMIN', 'HR_MANAGER', 'HR_STAFF', 'EMPLOYEE'];
const isSystem = (name?: string) => SYSTEM_ROLES.includes((name || '').toUpperCase());
const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,29}$/;
// The app maps any role containing ADMIN or HR to those screens at sign-in (LoginPage normalizeRole).
const RESERVED = /ADMIN|HR/;

interface RolesPanelProps {
  roles: RoleSummary[];
  accounts: UserAccountSummary[];
  roleLabel: (name?: string) => string;
  onChanged: (message: string) => Promise<void> | void;
}

const inputCls =
  'w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500 disabled:bg-slate-50 disabled:text-slate-500';
const labelCls = 'block text-sm font-semibold text-slate-800 mb-1.5';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none';
const primaryBtn =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none';
const iconBtn =
  'w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none';

export const RolesPanel: React.FC<RolesPanelProps> = ({ roles, accounts, roleLabel, onChanged }) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<RoleSummary | null>(null);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<RoleSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const usage = (role: RoleSummary) =>
    accounts.filter((a) => (a.roleName || '').toUpperCase() === (role.roleName || '').toUpperCase()).length;
  const errorText = (err: any) => err?.response?.data?.message || err?.message || '';

  const openCreate = () => {
    setMode('create');
    setEditing(null);
    setCode('');
    setDescription('');
    setFormError(null);
  };
  const openEdit = (role: RoleSummary) => {
    setMode('edit');
    setEditing(role);
    setCode(role.roleName);
    setDescription(role.description || '');
    setFormError(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const roleName = code.trim().toUpperCase();
    const locked = mode === 'edit' && isSystem(editing?.roleName);
    if (!locked) {
      if (!CODE_PATTERN.test(roleName)) return setFormError(t('rlCodeInvalid'));
      if (RESERVED.test(roleName)) return setFormError(t('rlCodeReserved'));
    }
    if (!description.trim()) return setFormError(t('rlDescRequired'));

    setIsSaving(true);
    try {
      const payload = { roleName: locked ? editing!.roleName : roleName, description: description.trim() };
      const res = mode === 'create' ? await roleApi.create(payload) : await roleApi.update(editing!.roleId, payload);
      if (res && res.success === false) {
        setFormError(res.message);
        return;
      }
      setMode(null);
      await onChanged(
        mode === 'create' ? t('rlCreatedToast', { role: payload.roleName }) : t('rlUpdatedToast', { role: payload.roleName })
      );
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await roleApi.remove(deleting.roleId);
      if (res && res.success === false) {
        setDeleteError(res.message);
        return;
      }
      const name = deleting.roleName;
      setDeleting(null);
      await onChanged(t('rlDeletedToast', { role: name }));
    } catch (err) {
      setDeleteError(errorText(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const sorted = [...roles].sort(
    (a, b) => Number(isSystem(b.roleName)) - Number(isSystem(a.roleName)) || a.roleName.localeCompare(b.roleName)
  );
  const lockedEdit = mode === 'edit' && isSystem(editing?.roleName);

  return (
    <DashboardCard
      title={t('rlTitle')}
      subtitle={t('rlSub')}
      action={
        <button type="button" onClick={openCreate} className={primaryBtn}>
          <Plus weight="bold" className="w-4 h-4" />
          {t('rlCreate')}
        </button>
      }
    >
      <div className="overflow-x-auto -mx-5 border-t border-slate-200">
        <table className="w-full min-w-[720px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <th scope="col" className="py-3 px-5">{t('rlColRole')}</th>
              <th scope="col" className="py-3 px-5">{t('rlColDescription')}</th>
              <th scope="col" className="py-3 px-5">{t('rlColType')}</th>
              <th scope="col" className="py-3 px-5 text-right">{t('rlColAccounts')}</th>
              <th scope="col" className="py-3 px-5 text-right">
                <span className="sr-only">{t('colActions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-500">{t('rlEmpty')}</td>
              </tr>
            ) : (
              sorted.map((role) => {
                const system = isSystem(role.roleName);
                const count = usage(role);
                const deleteBlockedReason = system ? t('rlCannotDeleteSystem') : count > 0 ? t('rlCannotDeleteInUse') : null;
                return (
                  <tr key={role.roleId}>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900">{roleLabel(role.roleName)}</div>
                      <code className="text-xs text-slate-500">{role.roleName}</code>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 max-w-[340px]">{role.description || '—'}</td>
                    <td className="py-3.5 px-5">
                      {system ? (
                        <StatusChip tone="info">{t('rlSystem')}</StatusChip>
                      ) : (
                        <StatusChip tone="neutral">{t('rlCustom')}</StatusChip>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right tabular-nums">{t('rlAccountsCount', { count })}</td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEdit(role)}
                          aria-label={t('rlEditAria', { role: role.roleName })}
                          title={t('rlEditTitle')}
                          className={`${iconBtn} hover:text-brand-700 hover:bg-brand-50`}
                        >
                          <PencilSimple weight="bold" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleting(role);
                          }}
                          disabled={!!deleteBlockedReason}
                          aria-label={t('rlDeleteAria', { role: role.roleName })}
                          title={deleteBlockedReason || t('acDelete')}
                          className={`${iconBtn} hover:text-rose-700 hover:bg-rose-50 disabled:hover:bg-transparent disabled:hover:text-slate-500`}
                        >
                          <Trash weight="bold" className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / edit */}
      <Modal
        isOpen={mode !== null}
        onClose={() => setMode(null)}
        title={mode === 'create' ? t('rlCreateTitle') : t('rlEditTitle')}
        maxWidth="md"
      >
        <form onSubmit={save} className="space-y-4" noValidate>
          {formError && (
            <p role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
              {formError}
            </p>
          )}
          {mode === 'create' && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900 flex gap-2.5">
              <WarningCircle weight="fill" className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t('rlNewRoleWarningTitle')}</p>
                <p className="mt-0.5 leading-relaxed">{t('rlNewRoleWarning')}</p>
              </div>
            </div>
          )}
          <div>
            <label htmlFor="rlCode" className={labelCls}>
              {t('rlCodeLabel')}
            </label>
            <input
              id="rlCode"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              disabled={lockedEdit}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="rlCodeHint"
              className={`${inputCls} font-mono`}
            />
            <p id="rlCodeHint" className="mt-1 text-[13px] text-slate-500 flex items-center gap-1.5">
              {lockedEdit && <LockSimple weight="bold" className="w-3.5 h-3.5 shrink-0" />}
              {lockedEdit ? t('rlSystemLocked') : t('rlCodeHint')}
            </p>
          </div>
          <div>
            <label htmlFor="rlDesc" className={labelCls}>
              {t('rlDescLabel')}
            </label>
            <textarea
              id="rlDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button type="button" onClick={() => setMode(null)} className={secondaryBtn}>
              {t('cancel')}
            </button>
            <button type="submit" disabled={isSaving} className={primaryBtn}>
              {isSaving && <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />}
              {isSaving ? t('saving') : mode === 'create' ? t('rlCreate') : t('acSave')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete */}
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title={t('rlDeleteTitle')} maxWidth="md">
        <div className="space-y-5">
          {deleteError && (
            <p role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
              {deleteError}
            </p>
          )}
          <p className="text-sm text-slate-700">{t('rlDeleteBody', { role: deleting?.roleName || '' })}</p>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setDeleting(null)} className={secondaryBtn}>
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {isDeleting ? <CircleNotch weight="bold" className="w-4 h-4 animate-spin" /> : <Trash weight="bold" className="w-4 h-4" />}
              {t('acDelete')}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardCard>
  );
};
