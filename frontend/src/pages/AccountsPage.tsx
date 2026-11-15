import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  UserPlus,
  UserGear,
  Users,
  KeyReturn,
  ShieldCheck,
  PencilSimple,
  Trash,
  MagnifyingGlass,
  Eye,
  EyeSlash,
  Copy,
  Check,
  ArrowsClockwise,
  CircleNotch,
  WarningCircle,
  CheckCircle,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../store/useHrmsStore';
import { useI18n, TranslationKey } from '../i18n/useI18n';
import { accountApi, roleApi, UserAccountSummary, RoleSummary } from '../api';
import { Modal } from '../components/ui/modal';
import { MetricCard } from '../components/dashboard/MetricCard';
import { InitialsAvatar, StatusChip, localeFor } from '../components/dashboard/DashboardCard';
import { FilterTabs } from '../components/ui/filter-tabs';

const ROLE_LABELS: Record<string, TranslationKey> = {
  ADMIN: 'acRoleAdmin',
  HR_MANAGER: 'acRoleHrManager',
  HR_STAFF: 'acRoleHrStaff',
  EMPLOYEE: 'acRoleEmployee',
};

const isActive = (status?: string) => (status || '').toUpperCase() === 'ACTIVE';

const errorText = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;

/** 12 characters without look-alikes (0/O, 1/l/I), from the browser's secure random source. */
const generatePassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

type FormState = {
  departmentId: number | '';
  employeeId: number | '';
  userName: string;
  email: string;
  roleId: number | '';
  status: 'ACTIVE' | 'INACTIVE';
  password: string;
};

const inputCls =
  'w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-brand-500';
const labelCls = 'block text-sm font-semibold text-slate-800 mb-1.5';
const secondaryBtn =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none';
const primaryBtn =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none';

