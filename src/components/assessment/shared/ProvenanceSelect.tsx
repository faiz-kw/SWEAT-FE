import React from 'react';
import type { ProvenanceTag } from '@/api/endpoints/assessmentApi';

interface ProvenanceSelectProps {
  label?: string;
  value: ProvenanceTag;
  onChange: (val: ProvenanceTag) => void;
  disabled?: boolean;
}

const PROVENANCE_OPTIONS: Array<{ value: ProvenanceTag; label: string; badgeColor: string }> = [
  { value: 'MEASURED', label: 'Measured', badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { value: 'CALCULATED', label: 'Calculated', badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { value: 'ESTIMATED', label: 'Estimated', badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { value: 'MEMBER_REPORTED', label: 'Member-reported', badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  { value: 'UNAVAILABLE', label: 'Unavailable', badgeColor: 'bg-muted text-muted-foreground border-border' },
];

export const ProvenanceSelect: React.FC<ProvenanceSelectProps> = ({
  label,
  value,
  onChange,
  disabled = false,
}) => {
  const activeOpt = PROVENANCE_OPTIONS.find((opt) => opt.value === value) ?? PROVENANCE_OPTIONS[0];

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {label && <span className="text-muted-foreground">{label}:</span>}
      <div className="relative inline-block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as ProvenanceTag)}
          disabled={disabled}
          className={`h-6 pl-2 pr-6 text-[11px] font-medium rounded border appearance-none cursor-pointer bg-card focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${activeOpt?.badgeColor ?? ''}`}
        >
          {PROVENANCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-card text-foreground">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-muted-foreground">
          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    </div>
  );
};
