import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus, Calendar, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { assessmentApi, ReassessmentComparison } from '@/api/endpoints/assessmentApi';
import { NonEquivalentProtocolWarning } from './NonEquivalentProtocolWarning';

interface ReassessmentComparisonViewProps {
  assessmentId?: string;
}

export const ReassessmentComparisonView: React.FC<ReassessmentComparisonViewProps> = ({
  assessmentId: initialAssessmentId,
}) => {
  const [assessmentId, setAssessmentId] = useState<string>(initialAssessmentId || '');
  const [data, setData] = useState<ReassessmentComparison | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComparison = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await assessmentApi.getComparison(id.trim());
      setData(res);
    } catch {
      setError('Failed to load comparison data. Please ensure the assessment ID is valid and has a previous baseline.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialAssessmentId) {
      setAssessmentId(initialAssessmentId);
      void fetchComparison(initialAssessmentId);
    }
  }, [initialAssessmentId, fetchComparison]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchComparison(assessmentId);
  };

  const renderDelta = (delta?: number | null, unit = '') => {
    if (delta == null) return <span className="text-muted-foreground">—</span>;
    if (delta > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="h-3.5 w-3.5" /> +{delta} {unit}
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 font-semibold text-destructive">
          <TrendingDown className="h-3.5 w-3.5" /> {delta} {unit}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-muted-foreground">
        <Minus className="h-3.5 w-3.5" /> 0 {unit}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ArrowLeftRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Longitudinal Reassessment Comparison
          </h2>
          <p className="text-xs text-muted-foreground">
            Section 15 like-for-like biomechanical comparison against established baseline assessment.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter Assessment ID..."
            value={assessmentId}
            onChange={(e) => setAssessmentId(e.target.value)}
            className="w-48 sm:w-64 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !assessmentId.trim()}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-foreground transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? 'Comparing...' : 'Compare'}
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          {error}
        </div>
      )}

      {data && !data.has_baseline && (
        <div className="rounded-xl border border-border bg-card/40 p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-amber-600 dark:text-amber-400" />
          <h3 className="mt-3 text-sm font-semibold text-foreground">Baseline Assessment</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            This record serves as the initial member baseline. No previous assessment is linked for direct longitudinal comparison.
          </p>
        </div>
      )}

      {data && data.has_baseline && (
        <div className="space-y-6">
          {/* Comparison Dates Metadata */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-background/70 p-4 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Baseline Assessment:</span>
              <strong className="text-foreground">{data.previous_date || 'Previous Session'}</strong>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-muted-foreground">Current Reassessment:</span>
              <strong className="text-emerald-300">{data.current_date || 'Current Session'}</strong>
            </div>
          </div>

          {/* Vitals Comparison Section */}
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Vitals & Body Composition Deltas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-muted-foreground">
                <thead className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="pb-2">Metric</th>
                    <th className="pb-2">Baseline</th>
                    <th className="pb-2">Current</th>
                    <th className="pb-2">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {Object.entries(data.vitals_comparison).map(([metric, val]) => (
                    <tr key={metric} className="hover:bg-muted/30">
                      <td className="py-2.5 font-medium text-foreground capitalize">{metric.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 text-muted-foreground">{val.previous != null ? val.previous : '—'}</td>
                      <td className="py-2.5 text-foreground font-semibold">{val.current != null ? val.current : '—'}</td>
                      <td className="py-2.5">{renderDelta(val.delta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Movement Battery Like-For-Like Comparison */}
          <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Movement Battery & Protocol Progression</h3>
            <div className="space-y-4">
              {data.movement_comparisons.map((item) => (
                <div
                  key={`${item.domain}-${item.test_title}`}
                  className="rounded-lg border border-border/80 bg-background/60 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        {item.domain}
                      </span>
                      <h4 className="text-sm font-bold text-foreground">{item.test_title}</h4>
                    </div>

                    {item.non_equivalent_comparison ? (
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/20">
                        Variation Advanced
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Like-for-Like
                      </span>
                    )}
                  </div>

                  {item.non_equivalent_comparison ? (
                    <NonEquivalentProtocolWarning
                      testTitle={item.test_title}
                      previousVariation={item.previous_variation}
                      currentVariation={item.current_variation}
                      comparisonNote={item.comparison_note}
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs pt-1">
                      <div className="rounded-md bg-card/80 p-2.5">
                        <span className="text-[10px] text-muted-foreground uppercase">Baseline Reps</span>
                        <p className="text-sm font-semibold text-foreground">{item.previous_reps ?? '—'}</p>
                      </div>
                      <div className="rounded-md bg-card/80 p-2.5">
                        <span className="text-[10px] text-muted-foreground uppercase">Current Reps</span>
                        <p className="text-sm font-semibold text-foreground">{item.current_reps ?? '—'}</p>
                      </div>
                      <div className="rounded-md bg-card/80 p-2.5">
                        <span className="text-[10px] text-muted-foreground uppercase">Reps Delta</span>
                        <p className="text-sm font-semibold">{renderDelta(item.reps_delta, 'reps')}</p>
                      </div>
                      <div className="rounded-md bg-card/80 p-2.5">
                        <span className="text-[10px] text-muted-foreground uppercase">Quality</span>
                        <p className="text-xs font-medium text-muted-foreground truncate">
                          {item.current_quality || 'Evaluated'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Capability Matrix Comparison */}
          {Object.keys(data.capability_comparison).length > 0 && (
            <div className="rounded-xl border border-border bg-card/60 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Domain Capability Level Evolution</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(data.capability_comparison).map(([domain, caps]) => (
                  <div key={domain} className="rounded-lg border border-border bg-background p-3 text-xs">
                    <span className="font-medium capitalize text-muted-foreground">{domain.replace(/_/g, ' ')}</span>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{caps.previous}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{caps.current}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
