import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { format, subDays, startOfWeek, isToday, isSameDay } from "date-fns";

interface WeekDay {
  day: string;
  date: string;
  status: "present" | "absent" | "leave" | "holiday" | "halfday";
  checkIn: string | null;
  checkOut: string | null;
}

const statusConfig = {
  present: { label: "Present", color: "bg-accent text-accent-foreground" },
  absent: { label: "Absent", color: "bg-destructive text-destructive-foreground" },
  leave: { label: "Leave", color: "bg-warning text-warning-foreground" },
  holiday: { label: "Holiday", color: "bg-muted text-muted-foreground" },
  halfday: { label: "Half Day", color: "bg-warning/70 text-warning-foreground" },
};

export function WeeklyAttendance() {
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyAttendance = async () => {
      try {
        setIsLoading(true);
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        
        // Fetch attendance for each day of the week
        const promises = [];
        for (let i = 0; i < 5; i++) { // Monday to Friday
          const date = new Date(weekStart);
          date.setDate(weekStart.getDate() + i);
          const dateStr = format(date, "yyyy-MM-dd");
          promises.push(
            api.get(`/api/attendance?date=${dateStr}`).catch(() => ({ data: [] }))
          );
        }
        
        const results = await Promise.all(promises);
        
        // Process each day's data
        const weekData: WeekDay[] = [];
        for (let i = 0; i < 5; i++) {
          const date = new Date(weekStart);
          date.setDate(weekStart.getDate() + i);
          const result = results[i];
          const records = result.data || result.records || [];
          
          // Get employee's record for this day
          const employeeRecord = records.find((r: any) => r.status !== undefined);
          
          let status: "present" | "absent" | "leave" | "holiday" | "halfday" = "absent";
          let checkIn: string | null = null;
          let checkOut: string | null = null;
          
          if (employeeRecord) {
            const recordStatus = (employeeRecord.status || "absent").toLowerCase();
            if (recordStatus === "present") {
              status = "present";
            } else if (recordStatus === "half-day" || recordStatus === "halfday") {
              status = "halfday";
            } else if (recordStatus === "leave") {
              status = "leave";
            }
            
            checkIn = employeeRecord.checkInTime || employeeRecord.check_in_time || null;
            checkOut = employeeRecord.checkOutTime || employeeRecord.check_out_time || null;
            
            if (checkIn) {
              try {
                const time = new Date(checkIn);
                checkIn = format(time, "HH:mm");
              } catch {
                checkIn = checkIn.split("T")[1]?.split(":")?.slice(0, 2).join(":") || checkIn;
              }
            }
            
            if (checkOut) {
              try {
                const time = new Date(checkOut);
                checkOut = format(time, "HH:mm");
              } catch {
                checkOut = checkOut.split("T")[1]?.split(":")?.slice(0, 2).join(":") || checkOut;
              }
            }
          }
          
          weekData.push({
            day: format(date, "EEE"),
            date: format(date, "MMM d"),
            status,
            checkIn,
            checkOut,
          });
        }
        
        setWeekDays(weekData);
      } catch (err) {
        console.error("Error fetching weekly attendance:", err);
        setWeekDays([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeeklyAttendance();
  }, []);

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-accent" />
          This Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : weekDays.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No attendance data for this week</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {weekDays.map((day) => {
              const config = statusConfig[day.status as keyof typeof statusConfig];
              const dayDate = new Date(day.date + " " + new Date().getFullYear());
              const isTodayDate = isToday(dayDate);
            
            return (
              <div
                key={day.day}
                className={cn(
                  "p-3 rounded-lg text-center transition-all",
                  isTodayDate ? "ring-2 ring-accent ring-offset-2" : "",
                  "bg-muted/30"
                )}
              >
                <p className="text-xs font-medium text-muted-foreground">{day.day}</p>
                <p className="text-sm font-semibold mb-2">{day.date.split(" ")[1]}</p>
                <span className={cn(
                  "inline-block px-2 py-0.5 rounded text-xs font-medium",
                  config.color
                )}>
                  {config.label}
                </span>
                {day.checkIn && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p>{day.checkIn}</p>
                    <p>{day.checkOut || "--:--"}</p>
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
