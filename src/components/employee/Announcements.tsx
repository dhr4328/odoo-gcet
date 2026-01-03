import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, AlertCircle, Info, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

const announcements: Array<{
  id: number;
  title: string;
  message: string;
  type: "info" | "important" | "celebration";
  date: string;
}> = [];

const typeConfig = {
  info: {
    icon: Info,
    bgColor: "bg-blue-500/10",
    iconColor: "text-blue-500",
    borderColor: "border-l-blue-500",
  },
  important: {
    icon: AlertCircle,
    bgColor: "bg-warning/10",
    iconColor: "text-warning",
    borderColor: "border-l-warning",
  },
  celebration: {
    icon: PartyPopper,
    bgColor: "bg-accent/10",
    iconColor: "text-accent",
    borderColor: "border-l-accent",
  },
};

export function Announcements() {
  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-accent" />
          Announcements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No announcements</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => {
            const config = typeConfig[announcement.type as keyof typeof typeConfig];
            const Icon = config.icon;
            
            return (
              <div
                key={announcement.id}
                className={cn(
                  "p-3 rounded-lg border-l-4",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{announcement.title}</p>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {announcement.date}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {announcement.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
