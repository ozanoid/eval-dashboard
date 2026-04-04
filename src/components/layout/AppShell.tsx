import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar />
      <main className="flex-1 overflow-y-auto shadow-[inset_2px_0_12px_rgba(0,0,0,0.15)]">
        <Outlet />
      </main>
    </div>
  );
}
