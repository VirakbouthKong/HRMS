import React, { useState, useMemo } from 'react';
import {
  CurrencyDollar,
  Play,
  FileText,
  Printer,
  CheckCircle,
  Clock,
  Receipt,
  GearSix,
  Wallet,
  ShieldCheck,
  WarningCircle,
  CircleNotch,
  Check,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../store/useHrmsStore';
import { PayrollRecord } from '../types';
import { BehavioralHistorySelect } from '../components/ui/behavioral-history-select';
import { Modal } from '../components/ui/modal';
import { hasPermission } from '../utils/rbac';
import { useI18n } from '../i18n/useI18n';
import { getMonthLabel } from '../i18n/translations';
import { payrollApi } from '../api';
import { MetricCard } from '../components/dashboard/MetricCard';
import { DashboardCard, InitialsAvatar, StatusChip } from '../components/dashboard/DashboardCard';
import { FilterTabs } from '../components/ui/filter-tabs';

export const PayrollPage: React.FC = () => {
  const {
    payroll,
    employees,
    fetchPayrollByPeriod,
    generateMonthlyPayroll,
    savePayrollProfile,
    markPayrollPaid,
    currentUser,
  } = useHrmsStore();
  const { t, tStatus, language } = useI18n();

  const currentYear = new Date().getFullYear();
  const currentMonthStr = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [viewingPayslip, setViewingPayslip] = useState<PayrollRecord | null>(null);

  // Salary Setup Modal State (PayrollProfile)
  const [isSalarySetupOpen, setIsSalarySetupOpen] = useState(false);
  const [profileEmpId, setProfileEmpId] = useState<number>(1);
  const [profileBaseSalary, setProfileBaseSalary] = useState<number>(2800);
  const [profilePenaltyPerMin, setProfilePenaltyPerMin] = useState<number>(0.26);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [salaryModalError, setSalaryModalError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [payTab, setPayTab] = useState<'ALL' | PayrollRecord['status']>('ALL');
  const [busyRecordId, setBusyRecordId] = useState<number | null>(null);

  const canViewAll = hasPermission(currentUser.role, 'PAYROLL_VIEW_ALL');
  const canMarkPaid = hasPermission(currentUser.role, 'PAYROLL_MARK_PAID');
  const myEmployeeId = currentUser.employeeId || 1;

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, idx) => {
        const ym = `${currentYear}-${String(idx + 1).padStart(2, '0')}`;
        return {
          value: ym,
          label: getMonthLabel(idx, currentYear, language, true),
        };
      }),
    [currentYear, language]
  );

  const displayedPayroll = canViewAll
    ? payroll
    : payroll.filter((p) => p.employeeId === myEmployeeId);


  const myLatestSlip = displayedPayroll[0];
  const myNetSalary = myLatestSlip?.netSalary || 0;
  const myAllowances = myLatestSlip?.allowances || 0;
  const myTax = myLatestSlip ? myLatestSlip.taxDeductions + myLatestSlip.lateDeductions : 0;

  const handlePeriodChange = async (ym: string) => {
    setSelectedMonth(ym);
    setErrorMessage(null);
    if (canViewAll) {
      const res = await fetchPayrollByPeriod(ym);
      if (!res.success && res.error) {
        setErrorMessage(res.error);
      }
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    const res = await generateMonthlyPayroll(selectedMonth);
    setIsGenerating(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to generate monthly payroll.');
      return;
    }

    setToastMessage(t('payrollBatchToast', { period: selectedMonth }));
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadEmployeeProfile = (empId: number, fallbackSalary: number) => {
    setProfileBaseSalary(fallbackSalary);
    setProfilePenaltyPerMin(Number((fallbackSalary / 22 / 480).toFixed(2)));
    payrollApi
      .getProfile(empId)
      .then((profile) => {
        if (profile && typeof profile.baseSalary === 'number') {
          setProfileBaseSalary(profile.baseSalary);
          setProfilePenaltyPerMin(
            typeof profile.latePenaltyPerMinute === 'number'
              ? profile.latePenaltyPerMinute
              : Number((profile.baseSalary / 22 / 480).toFixed(2))
          );
        }
      })
      .catch(() => {
        // No profile saved yet — keep fallback
      });
  };

  const handleOpenSalarySetup = () => {
    const targetEmp = employees.find((e) => e.employeeId === profileEmpId) || employees[0];
    if (targetEmp) {
      setProfileEmpId(targetEmp.employeeId);
      loadEmployeeProfile(targetEmp.employeeId, targetEmp.salary || 2500);
    }
    setSalaryModalError(null);
    setIsSalarySetupOpen(true);
  };

  const handleSaveSalaryProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setSalaryModalError(null);

    const base = Number(profileBaseSalary);
    const res = await savePayrollProfile(profileEmpId, {
      baseSalary: base,
      dailyRate: Number((base / 22).toFixed(2)),
      latePenaltyPerMinute: Number(profilePenaltyPerMin),
    });

    setIsSavingProfile(false);

    if (!res.success) {
      setSalaryModalError(res.error || 'Failed to save compensation profile.');
      return;
    }

    setIsSalarySetupOpen(false);
    setToastMessage(
      t('salaryProfileUpdatedToast', { id: profileEmpId, salary: profileBaseSalary })
    );
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- Evergreen run overview (derived from the payslips loaded for the selected period) ---
  const money = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n || 0);
  const [selYear, selMonthNum] = selectedMonth.split('-').map(Number);
  const periodLabel = getMonthLabel((selMonthNum || 1) - 1, selYear || currentYear, language);

  const countBy = (status: PayrollRecord['status']) => displayedPayroll.filter((p) => p.status === status).length;
  const pendingCount = countBy('PENDING');
  const processedCount = countBy('PROCESSED');
  const paidCount = countBy('PAID');
  const generated = displayedPayroll.length > 0;
  const steps = [
    { label: t('prStepGenerated'), done: generated },
    { label: t('prStepProcessed'), done: generated && pendingCount === 0 },
    { label: t('prStepPaid'), done: generated && paidCount === displayedPayroll.length },
  ];
  const currentStep = steps.findIndex((s) => !s.done);
  const runChip = !generated ? (
    <StatusChip tone="neutral">{t('prStatusNotStarted')}</StatusChip>
  ) : currentStep === -1 ? (
    <StatusChip tone="ok">{t('prStatusDone')}</StatusChip>
  ) : (
    <StatusChip tone="warn">{t('prStatusInProgress')}</StatusChip>
  );
  const sum = (pick: (p: PayrollRecord) => number) => displayedPayroll.reduce((acc, p) => acc + (pick(p) || 0), 0);
  const totals = [
    { label: t('prTotalBase'), value: money(sum((p) => p.baseSalary)) },
    { label: t('prTotalAllowances'), value: `+${money(sum((p) => p.allowances))}` },
    { label: t('prTotalLate'), value: `−${money(sum((p) => p.lateDeductions))}` },
    { label: t('prTotalTax'), value: `−${money(sum((p) => p.taxDeductions))}` },
    { label: t('prTotalNet'), value: money(sum((p) => p.netSalary)), strong: true },
  ];

  const tabRows = payTab === 'ALL' ? displayedPayroll : displayedPayroll.filter((p) => p.status === payTab);
  const statusChip = (status: PayrollRecord['status']) => (
    <StatusChip tone={status === 'PAID' ? 'ok' : status === 'PROCESSED' ? 'info' : 'warn'}>{tStatus(status)}</StatusChip>
  );

  const handleMarkPaid = async (p: PayrollRecord) => {
    setErrorMessage(null);
    setBusyRecordId(p.recordId);
    const result = await markPayrollPaid(p.recordId);
    setBusyRecordId(null);
    if (!result.success) setErrorMessage(result.error || 'Failed to mark payroll paid.');
  };

  const secondaryBtn =
    'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-sm font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none';
  const smallBtn =
    'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:outline-none';

  return (
    <div className="space-y-6 pb-12">
      {canViewAll ? (
        <>
          {/* 1. Toolbar: period, pay rules, run */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <BehavioralHistorySelect
              label={t('prPeriodLabel')}
              options={monthOptions}
              value={selectedMonth}
              onChange={handlePeriodChange}
              storageKey="hrms_payroll_period_history"
              selectWidth="170px"
              placeholder={t('colPeriod')}
            />
            <button type="button" onClick={handleOpenSalarySetup} className={secondaryBtn}>
              <GearSix weight="bold" className="w-4 h-4" />
              {t('prPayRules')}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {isGenerating ? (
                <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
              ) : (
                <Play weight="fill" className="w-4 h-4" />
              )}
              {t('runPayroll')}
            </button>
          </div>

          {/* 2. Run overview */}
          <DashboardCard
            title={t('prRunTitle', { period: periodLabel })}
            subtitle={generated ? t('prRunSub', { count: displayedPayroll.length }) : t('prNotGeneratedHint')}
            action={runChip}
          >
            <ol className="flex flex-wrap gap-2">
              {steps.map((step, i) => {
                const isCurrent = i === currentStep;
                return (
                  <li
                    key={step.label}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`flex-[1_1_180px] flex items-center gap-2.5 px-3 py-2.5 rounded-lg ${
                      isCurrent ? 'bg-brand-50' : 'bg-slate-50'
                    }`}
                  >
                    {step.done ? (
                      <span className="w-6 h-6 rounded-full bg-brand-600 text-white inline-flex items-center justify-center shrink-0">
                        <Check weight="bold" className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span
                        className={`w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 text-xs font-bold ${
                          isCurrent ? 'border-2 border-brand-600 text-brand-700' : 'border border-slate-300 text-slate-500'
                        }`}
                      >
                        {i + 1}
                      </span>
                    )}
                    <span
                      className={`text-sm ${step.done || isCurrent ? 'font-semibold text-slate-900' : 'font-medium text-slate-500'}`}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
            <dl className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
              {totals.map((item) => (
                <div
                  key={item.label}
                  className={`px-3.5 py-3 rounded-lg ${item.strong ? 'bg-slate-50 border border-slate-200' : ''}`}
                >
                  <dt className="text-[13px] text-slate-500">{item.label}</dt>
                  <dd
                    className={`mt-1 font-heading font-semibold text-slate-900 tabular-nums ${
                      item.strong ? 'text-2xl' : 'text-xl'
                    }`}
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </DashboardCard>
        </>
      ) : (
        /* Employee: personal summary */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title={t('myMonthlyNetPayout')}
            icon={Wallet}
            accent="brand"
            value={money(myNetSalary)}
            subtitle={myLatestSlip ? t('prLatestSlip', { period: myLatestSlip.periodMonth }) : t('prNoSlipYet')}
          />
          <MetricCard
            title={t('monthlyAllowances')}
            icon={Receipt}
            value={`+${money(myAllowances)}`}
            subtitle={t('transportMealSubsidy')}
          />
          <MetricCard
            title={t('taxAndDeductions')}
            icon={ShieldCheck}
            value={`−${money(myTax)}`}
            subtitle={t('statutoryTaxWithheld')}
          />
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-center gap-2 animate-fadeIn"
        >
          <WarningCircle weight="fill" className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* 3. Payslips */}
      <div className="flex flex-col gap-4">
        <FilterTabs
          label={t('prFilterLabel')}
          value={payTab}
          onChange={setPayTab}
          tabs={[
            { value: 'ALL', label: t('lvTabAll'), count: displayedPayroll.length },
            { value: 'PENDING', label: t('prTabPending'), count: pendingCount },
            { value: 'PROCESSED', label: t('prTabProcessed'), count: processedCount },
            { value: 'PAID', label: t('prTabPaid'), count: paidCount },
          ]}
        />

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <th scope="col" className="py-3 px-5">{t('colEmployee')}</th>
                <th scope="col" className="py-3 px-5">{canViewAll ? t('colDepartment') : t('colPeriod')}</th>
                <th scope="col" className="py-3 px-5 text-right">{t('colBaseSalary')}</th>
                <th scope="col" className="py-3 px-5 text-right">{t('colAllowances')}</th>
                <th scope="col" className="py-3 px-5 text-right">{t('prTotalLate')}</th>
                <th scope="col" className="py-3 px-5 text-right">{t('prColTax')}</th>
                <th scope="col" className="py-3 px-5 text-right">{t('prColNet')}</th>
                <th scope="col" className="py-3 px-5">{t('colStatus')}</th>
                <th scope="col" className="py-3 px-5 text-right">
                  <span className="sr-only">{t('colActions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700 tabular-nums">
              {tabRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 px-5 text-center text-slate-500">
                    {displayedPayroll.length === 0 ? t('noPayrollRows') : t('prNoneInTab')}
                  </td>
                </tr>
              ) : (
                tabRows.map((p) => (
                  <tr key={p.recordId}>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <InitialsAvatar name={p.employeeName} size="sm" employeeId={p.employeeId} />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">{p.employeeName}</div>
                          {p.jobTitle && <div className="text-[13px] text-slate-500">{p.jobTitle}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">
                      {canViewAll ? p.departmentName || '—' : p.periodMonth}
                    </td>
                    <td className="py-3.5 px-5 text-right">{money(p.baseSalary)}</td>
                    <td className="py-3.5 px-5 text-right text-emerald-700">+{money(p.allowances)}</td>
                    <td className="py-3.5 px-5 text-right">
                      {p.lateDeductions ? (
                        <span className="text-rose-700">−{money(p.lateDeductions)}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">−{money(p.taxDeductions)}</td>
                    <td className="py-3.5 px-5 text-right font-bold text-slate-900">{money(p.netSalary)}</td>
                    <td className="py-3.5 px-5">{statusChip(p.status)}</td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingPayslip(p)}
                          aria-label={`${t('payslipBtn')} ${p.employeeName}`}
                          className={`${smallBtn} border border-slate-200 bg-white text-slate-800 hover:bg-slate-50`}
                        >
                          <FileText weight="bold" className="w-3.5 h-3.5" />
                          {t('payslipBtn')}
                        </button>
                        {canMarkPaid && p.status !== 'PAID' && (
                          <button
                            type="button"
                            disabled={busyRecordId === p.recordId}
                            onClick={() => handleMarkPaid(p)}
                            aria-label={`${t('markPaidBtn')} ${p.employeeName}`}
                            className={`${smallBtn} bg-brand-600 text-white hover:bg-brand-700`}
                          >
                            {busyRecordId === p.recordId && <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />}
                            {t('markPaidBtn')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Official Printable Payslip Modal */}
      <Modal
        isOpen={!!viewingPayslip}
        onClose={() => setViewingPayslip(null)}
        title={t('officialPayslipTitle')}
        subtitle={t('officialPayslipSub')}
        maxWidth="lg"
      >
        {viewingPayslip && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
              <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-base font-bold text-slate-900">BigBoss Corp.</h4>
                  <p className="text-xs text-slate-400">{t('payrollAdminService')}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-brand-600">
                    {viewingPayslip.periodMonth}
                  </span>
                  <p className="text-xs text-slate-400">{t('confidentialPayAdvice')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">{t('colEmployee')}: </span>
                  <span className="font-bold text-slate-800">{viewingPayslip.employeeName}</span>
                </div>
                <div>
                  <span className="text-slate-400">{t('designationLabel')} </span>
                  <span className="font-semibold text-slate-700">
                    {viewingPayslip.jobTitle || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">{t('colDepartment')}: </span>
                  <span className="font-medium text-slate-700">
                    {viewingPayslip.departmentName || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">{t('colStatus')}: </span>
                  <span className="font-bold text-emerald-700">
                    {tStatus(viewingPayslip.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
                <div className="space-y-1.5">
                  <h5 className="font-semibold text-xs text-slate-400">
                    {t('earningsLabel')}
                  </h5>
                  <div className="flex justify-between text-slate-600">
                    <span>{t('baseSalaryColon')}</span>
                    <span className="font-mono font-semibold tabular-nums">
                      ${viewingPayslip.baseSalary}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{t('allowancesColon')}</span>
                    <span className="font-mono text-emerald-700 tabular-nums">
                      +${viewingPayslip.allowances}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h5 className="font-semibold text-xs text-slate-400">
                    {t('deductionsLabel')}
                  </h5>
                  <div className="flex justify-between text-slate-600">
                    <span>{t('taxWithheldColon')}</span>
                    <span className="font-mono text-rose-500 tabular-nums">
                      -${viewingPayslip.taxDeductions}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{t('latePenaltiesColon')}</span>
                    <span className="font-mono text-rose-500 tabular-nums">
                      -${viewingPayslip.lateDeductions}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-brand-50/80 border border-brand-100 flex items-center justify-between">
                <span className="text-xs font-bold text-brand-900">{t('totalNetSalaryPaid')}</span>
                <span className="font-heading text-lg font-semibold font-mono text-brand-700 tabular-nums">
                  ${viewingPayslip.netSalary.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">{t('generatedByBigBoss')}</span>
              <button
                type="button"
                onClick={() => window.print()}
                aria-label={t('printPayslip')}
                className="flex items-center gap-1.5 min-h-[38px] px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none cursor-pointer"
              >
                <Printer weight="bold" className="w-4 h-4" />
                <span>{t('printPayslip')}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white text-xs shadow-xl flex items-center gap-3 animate-fadeIn"
        >
          <CheckCircle weight="fill" className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODAL: Compensation & Salary Profile Setup */}
      <Modal
        isOpen={isSalarySetupOpen}
        onClose={() => setIsSalarySetupOpen(false)}
        title={t('compRulesTitle')}
        subtitle={t('compRulesSub')}
        maxWidth="md"
      >
        <form onSubmit={handleSaveSalaryProfile} className="space-y-3.5">
          {salaryModalError && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2"
            >
              <WarningCircle weight="fill" className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{salaryModalError}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              {t('targetEmployeeLabel')}
            </label>
            <BehavioralHistorySelect
              placeholder={t('selectEmployeePlaceholder')}
              options={employees.map((emp) => ({
                value: emp.employeeId,
                label: `${emp.firstName} ${emp.lastName} (#${emp.employeeId}) • ${emp.departmentName}`,
              }))}
              value={profileEmpId}
              onChange={(val) => {
                const id = Number(val);
                setProfileEmpId(id);
                const emp = employees.find((x) => x.employeeId === id);
                loadEmployeeProfile(id, emp?.salary || 2500);
              }}
              storageKey="hrms_payroll_employee_profile_history"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="profBaseSalary" className="block text-sm font-semibold text-slate-800 mb-1.5">
                {t('monthlyBaseSalaryLabel')}
              </label>
              <input
                id="profBaseSalary"
                type="number"
                value={profileBaseSalary}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setProfileBaseSalary(val);
                  setProfilePenaltyPerMin(Number((val / 22 / 480).toFixed(2)));
                }}
                required
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                {t('dailyRateLabel')}
              </label>
              <div className="w-full px-3 py-2 text-xs font-mono bg-slate-100 rounded-xl text-slate-600 tabular-nums">
                ${(profileBaseSalary / 22).toFixed(2)}{t('perDayUnit')}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="profLatePenalty" className="block text-sm font-semibold text-slate-800 mb-1.5">
              {t('latePenaltyRateLabel')}
            </label>
            <input
              id="profLatePenalty"
              type="number"
              step="0.01"
              value={profilePenaltyPerMin}
              onChange={(e) => setProfilePenaltyPerMin(Number(e.target.value))}
              required
              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
            />
            <span className="text-xs text-slate-400 mt-1 block">
              {t('latePenaltyFormula')}
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsSalarySetupOpen(false)}
              className="min-h-[38px] px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex items-center gap-2 min-h-[38px] px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold active:scale-[0.98] transition-[transform,background-color] disabled:opacity-60 cursor-pointer"
            >
              {isSavingProfile ? (
                <>
                  <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <span>{t('saveSalaryProfile')}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
