import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { AttendancePage } from './pages/AttendancePage';
import { LeavesPage } from './pages/LeavesPage';
import { PayrollPage } from './pages/PayrollPage';
import { ReportsPage } from './pages/ReportsPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { AutomationsPage } from './pages/AutomationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { LanguageSwitcher } from './components/ui/LanguageSwitcher';
import { useHrmsStore, NavTab } from './store/useHrmsStore';
import { useI18n, TranslationKey } from './i18n/useI18n';
import {
  SignOut,
  ArrowsClockwise,
  WifiSlash,
  CircleNotch,
  CaretDown,
  CaretUp,
} from '@phosphor-icons/react';

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    isAuthenticated,
    logout,
    isLoading,
    isGatewayConnected,
    gatewayError,
    syncWithGateway,
  } = useHrmsStore();
  const { t } = useI18n();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      if (search.get('collapsed') === 'true') return true;
      const saved = localStorage.getItem('hrms_sidebar_collapsed');
      if (saved !== null) return saved === 'true';
      return window.innerWidth < 768;
    }
    return false;
  });

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('hrms_sidebar_collapsed', String(next));
      }
      return next;
    });
  };
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  // Automatically initiate sync with Gateway upon authentication
  useEffect(() => {
    if (isAuthenticated) {
      syncWithGateway();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Streamlined Base Web Disconnection Modal (100% Pure Live API Gateway Mode)
  if (!isGatewayConnected && gatewayError) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 select-none relative overflow-hidden">
        {/* Subtle grid backdrop */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"
        />

        {/* Top-Right Flag Switcher */}
        <div className="absolute top-6 right-6 z-20">
          <LanguageSwitcher variant="dark" />
        </div>

        <div className="relative w-full max-w-md z-10 animate-fadeIn">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
              <WifiSlash weight="bold" className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/25 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>{t('serviceOffline')}</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {t('connectionLost')}
              </h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                {t('connectionLostDesc')}
              </p>
            </div>

            {/* Progressive Disclosure for Technical Details */}
            <div className="pt-1 text-left">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails((prev) => !prev)}
                aria-expanded={showTechnicalDetails}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-300 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-md px-1 py-0.5 cursor-pointer"
              >
                <span>{t('diagnostics')}</span>
                {showTechnicalDetails ? (
                  <CaretUp weight="bold" className="w-3 h-3" />
                ) : (
                  <CaretDown weight="bold" className="w-3 h-3" />
                )}
              </button>

              {showTechnicalDetails && (
                <div className="mt-2.5 p-3 rounded-xl bg-black/50 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1 animate-fadeIn">
                  <div className="text-rose-400 break-all">{gatewayError}</div>
                  <div className="text-[10px] text-slate-500">
                    {t('accountLabel')}: {currentUser.userName}
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={logout}
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 active:scale-[0.96] text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 transition-[transform,background-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
              >
                <SignOut weight="bold" className="w-4 h-4" />
                <span>{t('signOut')}</span>
              </button>

              <button
                type="button"
                onClick={() => syncWithGateway()}
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.96] text-white text-xs font-bold transition-[transform,background-color] duration-150 shadow-lg shadow-rose-950/40 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                    <span>{t('connecting')}</span>
                  </>
                ) : (
                  <>
                    <ArrowsClockwise weight="bold" className="w-4 h-4" />
                    <span>{t('retry')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const SECTION_META: Record<NavTab, { title: TranslationKey; subtitle: TranslationKey }> = {
    dashboard: { title: 'secTitleDashboard', subtitle: 'secSubDashboard' },
    attendance: { title: 'secTitleAttendance', subtitle: 'secSubAttendance' },
    timesheet: { title: 'secTitleTimesheet', subtitle: 'secSubTimesheet' },
    employees: { title: 'secTitleEmployees', subtitle: 'secSubEmployees' },
    departments: { title: 'secTitleDepartments', subtitle: 'secSubDepartments' },
    automations: { title: 'secTitleAutomations', subtitle: 'secSubAutomations' },
    leaves: { title: 'secTitleLeaves', subtitle: 'secSubLeaves' },
    payroll: { title: 'secTitlePayroll', subtitle: 'secSubPayroll' },
    reports: { title: 'secTitleReports', subtitle: 'secSubReports' },
    profile: { title: 'secTitleProfile', subtitle: 'secSubProfile' },
  };
  const sectionMeta = SECTION_META[activeTab] ?? {
    title: 'secTitleDashboard' as TranslationKey,
    subtitle: 'secSubDefault' as TranslationKey,
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'employees':
        return <EmployeesPage />;
      case 'departments':
        return <DepartmentsPage />;
      case 'automations':
        return <AutomationsPage />;
      case 'attendance':
      case 'timesheet':
        return <AttendancePage />;
      case 'leaves':
        return <LeavesPage />;
      case 'payroll':
        return <PayrollPage />;
      case 'reports':
        return <ReportsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#eaf1f7]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-slate-900 focus:text-white focus:text-xs focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* 1. Desktop Left Sidebar (collapsible) */}
      <div className="hidden lg:flex h-full shrink-0">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* 1b. Mobile Slide-Over Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full flex">
            <Sidebar
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 2. Main Central Work Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden min-w-0">
        <Header
          onRaiseRequestClick={() => setActiveTab('leaves')}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        <main id="main-content" className="flex-1 px-4 sm:px-6 lg:px-8 pt-2 min-w-0">
          <div key={activeTab} className="animate-pageEnter">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 pt-2 pb-3">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                {t(sectionMeta.title)}
              </h1>
              <p className="text-xs text-slate-500">
                {t(sectionMeta.subtitle)}
              </p>
            </div>
            {renderActivePage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
