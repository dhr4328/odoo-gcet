import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";

export type UserRole = "employee" | "hr" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  employeeId?: string;
  department?: string;
  position?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch employee name from employees API using employee ID
  const fetchEmployeeName = async (employeeId: string): Promise<string | null> => {
    try {
      // Check if token exists before making request
      const token = localStorage.getItem("token");
      if (!token || !employeeId) {
        return null;
      }

      // Fetch specific employee data using employee ID
      const employeeData = await api.get(`/api/employees/${employeeId}`);
      
      // Handle different response structures
      const employee = employeeData.employee || employeeData.data || employeeData;
      
      if (employee) {
        return employee.name || 
               employee.employeeName ||
               employee.fullName ||
               `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
               null;
      }
    } catch (err) {
      // Silently fail - don't log error if it's a 403 or 404 (permission/not found issue)
      if (err instanceof Error && !err.message.includes("403") && !err.message.includes("404")) {
        console.error("Error fetching employee details:", err);
      }
    }
    return null;
  };

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          
          // If name is missing or just "User", and we have a token, try to fetch it from employees API
          if (token && (!parsedUser.name || parsedUser.name === "User" || parsedUser.name.trim() === "") && parsedUser.employeeId) {
            // Try to fetch employee name using employee ID endpoint
            try {
              const employeeName = await fetchEmployeeName(parsedUser.employeeId);
              if (employeeName) {
                parsedUser.name = employeeName;
                setUser(parsedUser);
                localStorage.setItem("user", JSON.stringify(parsedUser));
              } else {
                setUser(parsedUser);
              }
            } catch (err) {
              // If fetch fails, just use the stored user
              setUser(parsedUser);
            }
          } else {
            setUser(parsedUser);
          }
        } catch (error) {
          console.error("Error parsing stored user:", error);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
      }
      setIsLoading(false);
    };
    
    loadUser();
  }, []);

  const login = async (email: string, password: string, role: UserRole = "employee") => {
    try {
      const response = await api.post("/api/auth/login", { email, password, role });
      const { user: apiUser, token } = response;

      if (!apiUser || !token) {
        throw new Error("Invalid API response: missing user or token");
      }

      console.log("API User Response:", apiUser); // Debug log

      // Map API user data to our User interface
      // Try multiple field name variations for name
      let userName = apiUser.name || 
                    apiUser.employeeName || 
                    apiUser.fullName ||
                    apiUser.userName ||
                    apiUser.displayName ||
                    (apiUser.firstName && apiUser.lastName ? `${apiUser.firstName} ${apiUser.lastName}`.trim() : null) ||
                    apiUser.firstName ||
                    apiUser.lastName ||
                    "";
      
      // If name is still empty, try to fetch from employees API using employee ID
      // This endpoint should work for all users to fetch their own data
      if ((!userName || userName.trim() === "") && (apiUser.employee_id || apiUser.employeeId)) {
        try {
          const employeeId = apiUser.employee_id || apiUser.employeeId;
          const fetchedName = await fetchEmployeeName(employeeId);
          if (fetchedName) {
            userName = fetchedName;
          }
        } catch (err) {
          // Silently fail - name will fall back to email username
          console.error("Error fetching employee details:", err);
        }
      }
      
      // If name is still empty, try to extract from email or use a default
      if (!userName || userName.trim() === "") {
        // Try to extract name from email (part before @)
        const emailName = apiUser.email?.split("@")[0];
        userName = emailName || "User";
      }

      const mappedUser: User = {
        id: apiUser.id || apiUser.employee_id || apiUser.employeeId,
        email: apiUser.email,
        name: userName,
        role: apiUser.role as UserRole,
        employeeId: apiUser.employee_id || apiUser.employeeId,
        department: apiUser.department,
        position: apiUser.position,
      };

      console.log("Mapped User:", mappedUser); // Debug log

      setUser(mappedUser);
      localStorage.setItem("user", JSON.stringify(mappedUser));
      localStorage.setItem("token", token); // Store the token
    } catch (error) {
      console.error("Login API call failed:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
