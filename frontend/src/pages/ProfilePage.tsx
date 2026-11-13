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
} from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { useHrmsStore } from '../store/useHrmsStore';
import { getRoleBadge, ROLE_PERMISSIONS } from '../utils/rbac';
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

  const humanCapabilities = [
    { title: t('capRosterTitle'), desc: t('capRosterDesc') },
    { title: t('capAttendanceTitle'), desc: t('capAttendanceDesc') },
    { title: t('capLeavesTitle'), desc: t('capLeavesDesc') },
    { title: t('capPayrollTitle'), desc: t('capPayrollDesc') },
    { title: t('capCronTitle'), desc: t('capCronDesc') },
    { title: t('capReportsTitle'), desc: t('capReportsDesc') },
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 select-none animate-fadeIn">
      {/* Feedback Banners */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-fadeIn"
        >
          <CheckCircle weight="fill" className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 animate-fadeIn"
        >
          <WarningCircle weight="fill" className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* 1. Profile Header Card */}
      <div className="rounded-2xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Avatar with Interactive Upload Overlay */}
          <div className="relative group shrink-0">
            <Avatar className="w-20 h-20 rounded-2xl ring-4 ring-slate-100 shadow-sm">
              <AvatarImage
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="rounded-2xl object-cover"
              />
              <AvatarFallback className="rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              aria-label={t('changePhoto')}
              title={t('changePhoto')}
              className="absolute inset-0 bg-slate-900/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-[10px] font-semibold focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
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

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {currentUser.fullName}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${roleBadge.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${roleBadge.dotClass}`} />
                <span>{roleInfo.shortTag}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{roleInfo.description}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px]">
              <span className="text-slate-400 font-mono">
                {t('accountIdPrefix')} #{currentUser.employeeId || currentUser.accountId || 1}
              </span>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer disabled:opacity-50"
              >
                {t('changePhoto')}
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isUploadingPhoto}
                className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                {t('removePhoto')}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          aria-label={t('signOut')}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 active:scale-[0.96] text-slate-700 text-xs font-semibold border border-slate-200 hover:border-rose-200 transition-[transform,background-color,border-color,color] duration-150 cursor-pointer shadow-2xs self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
        >
          <SignOut weight="bold" className="w-4 h-4" />
          <span>{t('signOut')}</span>
        </button>
      </div>

      {/* 2. Account Credentials Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Envelope weight="duotone" className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('corporateEmail')}
            </div>
            <div className="text-xs font-semibold text-slate-900 mt-0.5 truncate">
              {currentUser.email}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <IdentificationCard weight="duotone" className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('usernameLabel')}
            </div>
            <div className="text-xs font-semibold text-slate-900 font-mono mt-0.5 truncate">
              {currentUser.userName}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Buildings weight="duotone" className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('organizationHub')}
            </div>
            <div className="text-xs font-semibold text-slate-900 mt-0.5">{t('orgHubName')}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck weight="duotone" className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('sessionSecurity')}
            </div>
            <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{t('authenticatedActive')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. System Access & Capabilities */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            {t('roleEntitlementsTitle')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{t('roleEntitlementsSub')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {humanCapabilities.map((cap, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start gap-2.5"
            >
              <CheckCircle weight="fill" className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-semibold text-slate-900">{cap.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{cap.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Technical Authorities (Collapsible Disclosure) */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowTechnicalAuthorities(!showTechnicalAuthorities)}
            aria-expanded={showTechnicalAuthorities}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded px-1 py-0.5 cursor-pointer"
          >
            <Fingerprint weight="bold" className="w-3.5 h-3.5" />
            <span>{t('technicalAuthorities', { count: rawAuthorities.length })}</span>
            {showTechnicalAuthorities ? (
              <CaretUp weight="bold" className="w-3 h-3" />
            ) : (
              <CaretDown weight="bold" className="w-3 h-3" />
            )}
          </button>

          {showTechnicalAuthorities && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-wrap gap-1.5 animate-fadeIn">
              {rawAuthorities.map((auth) => (
                <span
                  key={auth}
                  className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono text-slate-600 shadow-2xs"
                >
                  {auth}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
