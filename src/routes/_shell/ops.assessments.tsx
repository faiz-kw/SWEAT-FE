import React, { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ClipboardCheck, ArrowLeftRight, TrendingUp, RefreshCw, AlertCircle, ClipboardList } from 'lucide-react';
import { AssessmentStudioWorkspace } from '@/components/assessment/AssessmentStudioWorkspace';
import { AssessmentRegister } from '@/components/assessment/AssessmentRegister';
import { ReassessmentComparisonView } from '@/components/assessment/reassessment/ReassessmentComparisonView';
import { IndividualProgressionCard } from '@/components/assessment/reassessment/IndividualProgressionCard';
import { assessmentApi, TestProgressionRecord } from '@/api/endpoints/assessmentApi';

export const Route = createFileRoute('/_shell/ops/assessments')({
  head: () => ({
    meta: [
      { title: 'Assessments & Transformation Studio · SWEAT' },
      { name: 'description', content: 'Dual-device Assessment & Transformation Studio in SWEAT operating system.' },
      { property: 'og:title', content: 'Assessments & Transformation Studio · SWEAT' },
      { property: 'og:description', content: 'Dual-device Assessment & Transformation Studio in SWEAT operating system.' },
    ],
  }),
  component: AssessmentOpsPage,
});

type ActiveTab = 'register' | 'new' | 'reassessment' | 'progressions';

function AssessmentOpsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('register');
  const [progressions, setProgressions] = useState<TestProgressionRecord[]>([]);
  const [loadingProgressions, setLoadingProgressions] = useState(false);
  const [progressionsError, setProgressionsError] = useState<string | null>(null);

  const fetchProgressions = async () => {
    setLoadingProgressions(true);
    setProgressionsError(null);
    try {
      const data = await assessmentApi.getTestProgressions();
      setProgressions(data);
    } catch {
      setProgressionsError('Failed to load active test progressions.');
    } finally {
      setLoadingProgressions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'progressions') {
      void fetchProgressions();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Assessment & Transformation Hub
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Standardized 17-section assessment battery, safety screening, like-for-like reassessments & progression tracking.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === 'register'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>All Assessments</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === 'new'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <ClipboardCheck className="h-4 w-4" />
            <span>New Assessment</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reassessment')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === 'reassessment'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>Reassessment Comparison</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('progressions')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === 'progressions'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Active Progressions</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'register' && (
        <AssessmentRegister
          onNew={() => setActiveTab('new')}
          onOpen={() => setActiveTab('new')}
        />
      )}

      {activeTab === 'new' && <AssessmentStudioWorkspace />}

      {activeTab === 'reassessment' && <ReassessmentComparisonView />}

      {activeTab === 'progressions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Section 14 Individual Exercise Progression Registry</h2>
              <p className="text-xs text-zinc-400">
                Independent test progression targets, quality rubrics, and coach advancement authorizations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchProgressions()}
              disabled={loadingProgressions}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingProgressions ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {progressionsError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
              {progressionsError}
            </div>
          )}

          {loadingProgressions && progressions.length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-xs text-zinc-400">
              Loading active exercise progressions...
            </div>
          )}

          {!loadingProgressions && progressions.length === 0 && !progressionsError && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-zinc-500" />
              <h3 className="mt-3 text-sm font-semibold text-white">No Active Progressions Found</h3>
              <p className="mt-1 text-xs text-zinc-400 max-w-sm mx-auto">
                Individual exercise progression targets are established upon completing and approving a member functional assessment.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {progressions.map((prog) => (
              <IndividualProgressionCard
                key={prog.id}
                progression={prog}
                onApproved={(updated) => {
                  setProgressions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
