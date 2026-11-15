import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  Briefcase,
  Buildings,
  CheckCircle,
  CircleNotch,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  ShieldCheck,
  Trash,
  User,
  UsersThree,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../store/useHrmsStore';
import { Department, JobTitle } from '../types';
import { BehavioralHistorySelect } from '../components/ui/behavioral-history-select';
import { Modal, Drawer } from '../components/ui/modal';
import { useI18n } from '../i18n/useI18n';
import { hasPermission } from '../utils/rbac';
import { MetricCard } from '../components/dashboard/MetricCard';
import { FilterTabs } from '../components/ui/filter-tabs';

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
    updateJobTitle,
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
  const [deptFormError, setDeptFormError] = useState<string | null>(null);

  // Job Title Form state
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobTitleInput, setJobTitleInput] = useState('');
  const [jobDeptIdInput, setJobDeptIdInput] = useState<number>(1);
  const [jobDescInput, setJobDescInput] = useState('');
  const [jobError, setJobError] = useState<string | null>(null);
  // Set when the job dialog edits an existing job instead of adding one.
  const [editingJob, setEditingJob] = useState<JobTitle | null>(null);
  const canEditJobs = hasPermission(currentUser.role, 'JOB_TITLE_EDIT');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isManager = currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'ROLE_HR';

  // Calculate dynamic headcounts based on employees collection
  const departmentsWithLiveStats = useMemo(() => {
    return departments.map((dept) => {
      const assigned = employees.filter((e) => e.departmentId === dept.departmentId);
      return {
        ...dept,
        headCount: assigned.length,
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
        (d.description && d.description.toLowerCase().includes(q))
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
    setEditingDept(null);
    setDeptFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.departmentName);
    setFormDesc(dept.description);
    setDeptFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setDeptFormError(t('deptNameRequiredErr'));
      return;
    }

    setIsSubmitting(true);
    setDeptFormError(null);

    const res = editingDept
      ? await updateDepartment(editingDept.departmentId, {
          departmentName: formName.trim(),
          description: formDesc.trim(),
        })
      : await addDepartment({
          departmentName: formName.trim(),
          description: formDesc.trim(),
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

    const dept = departments.find((d) => d.departmentId === Number(jobDeptIdInput));

    if (editingJob) {
      setIsSubmitting(true);
      const res = await updateJobTitle(editingJob.jobId, {
        jobTitle: jobTitleInput.trim(),
        departmentId: Number(jobDeptIdInput),
        description: jobDescInput.trim() || undefined,
      });
      setIsSubmitting(false);
      if (res.success) {
        setIsJobModalOpen(false);
        setEditingJob(null);
        setToastMessage(t('jbUpdatedToast', { title: jobTitleInput.trim() }));
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        setJobError(res.error === 'FORBIDDEN' ? t('jbNoPermission') : res.error || 'Failed to update job title');
      }
      return;
    }

    setIsSubmitting(true);
    const result = await addJobTitle({
      jobTitle: jobTitleInput.trim(),
      departmentId: Number(jobDeptIdInput),
      departmentName: dept?.departmentName || '',
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

  const avgTeamSize = departments.length ? Math.round((totalEmployeesCount / departments.length) * 10) / 10 : 0;
  const primaryBtn =
    'inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none';
  const iconBtn =
    'w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none';

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('metricTotalDivisions')}
          icon={Buildings}
          value={departments.length}
          subtitle={t('metricTotalDivisionsSub')}
        />
        <MetricCard
          title={t('metricConfiguredRoles')}
          icon={Briefcase}
          value={jobs.length}
          subtitle={t('metricConfiguredRolesSub')}
        />
        <MetricCard
          title={t('metricAssignedStaff')}
          icon={User}
          value={totalEmployeesCount}
          subtitle={t('metricAssignedStaffSub')}
        />
        <MetricCard title={t('orgAvgTeam')} icon={UsersThree} value={avgTeamSize} subtitle={t('orgAvgTeamSub')} />
      </div>

      {/* 2. View tabs + primary action */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterTabs
          label={t('orgViewLabel')}
          value={activeView}
          onChange={setActiveView}
          className="flex-1 min-w-[260px]"
          tabs={[
            { value: 'departments', label: t('orgTabDepartments'), count: departments.length },
            { value: 'jobs', label: t('orgTabJobs'), count: jobs.length },
          ]}
        />
        {isManager &&
          (activeView === 'departments' ? (
            <button type="button" onClick={handleOpenCreate} className={primaryBtn}>
              <Plus weight="bold" className="w-4 h-4" />
              {t('createDepartment')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setJobTitleInput('');
                setJobDescInput('');
                setJobDeptIdInput(departments[0]?.departmentId || 1);
                setJobError(null);
                setEditingJob(null);
                setIsJobModalOpen(true);
              }}
              className={primaryBtn}
            >
              <Plus weight="bold" className="w-4 h-4" />
              {t('addJobTitle')}
            </button>
          ))}
      </div>

      {deleteError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-start justify-between gap-3 animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <WarningCircle weight="fill" className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{deleteError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            aria-label={t('closeDialog')}
            className="text-rose-700 hover:text-rose-900 p-1 rounded cursor-pointer"
          >
            <X weight="bold" className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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

      {/* VIEW A: DEPARTMENTS */}
      {activeView === 'departments' && (
        <>
          <label className="flex items-center gap-2 h-10 max-w-md px-3 rounded-lg border border-slate-200 bg-white text-slate-500 focus-within:ring-2 focus-within:ring-brand-500">
            <MagnifyingGlass weight="bold" className="w-4 h-4 shrink-0" />
            <span className="sr-only">{t('searchDeptsPlaceholder')}</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchDeptsPlaceholder')}
              className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[13px] font-semibold text-slate-600 hover:text-slate-900 px-1.5 py-0.5 rounded cursor-pointer"
              >
                {t('clearBtn')}
              </button>
            )}
          </label>

          {filteredDepartments.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">{t('orgNoDeptsMatch')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDepartments.map((dept) => {
                const deptJobsCount = jobs.filter((j) => j.departmentId === dept.departmentId).length;
                return (
                  <section
                    key={dept.departmentId}
                    className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4 min-w-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <Buildings weight="regular" className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-base font-semibold text-slate-900 truncate">{dept.departmentName}</h2>
                          <span className="text-[13px] text-slate-500">{t('orgJobsCount', { count: deptJobsCount })}</span>
                        </div>
                      </div>

                      {isManager && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(dept)}
                            aria-label={`${t('editDeptTooltip')} ${dept.departmentName}`}
                            title={t('editDeptTooltip')}
                            className={`${iconBtn} hover:text-brand-700 hover:bg-brand-50`}
                          >
                            <PencilSimple weight="bold" className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteDept(dept)}
                            aria-label={`${t('deleteDeptTooltip')} ${dept.departmentName}`}
                            title={t('deleteDeptTooltip')}
                            className={`${iconBtn} hover:text-rose-700 hover:bg-rose-50`}
                          >
                            <Trash weight="bold" className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {dept.description || t('noDescProvided')}
                    </p>

                    <dl className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-2.5 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-slate-500">{t('activeRosterLabel')}</dt>
                        <dd>
                          <button
                            type="button"
                            onClick={() => setSelectedDeptForRoster(dept)}
                            className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800 hover:underline rounded cursor-pointer tabular-nums focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                          >
                            {dept.headCount} {t('gsPersonnelUnit')}
                            <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                          </button>
                        </dd>
                      </div>
                    </dl>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VIEW B: JOB TITLES */}
      {activeView === 'jobs' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BehavioralHistorySelect
              label={t('filterDeptLabel')}
              placeholder={t('allDepartments')}
              options={[
                { value: 'ALL', label: t('allDepartments') },
                ...departments.map((d) => ({ value: String(d.departmentId), label: d.departmentName })),
              ]}
              value={selectedJobDeptFilter}
              onChange={(val) => setSelectedJobDeptFilter(val)}
              selectWidth="240px"
              storageKey="hrms_job_dept_filter"
            />
            <span className="text-[13px] text-slate-500">
              {t('showingJobsCount', { shown: filteredJobs.length, total: jobs.length })}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <th scope="col" className="py-3 px-5">{t('colJobTitle')}</th>
                  <th scope="col" className="py-3 px-5">{t('colDepartment')}</th>
                  <th scope="col" className="py-3 px-5 text-right">{t('colAssignedStaff')}</th>
                  {isManager && (
                    <th scope="col" className="py-3 px-5 text-right">
                      <span className="sr-only">{t('colActions')}</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700 tabular-nums">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 px-5 text-center text-slate-500">
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
                      <tr key={job.jobId}>
                        <td className="py-3.5 px-5 font-semibold text-slate-900">{job.jobTitle}</td>
                        <td className="py-3.5 px-5 text-slate-600">{job.departmentName || dept?.departmentName || '—'}</td>
                        <td className="py-3.5 px-5 text-right">
                          {assignedStaff.length}{' '}
                          {assignedStaff.length === 1 ? t('employeeSingular') : t('employeePlural')}
                        </td>
                        {isManager && (
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            {canEditJobs && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingJob(job);
                                  setJobTitleInput(job.jobTitle);
                                  setJobDeptIdInput(job.departmentId || departments[0]?.departmentId || 1);
                                  setJobDescInput(job.description || '');
                                  setJobError(null);
                                  setIsJobModalOpen(true);
                                }}
                                aria-label={t('jbEditAria', { name: job.jobTitle })}
                                title={t('jbEditTitle')}
                                className={`${iconBtn} hover:text-brand-700 hover:bg-brand-50`}
                              >
                                <PencilSimple weight="bold" className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteJob(job)}
                              aria-label={`${t('deleteJobTooltip')} ${job.jobTitle}`}
                              title={t('deleteJobTooltip')}
                              className={`${iconBtn} hover:text-rose-700 hover:bg-rose-50`}
                            >
                              <Trash weight="bold" className="w-4 h-4" />
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
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {`${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {emp.firstName} {emp.lastName}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">{emp.jobTitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {tStatus(emp.status)}
                  </span>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">#{emp.employeeId}</div>
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
            <label htmlFor="deptNameInput" className="block text-sm font-semibold text-slate-800 mb-1.5">
              {t('deptNameLabel')}
            </label>
            <input
              id="deptNameInput"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t('deptNamePlaceholder')}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:border-brand-500"
            />
          </div>

          <div>
            <label htmlFor="deptDescInput" className="block text-sm font-semibold text-slate-800 mb-1.5">
              {t('descriptionLabel')}
            </label>
            <textarea
              id="deptDescInput"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder={t('deptDescPlaceholder')}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:border-brand-500"
            />
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
              className="inline-flex items-center gap-2 min-h-[38px] px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold active:scale-[0.98] transition-[transform,background-color] disabled:opacity-60 cursor-pointer"
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
        onClose={() => {
          setIsJobModalOpen(false);
          setEditingJob(null);
        }}
        title={editingJob ? t('jbEditTitle') : t('addJobModalTitle')}
        subtitle={editingJob ? t('jbEditSub') : t('addJobModalSub')}
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
            <label htmlFor="jobTitleInput" className="block text-sm font-semibold text-slate-800 mb-1.5">
              {t('jobTitleLabel')}
            </label>
            <input
              id="jobTitleInput"
              type="text"
              value={jobTitleInput}
              onChange={(e) => setJobTitleInput(e.target.value)}
              placeholder={t('jobTitlePlaceholder')}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
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


          <div>
            <label htmlFor="jobDescInput" className="block text-sm font-semibold text-slate-800 mb-1.5">
              {t('descOptionalLabel')}
            </label>
            <textarea
              id="jobDescInput"
              value={jobDescInput}
              onChange={(e) => setJobDescInput(e.target.value)}
              placeholder={t('jobDescPlaceholder')}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
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
              className="inline-flex items-center gap-2 min-h-[38px] px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold active:scale-[0.98] transition-[transform,background-color] disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <span>{editingJob ? t('acSave') : t('saveJobTitle')}</span>
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
