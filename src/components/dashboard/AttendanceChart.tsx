import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";

export function AttendanceChart() {
  const [data, setData] = useState<{ day: string; present: number; absent: number; leave: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyAttendance = async () => {
      try {
        setIsLoading(true);
        
        // Get dates for the past 7 days
        const today = new Date();
        const weekData: { day: string; present: number; absent: number; leave: number }[] = [];
        
        // Fetch attendance for each day of the week
        const promises = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(today, i);
          const dateStr = format(date, "yyyy-MM-dd");
          promises.push(
            api.get(`/api/attendance?date=${dateStr}`).catch(() => ({ data: [], records: [] }))
          );
        }
        
        const results = await Promise.all(promises);
        
        // Process each day's data
        for (let i = 6; i >= 0; i--) {
          const date = subDays(today, i);
          const dayName = format(date, "EEE"); // Mon, Tue, etc.
          const result = results[6 - i];
          
          const records = result.data || result.records || (Array.isArray(result) ? result : []);
          
          const present = records.filter((r: any) => (r.status || "absent") === "present").length;
          const absent = records.filter((r: any) => (r.status || "absent") === "absent").length;
          const leave = records.filter((r: any) => (r.status || "absent") === "leave").length;
          
          weekData.push({
            day: dayName,
            present,
            absent,
            leave,
          });
        }
        
        setData(weekData);
      } catch (err) {
        console.error("Error fetching weekly attendance:", err);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeeklyAttendance();
  }, []);

  return (
    <div className="card-elevated p-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
      <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Attendance</h3>
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No attendance data available</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="day" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
              <Bar dataKey="present" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Present" />
              <Bar dataKey="absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Absent" />
              <Bar dataKey="leave" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} name="On Leave" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-success" />
          <span className="text-sm text-muted-foreground">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-destructive" />
          <span className="text-sm text-muted-foreground">Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-warning" />
          <span className="text-sm text-muted-foreground">On Leave</span>
        </div>
      </div>
    </div>
  );
}
