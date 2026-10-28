import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Member360Workspace } from "../Member360Workspace";
import { UserCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Member360ModalProps {
  memberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName?: string;
  memberNumber?: string;
}

export function Member360Modal({
  memberId,
  open,
  onOpenChange,
  memberName,
  memberNumber,
}: Member360ModalProps) {
  if (!memberId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl h-[92vh] p-0 flex flex-col gap-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl">
        <DialogHeader className="px-6 py-3.5 border-b border-border/80 bg-muted/40 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <UserCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-foreground">
                  {memberName || "Member 360 Workspace"}
                </DialogTitle>
                {memberNumber && (
                  <Badge variant="outline" className="font-mono text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                    {memberNumber}
                  </Badge>
                )}
                <Badge variant="secondary" className="gap-1 text-[11px] font-semibold">
                  <Sparkles className="size-3 text-amber-500" />
                  Live Caller Identified
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Active Member Profile, Commercial Memberships, Attendance, and Ledger
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 bg-muted/10">
          <Member360Workspace memberId={memberId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