export const AccountsPage: React.FC = () => {
  const { employees, departments, currentUser } = useHrmsStore();
  const { t, language } = useI18n();

  const [accounts, setAccounts] = useState<UserAccountSummary[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [search, setSearch] = useState('');

  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<UserAccountSummary | null>(null);
  const [form, setForm] = useState<FormState>({
    departmentId: '',
    employeeId: '',
    userName: '',
    email: '',
    roleId: '',
    status: 'ACTIVE',
    password: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);

  const [deleting, setDeleting] = useState<UserAccountSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [acc, rls] = await Promise.all([accountApi.getAll(), roleApi.getAll()]);
      setAccounts(Array.isArray(acc) ? acc : []);
      setRoles(Array.isArray(rls) ? rls : []);
    } catch (err) {
      setLoadError(errorText(err, t('acLoadFailed')));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  // --- derived data ---
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.employeeId, e])), [employees]);
  const employeeName = (id: number | null) => {
    const e = id != null ? employeeById.get(id) : undefined;
    return e ? `${e.firstName} ${e.lastName}`.trim() : null;
  };
  const linkedEmployeeIds = new Set(accounts.map((a) => a.employeeId).filter((id): id is number => id != null));
  const employeesWithoutLogin = employees.filter((e) => {
    const s = (e.status || '').toUpperCase();
    return !linkedEmployeeIds.has(e.employeeId) && s !== 'TERMINATED' && s !== 'INACTIVE';
  });

  const withoutLoginByDept = (departmentId: number) =>
    employeesWithoutLogin.filter((e) => e.departmentId === departmentId);
  const sortedDepartments = [...departments].sort((a, b) => a.departmentName.localeCompare(b.departmentName));
  const deptEmployees =
    form.departmentId === ''
      ? []
      : withoutLoginByDept(Number(form.departmentId)).sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        );

  const activeCount = accounts.filter((a) => isActive(a.status)).length;
  const inactiveCount = accounts.length - activeCount;
  const firstLoginCount = accounts.filter((a) => a.isFirstLogin).length;
  const adminCount = accounts.filter((a) => a.roleName?.toUpperCase() === 'ADMIN').length;

  const q = search.trim().toLowerCase();
  const rows = accounts
    .filter((a) => (statusTab === 'ALL' ? true : statusTab === 'ACTIVE' ? isActive(a.status) : !isActive(a.status)))
    .filter(
      (a) =>
        !q ||
        a.userName.toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (employeeName(a.employeeId) || '').toLowerCase().includes(q)
    )
    .sort((a, b) => a.userName.localeCompare(b.userName));

  const roleLabel = (name?: string) => {
    const key = ROLE_LABELS[(name || '').toUpperCase()];
    return key ? t(key) : name || '—';
  };
  const dateFmt = new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : dateFmt.format(d);
  };

  // --- create / edit ---
  const defaultRoleId = roles.find((r) => r.roleName?.toUpperCase() === 'EMPLOYEE')?.roleId ?? roles[0]?.roleId ?? '';

  const suggestUserName = (employeeId: number) => {
    const e = employeeById.get(employeeId);
    if (!e) return '';
    const fromEmail = (e.email || '').split('@')[0];
    return (fromEmail || `${e.firstName}.${e.lastName}`).toLowerCase().replace(/\s+/g, '');
  };

  const openCreate = () => {
    setForm({
      departmentId: '',
      employeeId: '',
      userName: '',
      email: '',
      roleId: defaultRoleId,
      status: 'ACTIVE',
      password: generatePassword(),
    });
    setEditing(null);
    setFormError(null);
    setShowPassword(true);
    setCopied(false);
    setMode('create');
  };

  const openEdit = (account: UserAccountSummary) => {
    setForm({
      departmentId: '',
      employeeId: account.employeeId ?? '',
      userName: account.userName,
      email: account.email,
      roleId: roles.find((r) => r.roleName?.toUpperCase() === account.roleName?.toUpperCase())?.roleId ?? '',
      status: isActive(account.status) ? 'ACTIVE' : 'INACTIVE',
      password: '',
    });
    setEditing(account);
    setFormError(null);
    setMode('edit');
  };

  const pickDepartment = (id: number) => {
    // Changing department clears the employee and the details filled in from them.
    setForm((f) => ({ ...f, departmentId: id, employeeId: '', userName: '', email: '' }));
  };

  const pickEmployee = (id: number) => {
    const e = employeeById.get(id);
    setForm((f) => ({ ...f, employeeId: id, userName: suggestUserName(id), email: e?.email || '' }));
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(form.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (e.g. non-secure origin); the password stays visible to copy by hand.
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const userName = form.userName.trim();
    const email = form.email.trim();
    if (
      !userName ||
      !email ||
      form.roleId === '' ||
      (mode === 'create' && (form.departmentId === '' || form.employeeId === ''))
    ) {
      setFormError(t('acRequiredFields'));
      return;
    }
    if (mode === 'create' && form.password.length < 8) {
      setFormError(t('acPasswordTooShort'));
      return;
    }

    setIsSaving(true);
    try {
      const res =
        mode === 'create'
          ? await accountApi.create({
              userName,
              email,
              userPwd: form.password,
              status: form.status,
              employeeId: Number(form.employeeId),
              roleId: Number(form.roleId),
            })
          : await accountApi.update(editing!.accountId, {
              userName,
              email,
              status: form.status,
              roleId: Number(form.roleId),
            });
      if (res && res.success === false) {
        setFormError(res.message);
        return;
      }
      setMode(null);
      flash(mode === 'create' ? t('acCreatedToast', { user: userName }) : t('acUpdatedToast', { user: userName }));
      await load();
    } catch (err) {
      setFormError(errorText(err, t('acLoadFailed')));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await accountApi.remove(deleting.accountId);
      flash(t('acDeletedToast', { user: deleting.userName }));
      setDeleting(null);
      await load();
    } catch (err) {
      setLoadError(errorText(err, t('acLoadFailed')));
      setDeleting(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const isSelf = (a: UserAccountSummary) =>
    a.accountId === currentUser.accountId || a.userName === currentUser.userName;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('acKpiTotal')}
          icon={Users}
          value={accounts.length}
          subtitle={t('acKpiTotalSub', { active: activeCount, inactive: inactiveCount })}
        />
        <MetricCard
          title={t('acKpiFirstLogin')}
          icon={KeyReturn}
          accent={firstLoginCount > 0 ? 'warn' : 'neutral'}
          value={firstLoginCount}
          subtitle={t('acKpiFirstLoginSub')}
        />
        <MetricCard
          title={t('acKpiNoLogin')}
          icon={UserGear}
          value={employeesWithoutLogin.length}
          subtitle={t('acKpiNoLoginSub')}
        />
        <MetricCard title={t('acKpiAdmins')} icon={ShieldCheck} value={adminCount} subtitle={t('acKpiAdminsSub')} />
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 rounded-lg bg-brand-50 border border-brand-200 text-sm text-brand-800 flex items-center gap-2 animate-fadeIn"
        >
          <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{toast}</span>
        </div>
      )}
      {loadError && (
        <div
          role="alert"
          className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex flex-wrap items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <WarningCircle weight="fill" className="w-4 h-4 text-rose-600 shrink-0" />
            {loadError}
          </span>
          <button type="button" onClick={load} className={secondaryBtn}>
            <ArrowsClockwise weight="bold" className="w-4 h-4" />
            {t('retry')}
          </button>
        </div>
      )}

      {/* 2. Tabs + actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterTabs
          label={t('acFilterLabel')}
          value={statusTab}
          onChange={setStatusTab}
          className="flex-1 min-w-[260px]"
          tabs={[
            { value: 'ALL', label: t('lvTabAll'), count: accounts.length },
            { value: 'ACTIVE', label: t('acStatusActive'), count: activeCount },
            { value: 'INACTIVE', label: t('acStatusInactive'), count: inactiveCount },
          ]}
        />
        <button type="button" onClick={openCreate} disabled={isLoading || roles.length === 0} className={primaryBtn}>
          <UserPlus weight="bold" className="w-4 h-4" />
          {t('acCreate')}
        </button>
      </div>

      <label className="flex items-center gap-2 h-10 max-w-md px-3 rounded-lg border border-slate-200 bg-white text-slate-500 focus-within:ring-2 focus-within:ring-brand-500">
        <MagnifyingGlass weight="bold" className="w-4 h-4 shrink-0" />
        <span className="sr-only">{t('acSearch')}</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('acSearch')}
          className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500"
        />
      </label>

      {/* 3. Accounts table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[920px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
              <th scope="col" className="py-3 px-5">{t('acColUsername')}</th>
              <th scope="col" className="py-3 px-5">{t('colEmployee')}</th>
              <th scope="col" className="py-3 px-5">{t('acColEmail')}</th>
              <th scope="col" className="py-3 px-5">{t('acColRole')}</th>
              <th scope="col" className="py-3 px-5">{t('colStatus')}</th>
              <th scope="col" className="py-3 px-5">{t('acColCreated')}</th>
              <th scope="col" className="py-3 px-5 text-right">
                <span className="sr-only">{t('colActions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500">
                  <CircleNotch weight="bold" className="inline w-5 h-5 animate-spin" aria-label="Loading" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 px-5 text-center text-slate-500">
                  {t('acEmpty')}
                </td>
              </tr>
            ) : (
              rows.map((a) => {
                const self = isSelf(a);
                return (
                  <tr key={a.accountId}>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={a.userName.replace(/[._-]/g, ' ')} size="sm" />
                        <span className="font-semibold text-slate-900">{a.userName}</span>
                        {self && <StatusChip tone="neutral">{t('acYou')}</StatusChip>}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      {employeeName(a.employeeId) || <span className="text-slate-500">{t('acNoEmployee')}</span>}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 break-all">{a.email}</td>
                    <td className="py-3.5 px-5">{roleLabel(a.roleName)}</td>
                    <td className="py-3.5 px-5">
                      <div className="flex flex-wrap gap-1.5">
                        <StatusChip tone={isActive(a.status) ? 'ok' : 'neutral'}>
                          {isActive(a.status) ? t('acStatusActive') : t('acStatusInactive')}
                        </StatusChip>
                        {a.isFirstLogin && <StatusChip tone="warn">{t('acFirstLogin')}</StatusChip>}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 tabular-nums whitespace-nowrap">{fmtDate(a.createdDate)}</td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          aria-label={t('acEditAria', { user: a.userName })}
                          title={t('acEdit')}
                          className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-brand-700 hover:bg-brand-50 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                        >
                          <PencilSimple weight="bold" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(a)}
                          disabled={self}
                          aria-label={t('acDeleteAria', { user: a.userName })}
                          title={self ? t('acCannotDeleteSelf') : t('acDelete')}
                          className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
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

      {/* Create / edit dialog */}
      <Modal
        isOpen={mode !== null}
        onClose={() => setMode(null)}
        title={mode === 'create' ? t('acCreateTitle') : t('acEditTitle')}
        subtitle={mode === 'create' ? t('acCreateSub') : editing?.userName}
        maxWidth="lg"
      >
        <form onSubmit={save} className="space-y-4" noValidate>
          {formError && (
            <p role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
              {formError}
            </p>
          )}

          {mode === 'create' &&
            (employeesWithoutLogin.length === 0 ? (
              <p className="text-sm text-slate-500">{t('acNoEmployeesLeft')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="acDepartment" className={labelCls}>
                    {t('colDepartment')}
                  </label>
                  <select
                    id="acDepartment"
                    value={form.departmentId}
                    onChange={(e) => pickDepartment(Number(e.target.value))}
                    className={inputCls}
                  >
                    <option value="" disabled>
                      {t('acChooseDepartment')}
                    </option>
                    {sortedDepartments.map((d) => {
                      const count = withoutLoginByDept(d.departmentId).length;
                      return (
                        <option key={d.departmentId} value={d.departmentId} disabled={count === 0}>
                          {count === 0
                            ? t('acDeptAllHaveLogin', { name: d.departmentName })
                            : t('acDeptOption', { name: d.departmentName, count })}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label htmlFor="acEmployee" className={labelCls}>
                    {t('colEmployee')}
                  </label>
                  <select
                    id="acEmployee"
                    value={form.employeeId}
                    onChange={(e) => pickEmployee(Number(e.target.value))}
                    disabled={form.departmentId === ''}
                    className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed`}
                  >
                    <option value="" disabled>
                      {form.departmentId === '' ? t('acPickDepartmentFirst') : t('acChooseEmployee')}
                    </option>
                    {deptEmployees.map((e) => (
                      <option key={e.employeeId} value={e.employeeId}>
                        {e.firstName} {e.lastName}
                        {e.jobTitle ? ` · ${e.jobTitle}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="acUserName" className={labelCls}>
                {t('acColUsername')}
              </label>
              <input
                id="acUserName"
                autoComplete="off"
                spellCheck={false}
                value={form.userName}
                onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="acEmail" className={labelCls}>
                {t('acColEmail')}
              </label>
              <input
                id="acEmail"
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="acRole" className={labelCls}>
                {t('acColRole')}
              </label>
              <select
                id="acRole"
                value={form.roleId}
                onChange={(e) => setForm((f) => ({ ...f, roleId: Number(e.target.value) }))}
                className={inputCls}
              >
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>
                    {roleLabel(r.roleName)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="acStatus" className={labelCls}>
                {t('colStatus')}
              </label>
              <select
                id="acStatus"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState['status'] }))}
                className={inputCls}
                aria-describedby="acStatusHint"
              >
                <option value="ACTIVE">{t('acStatusActive')}</option>
                <option value="INACTIVE">{t('acStatusInactive')}</option>
              </select>
              <p id="acStatusHint" className="mt-1 text-[13px] text-slate-500">
                {t('acInactiveHint')}
              </p>
            </div>
          </div>

          {mode === 'create' && (
            <div>
              <label htmlFor="acPassword" className={labelCls}>
                {t('acTempPassword')}
              </label>
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    id="acPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    spellCheck={false}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    aria-describedby="acPasswordHint"
                    className={`${inputCls} pr-10 font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('acHidePassword') : t('acShowPassword')}
                    className="absolute inset-y-0 right-0 w-10 inline-flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-r-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                  >
                    {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}
                  className={secondaryBtn}
                >
                  <ArrowsClockwise weight="bold" className="w-4 h-4" />
                  {t('acGenerate')}
                </button>
                <button type="button" onClick={copyPassword} disabled={!form.password} className={secondaryBtn}>
                  {copied ? <Check weight="bold" className="w-4 h-4" /> : <Copy weight="bold" className="w-4 h-4" />}
                  {copied ? t('acCopied') : t('acCopy')}
                </button>
              </div>
              <p id="acPasswordHint" className="mt-1 text-[13px] text-slate-500">
                {t('acPasswordHint')}
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button type="button" onClick={() => setMode(null)} className={secondaryBtn}>
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving || (mode === 'create' && employeesWithoutLogin.length === 0)}
              className={primaryBtn}
            >
              {isSaving && <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />}
              {isSaving ? t('saving') : mode === 'create' ? t('acCreate') : t('acSave')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title={t('acDeleteTitle')} maxWidth="md">
        <div className="space-y-5">
          <p className="text-sm text-slate-700 leading-relaxed">
            {t('acDeleteBody', { user: deleting?.userName || '' })}
          </p>
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
    </div>
  );
};
