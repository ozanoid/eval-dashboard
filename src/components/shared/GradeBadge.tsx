import { getGradeConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface GradeBadgeProps {
  grade: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "text-[10px] px-2 py-0.5 rounded",
  md: "text-xs px-2.5 py-1 rounded-md",
  lg: "text-sm px-3 py-1 rounded-md",
};

export function GradeBadge({ grade, size = "md", className }: GradeBadgeProps) {
  const config = getGradeConfig(grade);

  return (
    <span
      className={cn(
        "inline-flex items-center font-mono font-bold tracking-wide",
        sizeClasses[size],
        className
      )}
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      {grade}
    </span>
  );
}
