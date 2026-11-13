import React, { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHrmsStore } from "@/store/useHrmsStore";
import { useI18n } from "@/i18n/useI18n";
import {
  Bell,
  Check,
  CheckCircle,
  X,
  Cpu,
  ArrowRight,
} from "@phosphor-icons/react";

export type NotificationType = "leave" | "attendance" | "payroll" | "system";

export interface HrmsNotification {
  id: string;
  type: NotificationType;
  user: {
    name: string;
    avatar: string;
    fallback: string;
  };
  action: string;
  target?: string;
  content?: string;
  timestamp: string;
  timeAgo: string;
  isRead: boolean;
  hasActions?: boolean;
  actionPayload?: {
    leaveId?: number;
    attendanceId?: number;
    targetTab?: string;
  };
}

interface NotificationsMenuProps {
  onClose?: () => void;
  className?: string;
}

export const NotificationsMenu: React.FC<NotificationsMenuProps> = ({
  onClose,
  className = "",
}) => {
  const {
    leaves,
    attendance,
    employees,
    cronHistory,
    updateLeaveStatus,
    setActiveTab,
  } = useHrmsStore();
  const { t, tStatus, tLeaveType } = useI18n();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const getLocalizedJobTitle = (jobName: string) => {
    switch (jobName) {
      case "DailyAttendanceSyncJob":
        return t("cronAttTitle");
      case "ContractExpiryJob":
        return t("cronContractTitle");
      case "MonthlyPayrollJob":
        return t("cronPayrollTitle");
      case "WeeklyReportJob":
        return t("cronWeeklyTitle");
      default:
        return jobName;
    }
  };

  // Derive real HRMS operational notifications from live microservices state
  const liveNotifications: HrmsNotification[] = useMemo(() => {
    const list: HrmsNotification[] = [];

    // 1. Pending & Recent Leave Notifications
    leaves.forEach((l) => {
      const isPending = l.status === "PENDING";
      const id = `notif-leave-${l.leaveId}`;
      const emp = employees.find((e) => e.employeeId === l.employeeId);
      list.push({
        id,
        type: "leave",
        user: {
          name: l.employeeName,
          avatar: emp?.avatarUrl || "",
          fallback: l.employeeName
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
        },
        action: isPending
          ? t("notifSubmittedLeave")
          : t("notifLeaveProcessed", { status: tStatus(l.status) }),
        target: `${tLeaveType(l.leaveType)} (${l.daysCount} ${t("gsDaysUnit")})`,
        content: l.reason ? `"${l.reason}"` : undefined,
        timestamp: l.appliedDate || l.startDate || "",
        timeAgo: isPending ? t("notifActionRequired") : t("notifProcessed"),
        isRead: readIds.has(id) || !isPending,
        hasActions: isPending,
        actionPayload: {
          leaveId: l.leaveId,
          targetTab: "leaves",
        },
      });
    });

    // 2. Attendance Discrepancies & Late Arrivals
    attendance
      .filter((a) => a.status === "LATE" || a.lateMinutes > 0)
      .slice(0, 4)
      .forEach((a) => {
        const id = `notif-att-${a.attendanceId}`;
        const emp = employees.find((e) => e.employeeId === a.employeeId);
        list.push({
          id,
          type: "attendance",
          user: {
            name: a.employeeName,
            avatar: emp?.avatarUrl || "",
            fallback: a.employeeName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
          },
          action: t("notifClockedInLate"),
          target: `${a.lateMinutes} ${t("notifMinsAt")} ${a.checkIn || "08:30 AM"}`,
          content: t("notifGraceExceeded"),
          timestamp: a.attendanceDate,
          timeAgo: t("notifToday"),
          isRead: readIds.has(id),
          hasActions: false,
          actionPayload: {
            attendanceId: a.attendanceId,
            targetTab: "attendance",
          },
        });
      });

    // 3. System Automations & Scheduled CRON Jobs
    cronHistory.slice(0, 3).forEach((c) => {
      const id = `notif-cron-${c.id}`;
      list.push({
        id,
        type: "system",
        user: {
          name: "CRON Engine",
          avatar: "",
          fallback: "CR",
        },
        action: t("notifCronExecuted"),
        target: getLocalizedJobTitle(c.jobName),
        content: c.message,
        timestamp: c.executionTime ? c.executionTime.substring(11, 16) : t("notifToday"),
        timeAgo: `${c.durationMs}ms`,
        isRead: readIds.has(id),
        hasActions: false,
        actionPayload: {
          targetTab: "automations",
        },
      });
    });

    return list;
  }, [leaves, attendance, employees, cronHistory, readIds, t, tStatus, tLeaveType]);

  const markAllAsRead = () => {
    const allIds = new Set(liveNotifications.map((n) => n.id));
    setReadIds(allIds);
  };

  const handleApproveLeave = (leaveId?: number) => {
    if (leaveId) {
      updateLeaveStatus(leaveId, "APPROVED");
      setReadIds((prev) => new Set(prev).add(`notif-leave-${leaveId}`));
    }
  };

  const handleRejectLeave = (leaveId?: number) => {
    if (leaveId) {
      updateLeaveStatus(leaveId, "REJECTED");
      setReadIds((prev) => new Set(prev).add(`notif-leave-${leaveId}`));
    }
  };

  const handleNavigateToTarget = (tab?: string) => {
    if (tab) {
      setActiveTab(tab as any);
      if (onClose) onClose();
    }
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case "leaves":
        return liveNotifications.filter((n) => n.type === "leave");
      case "attendance":
        return liveNotifications.filter((n) => n.type === "attendance");
      case "system":
        return liveNotifications.filter((n) => n.type === "system");
      default:
        return liveNotifications;
    }
  }, [liveNotifications, activeFilter]);

  const unreadCount = liveNotifications.filter((n) => !n.isRead).length;
  const leaveCount = liveNotifications.filter((n) => n.type === "leave" && !n.isRead).length;
  const attendanceCount = liveNotifications.filter((n) => n.type === "attendance" && !n.isRead).length;

  return (
    <Card
      className={`flex w-full max-w-[480px] flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl shadow-slate-900/15 ${className}`}
    >
      <CardHeader className="p-0 pb-3.5 space-y-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Bell weight="duotone" className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                {t("enterpriseNotifications")}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                {unreadCount > 0
                  ? t("unreadAlertsCount", { count: unreadCount })
                  : t("allAlertsCaughtUp")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                title={t("markAllReadTooltip")}
                className="h-8 px-2.5 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg active:scale-[0.96] transition-transform duration-100 cursor-pointer"
              >
                <Check weight="bold" className="w-3.5 h-3.5 mr-1" />
                <span>{t("markRead")}</span>
              </Button>
            )}

            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label={t("closeDialog")}
                className="size-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-[0.96] transition-transform duration-100 cursor-pointer"
              >
                <X weight="bold" className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <Tabs
          value={activeFilter}
          onValueChange={setActiveFilter}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-4 h-8 bg-slate-100/90 p-0.5 rounded-lg text-slate-500">
            <TabsTrigger
              value="all"
              className="text-[11px] py-1 rounded-md font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs active:scale-[0.98] transition-[transform,color,background-color,box-shadow]"
            >
              {t("notifTabAll")} {liveNotifications.length > 0 && `(${liveNotifications.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="leaves"
              className="text-[11px] py-1 rounded-md font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs active:scale-[0.98] transition-[transform,color,background-color,box-shadow]"
            >
              {t("notifTabLeaves")} {leaveCount > 0 && `(${leaveCount})`}
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="text-[11px] py-1 rounded-md font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs active:scale-[0.98] transition-[transform,color,background-color,box-shadow]"
            >
              {t("notifTabPunch")} {attendanceCount > 0 && `(${attendanceCount})`}
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="text-[11px] py-1 rounded-md font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs active:scale-[0.98] transition-[transform,color,background-color,box-shadow]"
            >
              {t("notifTabSystem")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      {/* Notifications List Content */}
      <CardContent className="p-0 pt-2 max-h-[380px] overflow-y-auto overscroll-contain divide-y divide-slate-100/80">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`py-3.5 px-2 rounded-xl transition-colors duration-150 ${
                !notification.isRead ? "bg-blue-50/20" : "hover:bg-slate-50/60"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar / Icon */}
                {notification.type === "system" ? (
                  <div className="size-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Cpu weight="duotone" className="w-5 h-5 text-blue-400" />
                  </div>
                ) : (
                  <Avatar className="size-9 ring-1 ring-slate-200 shrink-0">
                    <AvatarImage
                      src={notification.user.avatar}
                      alt={notification.user.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">
                      {notification.user.fallback}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-800 leading-snug">
                      <span className="font-bold text-slate-900">
                        {notification.user.name}
                      </span>{" "}
                      <span className="text-slate-500">{notification.action}</span>{" "}
                      {notification.target && (
                        <span className="font-semibold text-blue-600">
                          {notification.target}
                        </span>
                      )}
                    </div>
                    {!notification.isRead && (
                      <span className="size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
                    )}
                  </div>

                  {notification.content && (
                    <div className="mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
                      {notification.content}
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{notification.timestamp}</span>
                    <span className="font-sans font-medium text-slate-500">
                      {notification.timeAgo}
                    </span>
                  </div>

                  {/* Operational Action Buttons */}
                  {notification.hasActions && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveLeave(notification.actionPayload?.leaveId)}
                        className="h-7 px-3 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-[0.96] transition-transform duration-100 cursor-pointer"
                      >
                        <Check weight="bold" className="w-3 h-3 mr-1" />
                        {t("notifApprove")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectLeave(notification.actionPayload?.leaveId)}
                        className="h-7 px-3 text-[11px] font-bold rounded-lg border-slate-200 text-rose-600 hover:bg-rose-50 active:scale-[0.96] transition-transform duration-100 cursor-pointer"
                      >
                        <X weight="bold" className="w-3 h-3 mr-1" />
                        {t("notifReject")}
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleNavigateToTarget(notification.actionPayload?.targetTab)}
                        className="ml-auto text-[10px] text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>{t("notifViewQueue")}</span>
                        <ArrowRight weight="bold" className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
            <div className="size-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <CheckCircle weight="duotone" className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              {t("notifEmptyTitle")}
            </p>
            <p className="text-[11px] text-slate-400 max-w-[220px]">
              {t("notifEmptyDesc")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const Component = NotificationsMenu;
export default NotificationsMenu;
