import { useState, useMemo, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ShortcutHelpModal } from "@/components/shared/ShortcutHelpModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useNewEvalNotifications } from "@/hooks/useNewEvalNotifications";
import { useCartStore } from "@/stores/cartStore";
import { supabase } from "@/lib/supabase";

export function AppShell() {
  const [helpOpen, setHelpOpen] = useState(false);
  const { agents } = useAgentRegistry();
  useNewEvalNotifications(agents);

  // Hydrate applied suggestions from DB on mount
  const loadAppliedFromDb = useCartStore((s) => s.loadAppliedFromDb);
  useEffect(() => {
    supabase
      .from("suggestion_applications")
      .select("suggestion_hash")
      .then(({ data }) => {
        if (data && data.length > 0) {
          loadAppliedFromDb(data.map((r) => r.suggestion_hash));
        }
      });
  }, [loadAppliedFromDb]);

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
      <Sidebar />
      <main className="flex-1 overflow-y-auto shadow-[inset_2px_0_12px_rgba(0,0,0,0.15)]">
        <Outlet />
      </main>
      <ShortcutHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
