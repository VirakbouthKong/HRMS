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
} from '@phosphor-icons/react';
import { useHrmsStore } from '../store/useHrmsStore';
import { PayrollRecord } from '../types';
import { BehavioralHistorySelect } from '../components/ui/behavioral-history-select';
import { Modal } from '../components/ui/modal';
import { hasPermission } from '../utils/rbac';
import { useI18n } from '../i18n/useI18n';
import { getMonthLabel } from '../i18n/translations';
import { payrollApi } from '../api';

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

  const totalPayrollExpense = payroll.reduce((sum, p) => sum + p.netSalary, 0);
  const totalTax = payroll.reduce((sum, p) => sum + p.taxDeductions, 0);

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

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Summary Cards & Generator Action */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {canViewAll ? (
          <>
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
                  ${totalPayrollExpense.toLocaleString()}
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <CurrencyDollar weight="fill" className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
                  {t('totalMonthlyPayout')}
                </h3>
                <p className="text-[11px] text-emerald-600 mt-0.5 leading-tight font-medium">
                  {t('calculatedNetComp')}
                </p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
                  ${totalTax.toLocaleString()}
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Receipt weight="fill" className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
                  {t('withholdingTaxTotal')}
                </h3>
                <p className="text-[11px] text-blue-600 mt-0.5 leading-tight font-medium">
                  {t('taxComplianceWithholding')}
                </p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold text-slate-800 tracking-tight">
                  {t('batchPayrollProcessing')}
                </span>
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <GearSix weight="fill" className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <BehavioralHistorySelect
                  label={t('colPeriod')}
                  options={monthOptions}
                  value={selectedMonth}
                  onChange={handlePeriodChange}
                  storageKey="hrms_payroll_period_history"
                  selectWidth="140px"
                  placeholder={t('colPeriod')}
                />
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  aria-label={t('runPayroll')}
                  className="flex-1 flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.97] text-white text-xs font-bold shadow-sm transition-[transform,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  {isGenerating ? (
                    <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play weight="fill" className="w-3.5 h-3.5" />
                  )}
                  <span>{t('runPayroll')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenSalarySetup}
                  aria-label={t('compRulesTitle')}
                  title={t('compRulesTitle')}
                  className="min-w-[38px] min-h-[38px] p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <GearSix weight="bold" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
                  ${myNetSalary.toLocaleString()}
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Wallet weight="fill" className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
                  {t('myMonthlyNetPayout')}
                </h3>
                <p className="text-[11px] text-emerald-600 mt-0.5 leading-tight font-medium">
                  {t('directDeposited')}
                </p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
                  +${myAllowances.toLocaleString()}
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Receipt weight="fill" className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
                  {t('monthlyAllowances')}
                </h3>
                <p className="text-[11px] text-blue-600 mt-0.5 leading-tight font-medium">
                  {t('transportMealSubsidy')}
                </p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
                  -${myTax.toLocaleString()}
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <ShieldCheck weight="fill" className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
                  {t('taxAndDeductions')}
                </h3>
                <p className="text-[11px] text-purple-600 mt-0.5 leading-tight font-medium">
                  {t('statutoryTaxWithheld')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 animate-fadeIn"
        >
          <WarningCircle weight="fill" className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* 2. Payroll Records Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CurrencyDollar weight="duotone" className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                {canViewAll ? t('payrollRecordsTitle') : t('myCompensationTitle')}
              </h2>
              <p className="text-[10px] text-slate-400">
                {canViewAll
                  ? t('allSalaryDistributions')
                  : t('personalPayrollAdvice', { name: currentUser.fullName })}
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {canViewAll ? t('periodPrefix', { period: selectedMonth }) : `#${myEmployeeId}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-6">{t('colEmployee')}</th>
                <th className="py-3 px-6">{t('colDepartment')}</th>
                <th className="py-3 px-6">{t('colPeriod')}</th>
                <th className="py-3 px-6">{t('colBaseSalary')}</th>
                <th className="py-3 px-6">{t('colAllowances')}</th>
                <th className="py-3 px-6">{t('colDeductions')}</th>
                <th className="py-3 px-6">{t('colNetSalary')}</th>
                <th className="py-3 px-6">{t('colStatus')}</th>
                <th className="py-3 px-6 text-right">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {displayedPayroll.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 px-6 text-center text-slate-400">
                    {t('noPayrollRows')}
                  </td>
                </tr>
              ) : (
                displayedPayroll.map((p) => (
                  <tr key={p.recordId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      <div>{p.employeeName}</div>
                      {p.jobTitle && (
                        <div className="text-[11px] text-slate-400 font-normal">{p.jobTitle}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-6 font-medium text-slate-600">
                      {p.departmentName || '—'}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500 tabular-nums">
                      {p.periodMonth}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-medium tabular-nums">
                      ${p.baseSalary.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-emerald-600 tabular-nums">
                      +${p.allowances}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-rose-500 tabular-nums">
                      -${(p.lateDeductions + p.taxDeductions).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900 tabular-nums">
                      ${p.netSalary.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                          p.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                        }`}
                      >
                        {p.status === 'PAID' ? (
                          <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Clock weight="fill" className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>{tStatus(p.status)}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingPayslip(p)}
                          aria-label={`${t('payslipBtn')} ${p.employeeName}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
                        >
                          <FileText weight="bold" className="w-3.5 h-3.5 text-blue-600" />
                          <span>{t('payslipBtn')}</span>
                        </button>

                        {canMarkPaid && p.status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => markPayrollPaid(p.recordId)}
                            aria-label={`${t('markPaidBtn')} ${p.employeeName}`}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
                          >
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
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-base font-bold text-slate-900">BigBoss Corp.</h4>
                  <p className="text-[11px] text-slate-400">{t('payrollAdminService')}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-blue-600">
                    {viewingPayslip.periodMonth}
                  </span>
                  <p className="text-[10px] text-slate-400">{t('confidentialPayAdvice')}</p>
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
                  <span className="font-bold text-emerald-600">
                    {tStatus(viewingPayslip.status)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
                <div className="space-y-1.5">
                  <h5 className="font-bold uppercase text-[10px] tracking-wider text-slate-400">
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
                    <span className="font-mono text-emerald-600 tabular-nums">
                      +${viewingPayslip.allowances}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h5 className="font-bold uppercase text-[10px] tracking-wider text-slate-400">
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

              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">{t('totalNetSalaryPaid')}</span>
                <span className="text-lg font-extrabold font-mono text-blue-700 tabular-nums">
                  ${viewingPayslip.netSalary.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">{t('generatedByBigBoss')}</span>
              <button
                type="button"
                onClick={() => window.print()}
                aria-label={t('printPayslip')}
                className="flex items-center gap-1.5 min-h-[38px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
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
              <label htmlFor="profBaseSalary" className="block text-xs font-semibold text-slate-700 mb-1">
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
                className="w-full px-3 py-2 text-sm sm:text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('dailyRateLabel')}
              </label>
              <div className="w-full px-3 py-2 text-xs font-mono bg-slate-100 rounded-xl text-slate-600 tabular-nums">
                ${(profileBaseSalary / 22).toFixed(2)}{t('perDayUnit')}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="profLatePenalty" className="block text-xs font-semibold text-slate-700 mb-1">
              {t('latePenaltyRateLabel')}
            </label>
            <input
              id="profLatePenalty"
              type="number"
              step="0.01"
              value={profilePenaltyPerMin}
              onChange={(e) => setProfilePenaltyPerMin(Number(e.target.value))}
              required
              className="w-full px-3 py-2 text-sm sm:text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
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
              className="inline-flex items-center gap-2 min-h-[38px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold active:scale-[0.98] transition-[transform,background-color] disabled:opacity-60 cursor-pointer"
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
