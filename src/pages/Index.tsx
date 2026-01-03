import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Clock, Calendar, DollarSign, BarChart3, Shield } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Employee Management",
    description: "Centralized employee directory with comprehensive profiles and document management.",
  },
  {
    icon: Clock,
    title: "Attendance Tracking",
    description: "Real-time check-in/out tracking with automated reporting and alerts.",
  },
  {
    icon: Calendar,
    title: "Leave Management",
    description: "Streamlined leave requests with approval workflows and balance tracking.",
  },
  {
    icon: DollarSign,
    title: "Payroll Processing",
    description: "Accurate salary calculations with tax deductions and bonus management.",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Comprehensive insights with exportable reports and visual dashboards.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "Secure access control with customizable permissions for admins and employees.",
  },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-12 rounded-lg  flex items-center justify-center">
              <img src="/logo.png" alt="Dayflow" className="h-full w-[120%] contain" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="animate-slide-up">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
              Enterprise HRMS Solution
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
              Every workday,<br />
              <span className="text-accent">perfectly aligned.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Streamline your HR operations with an intuitive platform designed for modern teams. 
              From attendance to payroll, manage everything in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground px-8">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="outline" className="px-8">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything you need to manage HR
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A comprehensive suite of tools designed to simplify your human resource management.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="card-elevated p-6 hover:shadow-soft transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="card-elevated p-12 text-center bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 animate-slide-up">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to transform your HR operations?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of companies that trust Dayflow to manage their workforce efficiently.
            </p>
            <Link to="/auth">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground px-8">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold">D</span>
            </div>
            <span className="font-medium text-foreground">Dayflow</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Dayflow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
