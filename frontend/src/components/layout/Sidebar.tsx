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
  Leaf,
  IconProps,
} from '@phosphor-icons/react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useHrmsStore, NavTab } from '../../store/useHrmsStore';
import { isRoleAllowedForTab } from '../../utils/rbac';
import { useI18n, TranslationKey } from '../../i18n/useI18n';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<IconProps>;
  badge?: number;
}

interface NavGroup {
  label?: TranslationKey;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { activeTab, setActiveTab, currentUser, leaves, syncWithGateway, logout } = useHrmsStore();
  const { t, tRole } = useI18n();
  const isEmployee = currentUser.role === 'ROLE_EMPLOYEE';
  const roleInfo = tRole(currentUser.role);

  // Reviewers see how many leave requests are waiting for a decision.
  const pendingLeaves = isEmployee ? 0 : leaves.filter((l) => l.status === 'PENDING').length;

  const allGroups: NavGroup[] = [
    { items: [{ id: 'dashboard', label: t('navDashboard'), icon: SquaresFour }] },
    {
      label: 'navGroupTime',
      items: [
        { id: 'attendance', label: isEmployee ? t('navMyAttendance') : t('navAttendance'), icon: Clock },
        {
          id: 'leaves',
          label: isEmployee ? t('navMyLeaves') : t('navLeaves'),
          icon: CalendarCheck,
          badge: pendingLeaves,
        },
      ],
    },
    {
      label: 'navGroupPeople',
      items: [
        { id: 'employees', label: isEmployee ? t('navStaffDirectory') : t('navEmployees'), icon: UsersThree },
        { id: 'departments', label: t('navOrganization'), icon: Buildings },
      ],
    },
    {
      label: 'navGroupPay',
      items: [{ id: 'payroll', label: isEmployee ? t('navMyPayslips') : t('navPayroll'), icon: CurrencyDollar }],
    },
    {
      label: 'navGroupInsights',
      items: [
        { id: 'reports', label: t('navReports'), icon: ChartBar },
        { id: 'automations', label: t('navAutomations'), icon: Cpu },
      ],
    },
    {
      label: 'navGroupAccount',
      items: [{ id: 'profile', label: t('navProfile'), icon: UserCircle }],
    },
  ];
  const groups = allGroups
    .map((g) => ({ ...g, items: g.items.filter((item) => isRoleAllowedForTab(currentUser.role, item.id)) }))
    .filter((g) => g.items.length > 0);

  const initials = currentUser.fullName
    ? currentUser.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <aside
      className={`relative flex flex-col justify-between h-screen transition-[width] duration-200 ease-out z-30 select-none flex-shrink-0 bg-white border-r border-slate-200 ${
        isCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <div
        className={`flex flex-col flex-1 overflow-x-hidden overflow-y-auto ${
          isCollapsed ? 'px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'px-3 py-5'
        }`}
      >
        {/* Brand */}
        <div
          className={`flex items-center ${
            isCollapsed ? 'flex-col gap-2 justify-center mb-4' : 'justify-between px-2 mb-6'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-[10px] bg-brand-600 text-white flex-shrink-0">
              <Leaf weight="bold" className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-heading text-base font-bold tracking-tight text-slate-900 block leading-tight">
                  {t('brandName')}
                </span>
                <span className="text-xs text-slate-500 block">{t('brandHrMgmt')}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? t('expandNav') : t('collapseNav')}
            title={isCollapsed ? t('expandNav') : t('collapseNav')}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none cursor-pointer"
          >
            <CaretLeft
              weight="bold"
              className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Main Navigation" className={`flex flex-col ${isCollapsed ? 'gap-3' : 'gap-5'}`}>
          {groups.map((group, gi) => (
            <div key={group.label ?? `group-${gi}`} className="flex flex-col gap-0.5">
              {group.label &&
                (isCollapsed ? (
                  gi > 0 && <div className="mx-2 mb-2 border-t border-slate-200" aria-hidden="true" />
                ) : (
                  <span className="px-3 pb-1.5 text-xs font-semibold text-slate-500">{t(group.label)}</span>
                ))}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const showBadge = !!item.badge && item.badge > 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-label={showBadge ? `${item.label} (${item.badge})` : item.label}
                    title={isCollapsed ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative flex items-center transition-colors duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none ${
                      isCollapsed
                        ? 'w-11 h-11 mx-auto rounded-lg justify-center'
                        : 'w-full gap-3 min-h-[40px] px-3 rounded-lg text-sm'
                    } ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon weight={isActive ? 'fill' : 'regular'} className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                    {showBadge &&
                      (isCollapsed ? (
                        <span
                          aria-hidden="true"
                          className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="min-w-[22px] px-1.5 py-px rounded-full bg-amber-50 text-amber-800 text-xs font-bold text-center tabular-nums"
                        >
                          {item.badge}
                        </span>
                      ))}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* User footer */}
      <div className={`${isCollapsed ? 'p-2' : 'p-3'} border-t border-slate-200 flex flex-col items-center flex-shrink-0`}>
        <div className={`flex items-center w-full ${isCollapsed ? 'justify-center py-1' : 'gap-2.5 px-2 py-1'}`}>
          <Avatar className="w-9 h-9 rounded-full shrink-0">
            <AvatarImage src={currentUser.avatarUrl} alt={currentUser.fullName} className="rounded-full object-cover" />
            <AvatarFallback className="bg-brand-100 text-brand-800 font-semibold text-xs">{initials}</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">{currentUser.fullName}</div>
              <div className="text-xs text-slate-500 truncate">{roleInfo.shortTag}</div>
            </div>
          )}
          {!isCollapsed && (
            <button
              type="button"
              onClick={logout}
              aria-label={t('signOut')}
              title={t('signOut')}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none cursor-pointer"
            >
              <SignOut weight="bold" className="w-4 h-4" />
            </button>
          )}
        </div>

        {isCollapsed ? (
          <button
            type="button"
            onClick={logout}
            aria-label={t('signOut')}
            title={t('signOut')}
            className="mt-2 w-11 h-11 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none cursor-pointer"
          >
            <SignOut weight="bold" className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => syncWithGateway()}
            title={t('syncTooltip')}
            className="mt-2 w-full flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none cursor-pointer"
          >
            <ArrowsClockwise weight="bold" className="w-3.5 h-3.5" />
            <span>{t('syncBtn')}</span>
          </button>
        )}
      </div>
    </aside>
  );
};
