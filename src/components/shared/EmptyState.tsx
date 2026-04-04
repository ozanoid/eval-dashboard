import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-bg-card border border-border-subtle flex items-center justify-center mb-4 text-text-tertiary">
        {icon ?? <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-medium text-text-secondary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-muted max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
