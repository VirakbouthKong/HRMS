import React, { useState } from 'react';
import { ArrowRight, CircleNotch } from '@phosphor-icons/react';
import { useHrmsStore } from '../../store/useHrmsStore';
import { useI18n } from '../../i18n/useI18n';
import { hasPermission } from '../../utils/rbac';
import { PendingAction } from '../../types';
import { DashboardCard, EmptyState, InitialsAvatar, StatusChip, localeFor, parseDateKey } from './DashboardCard';

const MAX_ITEMS = 5;

export const ReviewQueueCard: React.FC = () => {
  const {
    pendingActions,
    leaves,
    attendanceCorrections,
    currentUser,
    updateLeaveStatus,
    reviewAttendanceCorrection,
    setActiveTab,
  } = useHrmsStore();
  const { t, tLeaveType, language } = useI18n();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canDecideLeave = hasPermission(currentUser.role, 'LEAVE_APPROVE_REJECT');
  const canDecideCorrection = hasPermission(currentUser.role, 'ATTENDANCE_CORRECTION_APPROVE');
  const isReviewer = canDecideLeave || canDecideCorrection;

  const dateFmt = new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'short' });
  const fmt = (key?: string) => (key ? dateFmt.format(parseDateKey(key)) : '');

  const describe = (action: PendingAction) => {
    if (action.actionKind === 'correction') {
      const c = attendanceCorrections.find((x) => `corr-${x.correctionId}` === action.id);
      return {
        type: t('dashCorrection'),
        detail: t('dashCorrectionDetail', {
          date: fmt(c?.attendanceDate),
          checkIn: (c?.requestedCheckIn || action.requestedCheckIn || '—').substring(0, 5),
          checkOut: (c?.requestedCheckOut || action.requestedCheckOut || '—').substring(0, 5),
        }),
      };
    }
    const leave = leaves.find((l) => `leave-${l.leaveId}` === action.id);
    const days = leave?.daysCount ?? action.daysCount ?? 1;
    const range =
      leave?.startDate && leave.endDate && leave.endDate !== leave.startDate
        ? `${fmt(leave.startDate)} – ${fmt(leave.endDate)}`
        : fmt(leave?.startDate);
    return {
      type: tLeaveType(leave?.leaveType || action.leaveType),
      detail: [range, days === 1 ? t('dashOneDay') : t('dashDaysCount', { count: days })].filter(Boolean).join(' · '),
    };
  };

  const canDecide = (action: PendingAction) =>
    action.actionKind === 'correction' ? canDecideCorrection : canDecideLeave;

  const decide = async (action: PendingAction, approve: boolean) => {
    setBusyId(action.id);
    setError(null);
    const id = Number(action.id.replace(/^\D+-/, ''));
    const status = approve ? 'APPROVED' : 'REJECTED';
    const result =
      action.actionKind === 'correction'
        ? await reviewAttendanceCorrection(id, status)
        : await updateLeaveStatus(id, status);
    if (!result.success) setError(result.error || t('dashActionFailed'));
    setBusyId(null);
  };

  const shown = pendingActions.slice(0, MAX_ITEMS);
  const hidden = pendingActions.length - shown.length;
  const btnBase =
    'inline-flex items-center justify-center h-9 px-3 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:outline-none';

  return (
    <DashboardCard
      title={isReviewer ? t('dashReviewTitle') : t('dashKpiMyPending')}
      subtitle={isReviewer ? t('dashReviewSub', { count: pendingActions.length }) : t('dashMyRequestsSub')}
    >
      {error && (
        <p role="alert" className="px-3 py-2 rounded-lg bg-rose-50 text-[13px] text-rose-800">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <EmptyState>{t('dashReviewEmpty')}</EmptyState>
      ) : (
        <ul className="flex flex-col -mt-1">
          {shown.map((action) => {
            const { type, detail } = describe(action);
            const busy = busyId === action.id;
            return (
              <li key={action.id} className="flex flex-wrap items-center gap-3 py-3 border-t border-slate-100 first:border-0">
                <InitialsAvatar name={action.employeeName} />
                <div className="flex-1 min-w-[160px]">
                  <div className="text-sm font-semibold text-slate-900">
                    {action.employeeName} <span className="font-medium text-slate-600">· {type}</span>
                  </div>
                  <div className="text-[13px] text-slate-500 mt-0.5">{detail}</div>
                </div>
                {canDecide(action) ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => decide(action, false)}
                      aria-label={t('dashDeclineAria', { name: action.employeeName })}
                      className={`${btnBase} border border-slate-200 bg-white text-slate-800 hover:bg-slate-50`}
                    >
                      {t('dashDecline')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => decide(action, true)}
                      aria-label={t('dashApproveAria', { name: action.employeeName })}
                      className={`${btnBase} gap-1.5 bg-brand-600 text-white hover:bg-brand-700`}
                    >
                      {busy && <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />}
                      {t('dashApprove')}
                    </button>
                  </div>
                ) : (
                  <StatusChip tone="warn">{t('dashPendingChip')}</StatusChip>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('leaves')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800 rounded focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none cursor-pointer"
        >
          {t('dashSeeAllRequests')}
          <ArrowRight weight="bold" className="w-3.5 h-3.5" />
        </button>
        {hidden > 0 && <span className="text-[13px] text-slate-500">{t('dashMoreRequests', { count: hidden })}</span>}
      </div>
    </DashboardCard>
  );
};
