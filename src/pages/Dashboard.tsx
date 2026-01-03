import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickAction } from "@/components/dashboard/QuickAction";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { AttendanceChart } from "@/components/dashboard/AttendanceChart";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import {
  Users,
  Clock,
  CalendarCheck,
  DollarSign,
  UserPlus,
  FileText,
  CheckSquare,
  AlertCircle,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    payrollDue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setIsLoading(true);
        
        // Fetch employees
        const employeesData = await api.get("/api/employees");
        const employees = Array.isArray(employeesData) 
          ? employeesData 
          : (employeesData.employees || employeesData.data || []);
        const totalEmployees = employees.length;
        const activeEmployees = employees.filter((emp: any) => 
          (emp.status || "active") === "active"
        ).length;

        // Fetch leave requests
        const leaveData = await api.get("/api/leave");
        const leaves = leaveData.data || leaveData.leaves || (Array.isArray(leaveData) ? leaveData : []);
        const pendingLeaves = leaves.filter((leave: any) => 
          (leave.status || "pending") === "pending"
        ).length;

        // Fetch today's attendance to get present count
        let presentToday = 0;
        try {
          const today = new Date().toISOString().split("T")[0];
          const attendanceData = await api.get(`/api/attendance?date=${today}`);
          const records = attendanceData.data || attendanceData.records || (Array.isArray(attendanceData) ? attendanceData : []);
          presentToday = records.filter((r: any) => (r.status || "absent") === "present").length;
        } catch (err) {
          console.error("Error fetching today's attendance:", err);
          // Fallback to active employees count
          presentToday = activeEmployees;
        }

        // For payroll due, calculate from employees' salaries
        // This would typically come from a payroll API
        let payrollDue = 0;
        employees.forEach((emp: any) => {
          if ((emp.status || "active") === "active") {
            const salary = emp.salary?.amount || emp.salary_amount || 0;
            payrollDue += salary;
          }
        });

        setStats({
          totalEmployees,
          presentToday,
          pendingLeaves,
          payrollDue,
        });
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
        // Keep default values on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);
  
  return (
    <AppLayout title="Dashboard" subtitle={`Welcome back, ${user?.name || "Admin"}`}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Employees"
          value={isLoading ? "..." : stats.totalEmployees}
          icon={Users}
          iconColor="accent"
        />
        <StatCard
          title="Present Today"
          value={isLoading ? "..." : stats.presentToday}
          icon={Clock}
          iconColor="accent"
        />
        <StatCard
          title="Pending Leaves"
          value={isLoading ? "..." : stats.pendingLeaves}
          icon={CalendarCheck}
          iconColor="warning"
        />
        <StatCard
          title="Payroll Due"
          value={isLoading ? "..." : `₹${stats.payrollDue.toLocaleString()}`}
          icon={DollarSign}
          iconColor="muted"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            title="Add Employee"
            description="Register new team member"
            icon={UserPlus}
            href="/employees?action=add"
            variant="accent"
          />
          <QuickAction
            title="Approve Leaves"
            description={stats.pendingLeaves > 0 ? `${stats.pendingLeaves} pending requests` : "No pending requests"}
            icon={CheckSquare}
            href="/approvals"
            variant="warning"
          />
          <QuickAction
            title="Run Payroll"
            description="Process monthly salary"
            icon={DollarSign}
            href="/payroll"
          />
          <QuickAction
            title="View Reports"
            description="Analytics & insights"
            icon={FileText}
            href="/reports"
          />
        </div>
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AttendanceChart />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>

    </AppLayout>
  );
}
