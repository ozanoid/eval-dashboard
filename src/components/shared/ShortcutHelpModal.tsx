import { X } from "lucide-react";

interface ShortcutHelpModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: "Navigation",
    shortcuts: [
      { key: "j", description: "Next eval card" },
      { key: "k", description: "Previous eval card" },
      { key: "Enter", description: "Open selected eval" },
      { key: "Esc", description: "Go back" },
    ],
  },
  {
    title: "Eval Detail",
    shortcuts: [
      { key: "Tab", description: "Next agent tab" },
      { key: "a", description: "Add suggestion to cart" },
    ],
  },
  {
    title: "General",
    shortcuts: [{ key: "?", description: "Show this help" }],
  },
];

export function ShortcutHelpModal({ open, onClose }: ShortcutHelpModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-bg-elevated border border-border-default rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-text-primary">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-card text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-[10px] font-medium text-text-tertiary uppercase tracking-[0.08em] mb-2.5">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-text-secondary">
                      {s.description}
                    </span>
                    <kbd className="font-mono text-xs bg-bg-page text-text-primary px-2 py-0.5 rounded border border-border-subtle min-w-[28px] text-center">
                      {s.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
