import * as React from "react";
import { Upload, X, Film, Image as ImageIcon } from "lucide-react";

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
                className={
                  f.type === "textarea" || f.type === "image" || f.type === "video"
                    ? "sm:col-span-2 space-y-1.5"
                    : "space-y-1.5"
                }
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
                ) : f.type === "image" ? (
                  <div className="space-y-2.5">
                    {(() => {
                      let imageList: string[] = [];
                      if (Array.isArray(v)) {
                        imageList = v.filter(Boolean).map(String);
                      } else if (typeof v === "string" && v) {
                        try {
                          const parsed = JSON.parse(v);
                          if (Array.isArray(parsed)) imageList = parsed;
                          else imageList = [v];
                        } catch {
                          imageList = [v];
                        }
                      }

                      const removeImage = (indexToRemove: number) => {
                        const next = imageList.filter((_, idx) => idx !== indexToRemove);
                        set(f.key, next.length > 0 ? next : "");
                      };

                      return (
                        <>
                          {imageList.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                                <span>{imageList.length} {imageList.length === 1 ? "image" : "images"} selected (first is primary cover)</span>
                                <button
                                  type="button"
                                  className="text-xs text-destructive hover:underline cursor-pointer"
                                  onClick={() => set(f.key, "")}
                                >
                                  Clear all
                                </button>
                              </div>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 p-2 rounded-lg border border-border bg-muted/30">
                                {imageList.map((imgSrc, idx) => (
                                  <div key={idx} className="group relative aspect-square rounded-md overflow-hidden border border-border bg-background shadow-xs">
                                    <img
                                      src={imgSrc}
                                      alt={`Product ${idx + 1}`}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                    {idx === 0 && (
                                      <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1 py-0.5 text-[9px] font-semibold text-white">
                                        Cover
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-80 group-hover:opacity-100 hover:scale-110 transition-all cursor-pointer shadow-xs"
                                      onClick={() => removeImage(idx)}
                                      title="Remove image"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-[12px] font-medium shadow-2xs hover:bg-accent hover:text-accent-foreground transition-colors">
                              <Upload className="h-3.5 w-3.5" />
                              <span>Upload Multiple Images</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files ?? []);
                                  if (files.length > 0) {
                                    Promise.all(
                                      files.map(
                                        (file) =>
                                          new Promise<string>((resolve) => {
                                            const reader = new FileReader();
                                            reader.onload = (event) => resolve(String(event.target?.result ?? ""));
                                            reader.readAsDataURL(file);
                                          })
                                      )
                                    ).then((newImgs) => {
                                      const updated = [...imageList, ...newImgs.filter(Boolean)];
                                      set(f.key, updated);
                                    });
                                  }
                                  e.target.value = "";
                                }}
                              />
                            </label>
                            <span className="text-[11px] text-muted-foreground">or add URL:</span>
                            <div className="flex flex-1 items-center gap-1 min-w-[200px]">
                              <Input
                                id={`${id}-url-input`}
                                placeholder="https://...image.jpg"
                                className="h-8 flex-1 text-[12px]"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const input = e.currentTarget;
                                    if (input.value.trim()) {
                                      set(f.key, [...imageList, input.value.trim()]);
                                      input.value = "";
                                    }
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs px-2.5"
                                onClick={() => {
                                  const input = document.getElementById(`${id}-url-input`) as HTMLInputElement | null;
                                  if (input && input.value.trim()) {
                                    set(f.key, [...imageList, input.value.trim()]);
                                    input.value = "";
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : f.type === "video" ? (
                  <div className="space-y-2">
                    {v ? (
                      <div className="relative flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-2.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Film className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground">Video attached</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {String(v).startsWith("data:") ? "Local video ready to save" : String(v)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => set(f.key, "")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-[12px] font-medium shadow-2xs hover:bg-accent hover:text-accent-foreground transition-colors">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Upload Video File</span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                set(f.key, event.target?.result ?? "");
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <span className="text-[11px] text-muted-foreground">or URL:</span>
                      <Input
                        placeholder="https://...video.mp4 or YouTube / Vimeo URL"
                        value={String(v ?? "").startsWith("data:") ? "" : String(v ?? "")}
                        onChange={(e) => set(f.key, e.target.value)}
                        className="h-8 min-w-[200px] flex-1 text-[12px]"
                      />
                    </div>
                  </div>
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
