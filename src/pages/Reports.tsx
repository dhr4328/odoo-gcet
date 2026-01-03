import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Download, FileSpreadsheet, FileText, TrendingUp, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format, subMonths, startOfYear } from "date-fns";

interface AttendanceData {
  month: string;
  present: number;
  absent: number;
  leave: number;
}

interface DepartmentData {
  name: string;
  value: number;
  color: string;
}

interface PayrollTrend {
  month: string;
  amount: number;
}

interface LeaveUtilization {
  type: string;
  used: number;
  total: number;
}

const COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--warning))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(var(--muted))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
];

const defaultLeaveBalances: Record<string, number> = {
  vacation: 20,
  sick: 10,
  personal: 5,
  maternity: 90,
  paid: 15,
  unpaid: 0,
};

export default function Reports() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [payrollTrend, setPayrollTrend] = useState<PayrollTrend[]>([]);
  const [leaveUtilization, setLeaveUtilization] = useState<LeaveUtilization[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    fetchReportsData();
  }, [selectedYear, selectedDepartment]);

  const fetchReportsData = async () => {
    try {
      setIsLoading(true);

      // Fetch all data in parallel
      const [employeesData, leaveData, payrollData] = await Promise.all([
        api.get("/api/employees").catch(() => ({ data: [] })),
        api.get("/api/leave").catch(() => ({ data: [] })),
        api.get("/api/payroll").catch(() => ({ data: [] })),
      ]);

      const employees = Array.isArray(employeesData) 
        ? employeesData 
        : (employeesData.employees || employeesData.data || []);
      
      const leaves = leaveData.data || leaveData.leaves || [];
      const payrollRecords = payrollData.data || [];

      // Filter employees by department if selected
      let filteredEmployees = employees;
      if (selectedDepartment !== "all") {
        filteredEmployees = employees.filter((emp: any) => 
          (emp.department || "").toLowerCase() === selectedDepartment.toLowerCase()
        );
      }

      // 1. Department Distribution
      const deptMap = new Map<string, number>();
      employees.forEach((emp: any) => {
        const dept = emp.department || "Unassigned";
        deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
      });
      
      const deptArray: DepartmentData[] = Array.from(deptMap.entries())
        .map(([name, value], index) => ({
          name,
          value,
          color: COLORS[index % COLORS.length],
        }))
        .sort((a, b) => b.value - a.value);

      setDepartmentData(deptArray);
      setDepartments(Array.from(deptMap.keys()));

      // 2. Attendance Trend (last 6 months)
      const attendanceTrend: AttendanceData[] = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const month = format(monthDate, "MMM");
        const monthNum = monthDate.getMonth() + 1;
        const year = monthDate.getFullYear();

        try {
          const summaryData = await api.get(`/api/attendance/summary?month=${monthNum}&year=${year}`);
          const summary = summaryData.data || {};
          
          const totalDays = summary.totalDays || 0;
          const presentDays = summary.presentDays || 0;
          const absentDays = summary.absentDays || 0;
          const leaveDays = summary.leaveDays || 0;

          attendanceTrend.push({
            month,
            present: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
            absent: totalDays > 0 ? Math.round((absentDays / totalDays) * 100) : 0,
            leave: totalDays > 0 ? Math.round((leaveDays / totalDays) * 100) : 0,
          });
        } catch (err) {
          // If summary endpoint doesn't exist, calculate from attendance records
          try {
            const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
            const endDate = monthNum === 12 
              ? `${year + 1}-01-01`
              : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;
            
            // Fetch attendance for the month
            const attendanceRecords = await api.get(`/api/attendance?date=${startDate}`);
            const records = attendanceRecords.data || attendanceRecords.records || [];
            
            const presentCount = records.filter((r: any) => r.status === "present").length;
            const absentCount = records.filter((r: any) => r.status === "absent").length;
            const leaveCount = records.filter((r: any) => r.status === "leave").length;
            const totalCount = records.length || 1;

            attendanceTrend.push({
              month,
              present: Math.round((presentCount / totalCount) * 100),
              absent: Math.round((absentCount / totalCount) * 100),
              leave: Math.round((leaveCount / totalCount) * 100),
            });
          } catch {
            attendanceTrend.push({ month, present: 0, absent: 0, leave: 0 });
          }
        }
      }

      setAttendanceData(attendanceTrend);

      // 3. Payroll Trend (last 6 months)
      const payrollTrendData: PayrollTrend[] = [];
      const payrollByMonth = new Map<string, number>();

      payrollRecords.forEach((record: any) => {
        if (record.year === selectedYear) {
          const month = format(new Date(selectedYear, record.month - 1, 1), "MMM");
          const key = `${record.month}-${record.year}`;
          payrollByMonth.set(key, (payrollByMonth.get(key) || 0) + (record.netSalary || 0));
        }
      });

      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const month = format(monthDate, "MMM");
        const monthNum = monthDate.getMonth() + 1;
        const key = `${monthNum}-${monthDate.getFullYear()}`;
        
        payrollTrendData.push({
          month,
          amount: payrollByMonth.get(key) || 0,
        });
      }

      setPayrollTrend(payrollTrendData);

      // 4. Leave Utilization
      const leaveUtil: LeaveUtilization[] = [];
      const usedByType: Record<string, number> = {};

      leaves.forEach((leave: any) => {
        const leaveType = (leave.leaveType || leave.leave_type || "vacation").toLowerCase();
        const status = leave.status || "pending";
        
        if (status === "approved") {
          const days = leave.days || 0;
          usedByType[leaveType] = (usedByType[leaveType] || 0) + days;
        }
      });

      Object.entries(defaultLeaveBalances).forEach(([type, total]) => {
        if (total > 0) {
          leaveUtil.push({
            type: type.charAt(0).toUpperCase() + type.slice(1),
            used: usedByType[type] || 0,
            total,
          });
        }
      });

      setLeaveUtilization(leaveUtil);
    } catch (err) {
      console.error("Error fetching reports data:", err);
      toast({
        title: "Error",
        description: "Failed to load reports data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ["Report Type", "Data"];
    const rows: string[][] = [];

    // Attendance data
    rows.push(["Attendance Trend", ""]);
    rows.push(["Month", "Present %", "Absent %", "Leave %"]);
    attendanceData.forEach((item) => {
      rows.push([item.month, item.present.toString(), item.absent.toString(), item.leave.toString()]);
    });

    // Department data
    rows.push(["", ""]);
    rows.push(["Department Distribution", ""]);
    rows.push(["Department", "Employees"]);
    departmentData.forEach((item) => {
      rows.push([item.name, item.value.toString()]);
    });

    // Payroll data
    rows.push(["", ""]);
    rows.push(["Payroll Trend", ""]);
    rows.push(["Month", "Amount"]);
    payrollTrend.forEach((item) => {
      rows.push([item.month, item.amount.toString()]);
    });

    // Leave utilization
    rows.push(["", ""]);
    rows.push(["Leave Utilization", ""]);
    rows.push(["Type", "Used", "Total"]);
    leaveUtilization.forEach((item) => {
      rows.push([item.type, item.used.toString(), item.total.toString()]);
    });

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-${selectedYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Reports exported to CSV",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Info",
      description: "PDF export feature coming soon",
    });
  };

  const handleQuickReport = (type: string) => {
    toast({
      title: "Info",
      description: `${type} report download coming soon`,
    });
  };

  // Generate year options
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <AppLayout title="Reports" subtitle="Analytics and insights">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedDepartment}
          onValueChange={setSelectedDepartment}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept.toLowerCase()}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" onClick={handleExportCSV} disabled={isLoading}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Button variant="outline" onClick={handleExportPDF} disabled={isLoading}>
          <FileText className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Attendance Trend */}
            <div className="card-elevated p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Attendance Trend</h3>
                {attendanceData.length > 0 && (
                  <span className="text-sm text-success flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Last 6 months
                  </span>
                )}
              </div>
              <div className="h-64">
                {attendanceData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">No attendance data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="present" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Present %" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Department Distribution */}
            <div className="card-elevated p-6 animate-slide-up" style={{ animationDelay: "50ms" }}>
              <h3 className="text-lg font-semibold text-foreground mb-4">Department Distribution</h3>
              {departmentData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">No department data available</p>
                </div>
              ) : (
                <div className="h-64 flex items-center">
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={departmentData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {departmentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-3">
                    {departmentData.map((dept) => (
                      <div key={dept.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: dept.color }} />
                          <span className="text-sm text-foreground">{dept.name}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{dept.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Payroll Trend */}
            <div className="card-elevated p-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Payroll Trend</h3>
                {payrollTrend.length > 0 && (
                  <span className="text-sm text-success flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {selectedYear}
                  </span>
                )}
              </div>
              <div className="h-64">
                {payrollTrend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">No payroll data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={payrollTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `₹${value / 1000}K`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="hsl(var(--accent))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--accent))', strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Leave Utilization */}
            <div className="card-elevated p-6 animate-slide-up" style={{ animationDelay: "150ms" }}>
              <h3 className="text-lg font-semibold text-foreground mb-4">Leave Utilization</h3>
              {leaveUtilization.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">No leave utilization data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leaveUtilization.map((item) => {
                    const percentage = item.total > 0 ? (item.used / item.total) * 100 : 0;
                    return (
                      <div key={item.type}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-foreground">{item.type} Leave</span>
                          <span className="text-muted-foreground">{item.used}/{item.total} days used</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Reports */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="card-elevated p-5 hover:shadow-soft transition-shadow cursor-pointer group animate-slide-up" 
              style={{ animationDelay: "200ms" }}
              onClick={() => handleQuickReport("Attendance")}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <FileText className="h-6 w-6 text-accent group-hover:text-accent-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Attendance Report</p>
                  <p className="text-sm text-muted-foreground">Download detailed report</p>
                </div>
                <Download className="h-4 w-4 text-muted-foreground ml-auto" />
              </div>
            </div>
            <div 
              className="card-elevated p-5 hover:shadow-soft transition-shadow cursor-pointer group animate-slide-up" 
              style={{ animationDelay: "250ms" }}
              onClick={() => handleQuickReport("Leave Summary")}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center group-hover:bg-warning group-hover:text-warning-foreground transition-colors">
                  <FileText className="h-6 w-6 text-warning group-hover:text-warning-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Leave Summary</p>
                  <p className="text-sm text-muted-foreground">Monthly leave analysis</p>
                </div>
                <Download className="h-4 w-4 text-muted-foreground ml-auto" />
              </div>
            </div>
            <div 
              className="card-elevated p-5 hover:shadow-soft transition-shadow cursor-pointer group animate-slide-up" 
              style={{ animationDelay: "300ms" }}
              onClick={() => handleQuickReport("Payroll Summary")}
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center group-hover:bg-success group-hover:text-success-foreground transition-colors">
                  <FileText className="h-6 w-6 text-success group-hover:text-success-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Payroll Summary</p>
                  <p className="text-sm text-muted-foreground">Financial overview</p>
                </div>
                <Download className="h-4 w-4 text-muted-foreground ml-auto" />
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
