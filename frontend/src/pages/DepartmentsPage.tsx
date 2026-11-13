import React, { useState, useMemo, useEffect } from 'react';
import {
  Buildings,
  Plus,
  MagnifyingGlass,
  Trash,
  PencilSimple,
  X,
  WarningCircle,
  ArrowRight,
  ShieldCheck,
  User,
  Briefcase,
  CheckCircle,
  CircleNotch,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../store/useHrmsStore';
import { Department, JobTitle } from '../types';
import { BehavioralHistorySelect } from '../components/ui/behavioral-history-select';
import { Modal, Drawer } from '../components/ui/modal';
import { useI18n } from '../i18n/useI18n';

export const DepartmentsPage: React.FC = () => {
  const {
    departments,
    jobs,
    employees,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addJobTitle,
    deleteJobTitle,
    departmentsView: activeView,
    setDepartmentsView: setActiveView,
    currentUser,
    searchQuery: globalQuery,
  } = useHrmsStore();
  const { t, tStatus } = useI18n();

  const [searchQuery, setSearchQuery] = useState(globalQuery);
  const [selectedJobDeptFilter, setSelectedJobDeptFilter] = useState<string>('ALL');

  useEffect(() => {
    if (globalQuery) setSearchQuery(globalQuery);
  }, [globalQuery]);

  const [selectedDeptForRoster, setSelectedDeptForRoster] = useState<Department | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm delete modals
  const [confirmDeleteDept, setConfirmDeleteDept] = useState<Department | null>(null);
  const [confirmDeleteJob, setConfirmDeleteJob] = useState<JobTitle | null>(null);

  // Department Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formBudget, setFormBudget] = useState('35000');
  const [formLeadId, setFormLeadId] = useState<number | ''>('');
  const [deptFormError, setDeptFormError] = useState<string | null>(null);

  // Job Title Form state
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobTitleInput, setJobTitleInput] = useState('');
  const [jobDeptIdInput, setJobDeptIdInput] = useState<number>(1);
  const [jobMinSalaryInput, setJobMinSalaryInput] = useState('1800');
  const [jobMaxSalaryInput, setJobMaxSalaryInput] = useState('3200');
  const [jobDescInput, setJobDescInput] = useState('');
  const [jobError, setJobError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isManager = currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'ROLE_HR';

  // Calculate dynamic headcounts based on employees collection
  const departmentsWithLiveStats = useMemo(() => {
    return departments.map((dept) => {
      const assigned = employees.filter((e) => e.departmentId === dept.departmentId);
      const lead = employees.find((e) => e.employeeId === dept.leadEmployeeId);
      return {
        ...dept,
        headCount: assigned.length,
        leadName: lead ? `${lead.firstName} ${lead.lastName}` : dept.leadName || t('unassigned'),
        leadAvatar: lead ? lead.avatarUrl : dept.leadAvatar,
      };
    });
  }, [departments, employees, t]);

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departmentsWithLiveStats;
    const q = searchQuery.toLowerCase();
    return departmentsWithLiveStats.filter(
      (d) =>
        d.departmentName.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        (d.leadName && d.leadName.toLowerCase().includes(q))
    );
  }, [departmentsWithLiveStats, searchQuery]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchesDept =
        selectedJobDeptFilter === 'ALL' || String(j.departmentId) === selectedJobDeptFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        j.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (j.departmentName && j.departmentName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesDept && matchesSearch;
    });
  }, [jobs, selectedJobDeptFilter, searchQuery]);

  const totalEmployeesCount = employees.length;

  const handleOpenCreate = () => {
    setFormName('');
    setFormDesc('');
    setFormBudget('40000');
    setFormLeadId(employees[0]?.employeeId || '');
    setEditingDept(null);
    setDeptFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.departmentName);
    setFormDesc(dept.description);
    setFormBudget(dept.budget ? String(dept.budget) : '35000');
    setFormLeadId(dept.leadEmployeeId || employees[0]?.employeeId || '');
    setDeptFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setDeptFormError(t('deptNameRequiredErr'));
      return;
    }

    const leadId = typeof formLeadId === 'number' ? formLeadId : undefined;
    const lead = employees.find((emp) => emp.employeeId === leadId);

    setIsSubmitting(true);
    setDeptFormError(null);

    const res = editingDept
      ? await updateDepartment(editingDept.departmentId, {
          departmentName: formName.trim(),
          description: formDesc.trim(),
          budget: Number(formBudget) || 0,
          leadEmployeeId: leadId,
          leadName: lead ? `${lead.firstName} ${lead.lastName}` : undefined,
          leadAvatar: lead?.avatarUrl,
        })
      : await addDepartment({
          departmentName: formName.trim(),
          description: formDesc.trim(),
          budget: Number(formBudget) || 0,
          leadEmployeeId: leadId,
          leadName: lead ? `${lead.firstName} ${lead.lastName}` : t('unassigned'),
          leadAvatar: lead?.avatarUrl,
        });

    setIsSubmitting(false);

    if (!res.success) {
      setDeptFormError(res.error || 'Failed to save department.');
      return;
    }

    setIsCreateModalOpen(false);
    setToastMessage(t('deptSavedToast', { name: formName.trim() }));
    setTimeout(() => setToastMessage(null), 3500);
  };

  const executeDeleteDepartment = async () => {
    if (!confirmDeleteDept) return;
    setDeleteError(null);
    setIsSubmitting(true);
    const result = await deleteDepartment(confirmDeleteDept.departmentId);
    setIsSubmitting(false);
    if (!result.success && result.error) {
      setDeleteError(result.error);
    } else {
      setToastMessage(t('deptRemovedToast', { name: confirmDeleteDept.departmentName }));
      setTimeout(() => setToastMessage(null), 3000);
    }
    setConfirmDeleteDept(null);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setJobError(null);
    if (!jobTitleInput.trim()) {
      setJobError(t('enterJobTitleError'));
      return;
    }
    const minVal = jobMinSalaryInput ? Number(jobMinSalaryInput) : undefined;
    const maxVal = jobMaxSalaryInput ? Number(jobMaxSalaryInput) : undefined;
    if (minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
      setJobError(t('invalidSalaryBandErr'));
      return;
    }

    const dept = departments.find((d) => d.departmentId === Number(jobDeptIdInput));
    setIsSubmitting(true);
    const result = await addJobTitle({
      jobTitle: jobTitleInput.trim(),
      departmentId: Number(jobDeptIdInput),
      departmentName: dept?.departmentName || '',
      minSalary: Number(jobMinSalaryInput) || undefined,
      maxSalary: Number(jobMaxSalaryInput) || undefined,
      description: jobDescInput.trim() || undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      setIsJobModalOpen(false);
      setJobTitleInput('');
      setJobDescInput('');
      setToastMessage(
        t('jobCreatedToast', {
          title: result.data?.jobTitle || jobTitleInput.trim(),
          dept: dept?.departmentName || '',
        })
      );
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      setJobError(result.error || 'Failed to create job title');
    }
  };

  const executeDeleteJob = async () => {
    if (!confirmDeleteJob) return;
    setDeleteError(null);
    setIsSubmitting(true);
    const result = await deleteJobTitle(confirmDeleteJob.jobId);
    setIsSubmitting(false);
    if (!result.success && result.error) {
      setDeleteError(result.error);
    } else {
      setToastMessage(t('jobRemovedToast', { name: confirmDeleteJob.jobTitle }));
      setTimeout(() => setToastMessage(null), 3000);
    }
    setConfirmDeleteJob(null);
  };

  const rosterEmployees = useMemo(() => {
    if (!selectedDeptForRoster) return [];
    return employees.filter((e) => e.departmentId === selectedDeptForRoster.departmentId);
  }, [selectedDeptForRoster, employees]);

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{t('orgJobsTitle')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('orgJobsSub')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented View Switcher */}
          <div className="p-1 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveView('departments')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeView === 'departments'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t('tabDepartments', { count: departments.length })}
            </button>
            <button
              type="button"
              onClick={() => setActiveView('jobs')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeView === 'jobs'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t('tabJobTitles', { count: jobs.length })}
            </button>
          </div>

          {isManager &&
            (activeView === 'departments' ? (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 min-h-[38px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs active:scale-[0.98] transition-[transform,background-color] cursor-pointer"
              >
                <Plus weight="bold" className="w-4 h-4" />
                <span>{t('createDepartment')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setJobTitleInput('');
                  setJobDescInput('');
                  setJobMinSalaryInput('1800');
                  setJobMaxSalaryInput('3200');
                  setJobDeptIdInput(departments[0]?.departmentId || 1);
                  setJobError(null);
                  setIsJobModalOpen(true);
                }}
                className="inline-flex items-center gap-2 min-h-[38px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs active:scale-[0.98] transition-[transform,background-color] cursor-pointer"
              >
                <Plus weight="bold" className="w-4 h-4" />
                <span>{t('addJobTitle')}</span>
              </button>
            ))}
        </div>
      </div>

      {/* 2. Top Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            {t('metricTotalDivisions')}
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {departments.length}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">{t('metricTotalDivisionsSub')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            {t('metricConfiguredRoles')}
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {jobs.length}
          </div>
          <span className="text-[10px] text-blue-600 font-medium mt-1 block">
            {t('metricConfiguredRolesSub')}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            {t('metricAssignedStaff')}
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            {totalEmployeesCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">{t('metricAssignedStaffSub')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            {t('metricGovernance')}
          </span>
          <div className="text-sm font-bold text-slate-800 mt-2 flex items-center gap-1.5">
            <ShieldCheck weight="bold" className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t('strictDeptMapping')}</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">{t('flywayV5Enforced')}</span>
        </div>
      </div>

      {/* Safety Alert Banner if Deletion blocked */}
      {deleteError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between gap-3 animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <WarningCircle weight="fill" className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{deleteError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            aria-label={t('closeDialog')}
            className="text-rose-500 hover:text-rose-700 p-1 rounded cursor-pointer"
          >
            <X weight="bold" className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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

      {/* VIEW A: DEPARTMENTS GRID */}
      {activeView === 'departments' && (
        <>
          {/* Search Filter */}
          <div className="flex items-center gap-3 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
            <MagnifyingGlass weight="bold" className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              aria-label={t('searchDeptsPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchDeptsPlaceholder')}
              className="w-full text-sm sm:text-xs bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 rounded-lg text-slate-800 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer px-1.5 py-0.5 rounded"
              >
                {t('clearBtn')}
              </button>
            )}
          </div>

          {/* Departments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDepartments.map((dept) => {
              const deptJobsCount = jobs.filter((j) => j.departmentId === dept.departmentId).length;
              return (
                <div
                  key={dept.departmentId}
                  className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-[box-shadow,border-color] duration-150 relative group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
                          <Buildings weight="duotone" className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
                            {dept.departmentName}
                          </h3>
                          <span className="text-[11px] font-mono text-slate-400">
                            #{dept.departmentId} • {deptJobsCount} {t('catJobs').toLowerCase()}
                          </span>
                        </div>
                      </div>

                      {isManager && (
                        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(dept)}
                            aria-label={`${t('editDeptTooltip')} ${dept.departmentName}`}
                            title={t('editDeptTooltip')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
                          >
                            <PencilSimple weight="bold" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteDept(dept)}
                            aria-label={`${t('deleteDeptTooltip')} ${dept.departmentName}`}
                            title={t('deleteDeptTooltip')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"
                          >
                            <Trash weight="bold" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                      {dept.description || t('noDescProvided')}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{t('deptLeadLabel')}</span>
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        {dept.leadAvatar ? (
                          <img
                            src={dept.leadAvatar}
                            alt=""
                            width={16}
                            height={16}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <User weight="bold" className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="truncate max-w-[120px]">{dept.leadName}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{t('activeRosterLabel')}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDeptForRoster(dept)}
                        className="font-mono font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>
                          {dept.headCount} {t('gsPersonnelUnit')}
                        </span>
                        <ArrowRight weight="bold" className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{t('monthlyBudgetLabel')}</span>
                      <span className="font-mono font-bold text-slate-800 tabular-nums">
                        ${(dept.budget || 35000).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* VIEW B: JOB TITLES DIRECTORY */}
      {activeView === 'jobs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">{t('filterDeptLabel')}</span>
              <BehavioralHistorySelect
                placeholder={t('allDepartments')}
                options={[
                  { value: 'ALL', label: t('allDepartments') },
                  ...departments.map((d) => ({
                    value: String(d.departmentId),
                    label: d.departmentName,
                  })),
                ]}
                value={selectedJobDeptFilter}
                onChange={(val) => setSelectedJobDeptFilter(val)}
                selectWidth="220px"
                storageKey="hrms_job_dept_filter"
              />
            </div>

            <div className="text-xs text-slate-400 font-mono">
              {t('showingJobsCount', { shown: filteredJobs.length, total: jobs.length })}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">{t('colJobTitle')}</th>
                    <th className="px-6 py-3.5">{t('colDepartment')}</th>
                    <th className="px-6 py-3.5">{t('colSalaryBand')}</th>
                    <th className="px-6 py-3.5">{t('colAssignedStaff')}</th>
                    {isManager && <th className="px-6 py-3.5 text-right">{t('colActions')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        {t('noJobsMatch')}
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => {
                      const assignedStaff = employees.filter(
                        (e) =>
                          (job.departmentId === undefined || e.departmentId === job.departmentId) &&
                          e.jobTitle?.trim().toLowerCase() === job.jobTitle.trim().toLowerCase()
                      );
                      const dept = departments.find((d) => d.departmentId === job.departmentId);

                      return (
                        <tr key={job.jobId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <Briefcase weight="duotone" className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>{job.jobTitle}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 font-medium text-slate-700">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[11px] font-mono">
                              {job.departmentName || dept?.departmentName || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 font-mono text-slate-600 tabular-nums">
                            {job.minSalary && job.maxSalary
                              ? `$${job.minSalary.toLocaleString()} – $${job.maxSalary.toLocaleString()}`
                              : t('standardBand')}
                          </td>
                          <td className="px-6 py-3.5 font-mono font-semibold text-slate-800 tabular-nums">
                            {assignedStaff.length}{' '}
                            {assignedStaff.length === 1 ? t('employeeSingular') : t('employeePlural')}
                          </td>
                          {isManager && (
                            <td className="px-6 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteJob(job)}
                                aria-label={`${t('deleteJobTooltip')} ${job.jobTitle}`}
                                title={t('deleteJobTooltip')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"
                              >
                                <Trash weight="bold" className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* Drawer: Department Personnel Roster */}
      <Drawer
        isOpen={Boolean(selectedDeptForRoster)}
        onClose={() => setSelectedDeptForRoster(null)}
        title={selectedDeptForRoster?.departmentName || t('deptRosterTitle')}
        subtitle={t('deptRosterSub', { count: rosterEmployees.length })}
        width="md"
      >
        <div className="space-y-3">
          {rosterEmployees.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              {t('noPersonnelInDept')}
            </div>
          ) : (
            rosterEmployees.map((emp) => (
              <div
                key={emp.employeeId}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {emp.avatarUrl ? (
                    <img
                      src={emp.avatarUrl}
                      alt={`${emp.firstName} ${emp.lastName}`}
                      width={36}
                      height={36}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {`${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {emp.firstName} {emp.lastName}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">{emp.jobTitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {tStatus(emp.status)}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">#{emp.employeeId}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </Drawer>

      {/* Modal: Create / Edit Department */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingDept ? t('editDeptModalTitle') : t('createDeptModalTitle')}
        subtitle={t('deptModalSub')}
        maxWidth="md"
      >
        <form onSubmit={handleSaveDepartment} className="space-y-3.5">
          {deptFormError && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2"
            >
              <WarningCircle weight="fill" className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{deptFormError}</span>
            </div>
          )}

          <div>
            <label htmlFor="deptNameInput" className="block text-xs font-semibold text-slate-700 mb-1">
              {t('deptNameLabel')}
            </label>
            <input
              id="deptNameInput"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t('deptNamePlaceholder')}
              required
              className="w-full px-3 py-2 text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="deptDescInput" className="block text-xs font-semibold text-slate-700 mb-1">
              {t('descriptionLabel')}
            </label>
            <textarea
              id="deptDescInput"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder={t('deptDescPlaceholder')}
              rows={2}
              className="w-full px-3 py-2 text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="deptBudgetInput" className="block text-xs font-semibold text-slate-700 mb-1">
                {t('monthlyBudgetUsdLabel')}
              </label>
              <input
                id="deptBudgetInput"
                type="number"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
                placeholder="40000"
                required
                className="w-full px-3 py-2 text-sm sm:text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('deptLeadLabel')}
              </label>
              <BehavioralHistorySelect
                placeholder={t('chooseLeadPlaceholder')}
                options={employees.map((emp) => ({
                  value: emp.employeeId,
                  label: `${emp.firstName} ${emp.lastName}`,
                }))}
                value={formLeadId}
                onChange={(val) => setFormLeadId(Number(val))}
                storageKey="hrms_dept_lead_history"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="min-h-[38px] px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 min-h-[38px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold active:scale-[0.98] transition-[transform,background-color] disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <span>{editingDept ? t('saveChanges') : t('createDepartment')}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Job Title */}
      <Modal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        title={t('addJobModalTitle')}
        subtitle={t('addJobModalSub')}
        maxWidth="md"
      >
        <form onSubmit={handleSaveJob} className="space-y-3.5">
          {jobError && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2"
            >
              <WarningCircle weight="fill" className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{jobError}</span>
            </div>
          )}

          <div>
            <label htmlFor="jobTitleInput" className="block text-xs font-semibold text-slate-700 mb-1">
              {t('jobTitleLabel')}
            </label>
            <input
              id="jobTitleInput"
              type="text"
              value={jobTitleInput}
              onChange={(e) => setJobTitleInput(e.target.value)}
              placeholder={t('jobTitlePlaceholder')}
              required
              className="w-full px-3 py-2 text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('assignedDeptLabel')}
            </label>
            <BehavioralHistorySelect
              placeholder={t('selectDepartmentPlaceholder')}
              options={departments.map((d) => ({
                value: String(d.departmentId),
                label: d.departmentName,
              }))}
              value={String(jobDeptIdInput)}
              onChange={(val) => setJobDeptIdInput(Number(val))}
              storageKey="hrms_job_modal_dept"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="jobMinSalary" className="block text-xs font-semibold text-slate-700 mb-1">
                {t('minBaseSalaryLabel')}
              </label>
              <input
                id="jobMinSalary"
                type="number"
                value={jobMinSalaryInput}
                onChange={(e) => setJobMinSalaryInput(e.target.value)}
                placeholder="1500"
                className="w-full px-3 py-2 text-sm sm:text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>
            <div>
              <label htmlFor="jobMaxSalary" className="block text-xs font-semibold text-slate-700 mb-1">
                {t('maxBaseSalaryLabel')}
              </label>
              <input
                id="jobMaxSalary"
                type="number"
                value={jobMaxSalaryInput}
                onChange={(e) => setJobMaxSalaryInput(e.target.value)}
                placeholder="3000"
                className="w-full px-3 py-2 text-sm sm:text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>
          </div>

          <div>
            <label htmlFor="jobDescInput" className="block text-xs font-semibold text-slate-700 mb-1">
              {t('descOptionalLabel')}
            </label>
            <textarea
              id="jobDescInput"
              value={jobDescInput}
              onChange={(e) => setJobDescInput(e.target.value)}
              placeholder={t('jobDescPlaceholder')}
              rows={2}
              className="w-full px-3 py-2 text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsJobModalOpen(false)}
              className="min-h-[38px] px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 min-h-[38px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold active:scale-[0.98] transition-[transform,background-color] disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <span>{t('saveJobTitle')}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Department Modal */}
      <Modal
        isOpen={Boolean(confirmDeleteDept)}
        onClose={() => setConfirmDeleteDept(null)}
        title={t('deleteDeptTooltip')}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('confirmDeleteDept', { name: confirmDeleteDept?.departmentName || '' })}
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setConfirmDeleteDept(null)}
              className="min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={executeDeleteDepartment}
              disabled={isSubmitting}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {t('deleteDeptTooltip')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Job Modal */}
      <Modal
        isOpen={Boolean(confirmDeleteJob)}
        onClose={() => setConfirmDeleteJob(null)}
        title={t('deleteJobTooltip')}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('confirmDeleteJob', { name: confirmDeleteJob?.jobTitle || '' })}
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setConfirmDeleteJob(null)}
              className="min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={executeDeleteJob}
              disabled={isSubmitting}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {t('deleteJobTooltip')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
