import * as React from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  content: React.ReactNode;
}

export function Wizard({
  steps,
  onComplete,
  completeLabel = "Activate",
}: {
  steps: WizardStep[];
  onComplete?: () => void;
  completeLabel?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const [done, setDone] = React.useState<Set<number>>(new Set());
  const step = steps[index]!;

  return (
    <div className="grid gap-3 lg:grid-cols-[230px_1fr]">
      <nav className="scrollbar-thin max-h-[calc(100vh-13rem)] overflow-y-auto rounded-md border border-border bg-surface p-1.5">
        <ol className="space-y-0.5">
          {steps.map((s, i) => (
            <li key={s.id}>
              <button
                onClick={() => setIndex(i)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] transition-colors",
                  i === index ? "bg-accent font-medium text-accent-foreground" : "hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "num flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px]",
                    done.has(i)
                      ? "border-success bg-success text-success-foreground"
                      : i === index
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {done.has(i) ? <Check className="size-2.5" /> : i + 1}
                </span>
                <span className="truncate">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex min-h-[420px] flex-col rounded-md border border-border bg-surface">
        <header className="border-b border-border px-3 py-2">
          <div className="num text-[11px] uppercase tracking-wide text-muted-foreground">
            Step {index + 1} of {steps.length}
          </div>
          <h2 className="text-[14px] font-semibold">{step.title}</h2>
          {step.description && <p className="text-xs text-muted-foreground">{step.description}</p>}
        </header>
        <div className="flex-1 p-3">{step.content}</div>
        <footer className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <Button variant="outline" size="sm" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            Back
          </Button>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setIndex(Math.min(steps.length - 1, index + 1))}>
              Skip
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setDone((prev) => new Set(prev).add(index));
                if (index < steps.length - 1) setIndex(index + 1);
                else onComplete?.();
              }}
            >
              {index === steps.length - 1 ? completeLabel : "Save & continue"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
