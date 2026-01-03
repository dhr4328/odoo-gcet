import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AttendanceStatus } from "@/components/employee/AttendanceStatus";
import { LeaveBalance } from "@/components/employee/LeaveBalance";
import { UpcomingLeave } from "@/components/employee/UpcomingLeave";
import { SalaryOverview } from "@/components/employee/SalaryOverview";
import { Announcements } from "@/components/employee/Announcements";
import { WeeklyAttendance } from "@/components/employee/WeeklyAttendance";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { User, Mail, Building2, Briefcase, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState({
    name: user?.name || "Employee",
    email: user?.email || "",
    department: user?.department || "N/A",
    position: user?.position || "N/A",
    employeeId: user?.employeeId || "N/A",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      if (!user?.employeeId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const data = await api.get(`/api/employees/${user.employeeId}`);
        const emp = data.employee || data.data || data;
        
        // Get full name from employee data
        const fullName = emp.name || 
                        emp.fullName ||
                        emp.employeeName ||
                        `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
                        user.name;
        
        setEmployee({
          name: fullName,
          email: emp.email || user.email || "",
          department: emp.department || user.department || "N/A",
          position: emp.position || emp.role || user.position || "N/A",
          employeeId: emp.employeeId || emp.employee_id || user.employeeId || "N/A",
        });
      } catch (err) {
        console.error("Error fetching employee details:", err);
        // Keep using user data from context
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployeeDetails();
  }, [user?.employeeId]);

  const firstName = employee.name.split(" ")[0] || "Employee";
  const initials = employee.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "E";

  return (
    <AppLayout title="My Dashboard" subtitle={`Welcome back, ${firstName}`}>
      {/* Profile Summary */}
      <Card className="card-elevated mb-6">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="" />
                <AvatarFallback className="bg-accent text-accent-foreground text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{employee.name}</h2>
                <p className="text-sm text-muted-foreground">{employee.employeeId}</p>
              </div>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{employee.email}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{employee.department}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span>{employee.position}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <AttendanceStatus />
          <LeaveBalance />
        </div>

        {/* Middle Column */}
        <div className="space-y-6">
          <WeeklyAttendance />
          <UpcomingLeave />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <SalaryOverview />
          <Announcements />
        </div>
      </div>
    </AppLayout>
  );
}
