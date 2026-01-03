import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

export interface Notification {
  id: string;
  type: "leave_request" | "leave_approval" | "leave_rejection" | "payroll" | "attendance" | "employee_added" | "announcement";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
  metadata?: any;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load notification preferences
      const savedPrefs = JSON.parse(
        localStorage.getItem("notificationPreferences") || "{}"
      );
      const prefs = {
        leaveRequests: savedPrefs.leaveRequests !== false,
        attendanceAlerts: savedPrefs.attendanceAlerts !== false,
        payrollReminders: savedPrefs.payrollReminders !== false,
        emailNotifications: savedPrefs.emailNotifications !== false,
      };

      const allNotifications: Notification[] = [];

      // Fetch leave-related notifications
      try {
        const leaveResponse = await api.get("/api/leave");
        const leaves = leaveResponse.data || leaveResponse || [];

        if (user.role === "hr" || user.role === "admin") {
          // HR: Get pending leave requests (only if preference is enabled)
          if (prefs.leaveRequests) {
            const pendingLeaves = leaves.filter(
              (leave: any) => leave.status === "pending"
            );

            pendingLeaves.forEach((leave: any) => {
              const leaveDate = new Date(leave.appliedDate || leave.createdAt || Date.now());
              allNotifications.push({
                id: `leave-${leave._id || leave.id}`,
                type: "leave_request",
                title: "Leave Request Pending",
                message: `${leave.employeeName || "An employee"} requested ${leave.days || 0} days ${leave.leaveType || "leave"}`,
                timestamp: leaveDate,
                read: false,
                link: "/approvals",
                metadata: { leaveId: leave._id || leave.id },
              });
            });
          }
        } else {
          // Employee: Get leave approvals/rejections
          const myLeaves = leaves.filter(
            (leave: any) => leave.employeeId === user.employeeId
          );

          // Only show leave notifications if preference is enabled
          if (prefs.leaveRequests) {
            myLeaves.forEach((leave: any) => {
              if (leave.status === "approved" && leave.approvedDate) {
                const approvedDate = new Date(leave.approvedDate);
                // Only show if approved in last 7 days
                if (Date.now() - approvedDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
                  allNotifications.push({
                    id: `leave-approved-${leave._id || leave.id}`,
                    type: "leave_approval",
                    title: "Leave Request Approved",
                    message: `Your ${leave.leaveType || "leave"} request for ${leave.days || 0} days has been approved`,
                    timestamp: approvedDate,
                    read: false,
                    link: "/leave",
                    metadata: { leaveId: leave._id || leave.id },
                  });
                }
              } else if (leave.status === "rejected" && leave.approvedDate) {
                const rejectedDate = new Date(leave.approvedDate);
                // Only show if rejected in last 7 days
                if (Date.now() - rejectedDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
                  allNotifications.push({
                    id: `leave-rejected-${leave._id || leave.id}`,
                    type: "leave_rejection",
                    title: "Leave Request Rejected",
                    message: `Your ${leave.leaveType || "leave"} request has been rejected${leave.comments ? `: ${leave.comments}` : ""}`,
                    timestamp: rejectedDate,
                    read: false,
                    link: "/leave",
                    metadata: { leaveId: leave._id || leave.id },
                  });
                }
              }
            });
          }
        }
      } catch (err) {
        console.error("Error fetching leave notifications:", err);
      }

      // Fetch payroll notifications (only if preference is enabled)
      if (prefs.payrollReminders) {
        try {
          const payrollResponse = await api.get("/api/payroll");
          const payrolls = payrollResponse.data || payrollResponse || [];

          if (user.role === "employee") {
            // Employee: Get recent payroll records
            const myPayrolls = payrolls
              .filter((p: any) => p.employeeId === user.employeeId)
              .sort((a: any, b: any) => {
                const dateA = new Date(a.createdAt || a.generatedAt || 0);
                const dateB = new Date(b.createdAt || b.generatedAt || 0);
                return dateB.getTime() - dateA.getTime();
              })
              .slice(0, 1); // Get most recent

            myPayrolls.forEach((payroll: any) => {
              const payrollDate = new Date(payroll.createdAt || payroll.generatedAt || Date.now());
              // Only show if generated in last 7 days
              if (Date.now() - payrollDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
                allNotifications.push({
                  id: `payroll-${payroll._id || payroll.id}`,
                  type: "payroll",
                  title: "Payslip Generated",
                  message: `Your payslip for ${payroll.payPeriod || `${payroll.month}/${payroll.year}`} is ready`,
                  timestamp: payrollDate,
                  read: false,
                  link: "/payroll",
                  metadata: { payrollId: payroll._id || payroll.id },
                });
              }
            });
          }
        } catch (err) {
          console.error("Error fetching payroll notifications:", err);
        }
      }

      // HR: Fetch new employees (added in last 7 days)
      if (user.role === "hr" || user.role === "admin") {
        try {
          const employeesResponse = await api.get("/api/employees");
          const employees = employeesResponse.data || employeesResponse || [];

          const recentEmployees = employees.filter((emp: any) => {
            if (!emp.dateOfJoining && !emp.joinDate && !emp.createdAt) return false;
            const joinDate = new Date(emp.dateOfJoining || emp.joinDate || emp.createdAt);
            return Date.now() - joinDate.getTime() < 7 * 24 * 60 * 60 * 1000;
          });

          recentEmployees.forEach((emp: any) => {
            const joinDate = new Date(emp.dateOfJoining || emp.joinDate || emp.createdAt);
            allNotifications.push({
              id: `employee-${emp.employeeId || emp.id}`,
              type: "employee_added",
              title: "New Employee Added",
              message: `${emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim()} joined the ${emp.department || "team"}`,
              timestamp: joinDate,
              read: false,
              link: "/employees",
              metadata: { employeeId: emp.employeeId || emp.id },
            });
          });
        } catch (err) {
          console.error("Error fetching employee notifications:", err);
        }
      }

      // Sort notifications by timestamp (newest first)
      allNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Load read status from localStorage
      const readNotifications = JSON.parse(
        localStorage.getItem("readNotifications") || "[]"
      );

      const notificationsWithReadStatus = allNotifications.map((notif) => ({
        ...notif,
        read: readNotifications.includes(notif.id),
      }));

      setNotifications(notificationsWithReadStatus);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch notifications");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    // Refresh notifications every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );

    // Save to localStorage
    const readNotifications = JSON.parse(
      localStorage.getItem("readNotifications") || "[]"
    );
    if (!readNotifications.includes(notificationId)) {
      readNotifications.push(notificationId);
      localStorage.setItem("readNotifications", JSON.stringify(readNotifications));
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));

    // Save to localStorage
    localStorage.setItem("readNotifications", JSON.stringify(allIds));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications,
    formatTime,
  };
}

