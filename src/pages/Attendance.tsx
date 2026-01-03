import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Clock, LogIn, LogOut, AlertTriangle, Loader2 } from "lucide-react";

interface AttendanceRecord {
  id?: string;
  employeeId?: string;
  employeeName: string;
  avatar?: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "present" | "absent" | "half-day" | "leave";
  hoursWorked: string | number;
  workingHours?: number;
}

interface TodayAttendance {
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number;
  status: "present" | "absent" | "half-day" | "leave";
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
}

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

export default function Attendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const isEmployee = user?.role === "employee";

  // Fetch today's attendance for employees
  const fetchTodayAttendance = async () => {
    if (!isEmployee) return;
    
    try {
      const response = await api.get("/api/attendance/today");
      if (response.success && response.data) {
        setTodayAttendance({
          employeeId: response.data.employeeId,
          employeeName: response.data.employeeName,
          date: response.data.date,
          checkIn: response.data.checkIn,
          checkOut: response.data.checkOut,
          workingHours: response.data.workingHours || 0,
          status: response.data.status,
          hasCheckedIn: response.hasCheckedIn || false,
          hasCheckedOut: response.hasCheckedOut || false,
        });
      }
    } catch (err) {
      console.error("Error fetching today's attendance:", err);
    }
  };

  // Fetch attendance records
  const fetchAttendanceRecords = async () => {
    try {
      setIsLoading(true);
      const dateStr = format(date, "yyyy-MM-dd");
      const response = await api.get(`/api/attendance?date=${dateStr}`);
      
      const records = response.data || response.records || (Array.isArray(response) ? response : []);
      
      const mappedRecords: AttendanceRecord[] = records.map((record: any) => ({
        id: record._id || record.id || "",
        employeeId: record.employeeId || record.employee_id,
        employeeName: record.employeeName || record.employee_name || record.name || "Unknown",
        date: record.date || dateStr,
        checkIn: record.checkIn || record.check_in || null,
        checkOut: record.checkOut || record.check_out || null,
        status: (record.status || "absent") as "present" | "absent" | "half-day" | "leave",
        hoursWorked: record.workingHours || record.hoursWorked || record.working_hours || 0,
        workingHours: record.workingHours || record.working_hours || 0,
      }));

      setAttendanceData(mappedRecords);
    } catch (err) {
      console.error("Error fetching attendance records:", err);
      setAttendanceData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch attendance summary for HR
  const fetchSummary = async () => {
    if (isEmployee) return;
    
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const response = await api.get(`/api/attendance/summary?month=${month}&year=${year}`);
      
      if (response.success && response.data) {
        setSummary(response.data);
      }
    } catch (err) {
      console.error("Error fetching attendance summary:", err);
    }
  };

  // Check in
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
        await fetchAttendanceRecords();
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

  // Check out
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
        await fetchAttendanceRecords();
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
    if (isEmployee) {
      fetchTodayAttendance();
    }
  }, [isEmployee]);

  useEffect(() => {
    fetchAttendanceRecords();
    if (!isEmployee) {
      fetchSummary();
    }
  }, [date, isEmployee]);

  // Filter records based on user role
  const userFilteredRecords = isEmployee 
    ? attendanceData.filter((record) => 
        record.employeeId === user?.employeeId || 
        record.employeeName === user?.name
      )
    : attendanceData;

  const filteredRecords = userFilteredRecords.filter((record) => {
    if (statusFilter === "all") return true;
    return record.status === statusFilter;
  });

  const stats = {
    present: userFilteredRecords.filter((r) => r.status === "present").length,
    absent: userFilteredRecords.filter((r) => r.status === "absent").length,
    halfDay: userFilteredRecords.filter((r) => r.status === "half-day").length,
    onLeave: userFilteredRecords.filter((r) => r.status === "leave").length,
  };

  return (
    <AppLayout title="Attendance" subtitle="Track daily attendance records">
      {/* Today's Attendance Card for Employees */}
      {isEmployee && todayAttendance && (
        <div className="card-elevated p-6 mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Today's Attendance</h3>
              <p className="text-sm text-muted-foreground">{format(new Date(todayAttendance.date), "EEEE, MMMM d, yyyy")}</p>
            </div>
            <Badge variant="outline" className={statusStyles[todayAttendance.status]}>
              {statusLabels[todayAttendance.status]}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Check In</p>
              <p className="text-lg font-semibold text-foreground">
                {todayAttendance.checkIn || "Not checked in"}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Check Out</p>
              <p className="text-lg font-semibold text-foreground">
                {todayAttendance.checkOut || "Not checked out"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCheckIn}
              disabled={todayAttendance.hasCheckedIn || isCheckingIn}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
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
              disabled={!todayAttendance.hasCheckedIn || todayAttendance.hasCheckedOut || isCheckingOut}
              variant="outline"
              className="border-warning text-warning hover:bg-warning/10"
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
          
          {todayAttendance.workingHours > 0 && (
            <div className="mt-4 p-3 bg-accent/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Working Hours</p>
              <p className="text-xl font-bold text-accent">{todayAttendance.workingHours.toFixed(2)} hours</p>
            </div>
          )}
        </div>
      )}

      {/* Attendance Summary for HR */}
      {!isEmployee && summary && (
        <div className="card-elevated p-6 mb-6 animate-slide-up">
          <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Days</p>
              <p className="text-2xl font-bold text-foreground">{summary.totalDays}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Present Days</p>
              <p className="text-2xl font-bold text-success">{summary.presentDays}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Absent Days</p>
              <p className="text-2xl font-bold text-destructive">{summary.absentDays}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Hours</p>
              <p className="text-2xl font-bold text-accent">{summary.averageHours?.toFixed(2) || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-stat animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.present}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
          </div>
        </div>
        <div className="card-stat animate-slide-up" style={{ animationDelay: "50ms" }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.absent}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
          </div>
        </div>
        <div className="card-stat animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.halfDay}</p>
              <p className="text-sm text-muted-foreground">Half Day</p>
            </div>
          </div>
        </div>
        <div className="card-stat animate-slide-up" style={{ animationDelay: "150ms" }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.onLeave}</p>
              <p className="text-sm text-muted-foreground">On Leave</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(d)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="present">Present</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
            <SelectItem value="half-day">Half Day</SelectItem>
            <SelectItem value="leave">On Leave</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Attendance Table */}
      <div className="card-elevated overflow-hidden animate-slide-up" style={{ animationDelay: "200ms" }}>
        <Table>
          <TableHeader>
            <TableRow className="table-header hover:bg-muted/50">
              {user?.role !== "employee" && <TableHead className="w-[250px]">Employee</TableHead>}
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Hours Worked</TableHead>
              <TableHead>Status</TableHead>
              {user?.role !== "employee" && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isEmployee ? 4 : 6} className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-12 w-12 mx-auto mb-3 opacity-50 animate-spin" />
                  <p>Loading attendance records...</p>
                </TableCell>
              </TableRow>
            ) : filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isEmployee ? 4 : 6} className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No attendance records found</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((record) => (
                <TableRow key={record.id} className="table-row-hover">
                {user?.role !== "employee" && (
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={record.avatar} />
                        <AvatarFallback className="bg-accent/10 text-accent">
                          {record.employeeName.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{record.employeeName}</span>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  {record.checkIn ? (
                    <div className="flex items-center gap-2 text-foreground">
                      <LogIn className="h-4 w-4 text-success" />
                      {record.checkIn}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {record.checkOut ? (
                    <div className="flex items-center gap-2 text-foreground">
                      <LogOut className="h-4 w-4 text-muted-foreground" />
                      {record.checkOut}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className={cn(
                  typeof record.hoursWorked === "number" && record.hoursWorked > 0 ? "text-foreground" : "text-muted-foreground"
                )}>
                  {typeof record.hoursWorked === "number" 
                    ? `${record.hoursWorked.toFixed(2)} hours`
                    : record.hoursWorked || "—"
                  }
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusStyles[record.status]}>
                    {statusLabels[record.status]}
                  </Badge>
                </TableCell>
                {user?.role !== "employee" && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
