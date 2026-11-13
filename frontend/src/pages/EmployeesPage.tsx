import React, { useState, useEffect } from 'react';
import {
  UsersThree,
  UserPlus,
  MagnifyingGlass,
  Trash,
  PencilSimple,
  XCircle,
  TreeStructure,
  CheckCircle,
  CurrencyDollar,
  EyeSlash,
  ShieldCheck,
  CircleNotch,
  WarningCircle,
} from '@phosphor-icons/react';
import { useHrmsStore } from '../store/useHrmsStore';
import { Employee } from '../types';
import { BehavioralHistorySelect } from '../components/ui/behavioral-history-select';
import { Modal } from '../components/ui/modal';
import { hasPermission } from '../utils/rbac';
import { useI18n } from '../i18n/useI18n';
import { payrollApi } from '../api';

export const EmployeesPage: React.FC = () => {
  const {
    employees,
    departments,
    jobs,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    currentUser,
    searchQuery,
  } = useHrmsStore();
  const { t, tStatus } = useI18n();

  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm Terminate Modal State
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<Employee | null>(null);

  // Edit Employee State
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dob: '1995-01-01',
    contractEndDate: '2028-12-31',
    departmentId: 1,
    jobTitle: '',
    jobId: 1,
    salary: 2000,
    status: 'Active' as 'Active' | 'On Leave' | 'Probation' | 'Terminated',
  });

  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  // Add Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    gender: 'Male' as const,
    dob: '1995-01-01',
    salary: 2000,
    departmentId: 1,
    jobTitle: '',
    jobId: 1,
    status: 'Active' as const,
    hireDate: new Date().toISOString().split('T')[0],
  });

  const departmentJobs = React.useMemo(() => {
    const list = jobs.filter((j) => j.departmentId === Number(formData.departmentId));
    return list.length > 0 ? list : jobs;
  }, [jobs, formData.departmentId]);

  const editDepartmentJobs = React.useMemo(() => {
    const list = jobs.filter((j) => j.departmentId === Number(editFormData.departmentId));
    return list.length > 0 ? list : jobs;
  }, [jobs, editFormData.departmentId]);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept =
      selectedDept === 'ALL' || emp.departmentName === selectedDept;

    return matchesSearch && matchesDept;
  });

  const activeCount = employees.filter(
    (e) => e.status?.toUpperCase() === 'ACTIVE' || e.status === 'Active'
  ).length;
  const avgSalary = Math.round(
    employees.reduce((sum, e) => sum + (e.salary || 0), 0) / (employees.length || 1)
  );

  const handleOpenAdd = () => {
    const defaultDeptId = departments[0]?.departmentId || 1;
    const defaultJob = jobs.find((j) => j.departmentId === defaultDeptId) || jobs[0];
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      gender: 'Male',
      dob: '1995-01-01',
      salary: defaultJob?.minSalary || 2000,
      departmentId: defaultDeptId,
      jobTitle: defaultJob?.jobTitle || '',
      jobId: defaultJob?.jobId || 1,
      status: 'Active',
      hireDate: new Date().toISOString().split('T')[0],
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      setFormError(t('fillRequiredEmpError'));
      return;
    }

    const dept = departments.find((d) => d.departmentId === Number(formData.departmentId));
    const effectiveJob =
      departmentJobs.find((j) => j.jobTitle === formData.jobTitle) || departmentJobs[0];

    setIsSubmitting(true);
    setFormError(null);

    const res = await addEmployee({
      ...formData,
      departmentId: Number(formData.departmentId),
      departmentName: dept ? dept.departmentName : '',
      jobTitle: effectiveJob?.jobTitle || formData.jobTitle || '',
      jobId: effectiveJob?.jobId || formData.jobId || 1,
      salary: Number(formData.salary),
    });

    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || 'Failed to register employee.');
      return;
    }

    setIsAddModalOpen(false);
    setToastMessage(
      t('empRegisteredToast', { name: `${formData.firstName} ${formData.lastName}` })
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditFormError(null);
    const deptJobs = jobs.filter((j) => j.departmentId === emp.departmentId);
    const matchedJob =
      deptJobs.find(
        (j) => j.jobTitle.trim().toLowerCase() === (emp.jobTitle || '').trim().toLowerCase()
      ) || deptJobs[0];
    const upperStatus = (emp.status || '').toUpperCase().replace(/\s+/g, '_');
    setEditFormData({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phoneNumber: emp.phoneNumber || '',
      dob: emp.dob || emp.dateOfBirth || '1995-01-01',
      contractEndDate: emp.contractEndDate || '2028-12-31',
      departmentId: emp.departmentId,
      jobTitle: matchedJob?.jobTitle || emp.jobTitle,
      jobId: matchedJob?.jobId || jobs[0]?.jobId || 1,
      salary: emp.salary || matchedJob?.minSalary || 0,
      status:
        upperStatus === 'ON_LEAVE'
          ? 'On Leave'
          : upperStatus === 'TERMINATED'
          ? 'Terminated'
          : upperStatus === 'PROBATION'
          ? 'Probation'
          : 'Active',
    });
    setIsEditModalOpen(true);

    if (canViewSalary) {
      payrollApi
        .getProfile(emp.employeeId)
        .then((profile) => {
          if (profile && typeof profile.baseSalary === 'number') {
            setEditFormData((prev) => ({ ...prev, salary: profile.baseSalary }));
          }
        })
        .catch(() => {
          // No payroll profile yet — keep fallback salary
        });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const dept = departments.find((d) => d.departmentId === Number(editFormData.departmentId));
    const effectiveJob =
      editDepartmentJobs.find((j) => j.jobTitle === editFormData.jobTitle) || editDepartmentJobs[0];

    setIsSubmitting(true);
    setEditFormError(null);

    const res = await updateEmployee(editingEmployee.employeeId, {
      ...editFormData,
      dateOfBirth: editFormData.dob,
      departmentId: Number(editFormData.departmentId),
      departmentName: dept?.departmentName || editingEmployee.departmentName,
      jobTitle: effectiveJob?.jobTitle || editFormData.jobTitle,
      jobId: effectiveJob?.jobId || editFormData.jobId,
      salary: Number(editFormData.salary),
    });

    setIsSubmitting(false);

    if (!res.success) {
      setEditFormError(res.error || 'Failed to update employee.');
      return;
    }

    setIsEditModalOpen(false);
    setToastMessage(
      t('empUpdatedToast', { name: `${editFormData.firstName} ${editFormData.lastName}` })
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTarget) return;
    setIsSubmitting(true);
    setPageError(null);
    const res = await deleteEmployee(confirmDeleteTarget.employeeId);
    setIsSubmitting(false);
    if (!res.success) {
      setPageError(res.error || 'Failed to terminate employee.');
    } else {
      setToastMessage(
        t('empTerminatedToast', {
          name: `${confirmDeleteTarget.firstName} ${confirmDeleteTarget.lastName}`,
        })
      );
      setTimeout(() => setToastMessage(null), 3500);
    }
    setConfirmDeleteTarget(null);
  };

  const canCreate = hasPermission(currentUser.role, 'EMPLOYEE_CREATE');
  const canEdit = hasPermission(currentUser.role, 'EMPLOYEE_EDIT');
  const canViewSalary = hasPermission(currentUser.role, 'EMPLOYEE_VIEW_SALARY');
  const canDelete = hasPermission(currentUser.role, 'EMPLOYEE_DELETE');

  const getStatusBadgeClasses = (status: string) => {
    const norm = (status || '').toUpperCase().replace(/\s+/g, '_');
    if (norm === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60';
    if (norm === 'ON_LEAVE' || norm === 'PROBATION')
      return 'bg-amber-50 text-amber-700 border border-amber-200/60';
    return 'bg-rose-50 text-rose-700 border border-rose-200/60';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[118px]">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
              {employees.length}
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <UsersThree weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {t('empMetricTotal')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-tight truncate">
              {t('empMetricTotalSub')}
            </p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[118px]">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
              {departments.length}
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <TreeStructure weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {t('empMetricDepts')}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-tight truncate">
              {t('empMetricDeptsSub')}
            </p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[118px]">
          <div className="flex items-start justify-between">
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
              {activeCount}
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CheckCircle weight="fill" className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {t('empMetricActive')}
            </h3>
            <p className="text-[11px] text-emerald-600 mt-0.5 leading-tight font-medium">
              {t('empMetricActiveSub')}
            </p>
          </div>
        </div>

        {canViewSalary ? (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[118px]">
            <div className="flex items-start justify-between">
              <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans tabular-nums leading-none">
                ${avgSalary.toLocaleString()}
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <CurrencyDollar weight="fill" className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-xs font-bold text-slate-800 tracking-tight leading-snug">
                {t('empMetricAvgSalary')}
              </h3>
              <p className="text-[11px] text-amber-600 mt-0.5 leading-tight font-medium">
                {t('empMetricAvgSalarySub')}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-150 flex flex-col justify-between min-h-[118px]">
            <div className="flex items-start justify-between">
              <div className="text-sm font-bold tracking-tight text-slate-800 leading-snug">
                {t('empPrivacyProtocol')}
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <ShieldCheck weight="fill" className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-slate-600 tracking-tight leading-snug">
                {t('empSalariesProtected')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-tight font-mono">
                {t('empRbacMasking')}
              </p>
            </div>
          </div>
        )}
      </div>

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-medium flex items-center justify-between animate-fadeIn"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label={t('closeDialog')}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 cursor-pointer px-1.5 py-0.5 rounded"
          >
            ×
          </button>
        </div>
      )}

      {pageError && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 bg-rose-50 text-rose-800 border border-rose-200/80 rounded-xl text-xs font-medium flex items-center justify-between animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <WarningCircle weight="fill" className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{pageError}</span>
          </div>
          <button
            type="button"
            onClick={() => setPageError(null)}
            aria-label={t('closeDialog')}
            className="text-rose-600 hover:text-rose-900 font-bold ml-2 cursor-pointer px-1.5 py-0.5 rounded"
          >
            ×
          </button>
        </div>
      )}

      {/* 2. Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 max-w-xl">
          <div className="relative w-full">
            <MagnifyingGlass
              weight="bold"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              aria-label={t('empSearchPlaceholder')}
              placeholder={t('empSearchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
            />
          </div>

          <BehavioralHistorySelect
            options={[
              { value: 'ALL', label: t('allDepartments') },
              ...departments.map((d) => ({
                value: d.departmentName,
                label: d.departmentName,
              })),
            ]}
            value={selectedDept}
            onChange={setSelectedDept}
            storageKey="hrms_dept_filter_history"
            selectWidth="210px"
            placeholder={t('allDepartments')}
          />
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={handleOpenAdd}
            aria-label={t('addEmployee')}
            className="flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.96] text-white text-xs font-bold shadow-sm transition-[transform,background-color] duration-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer shrink-0"
          >
            <UserPlus weight="bold" className="w-4 h-4" />
            <span>{t('addEmployee')}</span>
          </button>
        )}
      </div>

      {/* 3. Employees Table Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersThree weight="duotone" className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              {t('empDirTitle', { count: filteredEmployees.length })}
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {t('totalStaffCount', { count: employees.length })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-6">{t('colEmployee')}</th>
                <th className="py-3 px-6">{t('colDepartment')}</th>
                <th className="py-3 px-6">{t('colJobTitle')}</th>
                <th className="py-3 px-6">{canViewSalary ? t('colSalary') : t('colCompensation')}</th>
                <th className="py-3 px-6">{t('colStatus')}</th>
                <th className="py-3 px-6">{t('colHireDate')}</th>
                {(canEdit || canDelete) && <th className="py-3 px-6 text-right">{t('colActions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-6 text-center text-slate-400">
                    {t('noEmployeesMatch')}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.employeeId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs ring-2 ring-white shadow-sm overflow-hidden flex-shrink-0">
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={`${emp.firstName} ${emp.lastName}`}
                              width={36}
                              height={36}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="text-[11px] text-slate-400">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-medium">{emp.departmentName}</td>
                    <td className="py-3.5 px-6 text-slate-600">{emp.jobTitle}</td>
                    <td className="py-3.5 px-6 font-mono tabular-nums">
                      {canViewSalary ? (
                        <span className="font-semibold text-slate-900">
                          ${(emp.salary || 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-400 text-[11px]">
                          <EyeSlash weight="bold" className="w-3 h-3 text-slate-400" />
                          <span>{t('confidentialLabel')}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${getStatusBadgeClasses(
                          emp.status
                        )}`}
                      >
                        {tStatus(emp.status)}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px] tabular-nums">
                      {emp.hireDate || emp.contractEndDate || '—'}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(emp)}
                              aria-label={`${t('editEmployeeTitle')} ${emp.firstName} ${emp.lastName}`}
                              className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 active:scale-[0.96] transition-[transform,background-color,color] duration-100 inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
                              title={t('editEmployeeTitle')}
                            >
                              <PencilSimple weight="bold" className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTarget(emp)}
                              aria-label={`${t('deleteEmployeeTitle')} ${emp.firstName} ${emp.lastName}`}
                              className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-[0.96] transition-[transform,background-color,color] duration-100 inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer"
                              title={t('deleteEmployeeTitle')}
                            >
                              <Trash weight="bold" className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('addEmpModalTitle')}
        subtitle={t('addEmpModalSub')}
        maxWidth="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="empFirstName" className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('firstNameLabel')}
              </label>
              <input
                id="empFirstName"
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => {
                  setFormData({ ...formData, firstName: e.target.value });
                  if (formError) setFormError(null);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>
            <div>
              <label htmlFor="empLastName" className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('lastNameLabel')}
              </label>
              <input
                id="empLastName"
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => {
                  setFormData({ ...formData, lastName: e.target.value });
                  if (formError) setFormError(null);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="empEmail" className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('emailLabel')}
              </label>
              <input
                id="empEmail"
                type="email"
                required
                spellCheck={false}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (formError) setFormError(null);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>
            <div>
              <label htmlFor="empPhone" className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('phoneLabel')}
              </label>
              <input
                id="empPhone"
                type="text"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('departmentLabel')}
              </label>
              <BehavioralHistorySelect
                label={t('chooseDepartment')}
                options={departments.map((d) => ({
                  value: String(d.departmentId),
                  label: d.departmentName,
                }))}
                value={String(formData.departmentId)}
                onChange={(val) => {
                  const newDeptId = Number(val);
                  const matchingJobs = jobs.filter((j) => j.departmentId === newDeptId);
                  const defaultJob = matchingJobs[0];
                  setFormData({
                    ...formData,
                    departmentId: newDeptId,
                    jobTitle: defaultJob ? defaultJob.jobTitle : '',
                    jobId: defaultJob ? defaultJob.jobId : 1,
                  });
                }}
                storageKey="hrms_emp_dept_history"
                selectWidth="100%"
                placeholder={t('selectDepartmentPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('jobTitleCountLabel', { count: departmentJobs.length })}
              </label>
              <BehavioralHistorySelect
                label={t('chooseJobTitle')}
                options={departmentJobs.map((j) => ({
                  value: j.jobTitle,
                  label: j.jobTitle,
                }))}
                value={formData.jobTitle || departmentJobs[0]?.jobTitle || ''}
                onChange={(val) => {
                  const matched = departmentJobs.find((j) => j.jobTitle === val);
                  setFormData({
                    ...formData,
                    jobTitle: val,
                    jobId: matched ? matched.jobId : 1,
                  });
                }}
                storageKey="hrms_emp_job_history"
                selectWidth="100%"
                placeholder={t('selectJobPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="empSalary" className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('monthlyBaseSalaryLabel')}
              </label>
              <input
                id="empSalary"
                type="number"
                required
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
              {(() => {
                const selectedJob =
                  departmentJobs.find((j) => j.jobTitle === formData.jobTitle) || departmentJobs[0];
                if (selectedJob?.minSalary && selectedJob?.maxSalary) {
                  return (
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {t('approvedBandLabel')} ${selectedJob.minSalary.toLocaleString()} – $
                      {selectedJob.maxSalary.toLocaleString()}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('genderLabel')}
              </label>
              <BehavioralHistorySelect
                label={t('selectGender')}
                options={[
                  { value: 'Male', label: t('genderMale') },
                  { value: 'Female', label: t('genderFemale') },
                  { value: 'Other', label: t('genderOther') },
                ]}
                value={formData.gender}
                onChange={(val) => setFormData({ ...formData, gender: val as any })}
                storageKey="hrms_emp_gender_history"
                selectWidth="100%"
                placeholder={t('selectGender')}
              />
            </div>
          </div>

          {formError && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2"
            >
              <XCircle weight="fill" className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span className="font-medium">{formError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(false);
              }}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 active:scale-[0.96] transition-transform duration-100 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 min-h-[40px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.96] text-white text-xs font-semibold shadow-sm transition-[transform,background-color] duration-100 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <span>{t('saveEmployee')}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. Edit Employee Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t('editEmpModalTitle')}
        subtitle={t('editEmpModalSub', {
          name: `${editingEmployee?.firstName || ''} ${editingEmployee?.lastName || ''}`.trim(),
        })}
        maxWidth="lg"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="editEmpFirstName" className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('firstNameLabel')}
              </label>
              <input
                id="editEmpFirstName"
                type="text"
                required
                value={editFormData.firstName}
                onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>
            <div>
              <label htmlFor="editEmpLastName" className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('lastNameLabel')}
              </label>
              <input
                id="editEmpLastName"
                type="text"
                required
                value={editFormData.lastName}
                onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="editEmpEmail" className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('emailLabel')}
              </label>
              <input
                id="editEmpEmail"
                type="email"
                required
                spellCheck={false}
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>
            <div>
              <label htmlFor="editEmpPhone" className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('phoneLabel')}
              </label>
              <input
                id="editEmpPhone"
                type="text"
                value={editFormData.phoneNumber}
                onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('departmentLabel')}
              </label>
              <BehavioralHistorySelect
                label={t('chooseDepartment')}
                options={departments.map((d) => ({
                  value: String(d.departmentId),
                  label: d.departmentName,
                }))}
                value={String(editFormData.departmentId)}
                onChange={(val) => {
                  const newDeptId = Number(val);
                  const matchingJobs = jobs.filter((j) => j.departmentId === newDeptId);
                  const defaultJob = matchingJobs[0];
                  setEditFormData({
                    ...editFormData,
                    departmentId: newDeptId,
                    jobTitle: defaultJob ? defaultJob.jobTitle : '',
                    jobId: defaultJob ? defaultJob.jobId : 1,
                  });
                }}
                storageKey="hrms_emp_edit_dept_history"
                selectWidth="100%"
                placeholder={t('selectDepartmentPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('jobTitleCountLabel', { count: editDepartmentJobs.length })}
              </label>
              <BehavioralHistorySelect
                label={t('chooseJobTitle')}
                options={editDepartmentJobs.map((j) => ({
                  value: j.jobTitle,
                  label: j.jobTitle,
                }))}
                value={editFormData.jobTitle || editDepartmentJobs[0]?.jobTitle || ''}
                onChange={(val) => {
                  const matched = editDepartmentJobs.find((j) => j.jobTitle === val);
                  setEditFormData({
                    ...editFormData,
                    jobTitle: val,
                    jobId: matched ? matched.jobId : 1,
                  });
                }}
                storageKey="hrms_emp_edit_job_history"
                selectWidth="100%"
                placeholder={t('selectJobPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="editEmpSalary" className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('monthlyBaseSalaryLabel')}
              </label>
              <input
                id="editEmpSalary"
                type="number"
                required
                value={editFormData.salary}
                onChange={(e) => setEditFormData({ ...editFormData, salary: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm sm:text-xs text-slate-800 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              />
              {(() => {
                const currentJob =
                  editDepartmentJobs.find((j) => j.jobTitle === editFormData.jobTitle) ||
                  editDepartmentJobs[0];
                if (currentJob?.minSalary && currentJob?.maxSalary) {
                  return (
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {t('approvedBandLabel')} ${currentJob.minSalary.toLocaleString()} – $
                      {currentJob.maxSalary.toLocaleString()}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                {t('employmentStatusLabel')}
              </label>
              <BehavioralHistorySelect
                label={t('selectStatus')}
                options={[
                  { value: 'Active', label: tStatus('ACTIVE') },
                  { value: 'On Leave', label: tStatus('ON_LEAVE') },
                  { value: 'Probation', label: tStatus('PROBATION') },
                  { value: 'Terminated', label: tStatus('TERMINATED') },
                ]}
                value={editFormData.status}
                onChange={(val) => setEditFormData({ ...editFormData, status: val as any })}
                storageKey="hrms_emp_edit_status_history"
                selectWidth="100%"
                placeholder={t('selectStatus')}
              />
            </div>
          </div>

          {editFormError && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-center gap-2"
            >
              <XCircle weight="fill" className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span className="font-medium">{editFormError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 active:scale-[0.96] transition-transform duration-100 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 min-h-[40px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.96] text-white text-xs font-semibold shadow-sm transition-[transform,background-color] duration-100 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <span>{t('saveChanges')}</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. Confirm Terminate Employee Modal */}
      <Modal
        isOpen={Boolean(confirmDeleteTarget)}
        onClose={() => setConfirmDeleteTarget(null)}
        title={t('deleteEmployeeTitle')}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('confirmTerminateEmp', {
              name: `${confirmDeleteTarget?.firstName || ''} ${confirmDeleteTarget?.lastName || ''}`.trim(),
            })}
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setConfirmDeleteTarget(null)}
              className="min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="min-h-[38px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {t('terminateBtn')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
