import React, { useState, useEffect } from 'react';
import {
  Clock,
  SignIn,
  SignOut,
  CalendarCheck,
  WarningCircle,
  CheckCircle,
  UserCheck,
  ClockCountdown,
  ShieldCheck,
  PencilSimple,
  CircleNotch,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../store/useHrmsStore';
import { hasPermission } from '../utils/rbac';
import { AttendanceRecord } from '../types';
import { Modal, Drawer } from '../components/ui/modal';
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
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState(false);
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
  const isManager = currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'ROLE_HR';
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

  const presentCount = canViewAll
    ? attendance.filter((a) => isStatus(a.status, 'PRESENT')).length
    : displayedAttendance.filter((a) => isStatus(a.status, 'PRESENT')).length;

  const lateCount = canViewAll
    ? attendance.filter((a) => isStatus(a.status, 'LATE')).length
    : displayedAttendance.filter((a) => isStatus(a.status, 'LATE')).length;

  const onLeaveCount = canViewAll
    ? attendance.filter((a) => isStatus(a.status, 'ON_LEAVE')).length
    : displayedAttendance.filter((a) => isStatus(a.status, 'ON_LEAVE')).length;

  const totalOtHours = canViewAll
    ? attendance.reduce((sum, a) => sum + (a.otHours || 0), 0)
    : displayedAttendance.reduce((sum, a) => sum + (a.otHours || 0), 0);

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

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Punch Station Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
              <Clock weight="fill" className="w-4 h-4" />
              <span>{t('punchStationTitle')}</span>
            </div>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums">
              {currentTime.toLocaleTimeString(language === 'kh' ? 'km-KH' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {currentTime.toLocaleDateString(language === 'kh' ? 'km-KH' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              <span className="ml-2 text-slate-400">| {t('standardWorkdayNote')}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCheckIn}
              disabled={isCheckedIn || isPunching}
              aria-label={t('checkInNow')}
              className={`flex items-center gap-2 min-h-[42px] px-5 py-2.5 rounded-xl text-xs font-bold transition-[transform,background-color,color] duration-150 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                isCheckedIn
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white shadow-blue-500/20 cursor-pointer'
              }`}
            >
              {isPunching && !isCheckedIn ? (
                <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
              ) : isCheckedIn ? (
                <>
                  <CheckCircle weight="fill" className="w-4 h-4 text-emerald-600" />
                  <span>{t('checkedInAt', { time: myRecordToday?.checkIn || '' })}</span>
                </>
              ) : (
                <>
                  <SignIn weight="bold" className="w-4 h-4" />
                  <span>{t('checkInNow')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCheckOut}
              disabled={!isCheckedIn || isCheckedOut || isPunching}
              aria-label={t('checkOut')}
              className={`flex items-center gap-2 min-h-[42px] px-5 py-2.5 rounded-xl text-xs font-bold transition-[transform,background-color,color] duration-150 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                isCheckedOut || !isCheckedIn
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 active:scale-[0.97] text-white cursor-pointer'
              }`}
            >
              <SignOut weight="bold" className="w-4 h-4" />
              <span>
                {isCheckedOut
                  ? t('checkedOutAt', { time: myRecordToday?.checkOut || '' })
                  : t('checkOut')}
              </span>
            </button>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 animate-fadeIn"
          >
            <WarningCircle weight="fill" className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Current Punch State Banner */}
        {myRecordToday && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
            <span className="font-semibold text-slate-700">{t('todaysStatus')}</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold ${
                myRecordToday.status === 'PRESENT'
                  ? 'bg-emerald-50 text-emerald-600'
                  : myRecordToday.status === 'LATE'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              {tStatus(myRecordToday.status)}
            </span>
            {myRecordToday.lateMinutes > 0 && (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <WarningCircle weight="bold" className="w-3.5 h-3.5" />
                {t('lateByMinutes', { mins: myRecordToday.lateMinutes })}
              </span>
            )}
            {myRecordToday.otHours > 0 && (
              <span className="text-blue-600 font-medium">
                {t('overtimeHours', { hrs: myRecordToday.otHours })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Attendance Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[118px]">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
              {presentCount}
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <UserCheck weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {canViewAll ? t('attPresentToday') : t('attMyDaysPresent')}
            </h3>
            <p className="text-[11px] text-emerald-600 mt-0.5 leading-tight font-medium">
              {canViewAll ? t('attCheckedInWorkforce') : t('attPersonalOnTime')}
            </p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[118px]">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
              {lateCount}
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <WarningCircle weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {canViewAll ? t('attLateArrivals') : t('attMyLateArrivals')}
            </h3>
            <p className="text-[11px] text-amber-600 mt-0.5 leading-tight font-medium">
              {canViewAll ? t('attGraceExceeded') : t('attPastThreshold')}
            </p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[118px]">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
              {onLeaveCount}
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CalendarCheck weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {canViewAll ? t('attApprovedLeave') : t('attMyLeavesTaken')}
            </h3>
            <p className="text-[11px] text-cyan-600 mt-0.5 leading-tight font-medium">
              {canViewAll ? t('attPlannedAbsence') : t('attExcusedTimeOff')}
            </p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[118px]">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
              {totalOtHours}h
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <ClockCountdown weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {canViewAll ? t('attOvertimeHours') : t('attMyOvertime')}
            </h3>
            <p className="text-[11px] text-purple-600 mt-0.5 leading-tight font-medium">
              {canViewAll ? t('attLoggedExcess') : t('attEligibleOt')}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Attendance Daily Logs Table */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarCheck weight="duotone" className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                {canViewAll ? t('attDailyRecords') : t('attMyHistory')}
              </h2>
              <p className="text-[10px] text-slate-400">
                {canViewAll
                  ? t('attFullAuditLog')
                  : t('attViewingRecordsFor', { name: currentUser.fullName })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isManager && (
              <button
                type="button"
                onClick={() => setIsQueueDrawerOpen(true)}
                className="flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold active:scale-[0.98] transition-[transform,background-color] cursor-pointer"
              >
                <ShieldCheck weight="bold" className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('correctionsQueue')}</span>
                {pendingCorrections.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono">
                    {pendingCorrections.length}
                  </span>
                )}
              </button>
            )}

            {canRequestCorrection && (
              <button
                type="button"
                onClick={() => {
                  const target = displayedAttendance[0] || null;
                  setTargetRecordForCorrection(target);
                  setCorrectionError(null);
                  setIsCorrectionModalOpen(true);
                }}
                disabled={displayedAttendance.length === 0}
                className="flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none disabled:opacity-50 cursor-pointer"
              >
                <PencilSimple weight="bold" className="w-3.5 h-3.5" />
                <span>{t('requestCorrection')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 mx-6 mt-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between animate-fadeIn"
          >
            <div className="flex items-center gap-2">
              <CheckCircle weight="fill" className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-medium">{toastMessage}</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-600">{t('auditSynchronized')}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-6">{t('colEmployee')}</th>
                <th className="py-3 px-6">{t('colDate')}</th>
                <th className="py-3 px-6">{t('colCheckIn')}</th>
                <th className="py-3 px-6">{t('colCheckOut')}</th>
                <th className="py-3 px-6">{t('colLateMinutes')}</th>
                <th className="py-3 px-6">{t('colOtHours')}</th>
                <th className="py-3 px-6">{t('colStatus')}</th>
                {canRequestCorrection && <th className="py-3 px-6 text-right">{t('colAction')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {displayedAttendance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 px-6 text-center text-slate-400">
                    {t('noAttendanceRows')}
                  </td>
                </tr>
              ) : (
                displayedAttendance.map((rec) => (
                  <tr key={rec.attendanceId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      {rec.employeeName}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-slate-500 text-[11px] tabular-nums">
                      {rec.attendanceDate}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-medium text-slate-800 tabular-nums">
                      {rec.checkIn || '—'}
                    </td>
                    <td className="py-3.5 px-6 font-mono font-medium text-slate-800 tabular-nums">
                      {rec.checkOut || '—'}
                    </td>
                    <td className="py-3.5 px-6">
                      {rec.lateMinutes > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold border border-amber-200/60">
                          +{rec.lateMinutes} {t('minsUnit')}
                        </span>
                      ) : (
                        <span className="text-slate-400">{t('onTimeText')}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 font-mono tabular-nums">
                      {rec.otHours > 0 ? `${rec.otHours} ${t('hrsUnit')}` : '0'}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                          rec.status === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : rec.status === 'LATE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            : rec.status === 'ON_LEAVE'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        }`}
                      >
                        {tStatus(rec.status)}
                      </span>
                    </td>
                    {canRequestCorrection && (
                      <td className="py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setTargetRecordForCorrection(rec);
                            setReqCheckIn(rec.checkIn || '08:00');
                            setReqCheckOut(rec.checkOut || '17:00');
                            setReqReason('');
                            setCorrectionError(null);
                            setIsCorrectionModalOpen(true);
                          }}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline active:scale-[0.98] cursor-pointer"
                        >
                          {t('disputeBtn')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {t('currentPunchPrefix', {
                inTime: targetRecordForCorrection?.checkIn || '—',
                outTime: targetRecordForCorrection?.checkOut || '—',
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="corrCheckIn" className="block text-xs font-semibold text-slate-700 mb-1">
                {t('correctedCheckInLabel')}
              </label>
              <input
                id="corrCheckIn"
                type="text"
                value={reqCheckIn}
                onChange={(e) => setReqCheckIn(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm sm:text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="corrCheckOut" className="block text-xs font-semibold text-slate-700 mb-1">
                {t('correctedCheckOutLabel')}
              </label>
              <input
                id="corrCheckOut"
                type="text"
                value={reqCheckOut}
                onChange={(e) => setReqCheckOut(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm sm:text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="corrReason" className="block text-xs font-semibold text-slate-700 mb-1">
              {t('reasonAdjustmentLabel')}
            </label>
            <textarea
              id="corrReason"
              value={reqReason}
              onChange={(e) => setReqReason(e.target.value)}
              rows={2}
              required
              className="w-full px-3 py-2 text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500"
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
              className="inline-flex items-center gap-2 min-h-[38px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold active:scale-[0.98] transition-[transform,background-color] disabled:opacity-60 cursor-pointer"
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

      {/* DRAWER: Manager Corrections Review Queue */}
      <Drawer
        isOpen={isQueueDrawerOpen}
        onClose={() => setIsQueueDrawerOpen(false)}
        title={t('drawerQueueTitle')}
        subtitle={t('drawerQueueSub')}
        width="md"
      >
        <div className="space-y-4">
          <div className="space-y-3 max-h-[65vh] overflow-y-auto">
            {attendanceCorrections.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {t('noCorrectionRequests')}
              </div>
            ) : (
              attendanceCorrections.map((corr) => (
                <div
                  key={corr.correctionId}
                  className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900">
                      {corr.employeeName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        corr.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : corr.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {tStatus(corr.status)}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono">
                    {t('requestedInOut', {
                      date: corr.attendanceDate,
                      inTime: corr.requestedCheckIn,
                      outTime: corr.requestedCheckOut,
                    })}
                  </div>

                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 italic">
                    "{corr.reason}"
                  </p>

                  {corr.status === 'PENDING' && isManager && (
                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => reviewAttendanceCorrection(corr.correctionId, 'REJECTED')}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                      >
                        {t('notifReject')}
                      </button>
                      <button
                        type="button"
                        onClick={() => reviewAttendanceCorrection(corr.correctionId, 'APPROVED')}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs active:scale-[0.98] cursor-pointer"
                      >
                        {t('approveAndOverwrite')}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => setIsQueueDrawerOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              {t('closeQueue')}
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};
