import { Outlet, createFileRoute } from "@tanstack/react-router";

import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { AppProvider } from "@/lib/app-context";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  return (
    <AppProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="scrollbar-thin flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </AppProvider>
  );
}
