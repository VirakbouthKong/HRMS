import React, { useState } from 'react';
import {
  CalendarBlank,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Suitcase,
  ArrowCounterClockwise,
  CircleNotch,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../store/useHrmsStore';
import { LeaveRequest } from '../types';
import { BehavioralHistorySelect } from '../components/ui/behavioral-history-select';
import { DatePicker } from '../components/ui/date-picker';
import { Modal } from '../components/ui/modal';
import { hasPermission } from '../utils/rbac';
import { useI18n } from '../i18n/useI18n';
import { MetricCard } from '../components/dashboard/MetricCard';
import {
  DashboardCard,
  EmptyState,
  InitialsAvatar,
  StatusChip,
  localeFor,
  parseDateKey,
  toDateKey,
} from '../components/dashboard/DashboardCard';
import { FilterTabs } from '../components/ui/filter-tabs';

export const LeavesPage: React.FC = () => {
  const { leaves, currentUser, submitLeaveRequest, updateLeaveStatus, cancelLeaveRequest } = useHrmsStore();
  const { t, tStatus, tLeaveType, language } = useI18n();

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmCancelLeave, setConfirmCancelLeave] = useState<LeaveRequest | null>(null);

  const canApprove = hasPermission(currentUser.role, 'LEAVE_APPROVE_REJECT');
  const [statusTab, setStatusTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>(
    canApprove ? 'PENDING' : 'ALL'
  );
  const [busyLeaveId, setBusyLeaveId] = useState<number | null>(null);
  const canViewAll = hasPermission(currentUser.role, 'LEAVE_VIEW_ALL');
  const myEmployeeId = currentUser.employeeId || 1;

  const displayedLeaves = canViewAll
    ? leaves
    : leaves.filter((l) => l.employeeId === myEmployeeId);

  const [formData, setFormData] = useState({
    leaveType: 'Casual Leave' as LeaveRequest['leaveType'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    daysCount: 1,
    reason: '',
  });

  const computeDays = (start: string, end: string): number | null => {
    if (!start || !end) return null;
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return null;
    return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.endDate < formData.startDate) {
      setFormError(t('invalidDateRangeErr'));
      return;
    }
    if (!formData.reason.trim()) {
      setFormError(t('reasonRequiredError'));
      document.getElementById('reasonInput')?.focus();
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const res = await submitLeaveRequest({
      employeeId: currentUser.employeeId || 1,
      employeeName: currentUser.fullName,
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      daysCount: Number(formData.daysCount),
      reason: formData.reason.trim(),
    });

    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || 'Failed to submit leave application.');
      return;
    }

    setIsApplyModalOpen(false);
    setFormData({
      leaveType: 'Casual Leave',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      daysCount: 1,
      reason: '',
    });
  };

  const handleStatusChange = async (leaveId: number, status: 'APPROVED' | 'REJECTED') => {
    setPageError(null);
    setBusyLeaveId(leaveId);
    const res = await updateLeaveStatus(leaveId, status);
    setBusyLeaveId(null);
    if (!res.success && res.error) {
      setPageError(res.error);
    }
  };

  const executeCancelLeave = async () => {
    if (!confirmCancelLeave) return;
    setPageError(null);
    const res = await cancelLeaveRequest(confirmCancelLeave.leaveId);
    if (!res.success && res.error) {
      setPageError(res.error);
    }
    setConfirmCancelLeave(null);
  };

  // --- Evergreen summary, tabs and "who's out" (all derived from real leave data) ---
  const statusOf = (l: LeaveRequest) => (l.status || '').toUpperCase();
  const todayKey = toDateKey(new Date());
  const monthPrefix = todayKey.substring(0, 7);
  const yearPrefix = todayKey.substring(0, 4);
  const locale = localeFor(language);
  const shortDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const fmtDate = (key?: string) => (key ? shortDate.format(parseDateKey(key)) : '—');
  const fmtRange = (start?: string, end?: string) =>
    !end || end === start ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(end)}`;
  const monthName = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date());

  const pendingLeaves = displayedLeaves.filter((l) => statusOf(l) === 'PENDING');
  const approvedLeaves = displayedLeaves.filter((l) => statusOf(l) === 'APPROVED');
  const declinedLeaves = displayedLeaves.filter((l) => statusOf(l) === 'REJECTED');
  const oldestPending = pendingLeaves
    .map((l) => l.appliedDate)
    .filter(Boolean)
    .sort()[0];
  const approvedThisMonth = approvedLeaves.filter((l) => (l.startDate || '').startsWith(monthPrefix));
  const daysThisMonth = approvedThisMonth.reduce((sum, l) => sum + (l.daysCount || 1), 0);
  const peopleThisMonth = new Set(approvedThisMonth.map((l) => l.employeeId)).size;
  const daysThisYear = approvedLeaves
    .filter((l) => (l.startDate || '').startsWith(yearPrefix))
    .reduce((sum, l) => sum + (l.daysCount || 1), 0);
  const overlaps = (l: LeaveRequest, from: string, to: string) =>
    !!l.startDate && l.startDate.substring(0, 10) <= to && (l.endDate || l.startDate).substring(0, 10) >= from;
  const outToday = approvedLeaves.filter((l) => overlaps(l, todayKey, todayKey));
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 6);
  const whoIsOut = displayedLeaves
    .filter((l) => ['APPROVED', 'PENDING'].includes(statusOf(l)) && overlaps(l, todayKey, toDateKey(weekEnd)))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 6);

  const tabLeaves =
    statusTab === 'ALL' ? displayedLeaves : displayedLeaves.filter((l) => statusOf(l) === statusTab);

  const statusChip = (l: LeaveRequest) => {
    const s = statusOf(l);
    const tone = s === 'APPROVED' ? 'ok' : s === 'REJECTED' ? 'bad' : s === 'PENDING' ? 'warn' : 'neutral';
    return <StatusChip tone={tone}>{s === 'CANCELLED' ? t('lvStatusCancelled') : tStatus(l.status)}</StatusChip>;
  };

  const smallBtn =
    'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:outline-none';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title={canViewAll ? t('lvKpiWaiting') : t('lvKpiMyWaiting')}
          icon={Clock}
          accent={pendingLeaves.length > 0 ? 'warn' : 'neutral'}
          value={pendingLeaves.length}
          subtitle={oldestPending ? t('lvKpiWaitingSub', { date: fmtDate(oldestPending) }) : t('lvKpiWaitingNone')}
        />
        <MetricCard title={t('lvKpiApproved')} icon={CheckCircle} value={approvedThisMonth.length} subtitle={monthName} />
        <MetricCard
          title={t('lvKpiDaysTaken')}
          icon={CalendarBlank}
          value={daysThisMonth}
          subtitle={t('lvKpiDaysTakenSub', { count: peopleThisMonth })}
        />
        {canViewAll ? (
          <MetricCard title={t('lvKpiOutToday')} icon={Suitcase} value={outToday.length} subtitle={t('lvKpiOutTodaySub')} />
        ) : (
          <MetricCard
            title={t('lvKpiYearDays')}
            icon={Suitcase}
            value={daysThisYear}
            subtitle={t('lvKpiYearDaysSub', { year: yearPrefix })}
          />
        )}
      </div>

      {pageError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-center justify-between animate-fadeIn"
        >
          <span>{pageError}</span>
          <button
            type="button"
            onClick={() => setPageError(null)}
            aria-label={t('closeDialog')}
            className="font-bold px-1.5 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* 2. Requests table + who's out */}
      <div className="flex flex-wrap gap-4 items-start">
        <div className="flex-[999_1_620px] min-w-0 flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <FilterTabs
              label={t('lvFilterLabel')}
              value={statusTab}
              onChange={setStatusTab}
              className="flex-1 min-w-[280px]"
              tabs={[
                { value: 'PENDING', label: t('lvTabWaiting'), count: pendingLeaves.length },
                { value: 'APPROVED', label: t('lvTabApproved'), count: approvedLeaves.length },
                { value: 'REJECTED', label: t('lvTabDeclined'), count: declinedLeaves.length },
                { value: 'ALL', label: t('lvTabAll'), count: displayedLeaves.length },
              ]}
            />
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setIsApplyModalOpen(true);
              }}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Plus weight="bold" className="w-4 h-4" />
              {t('lvRequestLeave')}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <th scope="col" className="py-3 px-5">{t('colEmployee')}</th>
                  <th scope="col" className="py-3 px-5">{t('colLeaveType')}</th>
                  <th scope="col" className="py-3 px-5">{t('lvColDates')}</th>
                  <th scope="col" className="py-3 px-5 text-right">{t('lvColLength')}</th>
                  <th scope="col" className="py-3 px-5">{t('colReason')}</th>
                  <th scope="col" className="py-3 px-5">{t('lvColApplied')}</th>
                  <th scope="col" className="py-3 px-5">{t('colStatus')}</th>
                  <th scope="col" className="py-3 px-5 text-right">
                    <span className="sr-only">{t('colActions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {tabLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 px-5 text-center text-slate-500">
                      {displayedLeaves.length === 0 ? t('noLeavesFound') : t('lvNoneInTab')}
                    </td>
                  </tr>
                ) : (
                  tabLeaves.map((leave) => {
                    const pending = statusOf(leave) === 'PENDING';
                    const busy = busyLeaveId === leave.leaveId;
                    return (
                      <tr key={leave.leaveId}>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <InitialsAvatar name={leave.employeeName} size="sm" employeeId={leave.employeeId} />
                            <span className="font-semibold text-slate-900">{leave.employeeName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-slate-800">{tLeaveType(leave.leaveType)}</td>
                        <td className="py-3.5 px-5 font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {fmtRange(leave.startDate, leave.endDate)}
                        </td>
                        <td className="py-3.5 px-5 text-right tabular-nums whitespace-nowrap">
                          {leave.daysCount === 1 ? t('dashOneDay') : t('dashDaysCount', { count: leave.daysCount })}
                        </td>
                        <td className="py-3.5 px-5 max-w-[220px] truncate text-slate-600" title={leave.reason}>
                          {leave.reason || '—'}
                        </td>
                        <td className="py-3.5 px-5 text-slate-500 tabular-nums whitespace-nowrap">
                          {fmtDate(leave.appliedDate)}
                        </td>
                        <td className="py-3.5 px-5">{statusChip(leave)}</td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          {canApprove ? (
                            pending ? (
                              <div className="inline-flex gap-1.5">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleStatusChange(leave.leaveId, 'REJECTED')}
                                  aria-label={t('dashDeclineAria', { name: leave.employeeName })}
                                  className={`${smallBtn} border border-slate-200 bg-white text-slate-800 hover:bg-slate-50`}
                                >
                                  {t('dashDecline')}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleStatusChange(leave.leaveId, 'APPROVED')}
                                  aria-label={t('dashApproveAria', { name: leave.employeeName })}
                                  className={`${smallBtn} bg-brand-600 text-white hover:bg-brand-700`}
                                >
                                  {busy && <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />}
                                  {t('dashApprove')}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[13px] text-slate-500">
                                {leave.approvedBy ? t('byApprover', { name: leave.approvedBy }) : t('completedText')}
                              </span>
                            )
                          ) : pending ? (
                            <button
                              type="button"
                              onClick={() => setConfirmCancelLeave(leave)}
                              className={`${smallBtn} border border-slate-200 bg-white text-slate-800 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200`}
                            >
                              <ArrowCounterClockwise weight="bold" className="w-3.5 h-3.5" />
                              {t('cancelBtn')}
                            </button>
                          ) : (
                            <span className="text-[13px] text-slate-500">{t('concludedText')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {canViewAll && (
          <DashboardCard title={t('lvOutTitle')} subtitle={t('lvOutSub')} className="flex-[1_1_280px]">
            {whoIsOut.length === 0 ? (
              <EmptyState>{t('lvOutEmpty')}</EmptyState>
            ) : (
              <ul className="flex flex-col gap-3">
                {whoIsOut.map((l) => (
                  <li key={l.leaveId} className="flex items-center gap-3">
                    <InitialsAvatar name={l.employeeName} size="sm" employeeId={l.employeeId} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">{l.employeeName}</div>
                      <div className="text-[13px] text-slate-500 truncate">
                        {fmtRange(l.startDate, l.endDate)} · {tLeaveType(l.leaveType)}
                      </div>
                    </div>
                    {statusOf(l) === 'PENDING' && <StatusChip tone="warn">{t('dashPendingChip')}</StatusChip>}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[13px] text-slate-500">{t('lvOutNote')}</p>
          </DashboardCard>
        )}
      </div>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title={t('applyLeaveModalTitle')}
        subtitle={t('applyLeaveModalSub')}
        maxWidth="md"
      >
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              {t('leaveTypeLabel')}
            </label>
            <BehavioralHistorySelect
              label={t('leaveTypeLabel')}
              options={[
                { value: 'Casual Leave', label: tLeaveType('Casual Leave') },
                { value: 'Sick Leave', label: tLeaveType('Sick Leave') },
                { value: 'Annual Leave', label: tLeaveType('Annual Leave') },
                { value: 'Maternity Leave', label: tLeaveType('Maternity Leave') },
                { value: 'Unpaid Leave', label: tLeaveType('Unpaid Leave') },
                { value: 'Privilege Leave', label: tLeaveType('Privilege Leave') },
              ]}
              value={formData.leaveType}
              onChange={(val) => setFormData({ ...formData, leaveType: val as any })}
              storageKey="hrms_leave_type_history"
              placeholder={t('chooseLeaveTypePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="startDateInput" className="block text-sm font-semibold text-slate-800 mb-1.5">
                {t('startDateLabel')}
              </label>
              <DatePicker
                id="startDateInput"
                value={formData.startDate}
                onChange={(val) => {
                  const nextEnd = formData.endDate < val ? val : formData.endDate;
                  const days = computeDays(val, nextEnd) ?? formData.daysCount;
                  setFormData({ ...formData, startDate: val, endDate: nextEnd, daysCount: days });
                  if (formError) setFormError(null);
                }}
                placeholder={t('pickStartDate')}
              />
            </div>
            <div>
              <label htmlFor="endDateInput" className="block text-sm font-semibold text-slate-800 mb-1.5">
                {t('endDateLabel')}
              </label>
              <DatePicker
                id="endDateInput"
                value={formData.endDate}
                onChange={(val) => {
                  const days = computeDays(formData.startDate, val) ?? formData.daysCount;
                  setFormData({ ...formData, endDate: val, daysCount: days });
                  if (formError) setFormError(null);
                }}
                placeholder={t('pickEndDate')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="daysCountInput" className="block text-sm font-semibold text-slate-800 mb-1.5">
              {t('daysCountLabel')}
            </label>
            <input
              id="daysCountInput"
              type="number"
              min="1"
              max="30"
              required
              value={formData.daysCount}
              onChange={(e) => setFormData({ ...formData, daysCount: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="reasonInput" className="block text-sm font-semibold text-slate-800 mb-1.5">
              {t('reasonAbsenceLabel')}
            </label>
            <textarea
              id="reasonInput"
              rows={3}
              placeholder={t('reasonAbsencePlaceholder')}
              value={formData.reason}
              onChange={(e) => {
                setFormData({ ...formData, reason: e.target.value });
                if (formError) setFormError(null);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:border-brand-500 transition-colors"
            />
          </div>

          {formError && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2"
            >
              <XCircle weight="fill" className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span className="font-medium">{formError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setIsApplyModalOpen(false);
              }}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 active:scale-[0.96] transition-transform duration-100 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 min-h-[40px] px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.96] text-white text-xs font-semibold shadow-sm transition-[transform,background-color] duration-100 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <span>{t('submitApplicationBtn')}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Cancel Leave Modal */}
      <Modal
        isOpen={Boolean(confirmCancelLeave)}
        onClose={() => setConfirmCancelLeave(null)}
        title={t('cancelLeaveConfirmBtn')}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('confirmCancelLeave')}
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setConfirmCancelLeave(null)}
              className="min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              {t('keepRequestBtn')}
            </button>
            <button
              type="button"
              onClick={executeCancelLeave}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
            >
              {t('cancelLeaveConfirmBtn')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
