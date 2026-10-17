/**
 * src/components/members/modals/EditAttendanceModal.tsx
 * Admin modal to update attendance record status, check-in time, and check-out time.
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, CheckCircle2, UserCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { membersApi } from '@/api/endpoints/membersApi';
import type { MemberAttendanceItem } from '@/types/members';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface EditAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: MemberAttendanceItem | null;
  memberId: string;
}

const formatDateTimeLocal = (isoString?: string | null): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
};

export const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({
  isOpen,
  onClose,
  attendance,
  memberId,
}) => {
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<string>('PRESENT');
  const [checkInTime, setCheckInTime] = useState<string>('');
  const [checkOutTime, setCheckOutTime] = useState<string>('');
  const [method, setMethod] = useState<string>('FRONT_DESK');

  useEffect(() => {
    if (attendance) {
      setStatus(attendance.status || 'PRESENT');
      setCheckInTime(formatDateTimeLocal(attendance.check_in_at || attendance.date_time));
      setCheckOutTime(formatDateTimeLocal(attendance.check_out_at));
      setMethod(attendance.check_in_method || 'FRONT_DESK');
    }
  }, [attendance]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!attendance) throw new Error('No attendance record selected');
      return membersApi.updateAttendance(attendance.id, {
        status,
        check_in_at: checkInTime ? new Date(checkInTime).toISOString() : null,
        check_out_at: checkOutTime ? new Date(checkOutTime).toISOString() : null,
        check_in_method: method,
      });
    },
    onSuccess: () => {
      toast.success('Attendance record updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['member-360', memberId] });
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Failed to update attendance');
    },
  });

  if (!attendance) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            Update Attendance Record
          </DialogTitle>
          <DialogDescription>
            Modify attendance status, check-in, and check-out times for this session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Read-only session info summary */}
          <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Class / Session:</span>
              <strong className="text-foreground">{attendance.class_name || 'Class Session'}</strong>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Branch:</span>
              <span className="text-foreground">{attendance.branch_name}</span>
            </div>
          </div>

          {/* Status selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Attendance Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="PRESENT">PRESENT (Attended)</option>
              <option value="LATE">LATE (Late Arrival)</option>
              <option value="NO_SHOW">NO_SHOW (Unexcused Absence)</option>
              <option value="ABSENT">ABSENT (Cancelled / Excused)</option>
              <option value="MANUAL">MANUAL (Admin Adjusted)</option>
            </select>
          </div>

          {/* Check-In Timestamp */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              Check-In Time
            </Label>
            <input
              type="datetime-local"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Check-Out Timestamp */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Check-Out Time (Optional)
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {checkOutTime && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCheckOutTime('')}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground shrink-0"
                >
                  Clear
                </Button>
              )}
            </div>
            {!checkOutTime && (
              <p className="text-[11px] text-muted-foreground">
                Leave empty if member is still in session or check-out is unrecorded.
              </p>
            )}
          </div>

          {/* Verification / Check-in Method */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Check-In Method</Label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="FRONT_DESK">FRONT_DESK (Manual Staff Check-in)</option>
              <option value="ADMIN">ADMIN (System Administrator)</option>
              <option value="QR">QR (Member Mobile Scan)</option>
              <option value="ACCESS_DEVICE">ACCESS_DEVICE (Turnstile / RFID)</option>
              <option value="MOBILE">MOBILE (Trainer / Geofenced App)</option>
              <option value="MANUAL">MANUAL (Override)</option>
            </select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="h-8 text-xs font-medium"
          >
            {mutation.isPending ? 'Saving...' : 'Save Attendance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
