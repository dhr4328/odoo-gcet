import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Mail, Lock, Building, ArrowRight, User } from "lucide-react";
import { useAuth, UserRole } from "@/contexts/AuthContext";

export default function Auth() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [role, setRole] = useState<UserRole>("employee");

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === "employee") {
        navigate("/my-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, user, isLoading, navigate]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  // Don't render auth form if already logged in (will redirect)
  if (isAuthenticated) {
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingForm(true);
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await login(email, password, role);
      // Navigate based on role
      if (role === "employee") {
        navigate("/my-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Login failed. Please check your credentials.";
      alert(errorMessage);
    } finally {
      setIsLoadingForm(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar via-sidebar to-sidebar-accent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <div className="flex items-center gap-3 mb-16">
              <div className="h-10 w-12 rounded-lg  flex items-center justify-center">
                <img src="/logo.png" alt="Dayflow" className="h-full w-[120%] contain" />
              </div>
              <span className="text-sidebar-foreground font-semibold text-2xl">Dayflow</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-sidebar-foreground leading-tight mb-6">
              Every workday,<br />
              <span className="text-sidebar-primary">perfectly aligned.</span>
            </h1>
            <p className="text-lg text-sidebar-muted max-w-md">
              Streamline your HR operations with an intuitive platform designed for modern teams.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4 text-sidebar-muted">
              <div className="h-10 w-10 rounded-lg bg-sidebar-accent flex items-center justify-center">
                <Building className="h-5 w-5 text-sidebar-foreground" />
              </div>
              <div>
                <p className="text-sidebar-foreground font-medium">Enterprise Ready</p>
                <p className="text-sm">Scales with your organization</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sidebar-muted">
              <div className="h-10 w-10 rounded-lg bg-sidebar-accent flex items-center justify-center">
                <User className="h-5 w-5 text-sidebar-foreground" />
              </div>
              <div>
                <p className="text-sidebar-foreground font-medium">Role-Based Access</p>
                <p className="text-sm">Admin and employee dashboards</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-sidebar-muted">
            © 2025 Dayflow. All rights reserved.
          </p>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-sidebar-primary/10 blur-3xl" />
        <div className="absolute top-20 -right-10 w-60 h-60 rounded-full bg-sidebar-primary/5 blur-2xl" />
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-xl">D</span>
            </div>
            <span className="text-foreground font-semibold text-xl">Dayflow</span>
          </div>

          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
              <p className="text-muted-foreground mt-1">Enter your credentials to access your account</p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button type="button" className="text-sm text-accent hover:underline">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

             
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={isLoadingForm}
              >
                {isLoadingForm ? (
                  "Signing in..."
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
