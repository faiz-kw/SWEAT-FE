import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Field } from "@/modules/schema";
import type { Row } from "@/services/store";

function initialValues(fields: Field[], row?: Row) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = row?.[f.key];
    if (Array.isArray(v)) out[f.key] = v.join(", ");
    else if (v === null || v === undefined) out[f.key] = f.type === "boolean" ? false : "";
    else out[f.key] = v;
  }
  return out;
}

function coerce(fields: Field[], values: Record<string, unknown>, original?: Row) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = values[f.key];
    if (f.type === "boolean") out[f.key] = Boolean(raw);
    else if (f.type === "number" || f.type === "currency" || f.type === "percent")
      out[f.key] = raw === "" || raw === null ? 0 : Number(raw);
    else if (Array.isArray(original?.[f.key]))
      out[f.key] = String(raw ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    else out[f.key] = raw === "" ? null : raw;
  }
  return out;
}

/**
 * Schema-driven create/edit form. Every module reuses this, so all fields of a
 * record are editable without hand-written forms per module.
 */
export function RecordForm({
  open,
  onOpenChange,
  fields,
  row,
  entity,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fields: Field[];
  row?: Row | undefined;
  entity: string;
  onSubmit: (values: Record<string, unknown>) => void;
}) {
  const editable = React.useMemo(() => fields.filter((f) => f.key !== "id"), [fields]);
  const [values, setValues] = React.useState<Record<string, unknown>>(() => initialValues(editable, row));

  React.useEffect(() => {
    if (open) setValues(initialValues(editable, row));
  }, [open, row, editable]);

  const set = (key: string, v: unknown) => setValues((p) => ({ ...p, [key]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-[15px]">
            {row ? `Edit ${entity}` : `New ${entity}`}
            {row ? <span className="num ml-2 text-xs font-normal text-muted-foreground">{row.id}</span> : null}
          </DialogTitle>
          <DialogDescription className="text-xs">
            All fields for this record type. Changes are reflected across every linked module immediately.
          </DialogDescription>
        </DialogHeader>

        <form
          id="record-form"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(coerce(editable, values, row));
            onOpenChange(false);
          }}
        >
          {editable.map((f) => {
            const v = values[f.key];
            const id = `f-${f.key}`;
            return (
              <div
                key={f.key}
                className={f.type === "textarea" ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}
              >
                <Label htmlFor={id} className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {f.label}
                </Label>
                {f.type === "enum" ? (
                  <Select value={v ? String(v) : ""} onValueChange={(val) => set(f.key, val)}>
                    <SelectTrigger id={id} className="h-8 text-[13px]">
                      <SelectValue placeholder={`Select ${f.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((o) => (
                        <SelectItem key={o} value={o} className="text-[13px]">
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.type === "boolean" ? (
                  <div className="flex h-8 items-center gap-2">
                    <Switch id={id} checked={Boolean(v)} onCheckedChange={(c) => set(f.key, c)} />
                    <span className="text-[13px] text-muted-foreground">{v ? "Yes" : "No"}</span>
                  </div>
                ) : f.type === "textarea" ? (
                  <Textarea
                    id={id}
                    rows={2}
                    value={String(v ?? "")}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="text-[13px]"
                  />
                ) : (
                  <Input
                    id={id}
                    type={
                      f.type === "number" || f.type === "currency" || f.type === "percent"
                        ? "number"
                        : f.type === "date"
                          ? "date"
                          : "text"
                    }
                    value={String(v ?? "")}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="h-8 text-[13px]"
                  />
                )}
              </div>
            );
          })}
        </form>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="record-form" size="sm" className="w-full sm:w-auto">
            {row ? "Save changes" : `Create ${entity.toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
