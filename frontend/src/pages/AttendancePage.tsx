import React, { useState, useEffect } from 'react';
import {
  Clock,
  SignIn,
  SignOut,
  WarningCircle,
  CheckCircle,
  PencilSimple,
  CircleNotch,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../store/useHrmsStore';
import { hasPermission } from '../utils/rbac';
import { AttendanceRecord } from '../types';
import { Modal } from '../components/ui/modal';
import {
  DashboardCard,
  EmptyState,
  InitialsAvatar,
  StatusChip,
  localeFor,
  parseDateKey,
} from '../components/dashboard/DashboardCard';
import { FilterTabs } from '../components/ui/filter-tabs';
import { attendanceApi } from '../api';
import { useI18n } from '../i18n/useI18n';

export const AttendancePage: React.FC = () => {
  const {
    attendance,
    currentUser,
    checkInToday,
    checkOutToday,
    attendanceCorrections,
    requestAttendanceCorrection,
    reviewAttendanceCorrection,
  } = useHrmsStore();
  const { t, tStatus, language } = useI18n();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modal / Drawer state
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [view, setView] = useState<'log' | 'corrections'>('log');
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);
  const [busyCorrectionId, setBusyCorrectionId] = useState<number | null>(null);
  const [targetRecordForCorrection, setTargetRecordForCorrection] = useState<AttendanceRecord | null>(null);

  // Form State
  const [reqCheckIn, setReqCheckIn] = useState('08:00');
  const [reqCheckOut, setReqCheckOut] = useState('17:00');
  const [reqReason, setReqReason] = useState('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPunching, setIsPunching] = useState(false);

  const canViewAll = hasPermission(currentUser.role, 'ATTENDANCE_VIEW_ALL');
  const canRequestCorrection = hasPermission(currentUser.role, 'ATTENDANCE_CORRECTION_REQUEST');
  const myEmployeeId = currentUser.employeeId || 1;

  const pendingCorrections = attendanceCorrections.filter((c) => c.status === 'PENDING');

  // Live Clock effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;
  const myRecordToday = attendance.find(
    (a) => a.employeeId === myEmployeeId && a.attendanceDate === todayStr
  );

  const isCheckedIn = Boolean(myRecordToday?.checkIn);
  const isCheckedOut = Boolean(myRecordToday?.checkOut);

  const displayedAttendance = canViewAll
    ? attendance
    : attendance.filter((a) => a.employeeId === myEmployeeId);

  const isStatus = (status: string | undefined, target: string) =>
    status?.toUpperCase().replace(/\s+/g, '_') === target;

  const handleCheckIn = async () => {
    setIsPunching(true);
    setErrorMessage(null);
    const res = await checkInToday(currentUser.employeeId || 1);
    setIsPunching(false);
    if (!res.success && res.error) {
      setErrorMessage(res.error);
    }
  };

  const handleCheckOut = async () => {
    setIsPunching(true);
    setErrorMessage(null);
    const res = await checkOutToday(currentUser.employeeId || 1);
    setIsPunching(false);
    if (!res.success && res.error) {
      setErrorMessage(res.error);
    }
  };

  // --- Evergreen layout helpers (all figures derived from real attendance records) ---
  const locale = localeFor(language);
  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const shortFmt = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  const canReviewCorrections = hasPermission(currentUser.role, 'ATTENDANCE_CORRECTION_APPROVE');

  // Days that have records, newest first; HR/admin browse one day at a time.
  const availableDays = Array.from(new Set(attendance.map((a) => (a.attendanceDate || '').substring(0, 10)).filter(Boolean)))
    .sort()
    .reverse();
  const activeDay = selectedDay && availableDays.includes(selectedDay)
    ? selectedDay
    : availableDays.includes(todayStr)
    ? todayStr
    : availableDays[0];
  const dayIndex = availableDays.indexOf(activeDay);

  const dayRecords = attendance
    .filter((a) => (a.attendanceDate || '').startsWith(activeDay || '#'))
    .sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || ''));
  const monthPrefix = todayStr.substring(0, 7);
  const myMonthRecords = displayedAttendance.filter((a) => (a.attendanceDate || '').startsWith(monthPrefix));
  const tableRows = canViewAll
    ? dayRecords
    : [...displayedAttendance].sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate));

  const countStatus = (rows: AttendanceRecord[], s: string) => rows.filter((a) => isStatus(a.status, s)).length;
  const dayLate = dayRecords.filter((a) => isStatus(a.status, 'LATE'));
  const avgLate = dayLate.length
    ? Math.round(dayLate.reduce((sum, a) => sum + (a.lateMinutes || 0), 0) / dayLate.length)
    : 0;
  const monthName = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(currentTime);

  const toMinutes = (hhmm?: string | null) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const worked = (rec: AttendanceRecord) => {
    const a = toMinutes(rec.checkIn);
    const b = toMinutes(rec.checkOut);
    if (a === null || b === null || b < a) return null;
    return t('atDurationHm', { h: Math.floor((b - a) / 60), m: String((b - a) % 60).padStart(2, '0') });
  };

  const recordTone = (status?: string) =>
    isStatus(status, 'PRESENT') ? 'ok' : isStatus(status, 'LATE') ? 'warn' : isStatus(status, 'ON_LEAVE') ? 'info' : 'bad';
  const correctionTone = (status: string) => (status === 'APPROVED' ? 'ok' : status === 'REJECTED' ? 'bad' : 'warn');

  const openCorrection = (rec: AttendanceRecord | null) => {
    setTargetRecordForCorrection(rec);
    setReqCheckIn(rec?.checkIn || '08:00');
    setReqCheckOut(rec?.checkOut || '17:00');
    setReqReason('');
    setCorrectionError(null);
    setIsCorrectionModalOpen(true);
    if (!rec) return;
    // Refresh the record (GET /api/attendance/{id}): the request is based on its current times,
    // and the server refuses approval if they changed after the request was filed.
    const hhmm = (v?: string | null) => (v ? (v.includes('T') ? v.split('T')[1] : v).substring(0, 5) : null);
    attendanceApi
      .getById(rec.attendanceId)
      .then((raw: any) => {
        if (!raw || raw.attendanceId !== rec.attendanceId) return;
        const fresh = { ...rec, checkIn: hhmm(raw.checkIn), checkOut: hhmm(raw.checkOut), status: raw.status ?? rec.status };
        setTargetRecordForCorrection(fresh);
        setReqCheckIn(fresh.checkIn || '08:00');
        setReqCheckOut(fresh.checkOut || '17:00');
      })
      .catch(() => {});
  };

  const reviewCorrection = async (correctionId: number, status: 'APPROVED' | 'REJECTED') => {
    setErrorMessage(null);
    setBusyCorrectionId(correctionId);
    const result = await reviewAttendanceCorrection(correctionId, status);
    setBusyCorrectionId(null);
    if (!result.success) setErrorMessage(result.error || 'Failed to review correction.');
  };

  const sortedCorrections = [...attendanceCorrections].sort((a, b) =>
    a.status === b.status ? (b.requestedAt || '').localeCompare(a.requestedAt || '') : a.status === 'PENDING' ? -1 : b.status === 'PENDING' ? 1 : 0
  );

  const StatTile = ({ label, value, sub, swatch }: { label: string; value: React.ReactNode; sub: string; swatch: string }) => (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-col gap-1.5 min-w-0">
      <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-600">
        <span aria-hidden="true" className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: swatch }} />
        {label}
      </span>
      <span className="font-heading text-[28px] leading-tight font-semibold text-slate-900 tabular-nums">{value}</span>
      <span className="text-[13px] text-slate-500">{sub}</span>
    </div>
  );

  const smallBtn =
    'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:outline-none';
  const iconBtn =
    'w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none';
  const dash = <span className="text-slate-500">—</span>;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Check-in card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-brand-700 mb-1">
              <Clock weight="fill" className="w-4 h-4" />
              <span>{t('punchStationTitle')}</span>
            </div>
            <div className="font-heading text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {currentTime.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {currentTime.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              <span className="ml-2">· {t('standardWorkdayNote')}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={isCheckedIn || isPunching}
              className={`inline-flex items-center gap-2 h-11 px-5 rounded-lg text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none ${
                isCheckedIn
                  ? 'bg-brand-50 text-brand-800 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 text-white cursor-pointer disabled:opacity-60'
              }`}
            >
              {isPunching && !isCheckedIn ? (
                <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
              ) : isCheckedIn ? (
                <CheckCircle weight="fill" className="w-4 h-4" />
              ) : (
                <SignIn weight="bold" className="w-4 h-4" />
              )}
              <span>{isCheckedIn ? t('checkedInAt', { time: myRecordToday?.checkIn || '' }) : t('checkInNow')}</span>
            </button>

            <button
              type="button"
              onClick={handleCheckOut}
              disabled={!isCheckedIn || isCheckedOut || isPunching}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-sm font-semibold transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
            >
              <SignOut weight="bold" className="w-4 h-4" />
              <span>
                {isCheckedOut ? t('checkedOutAt', { time: myRecordToday?.checkOut || '' }) : t('checkOut')}
              </span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-center gap-2 animate-fadeIn"
          >
            <WarningCircle weight="fill" className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {myRecordToday && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-slate-700">{t('todaysStatus')}</span>
            <StatusChip tone={recordTone(myRecordToday.status)}>{tStatus(myRecordToday.status)}</StatusChip>
            {myRecordToday.lateMinutes > 0 && (
              <span className="text-amber-800 font-medium">{t('lateByMinutes', { mins: myRecordToday.lateMinutes })}</span>
            )}
            {myRecordToday.otHours > 0 && (
              <span className="text-brand-700 font-medium">{t('overtimeHours', { hrs: myRecordToday.otHours })}</span>
            )}
          </div>
        )}
      </div>

      {/* 2. Summary: selected day (HR/admin) or this month (employee) */}
      {canViewAll ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              aria-label={t('atPrevDay')}
              disabled={dayIndex < 0 || dayIndex >= availableDays.length - 1}
              onClick={() => setSelectedDay(availableDays[dayIndex + 1])}
              className={iconBtn}
            >
              <CaretLeft weight="bold" className="w-4 h-4" />
            </button>
            <label className="flex items-center">
              <span className="sr-only">{t('atDayLabel')}</span>
              <select
                value={activeDay || ''}
                onChange={(e) => setSelectedDay(e.target.value)}
                disabled={availableDays.length === 0}
                className="h-10 min-w-[200px] px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-900 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
              >
                {availableDays.map((d) => (
                  <option key={d} value={d}>
                    {dayFmt.format(parseDateKey(d))}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              aria-label={t('atNextDay')}
              disabled={dayIndex <= 0}
              onClick={() => setSelectedDay(availableDays[dayIndex - 1])}
              className={iconBtn}
            >
              <CaretRight weight="bold" className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatTile label={t('atPresent')} value={countStatus(dayRecords, 'PRESENT')} sub={t('atPresentSub')} swatch="#0B7A62" />
            <StatTile
              label={t('dashLate')}
              value={dayLate.length}
              sub={dayLate.length ? t('atLateSub', { mins: avgLate }) : t('atLateNone')}
              swatch="#C46A00"
            />
            <StatTile label={t('dashOnLeave')} value={countStatus(dayRecords, 'ON_LEAVE')} sub={t('atOnLeaveSub')} swatch="#6250D6" />
            <StatTile label={t('dashAbsent')} value={countStatus(dayRecords, 'ABSENT')} sub={t('atAbsentSub')} swatch="#C2405A" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatTile
            label={t('atMonthPresent')}
            value={countStatus(myMonthRecords, 'PRESENT') + countStatus(myMonthRecords, 'LATE')}
            sub={monthName}
            swatch="#0B7A62"
          />
          <StatTile label={t('atMonthLate')} value={countStatus(myMonthRecords, 'LATE')} sub={monthName} swatch="#C46A00" />
          <StatTile label={t('atMonthLeave')} value={countStatus(myMonthRecords, 'ON_LEAVE')} sub={monthName} swatch="#6250D6" />
          <StatTile
            label={t('atMonthOt')}
            value={t('atHoursShort', { hrs: myMonthRecords.reduce((s, a) => s + (a.otHours || 0), 0) })}
            sub={monthName}
            swatch="#46524C"
          />
        </div>
      )}

      {/* 3. Log / corrections */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FilterTabs
            label={t('atTabsLabel')}
            value={view}
            onChange={setView}
            className="flex-1 min-w-[260px]"
            tabs={[
              { value: 'log', label: canViewAll ? t('atTabLog') : t('atTabMyLog') },
              { value: 'corrections', label: t('atTabCorrections'), count: pendingCorrections.length },
            ]}
          />
          {canRequestCorrection && view === 'log' && (
            <button
              type="button"
              onClick={() => openCorrection(tableRows[0] || null)}
              disabled={tableRows.length === 0}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
            >
              <PencilSimple weight="bold" className="w-4 h-4" />
              {t('requestCorrection')}
            </button>
          )}
        </div>

        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-lg bg-brand-50 border border-brand-200 text-sm text-brand-800 flex items-center gap-2 animate-fadeIn"
          >
            <CheckCircle weight="fill" className="w-4 h-4 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        {view === 'log' ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full min-w-[880px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <th scope="col" className="py-3 px-5">{canViewAll ? t('colEmployee') : t('colDate')}</th>
                  <th scope="col" className="py-3 px-5 text-right">{t('colCheckIn')}</th>
                  <th scope="col" className="py-3 px-5 text-right">{t('colCheckOut')}</th>
                  <th scope="col" className="py-3 px-5 text-right">{t('atColWorked')}</th>
                  <th scope="col" className="py-3 px-5 text-right">{t('dashLate')}</th>
                  <th scope="col" className="py-3 px-5 text-right">{t('atMonthOt')}</th>
                  <th scope="col" className="py-3 px-5">{t('colStatus')}</th>
                  {canRequestCorrection && (
                    <th scope="col" className="py-3 px-5 text-right">
                      <span className="sr-only">{t('colAction')}</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700 tabular-nums">
                {tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 px-5 text-center text-slate-500">
                      {t('noAttendanceRows')}
                    </td>
                  </tr>
                ) : (
                  tableRows.map((rec) => {
                    const isToday = rec.attendanceDate === todayStr;
                    return (
                      <tr key={rec.attendanceId}>
                        <td className="py-3.5 px-5">
                          {canViewAll ? (
                            <div className="flex items-center gap-3">
                              <InitialsAvatar name={rec.employeeName} size="sm" employeeId={rec.employeeId} />
                              <span className="font-semibold text-slate-900">{rec.employeeName}</span>
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-900 whitespace-nowrap">
                              {shortFmt.format(parseDateKey(rec.attendanceDate))}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right text-slate-900">{rec.checkIn || dash}</td>
                        <td className="py-3.5 px-5 text-right text-slate-900">
                          {rec.checkOut || (rec.checkIn && isToday ? <span className="text-slate-500">{t('atStillIn')}</span> : dash)}
                        </td>
                        <td className="py-3.5 px-5 text-right">{worked(rec) || dash}</td>
                        <td className="py-3.5 px-5 text-right">
                          {rec.lateMinutes > 0 ? (
                            <span className="font-semibold text-amber-800">{t('atMinutesShort', { mins: rec.lateMinutes })}</span>
                          ) : (
                            dash
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          {rec.otHours > 0 ? t('atHoursShort', { hrs: rec.otHours }) : dash}
                        </td>
                        <td className="py-3.5 px-5">
                          <StatusChip tone={recordTone(rec.status)}>{tStatus(rec.status)}</StatusChip>
                        </td>
                        {canRequestCorrection && (
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => openCorrection(rec)}
                              aria-label={`${t('atRequestFix')} — ${rec.employeeName}, ${rec.attendanceDate}`}
                              className={`${smallBtn} text-brand-700 hover:bg-brand-50`}
                            >
                              <PencilSimple weight="bold" className="w-3.5 h-3.5" />
                              {t('atRequestFix')}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <DashboardCard title={t('atTabCorrections')} subtitle={t('atCorrSub')}>
            {sortedCorrections.length === 0 ? (
              <EmptyState>{t('noCorrectionRequests')}</EmptyState>
            ) : (
              <ul className="flex flex-col -mt-1">
                {sortedCorrections.map((corr) => {
                  const busy = busyCorrectionId === corr.correctionId;
                  return (
                    <li
                      key={corr.correctionId}
                      className="flex flex-wrap items-center gap-3 py-3.5 border-t border-slate-100 first:border-0"
                    >
                      <InitialsAvatar name={corr.employeeName} employeeId={corr.employeeId} />
                      <div className="flex-1 min-w-[240px]">
                        <div className="text-sm font-semibold text-slate-900">
                          {corr.employeeName}{' '}
                          <span className="font-medium text-slate-500">
                            · {corr.attendanceDate ? shortFmt.format(parseDateKey(corr.attendanceDate)) : ''}
                          </span>
                        </div>
                        <div className="text-[13px] text-slate-700 mt-0.5 tabular-nums">
                          {t('atCorrCheckIn', {
                            from: (corr.originalCheckIn || '—').substring(0, 5),
                            to: (corr.requestedCheckIn || '—').substring(0, 5),
                          })}
                          {' · '}
                          {t('atCorrCheckOut', {
                            from: (corr.originalCheckOut || '—').substring(0, 5),
                            to: (corr.requestedCheckOut || '—').substring(0, 5),
                          })}
                        </div>
                        {corr.reason && <div className="text-[13px] text-slate-500 mt-0.5">“{corr.reason}”</div>}
                      </div>
                      {corr.status === 'PENDING' && canReviewCorrections ? (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => reviewCorrection(corr.correctionId, 'REJECTED')}
                            aria-label={t('atRejectAria', { name: corr.employeeName })}
                            className={`${smallBtn} border border-slate-200 bg-white text-slate-800 hover:bg-slate-50`}
                          >
                            {t('notifReject')}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => reviewCorrection(corr.correctionId, 'APPROVED')}
                            aria-label={t('atApproveAria', { name: corr.employeeName })}
                            className={`${smallBtn} bg-brand-600 text-white hover:bg-brand-700`}
                          >
                            {busy && <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />}
                            {t('dashApprove')}
                          </button>
                        </div>
                      ) : (
                        <StatusChip tone={correctionTone(corr.status)}>{tStatus(corr.status)}</StatusChip>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </DashboardCard>
        )}
      </div>

      {/* MODAL: Request Punch Correction */}
      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title={t('modalCorrectionTitle')}
        subtitle={t('modalCorrectionSub')}
        maxWidth="md"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!targetRecordForCorrection) return;

            setIsSubmittingCorrection(true);
            setCorrectionError(null);
            const res = await requestAttendanceCorrection({
              attendanceId: targetRecordForCorrection.attendanceId,
              employeeId: targetRecordForCorrection.employeeId,
              employeeName: targetRecordForCorrection.employeeName,
              attendanceDate: targetRecordForCorrection.attendanceDate,
              originalCheckIn: targetRecordForCorrection.checkIn,
              originalCheckOut: targetRecordForCorrection.checkOut,
              requestedCheckIn: reqCheckIn,
              requestedCheckOut: reqCheckOut,
              reason: reqReason,
            });
            setIsSubmittingCorrection(false);

            if (!res.success && res.error) {
              setCorrectionError(res.error);
              return;
            }

            setIsCorrectionModalOpen(false);
            setToastMessage(t('correctionSubmittedToast'));
            setTimeout(() => setToastMessage(null), 4000);
          }}
          className="space-y-3.5"
        >
          {correctionError && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2"
            >
              <WarningCircle weight="fill" className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{correctionError}</span>
            </div>
          )}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <div className="font-semibold text-slate-800">
              {targetRecordForCorrection?.employeeName} • {targetRecordForCorrection?.attendanceDate}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-mono">
              {t('currentPunchPrefix', {
                inTime: targetRecordForCorrection?.checkIn || '—',
                outTime: targetRecordForCorrection?.checkOut || '—',
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="corrCheckIn" className="block text-sm font-semibold text-slate-800 mb-1.5">
                {t('correctedCheckInLabel')}
              </label>
              <input
                id="corrCheckIn"
                type="text"
                value={reqCheckIn}
                onChange={(e) => setReqCheckIn(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:border-brand-500"
              />
            </div>
            <div>
              <label htmlFor="corrCheckOut" className="block text-sm font-semibold text-slate-800 mb-1.5">
                {t('correctedCheckOutLabel')}
              </label>
              <input
                id="corrCheckOut"
                type="text"
                value={reqCheckOut}
                onChange={(e) => setReqCheckOut(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="corrReason" className="block text-sm font-semibold text-slate-800 mb-1.5">
              {t('reasonAdjustmentLabel')}
            </label>
            <textarea
              id="corrReason"
              value={reqReason}
              onChange={(e) => setReqReason(e.target.value)}
              rows={2}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:border-brand-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCorrectionModalOpen(false)}
              className="min-h-[38px] px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmittingCorrection}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {isSubmittingCorrection ? (
                <>
                  <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <span>{t('submitRequestBtn')}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
