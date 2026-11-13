import React, { useState, useEffect } from 'react';
import {
  Buildings,
  User,
  Lock,
  Eye,
  EyeSlash,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  CircleNotch,
  Key,
  ArrowLeft,
  ArrowRight,
  EnvelopeOpen,
  Sparkle,
  ArrowsClockwise,
  ShieldWarning,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../store/useHrmsStore';
import { UserRole, UserAccount } from '../types';
import { authApi, TokenResponse } from '../api';
import { Modal } from '../components/ui/modal';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { useI18n } from '../i18n/useI18n';

export const LoginPage: React.FC = () => {
  const { login } = useHrmsStore();
  const { t } = useI18n();

  const [mode, setMode] = useState<'login' | 'otp' | 'reset'>('login');
  const [userName, setUserName] = useState('sysadmin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [isFetchingMailpit, setIsFetchingMailpit] = useState(false);

  // First-Login Interception Modal State
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const [tempAuthResponse, setTempAuthResponse] = useState<TokenResponse | null>(null);
  const [firstLoginCurrentPassword, setFirstLoginCurrentPassword] = useState('');
  const [firstLoginNewPassword, setFirstLoginNewPassword] = useState('');
  const [firstLoginConfirmPassword, setFirstLoginConfirmPassword] = useState('');
  const [showModalOldPassword, setShowModalOldPassword] = useState(false);
  const [showModalNewPassword, setShowModalNewPassword] = useState(false);
  const [firstLoginError, setFirstLoginError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Reset Password State
  const [newPassword, setNewPassword] = useState('');

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Auto-fetch OTP from Mailpit upon entering OTP mode
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (mode === 'otp') {
      timer = setTimeout(() => {
        handleFetchMailpitOtp();
      }, 700);
    }
    return () => clearTimeout(timer);
  }, [mode]);

  const normalizeRole = (r?: string): UserRole => {
    if (!r) return 'ROLE_EMPLOYEE';
    const upper = r.toUpperCase();
    if (upper.includes('ADMIN')) return 'ROLE_ADMIN';
    if (upper.includes('HR')) return 'ROLE_HR';
    return 'ROLE_EMPLOYEE';
  };

  const resolveUserByRoleOrUsername = (
    uName: string,
    roleFromApi?: string,
    emailFromApi?: string,
    accountIdFromApi?: number,
    employeeIdFromApi?: number | null
  ): UserAccount => {
    const role: UserRole = normalizeRole(
      roleFromApi ||
        (uName.toLowerCase().includes('admin')
          ? 'ROLE_ADMIN'
          : uName.toLowerCase().includes('hr')
          ? 'ROLE_HR'
          : 'ROLE_EMPLOYEE')
    );

    return {
      accountId: accountIdFromApi ?? 0,
      userName: uName,
      fullName:
        uName === 'sysadmin'
          ? 'System Administrator'
          : uName === 'admin'
          ? 'HR Administrator'
          : uName,
      email: emailFromApi || `${uName}@hrms.local`,
      role,
      employeeId:
        employeeIdFromApi !== null && employeeIdFromApi !== undefined
          ? employeeIdFromApi
          : undefined,
      avatarUrl: '',
    };
  };

  const performLogin = async (usr: string, pwd: string) => {
    if (!usr.trim() || !pwd.trim()) {
      setErrorMessage(t('enterCredentialsError'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await authApi.login({ userName: usr.trim(), password: pwd });

      if (res && res.success) {
        if (res.token) {
          const user = resolveUserByRoleOrUsername(
            usr.trim(),
            res.role,
            res.email,
            res.accountId,
            res.employeeId
          );
          login(user, res.token);
          return;
        }

        setStatusMessage(res.message || t('otpDispatchedMsg'));
        setMode('otp');
        setOtpCode('');
      } else {
        setErrorMessage(res?.message || t('invalidCredentialsError'));
      }
    } catch (err: any) {
      const isNet =
        err.code === 'ERR_NETWORK' ||
        err.message?.includes('Network Error') ||
        err.response?.status === 502 ||
        err.response?.status === 503;

      const msg = isNet
        ? t('gatewayUnreachableError')
        : err.response?.data?.message || err.message || t('invalidCredentialsError');
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchMailpitOtp = async () => {
    setIsFetchingMailpit(true);
    try {
      const code = await authApi.fetchLatestMailpitOtp(userName);
      if (code) {
        setOtpCode(code);
        setStatusMessage(t('autoFilledOtpMsg', { code }));
      } else {
        setErrorMessage(t('noMailpitOtpError', { user: userName }));
      }
    } catch {
      setErrorMessage(t('mailpitConnectError'));
    } finally {
      setIsFetchingMailpit(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMessage(t('enterOtpError'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.verifyOtp({
        userName: userName.trim(),
        otpCode: otpCode.trim(),
      });

      if (!res || !res.success) {
        setErrorMessage(res?.message || t('invalidOtpError'));
        setIsLoading(false);
        return;
      }

      // First-Login Interception Modal
      if (res.isFirstLogin) {
        setTempAuthResponse(res);
        if (typeof window !== 'undefined' && res.token) {
          localStorage.setItem('hrms_jwt_token', res.token);
        }
        setFirstLoginCurrentPassword(password);
        setFirstLoginNewPassword('');
        setFirstLoginConfirmPassword('');
        setFirstLoginError(null);
        setShowFirstLoginModal(true);
        setIsLoading(false);
        return;
      }

      // Normal login success
      const user = resolveUserByRoleOrUsername(
        res.userName,
        res.role,
        res.email,
        res.accountId,
        res.employeeId
      );
      login(user, res.token);
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || t('otpVerifyFailedError');
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await authApi.login({ userName: userName.trim(), password });
      if (res && res.success) {
        setStatusMessage(res.message || t('freshOtpSentMsg'));
        setTimeout(() => handleFetchMailpitOtp(), 800);
      } else {
        setErrorMessage(res?.message || t('resendOtpFailedError'));
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || t('resendOtpFailedError');
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFirstLoginPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setFirstLoginError(null);

    if (!firstLoginCurrentPassword) {
      setFirstLoginError(t('errEnterTempPwd'));
      return;
    }
    if (!firstLoginNewPassword || firstLoginNewPassword.length < 8) {
      setFirstLoginError(t('errMinPwdLen'));
      return;
    }
    if (firstLoginNewPassword === firstLoginCurrentPassword) {
      setFirstLoginError(t('errSamePwd'));
      return;
    }
    if (
      firstLoginConfirmPassword &&
      firstLoginNewPassword !== firstLoginConfirmPassword
    ) {
      setFirstLoginError(t('errPwdMismatch'));
      return;
    }

    setIsChangingPassword(true);

    try {
      if (tempAuthResponse?.token && typeof window !== 'undefined') {
        localStorage.setItem('hrms_jwt_token', tempAuthResponse.token);
      }

      const res = await authApi.changePassword({
        oldPassword: firstLoginCurrentPassword,
        newPassword: firstLoginNewPassword,
      });

      if (res && res.success) {
        setShowFirstLoginModal(false);
        const user = resolveUserByRoleOrUsername(
          res.userName || tempAuthResponse?.userName || userName,
          res.role || tempAuthResponse?.role,
          res.email || tempAuthResponse?.email,
          res.accountId || tempAuthResponse?.accountId,
          res.employeeId ?? tempAuthResponse?.employeeId
        );
        login(user, res.token);
      } else {
        setFirstLoginError(res?.message || t('errChangeInitialPwd'));
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || t('errChangeInitialPwd');
      setFirstLoginError(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !newPassword.trim()) {
      setErrorMessage(t('resetValidationError'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.resetPassword({
        userName: userName.trim(),
        newPassword,
      });
      if (res && res.success) {
        setStatusMessage(t('resetSuccessMsg'));
        setPassword(newPassword);
        setMode('login');
      } else {
        setErrorMessage(res?.message || t('resetFailedError'));
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || t('resetFailedError');
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#eaf1f7] relative overflow-hidden">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-blue-200/40 via-sky-100/20 to-transparent blur-3xl pointer-events-none"
      />

      {/* Main Login Container */}
      <div className="relative w-full max-w-md z-10 space-y-5 animate-fadeIn">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Buildings weight="duotone" className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t('brandName')}
            </h1>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-0.5">
              {t('brandTagline')}
            </p>
          </div>
        </div>

        {/* Card Box */}
        <div className="bg-white/90 backdrop-blur-xl border border-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.06)] rounded-3xl p-7 sm:p-8 space-y-5">
          {/* Login Card Header with Flag-Only Language Switcher */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t('gatewayLabel')}</span>
            </div>
            <LanguageSwitcher variant="login" />
          </div>

          {/* Status / Alert Banner */}
          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-700 flex items-start gap-2.5 animate-fadeIn"
            >
              <WarningCircle
                weight="fill"
                className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 font-medium leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          {statusMessage && (
            <div
              role="status"
              aria-live="polite"
              className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-700 flex items-start gap-2.5 animate-fadeIn"
            >
              <CheckCircle
                weight="fill"
                className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 font-medium leading-relaxed">
                {statusMessage}
              </div>
            </div>
          )}

          {/* MODE 1: CREDENTIALS LOGIN */}
          {mode === 'login' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                performLogin(userName, password);
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  {t('loginUsernameLabel')}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User weight="duotone" className="w-4 h-4" />
                  </span>
                  <input
                    id="login-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    spellCheck={false}
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder={t('loginUsernamePlaceholder')}
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm sm:text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-colors text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-semibold text-slate-700"
                  >
                    {t('loginPasswordLabel')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setStatusMessage(null);
                      setMode('reset');
                    }}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded px-1 cursor-pointer"
                  >
                    {t('forgotPassword')}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock weight="duotone" className="w-4 h-4" />
                  </span>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-colors text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-r-xl cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeSlash weight="regular" className="w-4 h-4" />
                    ) : (
                      <Eye weight="regular" className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>{t('rememberBrowser')}</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 min-h-[42px] py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-semibold shadow-md shadow-slate-900/10 transition-[transform,background-color] duration-150 disabled:opacity-70 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                    <span>{t('verifyingCredentials')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('signInBtn')}</span>
                    <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE 2: TWO-FACTOR / 1-CLICK MAILPIT OTP */}
          {mode === 'otp' && (
            <form onSubmit={handleOtpVerify} className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-full bg-blue-50 text-blue-600 mb-1">
                  <ShieldCheck weight="duotone" className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {t('twoFactorTitle')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('twoFactorDesc')}{' '}
                  <span className="font-mono font-semibold text-slate-800">
                    @{userName}
                  </span>
                </p>
              </div>

              {/* 1-Click Mailpit OTP Auto-Fill Badge / Button */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                    <Sparkle weight="fill" className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-slate-800 truncate">
                      {t('mailpitInboxTitle')}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {t('mailpitInboxSubtitle')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFetchMailpitOtp}
                  disabled={isFetchingMailpit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-[11px] font-semibold text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 active:scale-[0.96] transition-[transform,background-color,border-color,color] duration-150 shadow-xs disabled:opacity-60 flex-shrink-0 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
                >
                  {isFetchingMailpit ? (
                    <>
                      <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('fetchingOtp')}</span>
                    </>
                  ) : (
                    <>
                      <EnvelopeOpen weight="bold" className="w-3.5 h-3.5" />
                      <span>{t('autoFillOtp')}</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label
                  htmlFor="login-otp"
                  className="block text-xs font-semibold text-slate-700 mb-1.5 text-center"
                >
                  {t('sixDigitOtpLabel')}
                </label>
                <input
                  id="login-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  required
                  className="w-full text-center tracking-[0.6em] text-xl font-mono py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-colors text-slate-900 font-bold placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-300"
                />
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 min-h-[42px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-[transform,background-color] duration-150 disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                      <span>{t('verifyingCode')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('completeVerification')}</span>
                      <CheckCircle weight="bold" className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded px-1 py-0.5 cursor-pointer"
                  >
                    <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
                    <span>{t('backToSignIn')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded px-1 py-0.5 cursor-pointer"
                  >
                    <ArrowsClockwise weight="bold" className="w-3.5 h-3.5" />
                    <span>{t('resendCode')}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* MODE 3: RESET PASSWORD */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-fadeIn">
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-800 mb-1">
                  <Key weight="duotone" className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {t('resetPasswordTitle')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('resetPasswordDesc')}
                </p>
              </div>

              <div>
                <label
                  htmlFor="reset-username"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  {t('confirmUsername')}
                </label>
                <input
                  id="reset-username"
                  type="text"
                  autoComplete="username"
                  spellCheck={false}
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t('loginUsernamePlaceholder')}
                  required
                  className="w-full px-3.5 py-2.5 text-sm sm:text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="reset-new-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  {t('newPasswordLabel')}
                </label>
                <input
                  id="reset-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('newPasswordPlaceholder')}
                  required
                  minLength={8}
                  className="w-full px-3.5 py-2.5 text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 min-h-[42px] py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-semibold shadow-md transition-[transform,background-color] duration-150 disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                      <span>{t('updating')}</span>
                    </>
                  ) : (
                    <span>{t('updatePasswordBtn')}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-xl cursor-pointer"
                >
                  <ArrowLeft weight="bold" className="w-3.5 h-3.5" />
                  <span>{t('cancelAndReturn')}</span>
                </button>
              </div>
            </form>
          )}

          {/* Default Enterprise Access Credentials */}
          <div className="pt-4 border-t border-slate-100/90 text-center">
            <div className="text-[11px] text-slate-400">
              {t('authorizedSysAdmin')}{' '}
              <button
                type="button"
                onClick={() => setUserName('sysadmin')}
                className="font-mono text-slate-700 font-semibold bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
                title="sysadmin"
              >
                sysadmin
              </button>
            </div>
          </div>
        </div>

        {/* Security & Architecture Note */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck weight="bold" className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t('securityFooter')}</span>
        </div>
      </div>

      {/* First-Login Interception Modal */}
      <Modal
        isOpen={showFirstLoginModal}
        onClose={() => {
          setShowFirstLoginModal(false);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('hrms_jwt_token');
          }
        }}
        title={t('firstLoginTitle')}
        subtitle={t('firstLoginSubtitle')}
        maxWidth="md"
      >
        <form onSubmit={handleFirstLoginPasswordChange} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldWarning
              weight="fill"
              className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"
            />
            <div className="leading-relaxed">
              <strong>{t('firstLoginNoticeTitle')}</strong>{' '}
              {t('firstLoginNoticeBody')}
            </div>
          </div>

          {firstLoginError && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-700 flex items-start gap-2.5 animate-fadeIn"
            >
              <WarningCircle
                weight="fill"
                className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 font-medium leading-relaxed">
                {firstLoginError}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="first-login-old-pwd"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {t('currentTempPassword')}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock weight="duotone" className="w-4 h-4" />
              </span>
              <input
                id="first-login-old-pwd"
                type={showModalOldPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={firstLoginCurrentPassword}
                onChange={(e) => setFirstLoginCurrentPassword(e.target.value)}
                placeholder={t('enterCurrentPasswordPlaceholder')}
                required
                className="w-full pl-10 pr-10 py-2.5 text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-colors text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowModalOldPassword(!showModalOldPassword)}
                aria-label={showModalOldPassword ? 'Hide current password' : 'Show current password'}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-r-xl cursor-pointer"
              >
                {showModalOldPassword ? (
                  <EyeSlash weight="regular" className="w-4 h-4" />
                ) : (
                  <Eye weight="regular" className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="first-login-new-pwd"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {t('newPermanentPassword')}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key weight="duotone" className="w-4 h-4" />
              </span>
              <input
                id="first-login-new-pwd"
                type={showModalNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={firstLoginNewPassword}
                onChange={(e) => setFirstLoginNewPassword(e.target.value)}
                placeholder={t('newPasswordPlaceholder')}
                required
                minLength={8}
                className="w-full pl-10 pr-10 py-2.5 text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-colors text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowModalNewPassword(!showModalNewPassword)}
                aria-label={showModalNewPassword ? 'Hide new password' : 'Show new password'}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-r-xl cursor-pointer"
              >
                {showModalNewPassword ? (
                  <EyeSlash weight="regular" className="w-4 h-4" />
                ) : (
                  <Eye weight="regular" className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="first-login-confirm-pwd"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {t('confirmNewPassword')}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Key weight="duotone" className="w-4 h-4" />
              </span>
              <input
                id="first-login-confirm-pwd"
                type={showModalNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={firstLoginConfirmPassword}
                onChange={(e) => setFirstLoginConfirmPassword(e.target.value)}
                placeholder={t('reenterNewPasswordPlaceholder')}
                required
                minLength={8}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-colors text-slate-900"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setShowFirstLoginModal(false);
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('hrms_jwt_token');
                }
              }}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isChangingPassword}
              className="flex items-center gap-2 min-h-[40px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 active:scale-[0.98] transition-[transform,background-color] duration-150 disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
            >
              {isChangingPassword ? (
                <>
                  <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                  <span>{t('updatingPassword')}</span>
                </>
              ) : (
                <>
                  <span>{t('changePasswordAndEnter')}</span>
                  <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
