import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MagnifyingGlass,
  X,
  User,
  Buildings,
  CalendarCheck,
  CurrencyDollar,
  Cpu,
  Clock,
  TreeStructure,
  ChartLineUp,
  House,
  ArrowRight,
  Briefcase,
} from '@phosphor-icons/react';
import { useHrmsStore, NavTab } from '../../store/useHrmsStore';
import { useI18n } from '../../i18n/useI18n';
import { isRoleAllowedForTab } from '../../utils/rbac';

interface SearchItem {
  id: string;
  categoryKey: 'catNavigation' | 'catEmployees' | 'catDepartments' | 'catJobs' | 'catLeaves' | 'catActions';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  avatarUrl?: string;
  icon?: any;
  onSelect: () => void;
}

export const GlobalSearch: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    employees,
    departments,
    jobs,
    leaves,
    setActiveTab,
    setDepartmentsView,
    currentUser,
  } = useHrmsStore();
  const { t, tStatus, tLeaveType } = useI18n();

  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      return search.get('search') === 'true' || Boolean(search.get('q'));
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const qParam = new URLSearchParams(window.location.search).get('q');
      if (qParam && !searchQuery) {
        setSearchQuery(qParam);
      }
    }
  }, []);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Navigation pages list (RBAC-filtered & localized)
  const navPages = useMemo(
    () =>
      [
        { id: 'dashboard', label: t('navDashboard'), desc: t('gsDashboardDesc'), icon: House, tab: 'dashboard' as NavTab },
        { id: 'employees', label: t('navEmployees'), desc: t('gsEmployeesDesc'), icon: TreeStructure, tab: 'employees' as NavTab },
        { id: 'departments', label: t('navOrganization'), desc: t('gsDepartmentsDesc'), icon: Buildings, tab: 'departments' as NavTab },
        { id: 'attendance', label: t('navAttendance'), desc: t('gsAttendanceDesc'), icon: Clock, tab: 'attendance' as NavTab },
        { id: 'leaves', label: t('navLeaves'), desc: t('gsLeavesDesc'), icon: CalendarCheck, tab: 'leaves' as NavTab },
        { id: 'payroll', label: t('navPayroll'), desc: t('gsPayrollDesc'), icon: CurrencyDollar, tab: 'payroll' as NavTab },
        { id: 'automations', label: t('navAutomations'), desc: t('gsAutomationsDesc'), icon: Cpu, tab: 'automations' as NavTab },
        { id: 'reports', label: t('navReports'), desc: t('gsReportsDesc'), icon: ChartLineUp, tab: 'reports' as NavTab },
        { id: 'profile', label: t('navProfile'), desc: t('gsProfileDesc'), icon: User, tab: 'profile' as NavTab },
      ].filter((p) => isRoleAllowedForTab(currentUser.role, p.tab)),
    [t, currentUser.role]
  );

  // Global Keyboard listener for "/" and "Cmd+K" / "Ctrl+K"
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) && !isInput) {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
        inputRef.current?.select();
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute matched items
  const searchResults = useMemo<SearchItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const items: SearchItem[] = [];

    if (!q) {
      navPages.slice(0, 5).forEach((p) => {
        items.push({
          id: `nav-${p.id}`,
          categoryKey: 'catNavigation',
          title: p.label,
          subtitle: p.desc,
          icon: p.icon,
          onSelect: () => {
            setActiveTab(p.tab);
            setIsOpen(false);
          },
        });
      });

      items.push({
        id: 'act-punch',
        categoryKey: 'catActions',
        title: t('gsCheckInTitle'),
        subtitle: t('gsCheckInDesc'),
        icon: Clock,
        badge: t('badgePunch'),
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        onSelect: () => {
          setActiveTab('attendance');
          setIsOpen(false);
        },
      });

      items.push({
        id: 'act-leave',
        categoryKey: 'catActions',
        title: t('gsApplyLeaveTitle'),
        subtitle: t('gsApplyLeaveDesc'),
        icon: CalendarCheck,
        badge: t('badgeLeave'),
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        onSelect: () => {
          setActiveTab('leaves');
          setIsOpen(false);
        },
      });

      return items;
    }

    // 1. Matched Navigation Pages
    navPages.forEach((p) => {
      if (p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)) {
        items.push({
          id: `nav-${p.id}`,
          categoryKey: 'catNavigation',
          title: p.label,
          subtitle: p.desc,
          icon: p.icon,
          badge: t('badgePage'),
          badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
          onSelect: () => {
            setActiveTab(p.tab);
            setIsOpen(false);
          },
        });
      }
    });

    // 2. Matched Employees
    employees.forEach((emp) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      if (
        fullName.includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.jobTitle.toLowerCase().includes(q) ||
        emp.departmentName.toLowerCase().includes(q)
      ) {
        const norm = (emp.status || '').toUpperCase().replace(/\s+/g, '_');
        items.push({
          id: `emp-${emp.employeeId}`,
          categoryKey: 'catEmployees',
          title: `${emp.firstName} ${emp.lastName}`,
          subtitle: `${emp.jobTitle} • ${emp.departmentName}`,
          avatarUrl: emp.avatarUrl,
          badge: tStatus(emp.status),
          badgeColor:
            norm === 'ACTIVE'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200',
          onSelect: () => {
            setActiveTab('employees');
            setSearchQuery(`${emp.firstName} ${emp.lastName}`);
            setIsOpen(false);
          },
        });
      }
    });

    // 3. Matched Departments
    departments.forEach((dept) => {
      if (
        dept.departmentName.toLowerCase().includes(q) ||
        (dept.description && dept.description.toLowerCase().includes(q)) ||
        (dept.leadName && dept.leadName.toLowerCase().includes(q))
      ) {
        items.push({
          id: `dept-${dept.departmentId}`,
          categoryKey: 'catDepartments',
          title: dept.departmentName,
          subtitle: `${t('gsLeadPrefix')} ${dept.leadName || t('unassigned')} • ${dept.headCount} ${t('gsPersonnelUnit')}`,
          icon: Buildings,
          badge: `$${(dept.budget || 0).toLocaleString()}`,
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
          onSelect: () => {
            setDepartmentsView('departments');
            setActiveTab('departments');
            setIsOpen(false);
          },
        });
      }
    });

    // 4. Matched Job Titles
    jobs.forEach((job) => {
      if (
        job.jobTitle.toLowerCase().includes(q) ||
        (job.departmentName && job.departmentName.toLowerCase().includes(q)) ||
        (job.description && job.description.toLowerCase().includes(q))
      ) {
        items.push({
          id: `job-${job.jobId}`,
          categoryKey: 'catJobs',
          title: job.jobTitle,
          subtitle: `${job.departmentName || ''}${
            job.minSalary && job.maxSalary
              ? ` • $${job.minSalary.toLocaleString()} – $${job.maxSalary.toLocaleString()}`
              : ''
          }`,
          icon: Briefcase,
          badge: t('badgePosition'),
          badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          onSelect: () => {
            setDepartmentsView('jobs');
            setActiveTab('departments');
            setSearchQuery(job.jobTitle);
            setIsOpen(false);
          },
        });
      }
    });

    // 5. Matched Leave Requests
    leaves.forEach((l) => {
      const translatedType = tLeaveType(l.leaveType);
      if (
        l.employeeName.toLowerCase().includes(q) ||
        l.leaveType.toLowerCase().includes(q) ||
        translatedType.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q)
      ) {
        items.push({
          id: `leave-${l.leaveId}`,
          categoryKey: 'catLeaves',
          title: `${l.employeeName} — ${translatedType}`,
          subtitle: `${l.daysCount} ${t('gsDaysUnit')} (${l.startDate} ${t('gsTo')} ${l.endDate})${l.reason ? ` • "${l.reason}"` : ''}`,
          icon: CalendarCheck,
          badge: tStatus(l.status),
          badgeColor:
            l.status === 'APPROVED'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : l.status === 'REJECTED'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-amber-50 text-amber-700 border-amber-200',
          onSelect: () => {
            setActiveTab('leaves');
            setIsOpen(false);
          },
        });
      }
    });

    return items;
  }, [searchQuery, navPages, employees, departments, jobs, leaves, setActiveTab, setDepartmentsView, setSearchQuery, t, tStatus, tLeaveType]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Keyboard navigation within the dropdown list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, searchResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        searchResults[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Group items by category for clean visual hierarchy
  const groupedResults = useMemo(() => {
    const groups: Record<string, { item: SearchItem; globalIdx: number }[]> = {};
    searchResults.forEach((item, idx) => {
      const catLabel = t(item.categoryKey);
      if (!groups[catLabel]) groups[catLabel] = [];
      groups[catLabel].push({ item, globalIdx: idx });
    });
    return groups;
  }, [searchResults, t]);

  return (
    <div className="relative flex-1 min-w-0 max-w-sm sm:flex-initial sm:w-80 lg:w-96" ref={searchContainerRef}>
      {/* Search Input Bar (40px desktop hit target) */}
      <div className="relative">
        <MagnifyingGlass
          weight="bold"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="global-search-listbox"
          aria-label={t('searchAria')}
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full h-10 pl-9 pr-14 rounded-xl bg-white border border-slate-200 text-sm sm:text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-colors shadow-2xs"
        />

        {searchQuery ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              inputRef.current?.focus();
            }}
            aria-label={t('clearSearch')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
          >
            <X weight="bold" className="w-3 h-3" />
          </button>
        ) : (
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-mono text-slate-400 border border-slate-200 pointer-events-none">
            /
          </kbd>
        )}
      </div>

      {/* Dropdown Results Panel */}
      {isOpen && (
        <div
          id="global-search-listbox"
          role="listbox"
          className="absolute left-0 top-12 z-50 w-full sm:w-[440px] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15 backdrop-blur-xl origin-top animate-in zoom-in-95 max-h-[420px] overflow-y-auto overscroll-contain"
        >
          {searchResults.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                <MagnifyingGlass weight="duotone" className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                {t('gsNoResultsTitle', { query: searchQuery })}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto">
                {t('gsNoResultsHint')}
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-1">
              {Object.entries(groupedResults).map(([category, entries]) => (
                <div key={category} className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {category} ({entries.length})
                  </div>
                  <div className="space-y-0.5">
                    {entries.map(({ item, globalIdx }) => {
                      const isSelected = globalIdx === selectedIndex;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          onClick={item.onSelect}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl text-left cursor-pointer transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                            isSelected
                              ? 'bg-blue-50/80 text-blue-900 shadow-2xs'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {/* Avatar or Icon */}
                          {item.avatarUrl ? (
                            <img
                              src={item.avatarUrl}
                              alt={item.title}
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
                            />
                          ) : Icon ? (
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                                isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <Icon weight={isSelected ? 'fill' : 'bold'} className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 font-bold text-xs">
                              {item.title.substring(0, 2).toUpperCase()}
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                className={`text-xs font-semibold truncate ${
                                  isSelected ? 'text-blue-900 font-bold' : 'text-slate-900'
                                }`}
                              >
                                {item.title}
                              </span>
                              {item.badge && (
                                <span
                                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold border shrink-0 ${
                                    item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {item.subtitle}
                            </p>
                          </div>

                          {/* Action Cue */}
                          <div
                            className={`opacity-0 shrink-0 text-slate-400 transition-opacity ${
                              isSelected ? 'opacity-100 text-blue-600' : ''
                            }`}
                          >
                            <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Keyboard Navigation Legend */}
          <div className="mt-2 pt-2 px-3 pb-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200">↑</kbd>
                <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200">↓</kbd>
                <span className="font-sans">{t('gsNavigate')}</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200">↵</kbd>
                <span className="font-sans">{t('gsSelect')}</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200">esc</kbd>
              <span className="font-sans">{t('gsClose')}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
