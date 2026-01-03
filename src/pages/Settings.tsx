import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building, Bell, Shield, Clock, Users, Save, User, Loader2, Eye, EyeOff, Lock, Plus, Edit, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Leave Policy Manager Component
interface LeaveType {
  _id?: string;
  id?: string;
  name: string;
  code: string;
  totalDays: number;
  description?: string;
  carryForward: boolean;
  maxCarryForward: number;
  isPaid: boolean;
  isActive: boolean;
}

function LeavePolicyManager() {
  const { toast } = useToast();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    totalDays: 0,
    description: "",
    carryForward: false,
    maxCarryForward: 0,
    isPaid: true,
    isActive: true,
  });

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      setIsLoading(true);
      const data = await api.get("/api/leave-types");
      const types = data.data || [];
      setLeaveTypes(types);
    } catch (err) {
      console.error("Error fetching leave types:", err);
      toast({
        title: "Error",
        description: "Failed to load leave types",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setSelectedLeaveType(null);
    setFormData({
      name: "",
      code: "",
      totalDays: 0,
      description: "",
      carryForward: false,
      maxCarryForward: 0,
      isPaid: true,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    setFormData({
      name: leaveType.name,
      code: leaveType.code,
      totalDays: leaveType.totalDays,
      description: leaveType.description || "",
      carryForward: leaveType.carryForward,
      maxCarryForward: leaveType.maxCarryForward,
      isPaid: leaveType.isPaid,
      isActive: leaveType.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleOpenDeleteDialog = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code || formData.totalDays < 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedLeaveType) {
        // Update existing
        const leaveTypeId = selectedLeaveType._id || selectedLeaveType.id;
        await api.put(`/api/leave-types/${leaveTypeId}`, formData);
        toast({
          title: "Success",
          description: "Leave type updated successfully",
        });
      } else {
        // Create new
        await api.post("/api/leave-types", formData);
        toast({
          title: "Success",
          description: "Leave type created successfully",
        });
      }
      setIsDialogOpen(false);
      await fetchLeaveTypes();
    } catch (err) {
      console.error("Error saving leave type:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save leave type",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLeaveType) return;

    setIsSubmitting(true);
    try {
      const leaveTypeId = selectedLeaveType._id || selectedLeaveType.id;
      await api.delete(`/api/leave-types/${leaveTypeId}`);
      toast({
        title: "Success",
        description: "Leave type deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedLeaveType(null);
      await fetchLeaveTypes();
    } catch (err) {
      console.error("Error deleting leave type:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete leave type",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedDefaultTypes = async () => {
    setIsSubmitting(true);
    try {
      // Create the default leave types
      const defaultTypes = [
        { name: "Vacation", code: "VL", totalDays: 20, description: "Annual paid vacation days", carryForward: false, maxCarryForward: 0, isPaid: true, isActive: true },
        { name: "Sick", code: "SL", totalDays: 10, description: "Annual sick days", carryForward: false, maxCarryForward: 0, isPaid: true, isActive: true },
        { name: "Personal", code: "PL", totalDays: 5, description: "Personal days off", carryForward: false, maxCarryForward: 0, isPaid: true, isActive: true },
        { name: "Maternity", code: "ML", totalDays: 90, description: "Maternity leave days", carryForward: false, maxCarryForward: 0, isPaid: true, isActive: true },
        { name: "Paid", code: "PD", totalDays: 15, description: "Additional paid leave days", carryForward: false, maxCarryForward: 0, isPaid: true, isActive: true },
        { name: "Unpaid", code: "UL", totalDays: 0, description: "Unpaid leave days", carryForward: false, maxCarryForward: 0, isPaid: false, isActive: true },
      ];

      let created = 0;
      let skipped = 0;

      for (const leaveType of defaultTypes) {
        try {
          await api.post("/api/leave-types", leaveType);
          created++;
        } catch (err: any) {
          // If already exists, skip it
          if (err.message?.includes("already exists") || err.message?.includes("400")) {
            skipped++;
          } else {
            console.error(`Error creating ${leaveType.name}:`, err);
          }
        }
      }

      toast({
        title: "Success",
        description: `Created ${created} leave type(s), skipped ${skipped} existing`,
      });

      await fetchLeaveTypes();
    } catch (err) {
      console.error("Error seeding leave types:", err);
      toast({
        title: "Error",
        description: "Failed to seed default leave types",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Manage Leave Types</h4>
          <p className="text-sm text-muted-foreground">
            Configure leave types and their policies for your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSeedDefaultTypes}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Seed Default Types
          </Button>
          <Button
            onClick={handleOpenCreateDialog}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Leave Type
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {leaveTypes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No leave types configured</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleOpenCreateDialog}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Leave Type
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {leaveTypes.map((leaveType) => (
              <div
                key={leaveType._id || leaveType.id}
                className="p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-foreground">{leaveType.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {leaveType.code}
                      </Badge>
                      {!leaveType.isActive && (
                        <Badge variant="outline" className="text-xs bg-muted">
                          Inactive
                        </Badge>
                      )}
                      {leaveType.isPaid ? (
                        <Badge variant="outline" className="text-xs bg-success/10 text-success">
                          Paid
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-muted">
                          Unpaid
                        </Badge>
                      )}
                    </div>
                    {leaveType.description && (
                      <p className="text-sm text-muted-foreground mb-2">{leaveType.description}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Days: </span>
                        <span className="font-medium text-foreground">{leaveType.totalDays}</span>
                      </div>
                      {leaveType.carryForward && (
                        <div>
                          <span className="text-muted-foreground">Max Carry Forward: </span>
                          <span className="font-medium text-foreground">{leaveType.maxCarryForward} days</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditDialog(leaveType)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDeleteDialog(leaveType)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLeaveType ? "Edit Leave Type" : "Create Leave Type"}</DialogTitle>
            <DialogDescription>
              {selectedLeaveType ? "Update leave type details" : "Add a new leave type to your organization"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Vacation Leave"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., VL"
                  required
                  maxLength={10}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalDays">Total Days *</Label>
                <Input
                  id="totalDays"
                  type="number"
                  min="0"
                  value={formData.totalDays}
                  onChange={(e) => setFormData({ ...formData, totalDays: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxCarryForward">Max Carry Forward Days</Label>
                <Input
                  id="maxCarryForward"
                  type="number"
                  min="0"
                  value={formData.maxCarryForward}
                  onChange={(e) => setFormData({ ...formData, maxCarryForward: parseInt(e.target.value) || 0 })}
                  disabled={!formData.carryForward}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this leave type"
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="carryForward">Allow Carry Forward</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow employees to carry forward unused leave days
                  </p>
                </div>
                <Switch
                  id="carryForward"
                  checked={formData.carryForward}
                  onCheckedChange={(checked) => setFormData({ ...formData, carryForward: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isPaid">Paid Leave</Label>
                  <p className="text-xs text-muted-foreground">
                    This leave type is paid
                  </p>
                </div>
                <Switch
                  id="isPaid"
                  checked={formData.isPaid}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    This leave type is currently active
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {selectedLeaveType ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {selectedLeaveType ? "Update" : "Create"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Leave Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedLeaveType?.name}"? This action cannot be undone.
              {selectedLeaveType && (
                <span className="block mt-2 text-destructive text-sm">
                  Note: If this leave type is used in existing leave requests, you'll need to deactivate it instead.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const isEmployee = user?.role === "employee";
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);
  
  // Employee profile form data
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    position: "",
  });

  // Password change form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState({
    leaveRequests: true,
    attendanceAlerts: true,
    payrollReminders: true,
    emailNotifications: true,
  });

  // Load notification preferences from localStorage
  useEffect(() => {
    const savedPrefs = localStorage.getItem("notificationPreferences");
    if (savedPrefs) {
      try {
        setNotificationPrefs(JSON.parse(savedPrefs));
      } catch (err) {
        console.error("Error loading notification preferences:", err);
      }
    }
  }, []);

  // Save notification preferences
  const handleSaveNotificationPrefs = () => {
    localStorage.setItem("notificationPreferences", JSON.stringify(notificationPrefs));
    toast({
      title: "Success",
      description: "Notification preferences saved successfully",
    });
  };

  // Fetch employee data for employees
  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (isEmployee && user?.employeeId) {
        try {
          setIsLoading(true);
          const data = await api.get(`/api/employees/${user.employeeId}`);
          const employee = data.employee || data.data || data;
          
          setEmployeeData(employee);
          
          // Parse name into first and last name
          const nameParts = (employee.name || employee.fullName || "").split(" ");
          setProfileData({
            firstName: employee.firstName || nameParts[0] || "",
            lastName: employee.lastName || nameParts.slice(1).join(" ") || "",
            email: employee.email || user.email || "",
            phone: employee.phone || employee.phone_number || "",
            department: employee.department || "",
            position: employee.position || employee.role || "",
          });
        } catch (err) {
          console.error("Error fetching employee data:", err);
          toast({
            title: "Error",
            description: "Failed to load employee data",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchEmployeeData();
  }, [isEmployee, user?.employeeId]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employeeId) return;

    setIsSaving(true);
    try {
      const updateData: any = {};
      
      // Employees can only update: firstName, lastName, phone
      // HR/Admin can update: email, department, position, salary, status
      if (profileData.firstName) updateData.firstName = profileData.firstName;
      if (profileData.lastName) updateData.lastName = profileData.lastName;
      if (profileData.phone !== undefined) updateData.phone = profileData.phone || null;
      
      // Only HR/Admin can update email, department, and position
      if (!isEmployee) {
        if (profileData.email) updateData.email = profileData.email;
        if (profileData.department) updateData.department = profileData.department;
        if (profileData.position) updateData.position = profileData.position;
      }

      // Use /api/employees/{employeeId} endpoint
      // Employees can update: firstName, lastName, phone
      // HR/Admin can update: email, department, position, salary, status
      await api.put(`/api/employees/${user.employeeId}`, updateData);
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      // Refresh employee data
      const data = await api.get(`/api/employees/${user.employeeId}`);
      const employee = data.employee || data.data || data;
      setEmployeeData(employee);
      
      // Update profile form data
      const nameParts = (employee.name || employee.fullName || "").split(" ");
      setProfileData({
        firstName: employee.firstName || nameParts[0] || profileData.firstName,
        lastName: employee.lastName || nameParts.slice(1).join(" ") || profileData.lastName,
        email: employee.email || profileData.email,
        phone: employee.phone || employee.phone_number || profileData.phone,
        department: employee.department || profileData.department,
        position: employee.position || employee.role || profileData.position,
      });
      
      // Update user context with new data
      const updatedName = employee.name || 
                         employee.fullName ||
                         employee.employeeName ||
                         `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
                         user.name;
      
      // Update the user context
      updateUser({
        name: updatedName,
        email: employee.email || user.email,
        department: employee.department || user.department,
        position: employee.position || employee.role || user.position,
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.employeeId) return;

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      // Use PUT /api/employees/{employee_id}/password endpoint
      // For employees: requires currentPassword and newPassword
      // For HR: only requires newPassword (but we'll send currentPassword for employees)
      await api.put(`/api/employees/${user.employeeId}/password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      toast({
        title: "Success",
        description: "Password changed successfully",
      });

      // Reset password form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error("Error changing password:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <AppLayout title="Settings" subtitle={isEmployee ? "Manage your profile" : "Configure your workspace"}>
      <div className="max-w-4xl">
        <Tabs defaultValue={isEmployee ? "profile" : "organization"} className="w-full">
          <TabsList className="mb-6">
            {isEmployee ? (
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
            ) : (
              <>
                <TabsTrigger value="organization" className="gap-2">
                  <Building className="h-4 w-4" />
                  Organization
                </TabsTrigger>
                <TabsTrigger value="leave" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Leave Types
                </TabsTrigger>
                <TabsTrigger value="attendance" className="gap-2">
                  <Users className="h-4 w-4" />
                  Attendance
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Security
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Profile Tab for Employees */}
          {isEmployee ? (
            <TabsContent value="profile">
              <div className="card-elevated p-6 animate-slide-up">
                <h3 className="text-lg font-semibold text-foreground mb-4">Personal Information</h3>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <form onSubmit={handleProfileUpdate}>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            value={profileData.firstName}
                            onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            value={profileData.lastName}
                            onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          readOnly
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email cannot be changed. Contact HR for email updates.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="department">Department</Label>
                          <Input
                            id="department"
                            value={profileData.department}
                            onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                            readOnly
                            className="bg-muted"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          value={profileData.position}
                          onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                          readOnly
                          className="bg-muted"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="bg-accent hover:bg-accent/90 text-accent-foreground"
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Password Change Section for Employees */}
              <div className="card-elevated p-6 animate-slide-up mt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </h3>
                <form onSubmit={handlePasswordChange}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password *</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          placeholder="Enter current password"
                          className="pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password *</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          placeholder="Enter new password"
                          className="pr-10"
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 8 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          placeholder="Confirm new password"
                          className="pr-10"
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Changing Password...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>
          ) : (
            <>
          <TabsContent value="organization">
            <div className="card-elevated p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-foreground mb-4">Organization Details</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input id="org-name" defaultValue="Acme Corporation" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-email">Contact Email</Label>
                    <Input id="org-email" type="email" defaultValue="hr@acmecorp.com" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-phone">Phone Number</Label>
                    <Input id="org-phone" defaultValue="+1 (555) 123-4567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue="est">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="est">Eastern Time (EST)</SelectItem>
                        <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                        <SelectItem value="cst">Central Time (CST)</SelectItem>
                        <SelectItem value="utc">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-address">Address</Label>
                  <Input id="org-address" defaultValue="123 Business Ave, Suite 100, New York, NY 10001" />
                </div>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="leave">
            <div className="card-elevated p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-foreground mb-4">Leave Policy Configuration</h3>
              <LeavePolicyManager />
            </div>
          </TabsContent>

          <TabsContent value="attendance">
            <div className="card-elevated p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-foreground mb-4">Attendance Rules</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Work Start Time</Label>
                    <Input type="time" defaultValue="09:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Work End Time</Label>
                    <Input type="time" defaultValue="18:00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Grace Period (minutes)</Label>
                  <Select defaultValue="15">
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Auto-mark Absent</p>
                    <p className="text-sm text-muted-foreground">Automatically mark absent if no check-in by noon</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Weekend Tracking</p>
                    <p className="text-sm text-muted-foreground">Track attendance on weekends</p>
                  </div>
                  <Switch />
                </div>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Save className="h-4 w-4 mr-2" />
                  Save Rules
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="card-elevated p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-foreground mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Leave Request Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      {isEmployee 
                        ? "Get notified when your leave requests are approved or rejected"
                        : "Get notified when employees submit leave requests"}
                    </p>
                  </div>
                  <Switch 
                    checked={notificationPrefs.leaveRequests}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, leaveRequests: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Attendance Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      {isEmployee
                        ? "Get reminders for check-in and attendance updates"
                        : "Receive alerts for late check-ins or absences"}
                    </p>
                  </div>
                  <Switch 
                    checked={notificationPrefs.attendanceAlerts}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, attendanceAlerts: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Payroll Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      {isEmployee
                        ? "Get notified when your payslip is generated"
                        : "Get reminded before payroll processing dates"}
                    </p>
                  </div>
                  <Switch 
                    checked={notificationPrefs.payrollReminders}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, payrollReminders: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch 
                    checked={notificationPrefs.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, emailNotifications: checked })
                    }
                  />
                </div>
                <Button 
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={handleSaveNotificationPrefs}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <div className="card-elevated p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-foreground mb-4">Security Settings</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Require 2FA for all admin accounts</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Session Timeout</p>
                    <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                  </div>
                  <Select defaultValue="30">
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Password Policy</Label>
                  <Select defaultValue="strong">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                      <SelectItem value="medium">Medium (8+ with numbers)</SelectItem>
                      <SelectItem value="strong">Strong (8+ with special characters)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Save className="h-4 w-4 mr-2" />
                  Save Security Settings
                </Button>
              </div>
            </div>
          </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
