import * as React from "react";
import {
  ArrowUpRight,
  Pencil,
  Trash2,
  CheckCircle2,
  Calendar,
  CheckCheck,
  Loader2,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Field as FieldRow, FieldGrid, MiniTable, Section, Timeline } from "@/components/enterprise/Page";
import { StatusBadge } from "@/components/enterprise/StatusBadge";
import { dateTime } from "@/components/enterprise/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCell } from "@/modules/cells";
import { useModuleNavigate } from "@/modules/navigate";
import { activityFeed, relatedGroups, timeOf } from "@/modules/related";
import { inferFields, pickStatusKey, pickTitleKey, type Field } from "@/modules/schema";
import { checkInMemberApi, fetchMembers, updateLeadApi, logLeadActivityApi } from "@/services/api-modules";
import { createRecord, setCollectionRows, updateRecord, type CollectionKey, type Row } from "@/services/store";

/**
 * Record drilldown: full field detail, every linked record across modules, and
 * a cross-module activity timeline with jump-to-module links.
 */
export function RecordDetail({
  open,
  onOpenChange,
  collection,
  fields,
  row,
  entity,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collection: CollectionKey;
  fields: Field[];
  row: Row | undefined;
  entity: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const go = useModuleNavigate();
  const titleKey = pickTitleKey(fields);
  const statusKey = pickStatusKey(fields);

  // Maintain local row state so user actions (Check In, Book Trial, Status changes)
  // reflect immediately in the open drawer without needing to close and re-open.
  const [localRow, setLocalRow] = React.useState<Row | undefined>(row);
  React.useEffect(() => {
    setLocalRow(row);
  }, [row]);

  const activeRow = localRow ?? row;

  // Check In state
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);

  // Book Trial dialog state
  const [trialOpen, setTrialOpen] = React.useState(false);
  const [trialType, setTrialType] = React.useState("Reformer Pilates Trial");
  const [trialDate, setTrialDate] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [trialTime, setTrialTime] = React.useState("10:00 AM");
  const [trialTrainer, setTrialTrainer] = React.useState("Kavita Rao (Master Pilates Coach)");
  const [trialNotes, setTrialNotes] = React.useState("Interested in Reformer Pilates & Toning");
  const [isBookingTrial, setIsBookingTrial] = React.useState(false);

  const groups = React.useMemo(() => (activeRow ? relatedGroups(collection, activeRow) : []), [collection, activeRow]);
  const feed = React.useMemo(() => (activeRow ? activityFeed(collection, activeRow) : []), [collection, activeRow]);

  if (!activeRow) return null;

  // Handler: Member Check In
  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const locId = String(activeRow["locationId"] ?? activeRow["location"] ?? "LOC-D077B3");
      const res = await checkInMemberApi(activeRow.id, locId, "Front Desk");
      const currentCount = Number(activeRow["attendanceCount30d"] ?? activeRow["attendance30"] ?? 0);
      const newCount = currentCount + 1;
      const nowIso = new Date().toISOString();

      const updated: Row = {
        ...activeRow,
        attendanceCount30d: newCount,
        attendance30: newCount,
        lastVisit: nowIso,
      };
      setLocalRow(updated);
      updateRecord("members", activeRow.id, {
        attendance30: newCount,
        attendanceCount30d: newCount,
        lastVisit: nowIso,
      });

      toast.success(`Check-in recorded for ${activeRow["name"]}!`, {
        description: `Visit #${newCount} logged to PostgreSQL database (${res?.location_name || "Front Desk"})`,
      });

      // Refresh members in background
      fetchMembers().then((m) => setCollectionRows("members", m));
    } catch (e: any) {
      toast.error(`Check-in failed: ${e?.message || "Error logging attendance"}`);
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Handler: Book Trial for CRM Lead
  const handleConfirmBookTrial = async () => {
    setIsBookingTrial(true);
    try {
      // 1. Update Lead in backend
      await updateLeadApi(activeRow.id, {
        stage: "Trial Booked",
        trialDate: trialDate,
        trial_date: trialDate,
      });

      // 2. Log activity in backend
      await logLeadActivityApi(
        activeRow.id,
        "Trial",
        `Scheduled ${trialType} on ${trialDate} at ${trialTime} with ${trialTrainer}. Note: ${trialNotes}`
      );

      // 3. Create record in trials collection
      createRecord("trials", {
        lead: String(activeRow["name"] || activeRow.id),
        leadId: activeRow.id,
        trialType,
        date: trialDate,
        time: trialTime,
        trainer: trialTrainer,
        status: "Scheduled",
        notes: trialNotes,
      });

      // 4. Update local state & store
      const updated: Row = {
        ...activeRow,
        stage: "Trial Booked",
        trialDate: trialDate,
      };
      setLocalRow(updated);
      updateRecord("leads", activeRow.id, {
        stage: "Trial Booked",
        trialDate: trialDate,
      });

      toast.success(`Workout Trial booked for ${activeRow["name"]}!`, {
        description: `${trialType} on ${trialDate} at ${trialTime} with ${trialTrainer}`,
      });
      setTrialOpen(false);
    } catch (err: any) {
      toast.error(`Failed to book trial: ${err?.message || "Unknown error"}`);
    } finally {
      setIsBookingTrial(false);
    }
  };

  // Handler: Mark Trial Attended
  const handleMarkTrialAttended = async () => {
    try {
      await updateLeadApi(activeRow.id, { stage: "Trial Attended" });
      await logLeadActivityApi(activeRow.id, "Trial", "Attended workout trial session.");
      const updated: Row = {
        ...activeRow,
        stage: "Trial Attended",
      };
      setLocalRow(updated);
      updateRecord("leads", activeRow.id, { stage: "Trial Attended" });
      toast.success(`Trial marked as Attended for ${activeRow["name"]}!`, {
        description: "Lead is qualified and ready for membership conversion.",
      });
    } catch (err: any) {
      toast.error(`Failed to update stage: ${err?.message || "Error"}`);
    }
  };

  // Handler: Convert Lead to Member
  const handleConvertLeadToMember = () => {
    onOpenChange(false);
    go("/members", {
      create: "1",
      name: String(activeRow["name"] || ""),
      phone: String(activeRow["phone"] || ""),
      email: String(activeRow["email"] || ""),
      fromLeadId: activeRow.id,
    });
  };

  const leadStage = String(activeRow["stage"] ?? "");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[720px]">
          <SheetHeader className="border-b border-border px-4 py-3 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="truncate text-[15px]">{String(activeRow[titleKey] ?? activeRow.id)}</SheetTitle>
                <SheetDescription className="num text-xs">
                  {entity} · {activeRow.id}
                </SheetDescription>
              </div>

              {/* Header Action Buttons — mr-9 ensures space so the close 'X' never overlaps */}
              <div className="flex shrink-0 items-center gap-1.5 mr-9">
                {/* 🏋️ Member Check In Action */}
                {collection === "members" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isCheckingIn}
                    className="text-primary hover:bg-primary/10 border-primary/40 font-semibold cursor-pointer transition-all"
                    onClick={handleCheckIn}
                  >
                    {isCheckingIn ? (
                      <>
                        <Loader2 className="mr-1 size-3.5 animate-spin" /> Checking in…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1 size-3.5 text-emerald-500" /> Check In
                      </>
                    )}
                  </Button>
                )}

                {/* 🎯 Lead Trial & Stage Progression Actions */}
                {collection === "leads" && (
                  <>
                    {leadStage === "Trial Booked" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600 hover:bg-emerald-50 border-emerald-300 font-medium"
                        onClick={handleMarkTrialAttended}
                      >
                        <CheckCheck className="mr-1 size-3.5 text-emerald-500" /> Mark Attended
                      </Button>
                    ) : leadStage === "Trial Attended" ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                        onClick={handleConvertLeadToMember}
                      >
                        <UserPlus className="mr-1 size-3.5" /> Convert to Member
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-primary hover:bg-primary/10 border-primary/40 font-semibold"
                        onClick={() => setTrialOpen(true)}
                      >
                        <Calendar className="mr-1 size-3.5 text-indigo-500" /> Book Trial
                      </Button>
                    )}
                  </>
                )}

                {statusKey && <StatusBadge value={String(activeRow[statusKey] ?? "—")} />}
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Pencil className="mr-1 size-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={onDelete}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="detail" className="flex-1">
            <TabsList className="mx-4 mt-3">
              <TabsTrigger value="detail" className="text-xs">
                Record
              </TabsTrigger>
              <TabsTrigger value="linked" className="text-xs">
                Linked ({groups.reduce((s, g) => s + g.rows.length, 0)})
              </TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs">
                Activity ({feed.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="detail" className="space-y-3 p-4">
              <Section title="All fields">
                <FieldGrid cols={2}>
                  {fields.map((f) => (
                    <FieldRow key={f.key} label={f.label} value={formatCell(f, activeRow[f.key])} />
                  ))}
                </FieldGrid>
              </Section>
            </TabsContent>

            <TabsContent value="linked" className="space-y-3 p-4">
              {groups.length === 0 && (
                <p className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No linked records in other modules yet.
                </p>
              )}
              {groups.map((g) => {
                const gFields = inferFields(g.rows);
                const gTitle = pickTitleKey(gFields);
                const gStatus = pickStatusKey(gFields);
                return (
                  <Section
                    key={g.collection}
                    title={g.label}
                    description={`${g.rows.length} linked record(s)`}
                    padded={false}
                    actions={
                      g.path ? (
                        <Button size="sm" variant="ghost" onClick={() => go(g.path!, { focus: activeRow.id })}>
                          Open module <ArrowUpRight className="ml-1 size-3.5" />
                        </Button>
                      ) : null
                    }
                  >
                    <div className="px-2 pb-1">
                      <MiniTable
                        head={["Record", "When", "Status"]}
                        rows={g.rows.slice(0, 8).map((r) => ({
                          cells: [
                            <span key="t" className="font-medium">
                              {String(r[gTitle] ?? r.id)}
                            </span>,
                            <span key="w" className="num text-xs text-muted-foreground">
                              {timeOf(r) ? dateTime(timeOf(r)) : "—"}
                            </span>,
                            gStatus ? <StatusBadge key="s" value={String(r[gStatus] ?? "—")} /> : "—",
                          ],
                          ...(g.path ? { onClick: () => go(g.path!, { focus: r.id }) } : {}),
                        }))}
                      />
                    </div>
                  </Section>
                );
              })}
            </TabsContent>

            <TabsContent value="timeline" className="p-4">
              <Section title="Cross-module activity">
                <Timeline
                  items={feed.map((e) => ({
                    at: e.at ? dateTime(e.at) : "—",
                    title: e.title,
                    detail: [e.status, e.detail].filter(Boolean).join(" · "),
                    module: e.module,
                    actor: e.recordId,
                  }))}
                />
              </Section>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* 📅 Book Workout Trial Dialog for Leads */}
      <Dialog open={trialOpen} onOpenChange={setTrialOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-indigo-500" /> Book Workout Trial
            </DialogTitle>
            <DialogDescription>
              Schedule a trial session for <strong>{String(activeRow["name"] || "this lead")}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Trial Session Type</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={trialType}
                onChange={(e) => setTrialType(e.target.value)}
              >
                <option value="Reformer Pilates Trial">Reformer Pilates Trial</option>
                <option value="1-on-1 Fitness Assessment">1-on-1 Fitness Assessment</option>
                <option value="Strength & Conditioning Session">Strength & Conditioning Session</option>
                <option value="HIIT Intro Class">HIIT Intro Class</option>
                <option value="Yoga & Mobility Intro">Yoga & Mobility Intro</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Trial Date</label>
                <Input
                  type="date"
                  className="mt-1 text-sm"
                  value={trialDate}
                  onChange={(e) => setTrialDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Time Slot</label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={trialTime}
                  onChange={(e) => setTrialTime(e.target.value)}
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="05:30 PM">05:30 PM</option>
                  <option value="06:30 PM">06:30 PM</option>
                  <option value="07:30 PM">07:30 PM</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Assigned Coach / Trainer</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={trialTrainer}
                onChange={(e) => setTrialTrainer(e.target.value)}
              >
                <option value="Kavita Rao (Master Pilates Coach)">Kavita Rao (Master Pilates Coach)</option>
                <option value="Vikram Malhotra (Studio Manager)">Vikram Malhotra (Studio Manager)</option>
                <option value="Lead Strength Coach">Lead Strength Coach</option>
                <option value="Senior Personal Trainer">Senior Personal Trainer</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Notes / Goal Focus</label>
              <Input
                type="text"
                className="mt-1 text-sm"
                placeholder="e.g. Reformer Pilates & Toning"
                value={trialNotes}
                onChange={(e) => setTrialNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setTrialOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              disabled={isBookingTrial}
              onClick={handleConfirmBookTrial}
            >
              {isBookingTrial ? (
                <>
                  <Loader2 className="mr-1 size-3.5 animate-spin" /> Scheduling…
                </>
              ) : (
                <>
                  <Calendar className="mr-1 size-3.5" /> Confirm & Book Trial
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
