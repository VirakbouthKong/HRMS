import React, { useState } from 'react';
import {
  CalendarBlank,
  Plus,
  Check,
  X,
  Clock,
  CheckCircle,
  XCircle,
  Sun,
  FirstAid,
  Suitcase,
  PlusCircle,
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

export const LeavesPage: React.FC = () => {
  const { leaves, currentUser, submitLeaveRequest, updateLeaveStatus, cancelLeaveRequest } = useHrmsStore();
  const { t, tStatus, tLeaveType } = useI18n();

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmCancelLeave, setConfirmCancelLeave] = useState<LeaveRequest | null>(null);

  const canApprove = hasPermission(currentUser.role, 'LEAVE_APPROVE_REJECT');
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
    const res = await updateLeaveStatus(leaveId, status);
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

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Leave Balances Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
              12<span className="text-sm font-normal text-slate-400">/14d</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sun weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {tLeaveType('Casual Leave')}
            </h3>
            <p className="text-[11px] text-emerald-600 mt-0.5 leading-tight font-medium">
              {t('casualLeaveDesc')}
            </p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
              08<span className="text-sm font-normal text-slate-400">/10d</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <FirstAid weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {tLeaveType('Sick Leave')}
            </h3>
            <p className="text-[11px] text-emerald-600 mt-0.5 leading-tight font-medium">
              {t('sickLeaveDesc')}
            </p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
              15<span className="text-sm font-normal text-slate-400">/18d</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Suitcase weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {tLeaveType('Annual Leave')}
            </h3>
            <p className="text-[11px] text-blue-600 mt-0.5 leading-tight font-medium">
              {t('privilegeLeaveDesc')}
            </p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              {t('requestTimeOffTitle')}
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <PlusCircle weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setIsApplyModalOpen(true);
              }}
              aria-label={t('applyForLeaveBtn')}
              className="w-full flex items-center justify-center gap-2 min-h-[40px] py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.96] text-white text-xs font-semibold shadow-sm transition-[transform,background-color] duration-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
            >
              <Plus weight="bold" className="w-4 h-4" />
              <span>{t('applyForLeaveBtn')}</span>
            </button>
          </div>
        </div>
      </div>

      {pageError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between animate-fadeIn"
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

      {/* 2. Leave Requests Table Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarBlank weight="duotone" className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                {canViewAll ? t('leaveQueueTitle') : t('myLeavesTitle')}
              </h2>
              <p className="text-[10px] text-slate-400">
                {canViewAll
                  ? t('leaveQueueSub')
                  : t('myLeavesSub', { name: currentUser.fullName })}
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400">
            {t('totalApplications', { count: displayedLeaves.length })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-6">{t('colEmployee')}</th>
                <th className="py-3 px-6">{t('colLeaveType')}</th>
                <th className="py-3 px-6">{t('colDuration')}</th>
                <th className="py-3 px-6">{t('colReason')}</th>
                <th className="py-3 px-6">{t('colAppliedDate')}</th>
                <th className="py-3 px-6">{t('colStatus')}</th>
                <th className="py-3 px-6 text-right">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {displayedLeaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-6 text-center text-slate-400">
                    {t('noLeavesFound')}
                  </td>
                </tr>
              ) : (
                displayedLeaves.map((leave) => (
                  <tr key={leave.leaveId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      {leave.employeeName}
                    </td>
                    <td className="py-3.5 px-6 font-medium text-blue-700">
                      {tLeaveType(leave.leaveType)}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-[11px] tabular-nums">
                      {leave.startDate} {t('gsTo')} {leave.endDate} ({leave.daysCount} {t('gsDaysUnit')})
                    </td>
                    <td className="py-3.5 px-6 max-w-xs truncate text-slate-600" title={leave.reason}>
                      {leave.reason}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-400 text-[11px] tabular-nums">
                      {leave.appliedDate}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                          leave.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : leave.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        }`}
                      >
                        {leave.status === 'APPROVED' && (
                          <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        {leave.status === 'REJECTED' && (
                          <XCircle weight="fill" className="w-3.5 h-3.5 text-rose-600" />
                        )}
                        {leave.status === 'PENDING' && (
                          <Clock weight="fill" className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <span>{tStatus(leave.status)}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      {canApprove ? (
                        leave.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(leave.leaveId, 'APPROVED')}
                              aria-label={`${t('notifApprove')} ${leave.employeeName}`}
                              className="min-w-[36px] min-h-[36px] p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-[0.96] transition-[transform,background-color] duration-100 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
                              title={t('approveLeaveTooltip')}
                            >
                              <Check weight="bold" className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(leave.leaveId, 'REJECTED')}
                              aria-label={`${t('notifReject')} ${leave.employeeName}`}
                              className="min-w-[36px] min-h-[36px] p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 active:scale-[0.96] transition-[transform,background-color] duration-100 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"
                              title={t('rejectLeaveTooltip')}
                            >
                              <X weight="bold" className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {leave.approvedBy
                              ? t('byApprover', { name: leave.approvedBy })
                              : t('completedText')}
                          </span>
                        )
                      ) : leave.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => setConfirmCancelLeave(leave)}
                          aria-label={t('cancelBtn')}
                          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 active:scale-[0.96] text-slate-600 text-[11px] font-semibold transition-[transform,background-color,color] duration-100 cursor-pointer"
                        >
                          <ArrowCounterClockwise weight="bold" className="w-3.5 h-3.5" />
                          <span>{t('cancelBtn')}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {leave.status === 'APPROVED' ? tStatus('APPROVED') : t('concludedText')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
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
              <label htmlFor="startDateInput" className="block text-[11px] font-semibold text-slate-600 mb-1">
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
              <label htmlFor="endDateInput" className="block text-[11px] font-semibold text-slate-600 mb-1">
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
            <label htmlFor="daysCountInput" className="block text-[11px] font-semibold text-slate-600 mb-1">
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
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="reasonInput" className="block text-[11px] font-semibold text-slate-600 mb-1">
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
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-colors"
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
              className="inline-flex items-center gap-2 min-h-[40px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.96] text-white text-xs font-semibold shadow-sm transition-[transform,background-color] duration-100 disabled:opacity-60 cursor-pointer"
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
