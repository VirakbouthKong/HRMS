import React from 'react';
import {
  SquaresFour,
  Clock,
  UsersThree,
  CalendarCheck,
  CurrencyDollar,
  ChartBar,
  UserCircle,
  CaretLeft,
  SignOut,
  Buildings,
  Cpu,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useHrmsStore, NavTab } from '../../store/useHrmsStore';
import { getRoleBadge, isRoleAllowedForTab } from '../../utils/rbac';
import { useI18n } from '../../i18n/useI18n';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { activeTab, setActiveTab, currentUser, syncWithGateway, logout } = useHrmsStore();
  const { t, tRole } = useI18n();
  const isEmployee = currentUser.role === 'ROLE_EMPLOYEE';
  const roleBadge = getRoleBadge(currentUser.role);
  const roleInfo = tRole(currentUser.role);

  const baseNavItems = [
    { id: 'dashboard' as NavTab, label: t('navDashboard'), icon: SquaresFour },
    {
      id: 'attendance' as NavTab,
      label: isEmployee ? t('navMyAttendance') : t('navAttendance'),
      icon: Clock,
    },
    {
      id: 'employees' as NavTab,
      label: isEmployee ? t('navStaffDirectory') : t('navEmployees'),
      icon: UsersThree,
    },
    {
      id: 'departments' as NavTab,
      label: t('navOrganization'),
      icon: Buildings,
    },
    {
      id: 'automations' as NavTab,
      label: t('navAutomations'),
      icon: Cpu,
    },
    {
      id: 'leaves' as NavTab,
      label: isEmployee ? t('navMyLeaves') : t('navLeaves'),
      icon: CalendarCheck,
    },
    {
      id: 'payroll' as NavTab,
      label: isEmployee ? t('navMyPayslips') : t('navPayroll'),
      icon: CurrencyDollar,
    },
    { id: 'reports' as NavTab, label: t('navReports'), icon: ChartBar },
    { id: 'profile' as NavTab, label: t('navProfile'), icon: UserCircle },
  ];

  const navItems = baseNavItems.filter((item) => isRoleAllowedForTab(currentUser.role, item.id));

  return (
    <aside
      className={`relative flex flex-col justify-between h-screen transition-[width] duration-200 ease-out z-30 select-none ${
        isCollapsed ? 'w-[72px]' : 'w-60'
      } bg-white border-r border-slate-200/80 shadow-[1px_0_4px_rgba(0,0,0,0.02)] flex-shrink-0`}
    >
      {/* Brand Header */}
      <div
        className={`flex flex-col flex-1 overflow-x-hidden ${
          isCollapsed
            ? 'px-2 py-3 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
            : 'px-3 py-5 overflow-y-auto'
        }`}
      >
        <div
          className={`flex items-center ${
            isCollapsed ? 'flex-col gap-2 justify-center px-0 mb-3' : 'justify-between px-2 mb-6'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 text-white shadow-sm flex-shrink-0">
              <Buildings weight="bold" className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="text-sm font-bold tracking-tight text-slate-900 block leading-tight">
                  {t('brandName')}
                </span>
                <span className="text-[10px] font-medium text-slate-400 block tracking-tight">
                  {t('brandHrMgmt')}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? t('expandNav') : t('collapseNav')}
            title={isCollapsed ? t('expandNav') : t('collapseNav')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
          >
            <CaretLeft
              weight="bold"
              className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Navigation Section */}
        <div className={isCollapsed ? 'px-0 mb-2' : 'px-2 mb-2'}>
          {!isCollapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-2 px-1">
              {t('platform')}
            </span>
          )}
          <nav className={isCollapsed ? 'space-y-1' : 'space-y-1.5'} aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <div key={item.id} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-label={item.label}
                    title={isCollapsed ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center active:scale-[0.96] transition-[transform,background-color,color] duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                      isCollapsed
                        ? 'w-10 h-10 rounded-xl justify-center'
                        : 'w-full gap-3 px-3 py-2.5 rounded-xl text-xs font-medium'
                    } ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon
                      weight={isActive ? 'fill' : 'duotone'}
                      className="w-5 h-5 flex-shrink-0"
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Footer */}
      <div className={`${isCollapsed ? 'p-2' : 'p-3'} border-t border-slate-100 bg-slate-50/50 flex flex-col items-center flex-shrink-0`}>
        <div
          className={`rounded-xl flex items-center ${
            isCollapsed ? 'justify-center p-1' : 'p-2 gap-2.5 w-full'
          }`}
        >
          <Avatar className="w-8 h-8 rounded-full ring-1 ring-slate-200 shrink-0">
            <AvatarImage
              src={currentUser.avatarUrl}
              alt={currentUser.fullName}
              className="rounded-full object-cover"
            />
            <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs">
              {currentUser.fullName
                ? currentUser.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'U'}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-semibold text-slate-800 truncate">{currentUser.fullName}</h4>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${roleBadge.dotClass}`} />
                <span className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-tight">
                  {roleInfo.shortTag}
                </span>
              </div>
            </div>
          )}
        </div>

        {isCollapsed && (
          <div className="mt-2 pt-2 border-t border-slate-200/60 flex justify-center w-full">
            <button
              type="button"
              onClick={logout}
              aria-label={t('signOut')}
              title={t('signOut')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
            >
              <SignOut weight="bold" className="w-4 h-4" />
            </button>
          </div>
        )}

        {!isCollapsed && (
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between px-1 w-full">
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-rose-600 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded px-1 py-0.5 cursor-pointer"
            >
              <SignOut weight="bold" className="w-3.5 h-3.5" />
              <span>{t('signOut')}</span>
            </button>
            <button
              type="button"
              onClick={() => syncWithGateway()}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded px-1 py-0.5 cursor-pointer"
              title={t('syncTooltip')}
            >
              <ArrowsClockwise weight="bold" className="w-3.5 h-3.5" />
              <span>{t('syncBtn')}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
