import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { format } from "date-fns";

interface UpcomingLeave {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "approved" | "pending" | "rejected";
}

const statusStyles = {
  approved: "bg-accent/10 text-accent border-accent/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export function UpcomingLeave() {
  const [upcomingLeaves, setUpcomingLeaves] = useState<UpcomingLeave[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingLeaves = async () => {
      try {
        setIsLoading(true);
        const data = await api.get("/api/leave");
        const leaves = data.data || data.leaves || [];
        const now = new Date();

        // Filter for upcoming leaves (approved or pending, start date in future)
        const upcoming = leaves
          .filter((leave: any) => {
            const status = leave.status || "pending";
            if (status === "rejected") return false;
            
            const startDate = new Date(leave.startDate || leave.start_date);
            return startDate >= now;
          })
          .map((leave: any) => ({
            id: leave._id || leave.id || String(leave.employeeId),
            type: (leave.leaveType || leave.leave_type || "Leave").charAt(0).toUpperCase() + 
                  (leave.leaveType || leave.leave_type || "Leave").slice(1).toLowerCase(),
            startDate: format(new Date(leave.startDate || leave.start_date), "MMM d"),
            endDate: format(new Date(leave.endDate || leave.end_date), "MMM d"),
            days: leave.days || 0,
            status: (leave.status || "pending") as "approved" | "pending" | "rejected",
          }))
          .sort((a: UpcomingLeave, b: UpcomingLeave) => {
            const dateA = new Date(a.startDate);
            const dateB = new Date(b.startDate);
            return dateA.getTime() - dateB.getTime();
          })
          .slice(0, 5); // Show only top 5 upcoming

        setUpcomingLeaves(upcoming);
      } catch (err) {
        console.error("Error fetching upcoming leaves:", err);
        setUpcomingLeaves([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpcomingLeaves();
  }, []);

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-accent" />
          Upcoming Leave
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/leave">Apply Leave</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : upcomingLeaves.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming leaves scheduled
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingLeaves.map((leave) => (
              <div
                key={leave.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm">{leave.type}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {leave.startDate} {leave.days > 1 && `- ${leave.endDate}`}
                    <span className="ml-1">({leave.days} day{leave.days > 1 ? "s" : ""})</span>
                  </div>
                </div>
                <Badge variant="outline" className={statusStyles[leave.status]}>
                  {leave.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
