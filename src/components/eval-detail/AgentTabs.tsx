import type { AgentEvalData } from "@/lib/types";
import { formatScore } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AgentTabsProps {
  agents: AgentEvalData[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export function AgentTabs({ agents, activeKey, onSelect }: AgentTabsProps) {
  return (
    <div className="flex gap-0 border-b border-border-default overflow-x-auto">
      {agents.map((agent) => {
        const isActive = agent.agent_key === activeKey;
        return (
          <button
            key={agent.agent_key}
            onClick={() => onSelect(agent.agent_key)}
            className={cn(
              "relative flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "text-text-primary"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            {agent.display_name}
            <span className="font-mono text-xs opacity-60">
              ({formatScore(agent.eval_report.overall.weighted_total)})
            </span>
            {isActive && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-accent-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
