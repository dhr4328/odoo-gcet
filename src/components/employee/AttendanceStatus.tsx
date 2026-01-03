import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function AttendanceStatus() {
  const { toast } = useToast();
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const fetchTodayAttendance = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/attendance/today");
      if (response.success && response.data) {
        setTodayAttendance(response);
      }
    } catch (err) {
      console.error("Error fetching today's attendance:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const response = await api.post("/api/attendance/checkin");
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Checked in successfully",
        });
        await fetchTodayAttendance();
      }
    } catch (err) {
      console.error("Error checking in:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to check in",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setIsCheckingOut(true);
    try {
      const response = await api.post("/api/attendance/checkout");
      if (response.success) {
        toast({
          title: "Success",
          description: response.message || "Checked out successfully",
        });
        await fetchTodayAttendance();
      }
    } catch (err) {
      console.error("Error checking out:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to check out",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const data = todayAttendance?.data;
  const hasCheckedIn = todayAttendance?.hasCheckedIn || false;
  const hasCheckedOut = todayAttendance?.hasCheckedOut || false;
  const checkInTime = data?.checkIn || null;
  const checkOutTime = data?.checkOut || null;
  const status = data?.status || "absent";
  const workingHours = data?.workingHours || 0;

  const statusStyles = {
    present: "badge-success",
    absent: "badge-error",
    "half-day": "badge-warning",
    leave: "badge-neutral",
  };

  const statusLabels = {
    present: "Present",
    absent: "Absent",
    "half-day": "Half Day",
    leave: "On Leave",
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-accent" />
          Today's Attendance
        </CardTitle>
        <p className="text-sm text-muted-foreground">{currentDate}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-semibold text-accent">
                    {hasCheckedIn ? (hasCheckedOut ? "Checked Out" : "Checked In") : "Not Checked In"}
                  </p>
                  <Badge variant="outline" className={statusStyles[status]}>
                    {statusLabels[status]}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Check-in Time</p>
                <p className="font-semibold">{checkInTime || "--:--"}</p>
              </div>
            </div>
            
            {checkOutTime && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Check-out Time</p>
                <p className="font-semibold text-foreground">{checkOutTime}</p>
                {workingHours > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Working Hours: <span className="font-semibold text-accent">{workingHours.toFixed(2)} hours</span>
                  </p>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={handleCheckIn}
                disabled={hasCheckedIn || isCheckingIn}
                className={!hasCheckedIn ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}
              >
                {isCheckingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking In...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Check In
                  </>
                )}
              </Button>
              <Button 
                onClick={handleCheckOut}
                disabled={!hasCheckedIn || hasCheckedOut || isCheckingOut}
                variant="outline"
                className={hasCheckedIn && !hasCheckedOut ? "bg-warning hover:bg-warning/90 text-warning-foreground border-warning" : ""}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking Out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Check Out
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
