import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
}: StatsCardProps) {
  const variantStyles = {
    default: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-500",
    warning: "bg-amber-500/10 text-amber-500",
    danger: "bg-red-500/10 text-red-500",
    info: "bg-blue-500/10 text-blue-500",
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-full", variantStyles[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}