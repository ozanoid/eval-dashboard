import { useState, useMemo } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ShortcutHelpModal } from "@/components/shared/ShortcutHelpModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useNewEvalNotifications } from "@/hooks/useNewEvalNotifications";

export function AppShell() {
  const [helpOpen, setHelpOpen] = useState(false);
  const { agents } = useAgentRegistry();
  useNewEvalNotifications(agents);

  const shortcuts = useMemo(
    () => [
      {
        key: "?",
        handler: () => setHelpOpen(true),
        description: "Show keyboard shortcuts",
        group: "General",
      },
      {
        key: "Escape",
        handler: () => setHelpOpen(false),
        when: () => helpOpen,
        description: "Close modal",
        group: "General",
      },
    ],
    [helpOpen]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent-primary focus:text-white focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-y-auto shadow-[inset_2px_0_12px_rgba(0,0,0,0.15)]">
        <Outlet />
      </main>
      <ShortcutHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
