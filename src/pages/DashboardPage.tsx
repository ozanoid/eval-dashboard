import { useState } from "react";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { DailyScoreChart } from "@/components/dashboard/DailyScoreChart";
import { GradeDistributionChart } from "@/components/dashboard/GradeDistributionChart";
import { RecentEvals } from "@/components/dashboard/RecentEvals";

export function DashboardPage() {
  const [activeSystem, setActiveSystem] = useState<string | null>(null);

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

      <StatsCards activeSystem={activeSystem} onSystemSelect={setActiveSystem} />
      <DailyScoreChart activeSystem={activeSystem} />
      <GradeDistributionChart activeSystem={activeSystem} />
      <RecentEvals />
    </div>
  );
}
