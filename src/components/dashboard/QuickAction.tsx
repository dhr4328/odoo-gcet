import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface QuickActionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  variant?: "default" | "accent" | "warning";
}

export function QuickAction({ title, description, icon: Icon, href, variant = "default" }: QuickActionProps) {
  const variantClasses = {
    default: "hover:border-accent/50",
    accent: "border-accent/30 bg-accent/5 hover:bg-accent/10",
    warning: "border-warning/30 bg-warning/5 hover:bg-warning/10",
  };

  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border border-border bg-card transition-all duration-200 hover:shadow-soft group",
        variantClasses[variant]
      )}
    >
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
        variant === "accent" ? "bg-accent text-accent-foreground" :
        variant === "warning" ? "bg-warning text-warning-foreground" :
        "bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
