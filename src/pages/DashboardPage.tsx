import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentEvals } from "@/components/dashboard/RecentEvals";

export function DashboardPage() {
  return (
    <div className="p-8 max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          All agent performance at a glance
        </p>
      </div>

      <StatsCards />
      <RecentEvals />
    </div>
  );
}
