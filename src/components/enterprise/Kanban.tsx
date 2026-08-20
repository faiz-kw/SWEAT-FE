import * as React from "react";
import { cn } from "@/lib/utils";

export interface KanbanColumn {
  id: string;
  title: string;
  accent?: string;
}

export function KanbanBoard<T>({
  columns,
  items,
  columnOf,
  renderCard,
  getId,
  onMove,
  footer,
}: {
  columns: KanbanColumn[];
  items: T[];
  columnOf: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  getId: (item: T) => string;
  onMove?: (id: string, toColumn: string) => void;
  footer?: (columnId: string, items: T[]) => React.ReactNode;
}) {
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overCol, setOverCol] = React.useState<string | null>(null);

  return (
    <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-2">
      {columns.map((col) => {
        const colItems = items.filter((i) => columnOf(i) === col.id);
        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOverCol(col.id);
            }}
            onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
            onDrop={() => {
              if (dragId && onMove) onMove(dragId, col.id);
              setDragId(null);
              setOverCol(null);
            }}
            className={cn(
              "flex w-[236px] shrink-0 flex-col rounded-md border border-border bg-muted/40",
              overCol === col.id && "border-primary/50 bg-accent/60",
            )}
          >
            <header className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: col.accent ?? "var(--color-primary)" }}
                />
                <span className="truncate text-[12px] font-semibold">{col.title}</span>
              </div>
              <span className="num rounded bg-surface px-1 text-[11px] text-muted-foreground">{colItems.length}</span>
            </header>
            <div className="scrollbar-thin flex max-h-[calc(100vh-19rem)] flex-1 flex-col gap-1.5 overflow-y-auto p-1.5">
              {colItems.map((item) => (
                <div
                  key={getId(item)}
                  draggable
                  onDragStart={() => setDragId(getId(item))}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "cursor-grab rounded border border-border bg-surface p-2 shadow-[0_1px_0_rgba(0,0,0,0.02)] active:cursor-grabbing",
                    dragId === getId(item) && "opacity-50",
                  )}
                >
                  {renderCard(item)}
                </div>
              ))}
              {colItems.length === 0 && (
                <div className="rounded border border-dashed border-border px-2 py-4 text-center text-[11px] text-muted-foreground">
                  Drop here
                </div>
              )}
            </div>
            {footer && <div className="border-t border-border px-2 py-1.5 text-[11px]">{footer(col.id, colItems)}</div>}
          </div>
        );
      })}
    </div>
  );
}
