import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface LeaveBalanceData {
  type: string;
  used: number;
  total: number;
  color: string;
}

const leaveTypeColors: Record<string, string> = {
  vacation: "bg-accent",
  sick: "bg-destructive",
  personal: "bg-warning",
  maternity: "bg-purple-500",
  paid: "bg-blue-500",
  unpaid: "bg-muted",
};

// Leave types in the order they should be displayed
const leaveTypeOrder = ["vacation", "sick", "personal", "maternity", "paid", "unpaid"];

const defaultLeaveBalances: Record<string, number> = {
  vacation: 20,
  sick: 10,
  personal: 5,
  maternity: 90,
  paid: 15,
  unpaid: 0,
};

export function LeaveBalance() {
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState<LeaveBalanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaveBalance = async () => {
      if (!user?.employeeId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Try to fetch from leave balance API
        try {
          const currentYear = new Date().getFullYear();
          const data = await api.get(`/api/leave-balance/${user.employeeId}?year=${currentYear}`);
          const balanceData = data.data?.balance || [];
          
          if (balanceData.length > 0) {
            const balances: LeaveBalanceData[] = balanceData.map((item: any) => {
              const leaveTypeName = (item.leaveType || "").toLowerCase();
              return {
                type: item.leaveType || "Leave",
                used: item.usedDays || 0,
                total: item.totalDays || 0,
                color: leaveTypeColors[leaveTypeName] || "bg-muted",
              };
            });
            setLeaveTypes(balances);
            return;
          }
        } catch (err) {
          console.log("Leave balance API not available, calculating from leave requests");
        }

        // Fallback: Calculate from leave requests
        const data = await api.get("/api/leave");
        const leaves = data.data || data.leaves || [];

        // Calculate used leaves by type
        const usedByType: Record<string, number> = {};
        const now = new Date();

        leaves.forEach((leave: any) => {
          const leaveType = (leave.leaveType || leave.leave_type || "vacation").toLowerCase();
          const status = leave.status || "pending";
          
          // Only count approved leaves
          if (status === "approved") {
            const endDate = new Date(leave.endDate || leave.end_date);
            // Only count if the leave has ended or is in the past
            if (endDate <= now) {
              const days = leave.days || 0;
              usedByType[leaveType] = (usedByType[leaveType] || 0) + days;
            }
          }
        });

        // Fetch leave types from API to get totals
        try {
          const typesData = await api.get("/api/leave-types");
          const types = typesData.data || [];
          const activeTypes = types.filter((lt: any) => lt.isActive !== false);
          
          const balances: LeaveBalanceData[] = activeTypes.map((lt: any) => {
            const leaveTypeName = (lt.name || "").toLowerCase();
            return {
              type: lt.name || "Leave",
              used: usedByType[leaveTypeName] || 0,
              total: lt.totalDays || 0,
              color: leaveTypeColors[leaveTypeName] || "bg-muted",
            };
          });
          setLeaveTypes(balances);
        } catch {
          // Fallback to default balances
          const balances: LeaveBalanceData[] = leaveTypeOrder.map((type) => ({
            type: type.charAt(0).toUpperCase() + type.slice(1),
            used: usedByType[type] || 0,
            total: defaultLeaveBalances[type] || 0,
            color: leaveTypeColors[type] || "bg-muted",
          }));
          setLeaveTypes(balances);
        }
      } catch (err) {
        console.error("Error fetching leave balance:", err);
        // Set default balances on error in correct order
        setLeaveTypes(
          leaveTypeOrder.map((type) => ({
            type: type.charAt(0).toUpperCase() + type.slice(1),
            used: 0,
            total: defaultLeaveBalances[type] || 0,
            color: leaveTypeColors[type] || "bg-muted",
          }))
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaveBalance();
  }, [user?.employeeId]);

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-accent" />
          Leave Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : leaveTypes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No leave balance data available</p>
          </div>
        ) : (
          <>
            {leaveTypes.map((leave) => {
              const remaining = leave.total - leave.used;
              const percentage = leave.total > 0 ? (leave.used / leave.total) * 100 : 0;
              
              return (
                <div key={leave.type} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{leave.type}</span>
                    <span className="text-muted-foreground">
                      {remaining} / {leave.total} days left
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${leave.color} transition-all duration-300`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Total Available: <span className="font-semibold text-foreground">
                  {leaveTypes.reduce((sum, lt) => sum + (lt.total - lt.used), 0)} days
                </span>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
