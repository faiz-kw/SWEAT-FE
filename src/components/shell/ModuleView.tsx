import { findNavItem } from "@/lib/nav";

export function ModuleView({ path }: { path: string }) {
  const nav = findNavItem(path);
  return (
    <div className="p-3">
      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{nav?.section ?? "Console"}</div>
        <h1 className="text-[16px] font-semibold">{nav?.label ?? path}</h1>
      </div>
      <div className="rounded-md border border-dashed border-border bg-surface p-6 text-center">
        <p className="text-[13px] font-medium">{nav?.label} workspace</p>
        <p className="mt-1 text-xs text-muted-foreground">
          This module is scaffolded and connected to the navigation, global location and period filters. Detailed grids
          and workflows land in the next build pass.
        </p>
      </div>
    </div>
  );
}
