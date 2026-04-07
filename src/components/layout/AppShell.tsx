import { useState, useMemo, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ShortcutHelpModal } from "@/components/shared/ShortcutHelpModal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useAgentRegistry } from "@/hooks/useAgentRegistry";
import { useNewEvalNotifications } from "@/hooks/useNewEvalNotifications";
import { useCartStore } from "@/stores/cartStore";
import { useReviewedStore } from "@/stores/reviewedStore";
import { supabase } from "@/lib/supabase";

export function AppShell() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { agents } = useAgentRegistry();
  useNewEvalNotifications(agents);

  // Hydrate applied suggestions from DB on mount
  const loadAppliedFromDb = useCartStore((s) => s.loadAppliedFromDb);
  const loadReviewedFromDb = useReviewedStore((s) => s.loadFromDb);
  useEffect(() => {
    supabase
      .from("suggestion_applications")
      .select("suggestion_hash")
      .then(({ data }) => {
        if (data && data.length > 0) {
          loadAppliedFromDb(data.map((r) => r.suggestion_hash));
        }
      });
    supabase
      .from("eval_reviewed")
      .select("eval_id")
      .then(({ data }) => {
        if (data && data.length > 0) {
          loadReviewedFromDb(data.map((r) => r.eval_id));
        }
      });
  }, [loadAppliedFromDb, loadReviewedFromDb]);

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
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main id="main-content" className="flex-1 overflow-y-auto shadow-[inset_2px_0_12px_rgba(0,0,0,0.15)]">
        {/* Mobile header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-bg-sidebar/95 backdrop-blur-sm border-b border-border-subtle lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="p-2 rounded-lg hover:bg-bg-card-hover text-text-secondary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-text-primary tracking-tight">EvalStudio</span>
        </div>
        <Outlet />
      </main>
      <ShortcutHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
