import { NavLink } from "react-router-dom";
import { Activity, LayoutDashboard, ShoppingCart } from "lucide-react";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useCartStore } from "@/stores/cartStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

function DynamicIcon({ name, ...props }: { name: string } & React.ComponentProps<typeof Activity>) {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<React.ComponentProps<typeof Activity>>>;
  const pascalName = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const Icon = icons[pascalName] ?? Activity;
  return <Icon {...props} />;
}

function NavItem({
  to,
  icon,
  label,
  end,
  badge,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-accent-primary/15 text-text-primary border-l-2 border-accent-primary ml-[-1px] pl-[11px]"
            : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn("w-4 h-4", isActive ? "text-accent-primary opacity-100" : "opacity-60")}>
            {icon}
          </span>
          <span className="flex-1">{label}</span>
          {badge}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  const { systemGroups } = useAgentRegistry();
  const cartCount = useCartStore((s) => s.items.length);
  const newCounts = useNotificationStore((s) => s.newCounts);

  return (
    <aside className="w-[240px] h-screen flex-shrink-0 bg-bg-sidebar border-r border-border-subtle flex flex-col">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/15 flex items-center justify-center">
            <Activity className="w-4 h-4 text-accent-primary" />
          </div>
          <span className="text-base font-bold text-text-primary tracking-tight">
            EvalStudio
          </span>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex flex-col gap-0.5 flex-1 overflow-y-auto px-3">
        <p className="text-[10px] font-medium text-text-tertiary tracking-[0.08em] uppercase px-3 pt-4 pb-2">
          Overview
        </p>
        <NavItem to="/" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" end />

        <p className="text-[10px] font-medium text-text-tertiary tracking-[0.08em] uppercase px-3 pt-6 pb-2">
          Systems
        </p>
        {systemGroups.map((group) => {
          const newCount = newCounts[group.group_key] ?? 0;
          return (
            <NavItem
              key={group.group_key}
              to={`/evals/${group.group_key}`}
              icon={
                <DynamicIcon
                  name={group.agents[0]?.icon ?? "activity"}
                  className="w-4 h-4"
                />
              }
              label={group.display_name}
              badge={
                newCount > 0 ? (
                  <span className="min-w-[20px] h-[20px] rounded-full bg-accent-primary text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {newCount}
                  </span>
                ) : undefined
              }
            />
          );
        })}

        <p className="text-[10px] font-medium text-text-tertiary tracking-[0.08em] uppercase px-3 pt-6 pb-2">
          Tools
        </p>
        <NavItem
          to="/cart"
          icon={<ShoppingCart className="w-4 h-4" />}
          label="Suggestion Cart"
          badge={
            cartCount > 0 ? (
              <span className="min-w-[20px] h-[20px] rounded-full bg-accent-primary text-white text-[10px] font-bold flex items-center justify-center px-1">
                {cartCount}
              </span>
            ) : undefined
          }
        />
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border-subtle">
        <p className="text-[11px] text-text-muted">v0.1.0</p>
      </div>
    </aside>
  );
}
