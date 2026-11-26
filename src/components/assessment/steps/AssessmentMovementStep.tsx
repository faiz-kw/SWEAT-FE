import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dumbbell, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SymptomLoggerModal } from '../shared/SymptomLoggerModal';
import { MovementBatteryExtras } from './MovementBatteryExtras';
import { TestLibraryPicker, type RecordedTest } from './TestLibraryPicker';
import { assessmentApi } from '@/api/endpoints/assessmentApi';
import type { FunctionalTestsPayload, SymptomRecord } from '@/api/endpoints/assessmentApi';

/**
 * The movement battery, driven by the served test catalogue.
 *
 * The coach picks the tests that suit this member instead of filling one fixed form: a chair
 * stand and a goblet squat are both valid ways to assess lower body, and the specification
 * asks for one framework with adaptive protocols rather than a different programme per age.
 *
 * Warm-up observation stays a fixed card because it is one standard set of observations
 * rather than a choice of protocol.
 */

// Domains whose tests come from the catalogue. Warm-up is handled separately.
const LIBRARY_DOMAINS = ['lower_body', 'upper_body', 'core', 'balance', 'mobility', 'cardiovascular', 'performance'];

interface AssessmentMovementStepProps {
  tests: FunctionalTestsPayload;
  setTests: React.Dispatch<React.SetStateAction<FunctionalTestsPayload>>;
  symptoms: Record<string, SymptomRecord>;
  setSymptoms: React.Dispatch<React.SetStateAction<Record<string, SymptomRecord>>>;
  onPrev: () => void;
  onNext: () => void;
}

export const AssessmentMovementStep: React.FC<AssessmentMovementStepProps> = ({
  tests,
  setTests,
  symptoms,
  setSymptoms,
  onPrev,
  onNext,
}) => {
  const [activeModalDomain, setActiveModalDomain] = useState<string | null>(null);

  const { data: library, isLoading } = useQuery({
    queryKey: ['assessment-test-library'],
    queryFn: () => assessmentApi.getTestLibrary(),
    staleTime: 30 * 60 * 1000, // the catalogue changes with a release, not during a session
  });

  const handleSymptomLogged = (sym: SymptomRecord) => {
    if (!activeModalDomain) return;
    setSymptoms((prev) => ({ ...prev, [activeModalDomain]: sym }));
  };

  const recordedFor = (domainKey: string): RecordedTest[] => {
    const section = (tests as Record<string, unknown>)[domainKey];
    if (Array.isArray(section)) return section as RecordedTest[];
    if (section && typeof section === 'object') {
      const assessed = (section as { assessed_tests?: RecordedTest[] }).assessed_tests;
      if (Array.isArray(assessed)) return assessed;
      // A legacy single-test block, kept so an assessment started before the catalogue
      // still opens with its data intact.
      if (Object.keys(section).length) return [section as RecordedTest];
    }
    return [];
  };

  const setRecordedFor = (domainKey: string, next: RecordedTest[]) => {
    setTests((prev) => ({ ...prev, [domainKey]: { assessed_tests: next } }));
  };

  const assessedCount = useMemo(
    () => LIBRARY_DOMAINS.filter((d) => recordedFor(d).some((t) => t.status && t.status !== 'NOT_ASSESSED')).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tests],
  );

  const domains = (library?.domains || []).filter((d) => LIBRARY_DOMAINS.includes(d.key));

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Step 4 of 6
            </span>
            <h2 className="text-lg font-bold text-foreground">Movement Tests</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pick the tests that suit this member. Record symptoms separately from performance.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Dumbbell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>
            {assessedCount}/{LIBRARY_DOMAINS.length} domains
            {library?.protocol_version ? ` · protocol v${library.protocol_version}` : ''}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Warm-up observation is a fixed set of observations, not a choice of protocol. */}
        <MovementBatteryExtras
          tests={tests}
          setTests={setTests}
          symptoms={symptoms}
          onLogSymptom={(domain) => setActiveModalDomain(domain)}
        />

        {isLoading && (
          <div className="p-6 rounded-xl bg-card border border-border text-center text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
            Loading the test catalogue…
          </div>
        )}

        {domains.map((domain) => (
          <TestLibraryPicker
            key={domain.key}
            domain={domain}
            protocolVersion={library?.protocol_version || '1.0'}
            recorded={recordedFor(domain.key)}
            onChange={(next) => setRecordedFor(domain.key, next)}
            onLogSymptom={() => setActiveModalDomain(domain.key)}
            hasSymptom={!!symptoms[domain.key]}
          />
        ))}
      </div>

      {activeModalDomain && (
        <SymptomLoggerModal
          isOpen={true}
          domainName={activeModalDomain.replace(/_/g, ' ').toUpperCase()}
          onClose={() => setActiveModalDomain(null)}
          onSaveSymptom={handleSymptomLogged}
        />
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={onPrev} className="text-xs text-muted-foreground gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Vitals</span>
        </Button>
        <Button onClick={onNext} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-6 h-10 gap-2">
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
