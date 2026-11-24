import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { SymptomRecord } from '@/api/endpoints/assessmentApi';

interface SymptomLoggerModalProps {
  isOpen: boolean;
  domainName: string;
  onClose: () => void;
  onSaveSymptom: (symptom: SymptomRecord) => void;
}

export const SymptomLoggerModal: React.FC<SymptomLoggerModalProps> = ({
  isOpen,
  domainName,
  onClose,
  onSaveSymptom,
}) => {
  const [symptomType, setSymptomType] = useState('Sharp Pain');
  const [bodyLocation, setBodyLocation] = useState('Lumbar Spine / Lower Back');
  const [severity, setSeverity] = useState(4);
  const [stoppingReason, setStoppingReason] = useState('Coach stopped test due to discomfort');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSymptom({
      symptom_type: symptomType,
      body_location: bodyLocation,
      severity_scale: severity,
      stopping_reason: stoppingReason,
      timestamp: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-semibold text-zinc-100 text-sm">
              Log Symptom / Safety Event ({domainName})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          Decoupled from movement performance scores. Document adverse events for clinical safety and recovery tracking.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Symptom Type</label>
            <select
              value={symptomType}
              onChange={(e) => setSymptomType(e.target.value)}
              className="w-full h-9 rounded-md bg-zinc-800 border border-zinc-700 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="Sharp Pain">Sharp Pain</option>
              <option value="Dull Ache">Dull Ache</option>
              <option value="Joint Impingement / Pinching">Joint Impingement / Pinching</option>
              <option value="Dizziness / Lightheadedness">Dizziness / Lightheadedness</option>
              <option value="Shortness of Breath / Dyspnea">Shortness of Breath / Dyspnea</option>
              <option value="Muscle Cramp / Spasm">Muscle Cramp / Spasm</option>
              <option value="Loss of Balance / Instability">Loss of Balance / Instability</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Body Location</label>
            <Input
              value={bodyLocation}
              onChange={(e) => setBodyLocation(e.target.value)}
              placeholder="e.g. Right Anterior Shoulder, Left Knee Lateral"
              className="h-9 bg-zinc-800 border-zinc-700 text-xs text-zinc-200"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-zinc-300">Severity Scale (1 - 10)</label>
              <span className={`text-xs font-bold ${severity >= 7 ? 'text-red-400' : severity >= 4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {severity} / 10
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={severity}
              onChange={(e) => setSeverity(parseInt(e.target.value, 10))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Stopping Reason / Action Taken</label>
            <Textarea
              value={stoppingReason}
              onChange={(e) => setStoppingReason(e.target.value)}
              rows={2}
              placeholder="e.g. Test halted immediately. Recommended ice and avoided overhead loading."
              className="bg-zinc-800 border-zinc-700 text-xs text-zinc-200"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-zinc-400">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold">
            Record Safety Event
          </Button>
        </div>
      </div>
    </div>
  );
};
