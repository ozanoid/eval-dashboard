import { useEffect } from "react";

export interface Shortcut {
  key: string;
  handler: () => void;
  when?: () => boolean;
  description: string;
  group: string;
}

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (INPUT_TAGS.has(target.tagName) || target.isContentEditable) return;

      for (const shortcut of shortcuts) {
        if (e.key === shortcut.key && (!shortcut.when || shortcut.when())) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
