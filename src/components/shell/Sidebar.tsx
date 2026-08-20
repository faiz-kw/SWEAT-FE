import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Apple,
  BarChart3,
  Building2,
  CalendarRange,
  ChevronDown,
  Dumbbell,
  LifeBuoy,
  Sparkles,
  HeartPulse,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  Target,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";

import { NAV } from "@/lib/nav";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Target, Users, CalendarRange, Activity, Apple, Package, Wallet,
  HeartPulse, Megaphone, Workflow, BarChart3, Settings, Building2, Sparkles, Dumbbell, LifeBuoy,
};

export function Sidebar() {
  const { collapsed } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const s of NAV) init[s.id] = s.items.some((i) => i.to === "/" || pathname.startsWith(i.to));
    init["crm"] = true;
    return init;
  });

  return (
    <aside
      className={cn(
        "scrollbar-thin z-30 flex h-full shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar transition-[width] duration-150",
        collapsed ? "w-[52px]" : "w-[228px]",
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
        <div className="flex size-6 shrink-0 items-center justify-center rounded bg-primary text-[11px] font-bold text-primary-foreground">
          P
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold leading-tight">PerformanceOS</div>
            <div className="truncate text-[10px] leading-tight text-muted-foreground">Admin Console</div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-1.5 py-2">
        {NAV.map((section) => {
          const Icon = ICONS[section.icon] ?? LayoutDashboard;
          const isOpen = open[section.id] ?? false;
          const sectionActive = section.items.some((i) =>
            i.to === "/" ? pathname === "/" : pathname.startsWith(i.to),
          );

          if (section.items.length === 1) {
            const item = section.items[0]!;
            return (
              <Link
                key={section.id}
                to={item.to}
                className={cn(
                  "mb-0.5 flex items-center gap-2 rounded px-2 py-1.5 text-[12.5px] font-medium",
                  pathname === item.to
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-muted",
                )}
                title={section.label}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span className="truncate">{section.label}</span>}
              </Link>
            );
          }

          return (
            <div key={section.id} className="mb-0.5">
              <button
                onClick={() => setOpen((p) => ({ ...p, [section.id]: !isOpen }))}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-[12.5px] font-medium",
                  sectionActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground",
                  "hover:bg-muted",
                )}
                title={section.label}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="truncate">{section.label}</span>
                    <ChevronDown
                      className={cn("ml-auto size-3.5 shrink-0 transition-transform", isOpen && "rotate-180")}
                    />
                  </>
                )}
              </button>
              {!collapsed && isOpen && (
                <ul className="mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2 ml-4">
                  {section.items.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "block truncate rounded px-2 py-1 text-[12px]",
                          pathname === item.to
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
