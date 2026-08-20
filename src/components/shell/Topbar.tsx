import { Bell, PanelLeft, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp, useLocations } from "@/lib/app-context";
import { findNavItem } from "@/lib/nav";
import { useRouterState } from "@tanstack/react-router";

export function Topbar() {
  const { toggleCollapsed, locationId, setLocationId, range, setRange, density, setDensity, tenantName, role } =
    useApp();
  const locations = useLocations();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = findNavItem(pathname);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-2.5">
      <Button variant="ghost" size="icon" className="size-8" onClick={toggleCollapsed} aria-label="Toggle sidebar">
        <PanelLeft className="size-4" />
      </Button>

      <div className="hidden min-w-0 items-center gap-1.5 text-xs text-muted-foreground md:flex">
        <span className="font-medium text-foreground">{tenantName}</span>
        <span>/</span>
        <span>{nav?.section ?? "Console"}</span>
        {nav && (
          <>
            <span>/</span>
            <span className="truncate text-foreground">{nav.label}</span>
          </>
        )}
      </div>

      <div className="relative ml-auto hidden w-56 lg:block">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search members, leads, invoices…" className="h-8 pl-7 text-[13px]" />
      </div>

      <Select value={locationId} onValueChange={setLocationId}>
        <SelectTrigger className="h-8 w-auto min-w-[8rem] text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All locations</SelectItem>
          {locations.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.city} · {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={range} onValueChange={setRange}>
        <SelectTrigger className="hidden h-8 w-auto min-w-[8.5rem] text-[13px] md:flex">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {["Today", "Last 7 days", "Last 30 days", "This quarter", "Last 12 months"].map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={density} onValueChange={(v) => setDensity(v as typeof density)}>
        <SelectTrigger className="hidden h-8 w-auto text-[13px] xl:flex">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="tight">Tight rows</SelectItem>
          <SelectItem value="default">Default rows</SelectItem>
          <SelectItem value="comfortable">Comfortable rows</SelectItem>
        </SelectContent>
      </Select>

      <Button size="sm" className="h-8 px-2 text-xs">
        <Plus className="size-3.5" /> New
      </Button>

      <Button variant="ghost" size="icon" className="relative size-8" aria-label="Notifications">
        <Bell className="size-4" />
        <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
      </Button>

      <div className="flex items-center gap-2 border-l border-border pl-2">
        <div className="hidden text-right leading-tight sm:block">
          <div className="text-[12px] font-medium">Aarav Menon</div>
          <div className="text-[10px] text-muted-foreground">{role}</div>
        </div>
        <div className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
          AM
        </div>
      </div>
    </header>
  );
}
