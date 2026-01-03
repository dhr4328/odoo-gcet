import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Activity {
  id: string;
  type: "leave" | "attendance" | "payroll" | "employee";
  title: string;
  description: string;
  time: string;
  status?: "approved" | "pending" | "rejected";
}

const typeColors = {
  leave: "bg-accent/10",
  attendance: "bg-warning/10",
  payroll: "bg-success/10",
  employee: "bg-muted",
};

const statusStyles = {
  approved: "text-success",
  pending: "text-warning",
  rejected: "text-destructive",
};

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        setIsLoading(true);
        
        // Fetch recent leave requests
        const leaveData = await api.get("/api/leave").catch(() => ({ data: [] }));
        const leaves = leaveData.data || leaveData.leaves || [];
        
        // Fetch recent employees (newly added)
        const employeesData = await api.get("/api/employees").catch(() => ({ data: [] }));
        const employees = Array.isArray(employeesData) 
          ? employeesData 
          : (employeesData.employees || employeesData.data || []);
        
        // Sort employees by creation date (newest first)
        const recentEmployees = employees
          .sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || a.createdAt || 0);
            const dateB = new Date(b.created_at || b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 3);
        
        // Combine and format activities
        interface ActivityWithTimestamp extends Activity {
          timestamp: number;
        }
        
        const activityList: ActivityWithTimestamp[] = [];
        
        // Add recent leave requests
        leaves.slice(0, 5).forEach((leave: any) => {
          const appliedDate = leave.appliedDate || leave.applied_date || leave.createdAt || leave.created_at;
          const dateObj = appliedDate ? new Date(appliedDate) : new Date();
          activityList.push({
            id: leave._id || leave.id || `leave-${leave.employeeId}`,
            type: "leave",
            title: `${leave.employeeName || "Employee"} requested leave`,
            description: `${leave.days || 0} days - ${leave.leaveType || leave.leave_type || "leave"}`,
            time: format(dateObj, "MMM d, h:mm a"),
            status: leave.status as "approved" | "pending" | "rejected",
            timestamp: dateObj.getTime(),
          });
        });
        
        // Add recent employees
        recentEmployees.forEach((emp: any) => {
          const createdDate = emp.created_at || emp.createdAt;
          const dateObj = createdDate ? new Date(createdDate) : new Date();
          activityList.push({
            id: emp._id || emp.id || `emp-${emp.employeeId}`,
            type: "employee",
            title: "New employee added",
            description: `${emp.name || emp.employeeName || "Employee"} joined ${emp.department || "the team"}`,
            time: format(dateObj, "MMM d, h:mm a"),
            timestamp: dateObj.getTime(),
          });
        });
        
        // Sort by timestamp (most recent first) and limit to 10
        activityList.sort((a, b) => b.timestamp - a.timestamp);
        
        // Remove timestamp before setting state
        const formattedActivities: Activity[] = activityList.slice(0, 10).map(({ timestamp, ...activity }) => activity);
        setActivities(formattedActivities);
      } catch (err) {
        console.error("Error fetching recent activity:", err);
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  return (
    <div className="card-elevated p-6 animate-slide-up" style={{ animationDelay: "150ms" }}>
      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
            <p className="text-sm">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className={cn(
              "h-2 w-2 rounded-full mt-2",
              typeColors[activity.type]
            )} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {activity.title}
                </p>
                {activity.status && (
                  <span className={cn(
                    "text-xs font-medium capitalize",
                    statusStyles[activity.status]
                  )}>
                    {activity.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
}
