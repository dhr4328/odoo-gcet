import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Plus, Check, X, Clock, Plane, Stethoscope, Baby, Loader2, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

interface LeaveRequest {
  id: string;
  employeeName: string;
  avatar?: string;
  type: "paid" | "unpaid" | "vacation" | "sick" | "personal" | "maternity";
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "rejected";
  reason: string;
  appliedOn: string;
}


const leaveTypeIcons = {
  paid: Plane,
  unpaid: Clock,
  vacation: Plane,
  sick: Stethoscope,
  personal: Clock,
  maternity: Baby,
};

const leaveTypeColors = {
  paid: "bg-accent/10 text-accent",
  unpaid: "bg-muted text-muted-foreground",
  vacation: "bg-accent/10 text-accent",
  sick: "bg-destructive/10 text-destructive",
  personal: "bg-warning/10 text-warning",
  maternity: "bg-muted text-muted-foreground",
};

const statusStyles = {
  pending: "badge-warning",
  approved: "badge-success",
  rejected: "badge-error",
};

export default function Leave() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [leaveType, setLeaveType] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Map<string, string>>(new Map()); // employeeId -> name
  const [availableLeaveTypes, setAvailableLeaveTypes] = useState<Array<{ name: string; code: string; totalDays: number }>>([]);

  // HR and Admin users cannot apply for leave, they can only approve/reject
  const canApplyForLeave = user?.role === "employee";

  // Fetch employees for HR users to get employee names
  const fetchEmployees = async () => {
    if (user?.role !== "employee") {
      try {
        const data = await api.get("/api/employees");
        const employeesArray = Array.isArray(data) ? data : (data.employees || data.data || []);
        const employeesMap = new Map<string, string>();
        employeesArray.forEach((emp: any) => {
          const employeeId = emp.employeeId || emp.employee_id || emp.id;
          const name = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.full_name || "Unknown";
          if (employeeId) {
            employeesMap.set(employeeId, name);
          }
        });
        setEmployees(employeesMap);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    }
  };

  // Fetch available leave types
  const fetchLeaveTypes = async () => {
    try {
      const data = await api.get("/api/leave-types");
      const types = data.data || [];
      setAvailableLeaveTypes(types.filter((lt: any) => lt.isActive !== false));
    } catch (err) {
      console.error("Error fetching leave types:", err);
      // Fallback to default types if API fails
      setAvailableLeaveTypes([
        { name: "Vacation", code: "VL", totalDays: 20 },
        { name: "Sick", code: "SL", totalDays: 10 },
        { name: "Personal", code: "PL", totalDays: 5 },
        { name: "Maternity", code: "ML", totalDays: 90 },
        { name: "Paid", code: "PD", totalDays: 15 },
        { name: "Unpaid", code: "UL", totalDays: 0 },
      ]);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get("/api/leave");
      
      // Handle API response structure: {success: true, data: leaves}
      const leaves = response.data || response.leaves || (Array.isArray(response) ? response : []);
      
      // Map API response to LeaveRequest interface
      const mappedRequests: LeaveRequest[] = leaves.map((req: any) => {
        const employeeId = req.employeeId || req.employee_id;
        let employeeName = "Unknown";
        
        // For HR users, get name from employees map
        if (user?.role !== "employee" && employeeId) {
          employeeName = employees.get(employeeId) || user?.name || "Unknown";
        } else {
          // For employees, use their own name
          employeeName = user?.name || "Unknown";
        }
        
        // Calculate days if not provided
        let days = req.days || 0;
        if (!days && req.startDate && req.endDate) {
          const start = new Date(req.startDate);
          const end = new Date(req.endDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
        
        // Normalize leave type to match our mapping
        const rawType = (req.leaveType || req.leave_type || req.type || "paid").toLowerCase();
        let normalizedType: "paid" | "unpaid" | "vacation" | "sick" | "personal" | "maternity" = "paid";
        if (rawType === "paid") {
          normalizedType = "paid";
        } else if (rawType === "unpaid") {
          normalizedType = "unpaid";
        } else if (rawType === "vacation" || rawType === "vacation leave") {
          normalizedType = "vacation";
        } else if (rawType === "sick" || rawType === "sick leave") {
          normalizedType = "sick";
        } else if (rawType === "personal" || rawType === "personal leave") {
          normalizedType = "personal";
        } else if (rawType === "maternity" || rawType === "maternity leave") {
          normalizedType = "maternity";
        }
        
        return {
          id: req._id || req.id || "",
          employeeName,
          avatar: req.avatar || req.profile_picture || req.profilePicture,
          type: normalizedType,
          startDate: req.startDate || req.start_date || "",
          endDate: req.endDate || req.end_date || "",
          days,
          status: (req.status || "pending") as "pending" | "approved" | "rejected",
          reason: req.reason || req.description || req.comment || "",
          appliedOn: req.appliedDate || req.applied_date || req.appliedOn || req.createdAt || req.created_at || new Date().toISOString(),
        };
      });
      
      setLeaveRequests(mappedRequests);
    } catch (err) {
      console.error("Error fetching leave requests:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch leave requests");
      setLeaveRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
    if (user?.role !== "employee") {
      fetchEmployees();
    }
    fetchLeaveRequests();
  }, [user?.role]);

  useEffect(() => {
    // Wait for employees to load if HR, or fetch immediately if employee
    if (user?.role === "employee" || (user?.role !== "employee" && employees.size > 0)) {
      fetchLeaveRequests();
    }
  }, [employees.size, user?.role]);

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !leaveType || !reason.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (endDate < startDate) {
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    // Calculate days
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    setIsSubmitting(true);
    try {
      // Format dates as YYYY-MM-DD
      const formattedStartDate = startDate.toISOString().split("T")[0];
      const formattedEndDate = endDate.toISOString().split("T")[0];

      await api.post("/api/leave", {
        // Use the leave type name directly (it's already the name from API)
        leaveType: leaveType,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        days: days,
        reason: reason.trim(),
      });

      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });

      setApplyDialogOpen(false);
      setStartDate(undefined);
      setEndDate(undefined);
      setLeaveType("");
      setReason("");
      await fetchLeaveRequests();
    } catch (err) {
      console.error("Error creating leave request:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to submit leave request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveLeave = async (leaveId: string) => {
    try {
      await api.put(`/api/leave/${leaveId}`, {
        status: "approved",
      });

      toast({
        title: "Success",
        description: "Leave request approved",
      });

      await fetchLeaveRequests();
    } catch (err) {
      console.error("Error approving leave request:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to approve leave request",
        variant: "destructive",
      });
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    try {
      await api.put(`/api/leave/${leaveId}`, {
        status: "rejected",
      });

      toast({
        title: "Success",
        description: "Leave request rejected",
      });

      await fetchLeaveRequests();
    } catch (err) {
      console.error("Error rejecting leave request:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to reject leave request",
        variant: "destructive",
      });
    }
  };

  const pendingRequests = leaveRequests.filter((r) => r.status === "pending");
  const processedRequests = leaveRequests.filter((r) => r.status === "approved" || r.status === "rejected");

  const LeaveCard = ({ request }: { request: LeaveRequest }) => {
    const TypeIcon = leaveTypeIcons[request.type] || Clock; // Fallback to Clock icon if type not found
    const typeColor = leaveTypeColors[request.type] || leaveTypeColors.personal; // Fallback color

    return (
      <div className="card-elevated p-5 animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={request.avatar} />
              <AvatarFallback className="bg-accent/10 text-accent">
                {request.employeeName.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{request.employeeName}</p>
              <p className="text-sm text-muted-foreground">Applied {format(new Date(request.appliedOn), "MMM d, yyyy")}</p>
            </div>
          </div>
          <Badge variant="outline" className={statusStyles[request.status] || statusStyles.pending}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", typeColor)}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <span className="font-medium text-foreground capitalize">{request.type} Leave</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{request.days} day{request.days > 1 ? "s" : ""}</span>
        </div>

        <div className="text-sm text-muted-foreground mb-3">
          {format(new Date(request.startDate), "MMM d")} - {format(new Date(request.endDate), "MMM d, yyyy")}
        </div>

        <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg mb-4">
          "{request.reason}"
        </p>

        {request.status === "pending" && user?.role !== "employee" && (
          <div className="flex gap-2">
            <Button 
              className="flex-1 bg-success hover:bg-success/90 text-success-foreground" 
              size="sm"
              onClick={() => handleApproveLeave(request.id)}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 border-destructive text-destructive hover:bg-destructive/10" 
              size="sm"
              onClick={() => handleRejectLeave(request.id)}
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout title="Leave Management" subtitle="Manage leave requests and balances">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        {canApplyForLeave && (
          <div className="flex gap-4">
            <div className="card-stat py-3 px-5">
              <div className="flex items-center gap-3">
                <Plane className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-lg font-semibold text-foreground">0</p>
                  <p className="text-xs text-muted-foreground">Vacation Balance</p>
                </div>
              </div>
            </div>
            <div className="card-stat py-3 px-5">
              <div className="flex items-center gap-3">
                <Stethoscope className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-lg font-semibold text-foreground">0</p>
                  <p className="text-xs text-muted-foreground">Sick Leave</p>
                </div>
              </div>
            </div>
            <div className="card-stat py-3 px-5">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-lg font-semibold text-foreground">0</p>
                  <p className="text-xs text-muted-foreground">Personal Days</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {canApplyForLeave && (
          <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Apply for Leave
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request for approval.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLeave}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Leave Type *</Label>
                <Select value={leaveType} onValueChange={setLeaveType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLeaveTypes.length > 0 ? (
                      availableLeaveTypes.map((lt) => (
                        <SelectItem key={lt.code} value={lt.name}>
                          {lt.name} ({lt.code}) - {lt.totalDays} days
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Vacation">Vacation Leave</SelectItem>
                        <SelectItem value="Sick">Sick Leave</SelectItem>
                        <SelectItem value="Personal">Personal Leave</SelectItem>
                        <SelectItem value="Maternity">Maternity Leave</SelectItem>
                        <SelectItem value="Paid">Paid Leave</SelectItem>
                        <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason *</Label>
                <Textarea 
                  placeholder="Briefly describe the reason for your leave request..." 
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => {
                  setApplyDialogOpen(false);
                  setStartDate(undefined);
                  setEndDate(undefined);
                  setLeaveType("");
                  setReason("");
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-accent hover:bg-accent/90 text-accent-foreground" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="pending" className="relative">
            Pending Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 h-5 min-w-5 rounded-full bg-warning px-1.5 text-xs font-medium text-warning-foreground flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-12 w-12 mx-auto mb-3 opacity-50 animate-spin" />
              <p>Loading leave requests...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-destructive" />
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={fetchLeaveRequests}
              >
                Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingRequests.map((request, index) => (
                  <div key={request.id} style={{ animationDelay: `${index * 50}ms` }}>
                    <LeaveCard request={request} />
                  </div>
                ))}
              </div>
              {pendingRequests.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No pending leave requests</p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-12 w-12 mx-auto mb-3 opacity-50 animate-spin" />
              <p>Loading leave history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-destructive" />
              <p className="text-destructive">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={fetchLeaveRequests}
              >
                Retry
              </Button>
            </div>
          ) : processedRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {processedRequests.map((request, index) => (
                <div key={request.id} style={{ animationDelay: `${index * 50}ms` }}>
                  <LeaveCard request={request} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No leave history</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
