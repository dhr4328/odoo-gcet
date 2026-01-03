import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  DollarSign,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: number;
  roles?: ("employee" | "hr" | "admin")[];
}

const allNavItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", roles: ["hr", "admin"] },
  { label: "My Dashboard", icon: LayoutDashboard, href: "/my-dashboard", roles: ["employee"] },
  { label: "Employees", icon: Users, href: "/employees", roles: ["hr", "admin"] },
  { label: "Attendance", icon: Clock, href: "/attendance" },
  { label: "Leave", icon: CalendarDays, href: "/leave" },
  { label: "Payroll", icon: DollarSign, href: "/payroll", roles: ["hr", "admin"] },
  { label: "Approvals", icon: CheckSquare, href: "/approvals", roles: ["hr", "admin"] },
  { label: "Reports", icon: BarChart3, href: "/reports", roles: ["hr", "admin"] },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  // Filter nav items based on user role
  const navItems = allNavItems.filter((item) => {
    if (!item.roles) return true; // Show to all if no roles specified
    return user && item.roles.includes(user.role);
  });

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar flex flex-col transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link to={user?.role === "employee" ? "/my-dashboard" : "/dashboard"} className="flex items-center gap-3">
          <div className="h-10 w-12 rounded-lg  flex items-center justify-center">
            <img src="/logo.png" alt="Dayflow" className="h-full w-[120%] contain" />
          </div>
          {!collapsed && (
            <span className="text-sidebar-foreground font-semibold text-lg">Dayflow</span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "sidebar-link",
                isActive && "sidebar-link-active"
              )}
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-sidebar-primary" : "")} />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="sidebar-link text-sidebar-muted hover:text-destructive w-full"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
