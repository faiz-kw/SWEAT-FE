import React, { useMemo, useState } from 'react';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AssessmentTestDefinition, AssessmentTestDomain } from '@/api/endpoints/assessmentApi';

/**
 * Renders one domain from the served test catalogue.
 *
 * The coach adds the tests that suit this member rather than filling a fixed form: the
 * specification asks for one common framework with adaptive protocols, so a chair stand and
 * a goblet squat are both valid ways to assess lower body.
 *
 * Each recorded test keeps its `test_code` and `protocol_version`, which is what lets a
 * reassessment tell a repeated test from a substituted one.
 */

export interface RecordedTest {
  test_code: string;
  name: string;
  protocol_version: string;
  variation?: string;
  status?: string;
  [field: string]: unknown;
}

interface TestLibraryPickerProps {
  domain: AssessmentTestDomain;
  protocolVersion: string;
  recorded: RecordedTest[];
  onChange: (tests: RecordedTest[]) => void;
  onLogSymptom?: () => void;
  hasSymptom?: boolean | undefined;
}

const inputClass = 'h-9 bg-muted border-border text-xs text-foreground';
const selectClass = 'w-full h-9 rounded bg-muted border border-border px-2 text-xs text-foreground';

export const TestLibraryPicker: React.FC<TestLibraryPickerProps> = ({
  domain,
  protocolVersion,
  recorded,
  onChange,
  onLogSymptom,
  hasSymptom,
}) => {
  const [adding, setAdding] = useState('');

  const available = useMemo(
    () => domain.tests.filter((t) => !recorded.some((r) => r.test_code === t.code)),
    [domain.tests, recorded],
  );

  const addTest = (code: string) => {
    const def = domain.tests.find((t) => t.code === code);
    if (!def) return;
    onChange([
      ...recorded,
      {
        test_code: def.code,
        name: def.name,
        protocol_version: protocolVersion,
        variation: def.variations?.[0] ?? '',
        status: 'NOT_ASSESSED',
      },
    ]);
    setAdding('');
  };

  const updateTest = (index: number, field: string, value: unknown) => {
    onChange(recorded.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const removeTest = (index: number) => onChange(recorded.filter((_, i) => i !== index));

  return (
    <div className="p-4 rounded-xl bg-card border border-border space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {domain.label}
          </span>
          {domain.optional && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Optional</span>
          )}
        </div>
        {onLogSymptom && (
          <button
            type="button"
            onClick={onLogSymptom}
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
              hasSymptom
                ? 'bg-destructive/20 text-destructive border-destructive/40'
                : 'bg-muted text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>{hasSymptom ? 'Symptom logged' : 'Log symptom'}</span>
          </button>
        )}
      </div>

      {recorded.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          No test recorded. This domain will read as not assessed.
        </p>
      )}

      {recorded.map((test, index) => {
        const def = domain.tests.find((t) => t.code === test.test_code);
        return (
          <div key={`${test.test_code}-${index}`} className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                {def?.name || test.name}
                {def?.section && <span className="ml-1.5 text-[10px] text-muted-foreground">{def.section}</span>}
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={(test.status as string) || 'NOT_ASSESSED'}
                  onChange={(e) => updateTest(index, 'status', e.target.value)}
                  className="h-7 rounded bg-muted border border-border px-2 text-[11px] text-foreground"
                  aria-label="Result status"
                >
                  <option value="NOT_ASSESSED">Not assessed</option>
                  <option value="VALID">Valid</option>
                  <option value="MODIFIED">Modified</option>
                  <option value="INCOMPLETE">Incomplete</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeTest(index)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${def?.name || test.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {def?.note && <p className="text-[10px] text-muted-foreground">{def.note}</p>}

            {!!def?.variations?.length && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Variation</label>
                <select
                  value={(test.variation as string) || ''}
                  onChange={(e) => updateTest(index, 'variation', e.target.value)}
                  className={selectClass}
                >
                  {def.variations.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {(def?.fields || []).map((field) => (
                <div key={field.key} className={field.type === 'text' ? 'col-span-2' : ''}>
                  <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={(test[field.key] as string) || ''}
                      onChange={(e) => updateTest(index, field.key, e.target.value)}
                      className={selectClass}
                    >
                      <option value="">—</option>
                      {(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : field.type === 'bool' ? (
                    <label className="flex items-center gap-2 h-9 text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={test[field.key] === true}
                        onChange={(e) => updateTest(index, field.key, e.target.checked)}
                      />
                      <span className="text-muted-foreground">Yes</span>
                    </label>
                  ) : field.type === 'text' ? (
                    <Input
                      value={(test[field.key] as string) || ''}
                      placeholder={field.placeholder || ''}
                      onChange={(e) => updateTest(index, field.key, e.target.value)}
                      className={inputClass}
                    />
                  ) : (
                    <Input
                      type="number"
                      placeholder="—"
                      value={(test[field.key] as number | null) ?? ''}
                      onChange={(e) => updateTest(index, field.key, e.target.value === '' ? null : Number(e.target.value))}
                      className={inputClass}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            className="flex-1 h-8 rounded bg-muted border border-border px-2 text-xs text-foreground"
          >
            <option value="">Add a test…</option>
            {available.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}{t.difficulty === 'advanced' ? ' (advanced)' : t.difficulty === 'accessible' ? ' (accessible)' : ''}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[11px] gap-1"
            disabled={!adding}
            onClick={() => addTest(adding)}
          >
            <Plus className="w-3 h-3" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
};
