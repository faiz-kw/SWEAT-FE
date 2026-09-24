import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TrainerProfile } from '@/types/workforce';
import { TrainerAllottedClassesView } from '../classes/TrainerAllottedClassesView';
import { Award, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TrainerAllottedClassesModalProps {
  trainer: TrainerProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyLeave?: () => void;
}

export const TrainerAllottedClassesModal: React.FC<TrainerAllottedClassesModalProps> = ({
  trainer,
  isOpen,
  onClose,
  onApplyLeave,
}) => {
  if (!trainer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Award className="size-5 text-primary" />
                <span>Allotted Classes: {trainer.trainer_name || trainer.trainer_code}</span>
                <Badge variant="outline" className="text-2xs font-mono bg-primary/10 text-primary border-primary/20">
                  {trainer.trainer_code}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Review assigned group workout sessions, manage daily session schedules, and mark student member attendance.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5">
          <TrainerAllottedClassesView
            trainerId={trainer.id}
            trainerName={trainer.trainer_name || trainer.trainer_code}
            isEmbedded={true}
            onApplyLeave={onApplyLeave}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
