import React, { useState } from 'react';
import {
  ChatCircleText,
  Bell,
  Funnel,
  CheckCircle,
  ArrowRight,
  Cpu,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../../store/useHrmsStore';
import { useI18n } from '../../i18n/useI18n';
import { PendingAction } from '../../types';

export const PendingActionCard: React.FC = () => {
  const { pendingActions, cronHistory, setActiveTab: navigateTab } = useHrmsStore();
  const { t, tLeaveType, tStatus } = useI18n();
  const [activeTab, setActiveTab] = useState<'tasks' | 'notifications'>('tasks');
  const [filterMode, setFilterMode] = useState<'all' | 'priority'>('all');

  const filteredActions =
    filterMode === 'priority'
      ? pendingActions.filter((a) => a.badgeType === 'warning')
      : pendingActions;

  const getLocalizedActionTitle = (action: PendingAction) => {
    if (action.actionKind === 'leave' && action.leaveType) {
      return `${t('reviewLeaveBtn')}: ${tLeaveType(action.leaveType)} (${action.daysCount || 1} ${t('gsDaysUnit')})`;
    }
    if (action.actionKind === 'correction') {
      return `${t('inspectLogBtn')} (${action.requestedCheckIn || ''} / ${action.requestedCheckOut || ''})`;
    }
    return action.title;
  };

  const getLocalizedBadge = (action: PendingAction) => {
    if (action.actionKind === 'correction') return t('disputePendingBadge');
    if (action.badgeText === 'Awaiting Decision') return t('awaitingDecisionBadge');
    return t('reviewRequiredBadge');
  };

  const getLocalizedButtonLabel = (action: PendingAction, isAttendance: boolean) => {
    if (isAttendance) return t('inspectLogBtn');
    if (action.actionKind === 'leave' || action.actionText?.toLowerCase().includes('leave')) {
      return t('reviewLeaveBtn');
    }
    return t('reviewApplication');
  };

  const getLocalizedJobTitle = (jobName: string) => {
    switch (jobName) {
      case 'DailyAttendanceSyncJob':
        return t('cronAttTitle');
      case 'ContractExpiryJob':
        return t('cronContractTitle');
      case 'MonthlyPayrollJob':
        return t('cronPayrollTitle');
      case 'WeeklyReportJob':
        return t('cronWeeklyTitle');
      default:
        return jobName;
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col h-full justify-between">
      {/* Header: Title and Streamlined Filter Pill */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            {t('pendingActionsTitle')}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">{t('pendingActionsSub')}</p>
        </div>

        <button
          type="button"
          onClick={() => setFilterMode((prev) => (prev === 'all' ? 'priority' : 'all'))}
          aria-label={filterMode === 'all' ? t('priorityOnly') : t('allItems')}
          title={filterMode === 'all' ? t('allItems') : t('priorityOnly')}
          className={`flex items-center gap-1.5 min-h-[32px] px-3 py-1 rounded-full text-[11px] font-semibold border transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer shrink-0 ${
            filterMode === 'priority'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Funnel weight={filterMode === 'priority' ? 'fill' : 'bold'} className="w-3 h-3 text-blue-500" />
          <span>{filterMode === 'priority' ? t('priorityOnly') : t('allItems')}</span>
        </button>
      </div>

      {/* Segmented Pill Tabs */}
      <div
        className="flex items-center gap-1 mb-3.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'tasks'}
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 flex items-center justify-center gap-1.5 min-h-[36px] py-1.5 rounded-lg text-xs transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer ${
            activeTab === 'tasks'
              ? 'bg-white text-blue-600 shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <ChatCircleText weight={activeTab === 'tasks' ? 'fill' : 'bold'} className="w-3.5 h-3.5" />
          <span>{t('activeTasksTab', { count: pendingActions.length })}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'notifications'}
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 flex items-center justify-center gap-1.5 min-h-[36px] py-1.5 rounded-lg text-xs transition-[transform,background-color,color,box-shadow] duration-150 active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer ${
            activeTab === 'notifications'
              ? 'bg-white text-blue-600 shadow-sm font-bold'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Bell weight={activeTab === 'notifications' ? 'fill' : 'bold'} className="w-3.5 h-3.5" />
          <span>{t('notificationsTab')}</span>
        </button>
      </div>

      {/* Action Items List */}
      <div className="space-y-3 flex-1 overflow-y-auto pr-0.5 max-h-[220px]">
        {activeTab === 'tasks' ? (
          filteredActions.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-2.5 shadow-xs">
                <CheckCircle weight="duotone" className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-slate-800">{t('allTasksCleared')}</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[230px] leading-relaxed">
                {filterMode === 'priority' ? t('noPriorityItems') : t('noPendingLeaves')}
              </p>
            </div>
          ) : (
            filteredActions.map((action, idx) => {
              const isFirst = idx === 0;
              const isAttendance =
                action.actionKind === 'correction' ||
                action.code.startsWith('HR-CORR') ||
                action.actionText?.toLowerCase().includes('log') ||
                action.actionText?.toLowerCase().includes('attendance') ||
                action.title.toLowerCase().includes('attendance');

              return (
                <div
                  key={action.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    isFirst
                      ? 'bg-blue-50/40 border-blue-200/90 shadow-xs'
                      : 'bg-white border-slate-200/80'
                  }`}
                >
                  {/* Code & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-blue-600 tracking-tight font-mono">
                      {action.code}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        action.badgeType === 'info'
                          ? 'bg-blue-50 text-blue-700 border-blue-200/60'
                          : 'bg-amber-50 text-amber-700 border-amber-200/60'
                      }`}
                    >
                      {getLocalizedBadge(action)}
                    </span>
                  </div>

                  {/* Employee & Title */}
                  <div className="mt-1.5 text-xs text-slate-800 font-medium">
                    <span className="font-semibold text-slate-900">
                      {getLocalizedActionTitle(action)}
                    </span>{' '}
                    — {action.employeeName}
                  </div>

                  {/* Timestamp */}
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {t('submittedLabel')}{' '}
                    {action.lastUpdated === 'Awaiting Action'
                      ? t('awaitingActionTime')
                      : action.lastUpdated === 'Just now'
                      ? t('justNow')
                      : action.lastUpdated}
                  </div>

                  {/* Action Trigger Button */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => navigateTab(isAttendance ? 'attendance' : 'leaves')}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-[0.96] text-white text-xs font-semibold transition-[transform,background-color] duration-100 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
                    >
                      <span>{getLocalizedButtonLabel(action, isAttendance)}</span>
                      <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )
        ) : cronHistory.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100/80 border border-slate-200/60 flex items-center justify-center text-slate-400 mb-2.5 shadow-xs">
              <CheckCircle weight="duotone" className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-700">{t('noUnreadNotifs')}</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[230px] leading-relaxed">
              {t('allTelemetryReviewed')}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cronHistory.slice(0, 3).map((job) => (
              <div
                key={job.id}
                className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Cpu weight="duotone" className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 truncate">{getLocalizedJobTitle(job.jobName)}</span>
                    <span className="text-[10px] font-mono text-slate-400">{job.durationMs}ms</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{job.message}</p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{job.executionTime}</span>
                    <span className="text-emerald-600 font-bold font-sans">
                      {tStatus(job.status)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
