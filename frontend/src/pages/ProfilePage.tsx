import React, { useState, useRef } from 'react';
import {
  Envelope,
  IdentificationCard,
  Buildings,
  ShieldCheck,
  SignOut,
  CheckCircle,
  CaretDown,
  CaretUp,
  Fingerprint,
  Camera,
  CircleNotch,
  WarningCircle,
  MinusCircle,
} from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useHrmsStore } from '../store/useHrmsStore';
import { getRoleBadge, ROLE_PERMISSIONS, hasPermission, isRoleAllowedForTab } from '../utils/rbac';
import { DashboardCard, StatusChip } from '../components/dashboard/DashboardCard';
import { authApi } from '../api';
import { useI18n } from '../i18n/useI18n';

export const ProfilePage: React.FC = () => {
  const { currentUser, logout, updateUserAvatar } = useHrmsStore();
  const { t, tRole } = useI18n();
  const [showTechnicalAuthorities, setShowTechnicalAuthorities] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roleBadge = getRoleBadge(currentUser.role);
  const roleInfo = tRole(currentUser.role);
  const rawAuthorities = ROLE_PERMISSIONS[currentUser.role] || [];

  // Each capability is shown as included only if this role actually has it.
  const role = currentUser.role;
  const humanCapabilities = [
    { title: t('capRosterTitle'), desc: t('capRosterDesc'), allowed: hasPermission(role, 'EMPLOYEE_VIEW_DIRECTORY') },
    {
      title: t('capAttendanceTitle'),
      desc: t('capAttendanceDesc'),
      allowed: hasPermission(role, 'ATTENDANCE_PUNCH') || hasPermission(role, 'ATTENDANCE_VIEW_ALL'),
    },
    {
      title: t('capLeavesTitle'),
      desc: t('capLeavesDesc'),
      allowed: hasPermission(role, 'LEAVE_APPLY') || hasPermission(role, 'LEAVE_APPROVE_REJECT'),
    },
    {
      title: t('capPayrollTitle'),
      desc: t('capPayrollDesc'),
      allowed: hasPermission(role, 'PAYROLL_VIEW_OWN') || hasPermission(role, 'PAYROLL_VIEW_ALL'),
    },
    { title: t('capCronTitle'), desc: t('capCronDesc'), allowed: isRoleAllowedForTab(role, 'automations') },
    { title: t('capReportsTitle'), desc: t('capReportsDesc'), allowed: hasPermission(role, 'REPORTS_VIEW_EXECUTIVE') },
  ];

  const initials = currentUser.fullName
    ? currentUser.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setToastMessage(null);

    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage(t('photoTooLargeErr'));
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMessage(t('photoUnsupportedErr'));
      return;
    }

    setIsUploadingPhoto(true);

    try {
      await authApi.uploadProfilePhoto(file);
      const previewUrl = URL.createObjectURL(file);
      updateUserAvatar(previewUrl);
      setToastMessage(t('photoUpdatedToast'));
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || t('photoUploadFailedErr'));
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setErrorMessage(null);
    setToastMessage(null);
    setIsUploadingPhoto(true);

    try {
      await authApi.deleteProfilePhoto();
      updateUserAvatar('');
      setToastMessage(t('photoRemovedToast'));
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || t('photoRemoveFailedErr'));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const detailRows = [
    { icon: Envelope, label: t('corporateEmail'), value: currentUser.email },
    { icon: IdentificationCard, label: t('usernameLabel'), value: currentUser.userName },
    { icon: Buildings, label: t('organizationHub'), value: t('orgHubName') },
  ];
  const includedCount = humanCapabilities.filter((c) => c.allowed).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Feedback */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 rounded-lg bg-brand-50 border border-brand-200 text-sm text-brand-800 flex items-center gap-2 animate-fadeIn"
        >
          <CheckCircle weight="fill" className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-center gap-2 animate-fadeIn"
        >
          <WarningCircle weight="fill" className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* 1. Identity */}
      <div className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative group shrink-0">
            <Avatar className="w-20 h-20 rounded-2xl">
              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.fullName} className="rounded-2xl object-cover" />
              <AvatarFallback className="rounded-2xl bg-brand-100 text-brand-800 font-semibold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              aria-label={t('changePhoto')}
              title={t('changePhoto')}
              className="absolute inset-0 bg-slate-900/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-xs font-semibold focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
            >
              {isUploadingPhoto ? (
                <CircleNotch weight="bold" className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Camera weight="bold" className="w-5 h-5 mb-0.5" />
                  <span>{t('updateBtn')}</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{currentUser.fullName}</h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadge.badgeClass}`}
              >
                <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${roleBadge.dotClass}`} />
                {roleInfo.shortTag}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{roleInfo.description}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[13px]">
              <span className="text-slate-500 tabular-nums">
                {t('accountIdPrefix')} #{currentUser.employeeId || currentUser.accountId || 1}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="text-brand-700 hover:text-brand-800 font-semibold rounded cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
              >
                {t('changePhoto')}
              </button>
              {currentUser.avatarUrl && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isUploadingPhoto}
                    className="text-slate-600 hover:text-rose-700 font-medium rounded transition-colors cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                  >
                    {t('removePhoto')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200 text-sm font-semibold transition-colors cursor-pointer self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
        >
          <SignOut weight="bold" className="w-4 h-4" />
          {t('signOut')}
        </button>
      </div>

      {/* 2. Account details */}
      <DashboardCard title={t('pfAccountDetails')}>
        <dl className="flex flex-col -mt-1">
          {detailRows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-wrap items-center gap-3 py-3 border-t border-slate-100 first:border-0">
              <Icon weight="regular" aria-hidden="true" className="w-5 h-5 text-slate-500 shrink-0" />
              <dt className="w-44 shrink-0 text-sm text-slate-500">{label}</dt>
              <dd className="flex-1 min-w-0 text-sm font-semibold text-slate-900 break-all">{value}</dd>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3 py-3 border-t border-slate-100">
            <ShieldCheck weight="regular" aria-hidden="true" className="w-5 h-5 text-slate-500 shrink-0" />
            <dt className="w-44 shrink-0 text-sm text-slate-500">{t('sessionSecurity')}</dt>
            <dd className="flex-1">
              <StatusChip tone="ok">{t('authenticatedActive')}</StatusChip>
            </dd>
          </div>
        </dl>
      </DashboardCard>

      {/* 3. What this role can do (each item checked against the real permission matrix) */}
      <DashboardCard
        title={t('roleEntitlementsTitle')}
        subtitle={`${t('roleEntitlementsSub')} · ${t('pfIncludedCount', { count: includedCount, total: humanCapabilities.length })}`}
      >
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {humanCapabilities.map((cap) => (
            <li
              key={cap.title}
              className={`p-3.5 rounded-lg border flex items-start gap-2.5 ${
                cap.allowed ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'
              }`}
            >
              {cap.allowed ? (
                <CheckCircle weight="fill" aria-hidden="true" className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              ) : (
                <MinusCircle weight="regular" aria-hidden="true" className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className={`text-sm font-semibold ${cap.allowed ? 'text-slate-900' : 'text-slate-500'}`}>{cap.title}</h3>
                <p className="text-[13px] text-slate-500 mt-0.5 leading-snug">
                  {cap.allowed ? cap.desc : t('pfNotIncluded')}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowTechnicalAuthorities(!showTechnicalAuthorities)}
            aria-expanded={showTechnicalAuthorities}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none rounded px-1 py-0.5 cursor-pointer"
          >
            <Fingerprint weight="bold" className="w-4 h-4" />
            <span>{t('technicalAuthorities', { count: rawAuthorities.length })}</span>
            {showTechnicalAuthorities ? (
              <CaretUp weight="bold" className="w-3 h-3" />
            ) : (
              <CaretDown weight="bold" className="w-3 h-3" />
            )}
          </button>

          {showTechnicalAuthorities && (
            <div className="mt-3 flex flex-wrap gap-1.5 animate-fadeIn">
              {rawAuthorities.map((auth) => (
                <code key={auth} className="px-2 py-0.5 rounded bg-slate-100 text-xs text-slate-700">
                  {auth}
                </code>
              ))}
            </div>
          )}
        </div>
      </DashboardCard>
    </div>
  );
};

export default ProfilePage;
