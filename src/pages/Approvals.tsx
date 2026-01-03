import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Calendar, Clock, FileText, AlertCircle, CheckSquare, Loader2, Plane, Stethoscope, Baby } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ApprovalItem {
  id: string;
  type: "leave" | "attendance" | "expense";
  employeeName: string;
  employeeId?: string;
  avatar?: string;
  title: string;
  description: string;
  submittedAt: string;
  priority: "high" | "medium" | "low";
  details?: Record<string, string>;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
}

const typeIcons = {
  leave: Calendar,
  attendance: Clock,
  expense: FileText,
};

const typeColors = {
  leave: "bg-accent/10 text-accent",
  attendance: "bg-warning/10 text-warning",
  expense: "bg-muted text-muted-foreground",
};

const leaveTypeIcons: Record<string, any> = {
  vacation: Plane,
  sick: Stethoscope,
  personal: Clock,
  maternity: Baby,
  paid: Plane,
  unpaid: Clock,
};

const priorityStyles = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-muted",
};

export default function Approvals() {
  const { toast } = useToast();
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<Map<string, string>>(new Map());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Fetch employees for HR users to get employee names
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await api.get("/api/employees");
        const employeesArray = Array.isArray(data) ? data : (data.employees || data.data || []);
        const employeesMap = new Map<string, string>();
        employeesArray.forEach((emp: any) => {
          const employeeId = emp.employeeId || emp.employee_id || emp.id;
          const name = emp.name || 
                      `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || 
                      emp.full_name || 
                      emp.employeeName ||
                      "Unknown";
          if (employeeId) {
            employeesMap.set(employeeId, name);
          }
        });
        setEmployees(employeesMap);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };

    fetchEmployees();
  }, []);

  // Fetch pending leave requests
  useEffect(() => {
    fetchPendingApprovals();
  }, [employees]);

  const fetchPendingApprovals = async () => {
    try {
      setIsLoading(true);
      const data = await api.get("/api/leave");
      const leaves = data.data || data.leaves || [];

      // Filter for pending leave requests
      const pendingLeaves = leaves.filter((leave: any) => 
        (leave.status || "pending") === "pending"
      );

      // Map to ApprovalItem format
      const approvals: ApprovalItem[] = pendingLeaves.map((leave: any) => {
        const employeeId = leave.employeeId || leave.employee_id;
        const employeeName = leave.employeeName || 
                            employees.get(employeeId) || 
                            "Unknown Employee";
        
        const leaveType = (leave.leaveType || leave.leave_type || "leave").toLowerCase();
        const startDate = leave.startDate || leave.start_date;
        const endDate = leave.endDate || leave.end_date;
        const days = leave.days || 0;
        const appliedDate = leave.appliedDate || leave.applied_date || leave.createdAt || leave.created_at;

        // Calculate priority based on how soon the leave starts
        let priority: "high" | "medium" | "low" = "low";
        if (startDate) {
          const start = new Date(startDate);
          const now = new Date();
          const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil <= 3) {
            priority = "high";
          } else if (daysUntil <= 7) {
            priority = "medium";
          }
        }

        const TypeIcon = leaveTypeIcons[leaveType] || Calendar;

        return {
          id: leave._id || leave.id || String(employeeId),
          type: "leave" as const,
          employeeName,
          employeeId,
          title: `${leaveType.charAt(0).toUpperCase() + leaveType.slice(1)} Leave Request`,
          description: leave.reason || "No reason provided",
          submittedAt: appliedDate || new Date().toISOString(),
          priority,
          leaveType,
          startDate,
          endDate,
          days,
          details: {
            "Leave Type": leaveType.charAt(0).toUpperCase() + leaveType.slice(1),
            "Start Date": startDate ? format(new Date(startDate), "MMM d, yyyy") : "N/A",
            "End Date": endDate ? format(new Date(endDate), "MMM d, yyyy") : "N/A",
            "Duration": `${days} day${days !== 1 ? "s" : ""}`,
          },
        };
      });

      // Sort by priority and date
      approvals.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      });

      setPendingApprovals(approvals);
    } catch (err) {
      console.error("Error fetching pending approvals:", err);
      toast({
        title: "Error",
        description: "Failed to load pending approvals",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (item: ApprovalItem) => {
    if (item.type !== "leave") return;

    setProcessingIds((prev) => new Set(prev).add(item.id));
    try {
      await api.put(`/api/leave/${item.id}`, {
        status: "approved",
      });

      toast({
        title: "Success",
        description: `Leave request approved for ${item.employeeName}`,
      });

      await fetchPendingApprovals();
    } catch (err) {
      console.error("Error approving leave request:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to approve leave request",
        variant: "destructive",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleReject = async (item: ApprovalItem) => {
    if (item.type !== "leave") return;

    setProcessingIds((prev) => new Set(prev).add(item.id));
    try {
      await api.put(`/api/leave/${item.id}`, {
        status: "rejected",
      });

      toast({
        title: "Success",
        description: `Leave request rejected for ${item.employeeName}`,
      });

      await fetchPendingApprovals();
    } catch (err) {
      console.error("Error rejecting leave request:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to reject leave request",
        variant: "destructive",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleApproveAll = async () => {
    const leaveApprovals = pendingApprovals.filter((a) => a.type === "leave");
    if (leaveApprovals.length === 0) return;

    try {
      const promises = leaveApprovals.map((item) =>
        api.put(`/api/leave/${item.id}`, { status: "approved" })
      );
      await Promise.all(promises);

      toast({
        title: "Success",
        description: `Approved ${leaveApprovals.length} leave request(s)`,
      });

      await fetchPendingApprovals();
    } catch (err) {
      console.error("Error approving all requests:", err);
      toast({
        title: "Error",
        description: "Failed to approve all requests",
        variant: "destructive",
      });
    }
  };

  const leaveApprovals = pendingApprovals.filter((a) => a.type === "leave");
  const otherApprovals = pendingApprovals.filter((a) => a.type !== "leave");

  const ApprovalCard = ({ item }: { item: ApprovalItem }) => {
    const TypeIcon = typeIcons[item.type];
    const LeaveTypeIcon = item.type === "leave" && item.leaveType 
      ? (leaveTypeIcons[item.leaveType] || Calendar)
      : null;
    const isProcessing = processingIds.has(item.id);

    return (
      <div className={`card-elevated p-5 border-l-4 ${priorityStyles[item.priority]} animate-slide-up`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={item.avatar} />
              <AvatarFallback className="bg-accent/10 text-accent">
                {item.employeeName.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{item.employeeName}</p>
              <p className="text-sm text-muted-foreground">
                Submitted {format(new Date(item.submittedAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>
          {item.priority === "high" && (
            <Badge variant="outline" className="badge-error">
              <AlertCircle className="h-3 w-3 mr-1" />
              Urgent
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${typeColors[item.type]}`}>
            {item.type === "leave" && LeaveTypeIcon ? (
              <LeaveTypeIcon className="h-4 w-4" />
            ) : (
              <TypeIcon className="h-4 w-4" />
            )}
          </div>
          <span className="font-medium text-foreground">{item.title}</span>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{item.description}</p>

        {item.details && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4 space-y-1">
            {Object.entries(item.details).map(([key, value]) => (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{key}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
            size="sm"
            onClick={() => handleApprove(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Approve
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
            size="sm"
            onClick={() => handleReject(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <X className="h-4 w-4 mr-1" />
            )}
            Reject
          </Button>
        </div>
      </div>
    );
  };

  return (
    <AppLayout title="Approvals" subtitle="Review and process pending requests">
      {/* Summary */}
      <div className="card-elevated p-4 mb-6 flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{pendingApprovals.length} Pending Approvals</p>
            <p className="text-sm text-muted-foreground">
              {pendingApprovals.filter((a) => a.priority === "high").length} require immediate attention
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          disabled={pendingApprovals.length === 0 || isLoading}
          onClick={handleApproveAll}
        >
          Approve All
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all" className="relative">
            All
            <span className="ml-2 h-5 min-w-5 rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground flex items-center justify-center">
              {pendingApprovals.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="leave" className="relative">
            Leave
            <span className="ml-2 h-5 min-w-5 rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground flex items-center justify-center">
              {leaveApprovals.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="all">
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No pending approvals</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingApprovals.map((item, index) => (
                    <div key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                      <ApprovalCard item={item} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="leave">
              {leaveApprovals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No pending leave approvals</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leaveApprovals.map((item, index) => (
                    <div key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                      <ApprovalCard item={item} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="other">
              {otherApprovals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No other pending approvals</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherApprovals.map((item, index) => (
                    <div key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                      <ApprovalCard item={item} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </AppLayout>
  );
}
