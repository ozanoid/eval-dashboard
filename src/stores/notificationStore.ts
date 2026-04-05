import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotificationState {
  lastSeen: Record<string, string>; // systemGroup → ISO timestamp
  newCounts: Record<string, number>; // systemGroup → count of new evals
  markSeen: (systemGroup: string) => void;
  setNewCount: (systemGroup: string, count: number) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      lastSeen: {},
      newCounts: {},

      markSeen: (systemGroup) =>
        set((state) => ({
          lastSeen: {
            ...state.lastSeen,
            [systemGroup]: new Date().toISOString(),
          },
          newCounts: {
            ...state.newCounts,
            [systemGroup]: 0,
          },
        })),

      setNewCount: (systemGroup, count) =>
        set((state) => ({
          newCounts: {
            ...state.newCounts,
            [systemGroup]: count,
          },
        })),
    }),
    {
      name: "eval-notifications",
    }
  )
);
