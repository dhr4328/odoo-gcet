import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    positive: boolean;
  };
  icon: LucideIcon;
  iconColor?: "accent" | "warning" | "destructive" | "muted";
}

export function StatCard({ title, value, change, icon: Icon, iconColor = "accent" }: StatCardProps) {
  const iconColorClasses = {
    accent: "bg-accent/10 text-accent",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  };

  return (
    <div className="card-stat group animate-slide-up">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
          {change && (
            <p className={cn(
              "text-sm font-medium",
              change.positive ? "text-success" : "text-destructive"
            )}>
              {change.positive ? "+" : ""}{change.value}
              <span className="text-muted-foreground font-normal ml-1">vs last month</span>
            </p>
          )}
        </div>
        <div className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
          iconColorClasses[iconColor]
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
