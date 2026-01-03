import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, MoreHorizontal, Filter, Download, Mail, Phone, MapPin, Building, Calendar, Users, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Employee {
  id: string;
  employeeId?: string; // Store employeeId separately if available
  name: string;
  email: string;
  role: string;
  department: string;
  status: "active" | "inactive" | "on-leave";
  joinDate: string;
  avatar?: string;
  phone?: string;
  location?: string;
}

const statusStyles = {
  active: "badge-success",
  inactive: "badge-neutral",
  "on-leave": "badge-warning",
};

const statusLabels = {
  active: "Active",
  inactive: "Inactive",
  "on-leave": "On Leave",
};

interface CreateEmployeeForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  department: string;
  position: string;
  salary: {
    amount: number;
    currency?: string;
  };
}

interface UpdateEmployeeForm {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  salary?: {
    amount: number;
    currency?: string;
  };
  status?: string;
}

export default function Employees() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<CreateEmployeeForm>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    department: "",
    position: "",
    salary: {
      amount: 0,
      currency: "INR",
    },
  });
  const [editFormData, setEditFormData] = useState<UpdateEmployeeForm>({});

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.get("/api/employees");
      
      // Map API response to Employee interface
      const mappedEmployees: Employee[] = Array.isArray(data) 
        ? data.map((emp: any) => {
            const employeeId = emp.employeeId || emp.employee_id || emp.id || "";
            return {
              id: emp.id || employeeId,
              employeeId: employeeId,
              name: emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.full_name || "",
              email: emp.email || "",
              role: emp.role || emp.position || "",
              department: emp.department || "",
              status: (emp.status || "active") as "active" | "inactive" | "on-leave",
              joinDate: emp.join_date || emp.joinDate || emp.dateOfJoining || emp.created_at || new Date().toISOString(),
              avatar: emp.avatar || emp.profile_picture || emp.profilePicture,
              phone: emp.phone || emp.phone_number || "",
              location: emp.location || emp.address || "",
            };
          })
        : (data.employees || data.data || []).map((emp: any) => {
            const employeeId = emp.employeeId || emp.employee_id || emp.id || "";
            return {
              id: emp.id || employeeId,
              employeeId: employeeId,
              name: emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.full_name || "",
              email: emp.email || "",
              role: emp.role || emp.position || "",
              department: emp.department || "",
              status: (emp.status || "active") as "active" | "inactive" | "on-leave",
              joinDate: emp.join_date || emp.joinDate || emp.dateOfJoining || emp.created_at || new Date().toISOString(),
              avatar: emp.avatar || emp.profile_picture || emp.profilePicture,
              phone: emp.phone || emp.phone_number || "",
              location: emp.location || emp.address || "",
            };
          });
      
      setEmployees(mappedEmployees);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch employees");
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Check for query parameter to open add dialog
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "add") {
      setIsAddDialogOpen(true);
      // Remove the query parameter from URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleEditClick = (employee: Employee) => {
    // Parse name into first and last name
    const nameParts = employee.name.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    setEditFormData({
      firstName,
      lastName,
      email: employee.email,
      phone: employee.phone || "",
      department: employee.department,
      position: employee.role,
      status: employee.status,
      // Note: Salary would need to be fetched from API if available
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateEmployeeStatus = async (employee: Employee, status: "active" | "inactive" | "on-leave") => {
    try {
      const updateData: UpdateEmployeeForm = { status };
      const employeeId = employee.employeeId || employee.id;
      
      await api.put(`/api/employees/${employeeId}`, updateData);
      
      toast({
        title: "Success",
        description: `Employee status updated to ${status === "inactive" ? "inactive" : status}`,
      });
      
      // Refresh employee list
      await fetchEmployees();
    } catch (err) {
      console.error("Error updating employee status:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update employee status",
        variant: "destructive",
      });
    }
  };

  const handleDownloadEmployees = () => {
    // Get filtered employees
    const filteredEmployees = employees.filter((employee) => {
      const matchesSearch = 
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDepartment = !departmentFilter || departmentFilter === "all" || employee.department === departmentFilter;
      
      return matchesSearch && matchesDepartment;
    });

    // Prepare CSV data
    const headers = ["Employee ID", "Name", "Email", "Phone", "Department", "Position", "Status", "Join Date"];
    const csvRows = [
      headers.join(","),
      ...filteredEmployees.map((emp) => {
        const row = [
          emp.employeeId || emp.id,
          `"${emp.name}"`,
          emp.email,
          emp.phone || "",
          `"${emp.department}"`,
          `"${emp.role}"`,
          emp.status,
          new Date(emp.joinDate).toLocaleDateString("en-US"),
        ];
        return row.join(",");
      }),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `employees_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: `Downloaded ${filteredEmployees.length} employee(s) as CSV`,
    });
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    setIsSubmitting(true);

    try {
      // Prepare update data - only include fields that have values
      const updateData: UpdateEmployeeForm = {};
      
      if (editFormData.firstName) updateData.firstName = editFormData.firstName;
      if (editFormData.lastName) updateData.lastName = editFormData.lastName;
      if (editFormData.email) updateData.email = editFormData.email;
      if (editFormData.phone !== undefined) updateData.phone = editFormData.phone || null;
      if (editFormData.department) updateData.department = editFormData.department;
      if (editFormData.position) updateData.position = editFormData.position;
      if (editFormData.salary && editFormData.salary.amount > 0) {
        updateData.salary = editFormData.salary;
      }
      if (editFormData.status) updateData.status = editFormData.status;

      // Use employeeId if available, otherwise use id
      const employeeId = selectedEmployee.employeeId || selectedEmployee.id;
      const response = await api.put(`/api/employees/${employeeId}`, updateData);
      
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });

      // Close dialog
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      
      // Refresh employee list
      await fetchEmployees();
    } catch (err) {
      console.error("Error updating employee:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update employee",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare data in the format expected by API
      const requestData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        department: formData.department,
        position: formData.position,
        salary: formData.salary, // Send as dict/object
        password: formData.password,
      };

      const response = await api.post("/api/employees", requestData);
      
      toast({
        title: "Success",
        description: response.message || "Employee created successfully",
      });

      // Reset form
      setFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        department: "",
        position: "",
        salary: {
          amount: 0,
          currency: "INR",
        },
      });
      
      // Close dialog
      setIsAddDialogOpen(false);
      
      // Refresh employee list
      await fetchEmployees();
    } catch (err) {
      console.error("Error creating employee:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create employee",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];

  return (
    <AppLayout title="Employees" subtitle="Manage your team members">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={handleDownloadEmployees}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button 
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Employee Table */}
      <div className="card-elevated overflow-hidden animate-slide-up">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading employees...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="table-header hover:bg-muted/50">
                <TableHead className="w-[300px]">Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{searchQuery || departmentFilter !== "all" ? "No employees match your filters" : "No employees found"}</p>
                  </TableCell>
                </TableRow>
              ) : (
              filteredEmployees.map((employee) => (
              <TableRow
                key={employee.id}
                className="table-row-hover cursor-pointer"
                onClick={() => setSelectedEmployee(employee)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={employee.avatar} />
                      <AvatarFallback className="bg-accent/10 text-accent">
                        {employee.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{employee.name}</p>
                      <p className="text-sm text-muted-foreground">{employee.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-foreground">{employee.role}</TableCell>
                <TableCell className="text-muted-foreground">{employee.department}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusStyles[employee.status]}>
                    {statusLabels[employee.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(employee.joinDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEmployee(employee);
                      }}>
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(employee);
                      }}>
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>View Attendance</DropdownMenuItem>
                      {employee.status === "inactive" ? (
                        <DropdownMenuItem 
                          className="text-green-600 dark:text-green-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateEmployeeStatus(employee, "active");
                          }}
                        >
                          Activate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateEmployeeStatus(employee, "inactive");
                          }}
                        >
                          Deactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Employee Detail Sheet */}
      <Sheet open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selectedEmployee && (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedEmployee.avatar} />
                    <AvatarFallback className="bg-accent/10 text-accent text-xl">
                      {selectedEmployee.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-xl">{selectedEmployee.name}</SheetTitle>
                    <p className="text-muted-foreground">{selectedEmployee.role}</p>
                    <Badge variant="outline" className={`mt-2 ${statusStyles[selectedEmployee.status]}`}>
                      {statusLabels[selectedEmployee.status]}
                    </Badge>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="job">Job Info</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                </TabsList>
                <TabsContent value="personal" className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-foreground">{selectedEmployee.email}</p>
                    </div>
                  </div>
                  {selectedEmployee.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="text-foreground">{selectedEmployee.phone}</p>
                      </div>
                    </div>
                  )}
                  {selectedEmployee.location && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="text-foreground">{selectedEmployee.location}</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="job" className="mt-6 space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p className="text-foreground">{selectedEmployee.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Join Date</p>
                      <p className="text-foreground">
                        {new Date(selectedEmployee.joinDate).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-4 w-4 rounded-full bg-accent" />
                    <div>
                      <p className="text-sm text-muted-foreground">Employee ID</p>
                      <p className="text-foreground font-mono">{selectedEmployee.employeeId || selectedEmployee.id}</p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="attendance" className="mt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Attendance records will appear here</p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-8 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleEditClick(selectedEmployee)}
                >
                  Edit Profile
                </Button>
                {selectedEmployee.status === "inactive" ? (
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleUpdateEmployeeStatus(selectedEmployee, "active")}
                  >
                    Activate Employee
                  </Button>
                ) : (
                  <Button 
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleUpdateEmployeeStatus(selectedEmployee, "inactive")}
                  >
                    Deactivate Employee
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Employee Dialog */}
      <Dialog 
        open={isAddDialogOpen} 
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setShowPassword(false);
            setFormData({
              email: "",
              password: "",
              firstName: "",
              lastName: "",
              phone: "",
              department: "",
              position: "",
              salary: {
                amount: 0,
                currency: "INR",
              },
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new employee account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  className="pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Engineering"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Senior Developer"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Salary (Amount) *</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary.amount || ""}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    salary: { 
                      ...formData.salary, 
                      amount: parseFloat(e.target.value) || 0 
                    } 
                  })}
                  placeholder="5000"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Employee
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditFormData({});
            setSelectedEmployee(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information. Leave fields empty to keep current values.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateEmployee} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  value={editFormData.firstName || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={editFormData.lastName || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email || ""}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="john.doe@company.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={editFormData.department || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  placeholder="Engineering"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-position">Position</Label>
                <Input
                  id="edit-position"
                  value={editFormData.position || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                  placeholder="Senior Developer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editFormData.phone || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editFormData.status || ""}
                  onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on-leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-salary">Salary (Amount)</Label>
              <Input
                id="edit-salary"
                type="number"
                value={editFormData.salary?.amount || ""}
                onChange={(e) => setEditFormData({ 
                  ...editFormData, 
                  salary: { 
                    ...(editFormData.salary || { amount: 0, currency: "USD" }), 
                    amount: parseFloat(e.target.value) || 0 
                  } 
                })}
                placeholder="5000"
                min="0"
                step="0.01"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
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
                    Updating...
                  </>
                ) : (
                  "Update Employee"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
