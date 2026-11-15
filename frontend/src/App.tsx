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
  Leaf,
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

  // Gateway unreachable: Evergreen offline screen with retry
  if (!isGatewayConnected && gatewayError) {
    return (
      <div className="hrms-login min-h-screen w-full flex flex-col bg-[#F5F6F4]">
        {/* Top bar: brand + language (same as the sign-in page) */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center">
              <Leaf weight="bold" className="w-5 h-5" />
            </div>
            <span className="font-heading text-[17px] font-bold tracking-tight text-slate-900">{t('brandName')}</span>
          </div>
          <LanguageSwitcher variant="login" />
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pb-14">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-[22px] p-7 sm:p-8 text-center space-y-6 animate-fadeIn">
            <div className="mx-auto w-14 h-14 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <WifiSlash weight="bold" className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-current" />
                {t('serviceOffline')}
              </span>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{t('connectionLost')}</h1>
              <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">{t('connectionLostDesc')}</p>
            </div>

            {/* Technical details on demand */}
            <div className="text-left">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails((prev) => !prev)}
                aria-expanded={showTechnicalDetails}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none rounded-md px-1 py-0.5 cursor-pointer"
              >
                {t('diagnostics')}
                {showTechnicalDetails ? (
                  <CaretUp weight="bold" className="w-3 h-3" />
                ) : (
                  <CaretDown weight="bold" className="w-3 h-3" />
                )}
              </button>
              {showTechnicalDetails && (
                <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 space-y-1 animate-fadeIn">
                  <div className="text-rose-800 break-all">{gatewayError}</div>
                  <div>
                    {t('accountLabel')}: {currentUser.userName}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={logout}
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none cursor-pointer"
              >
                <SignOut weight="bold" className="w-4 h-4" />
                {t('signOut')}
              </button>
              <button
                type="button"
                onClick={() => syncWithGateway()}
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                    {t('connecting')}
                  </>
                ) : (
                  <>
                    <ArrowsClockwise weight="bold" className="w-4 h-4" />
                    {t('retry')}
                  </>
                )}
              </button>
            </div>
          </div>
        </main>
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
    <div className="hrms-workspace flex h-screen w-full overflow-hidden bg-[#F5F6F4]">
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

        <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 pt-7 min-w-0">
          <div key={activeTab} className="animate-pageEnter">
            {/* The dashboard renders its own greeting header */}
            {activeTab !== 'dashboard' && (
              <div className="flex flex-col gap-2 pb-7">
                <h1 className="text-2xl sm:text-[28px] font-semibold tracking-tight text-slate-900">
                  {t(sectionMeta.title)}
                </h1>
                <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
                  {t(sectionMeta.subtitle)}
                </p>
              </div>
            )}
            {renderActivePage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
