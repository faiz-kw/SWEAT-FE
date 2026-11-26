import React, { useState, useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { ClipboardCheck, ArrowLeftRight, TrendingUp, RefreshCw, AlertCircle, ClipboardList } from 'lucide-react';
import { AssessmentStudioWorkspace } from '@/components/assessment/AssessmentStudioWorkspace';
import { AssessmentRegister } from '@/components/assessment/AssessmentRegister';
import { ReassessmentComparisonView } from '@/components/assessment/reassessment/ReassessmentComparisonView';
import { IndividualProgressionCard } from '@/components/assessment/reassessment/IndividualProgressionCard';
import { assessmentApi, TestProgressionRecord } from '@/api/endpoints/assessmentApi';
import { PageHeader, PageBody } from '@/components/enterprise/Page';

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

  // One tab definition drives both the header control and the body, so a new tab cannot be
  // added to one and forgotten in the other.
  const TABS: Array<{ id: ActiveTab; label: string; icon: React.ElementType }> = [
    { id: 'register', label: 'All Assessments', icon: ClipboardList },
    { id: 'new', label: 'New Assessment', icon: ClipboardCheck },
    { id: 'reassessment', label: 'Reassessment', icon: ArrowLeftRight },
    { id: 'progressions', label: 'Progressions', icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-24">
      <PageHeader
        title="Assessments"
        description="Guided member assessments, intake to sign-off."
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card/80 p-1 overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        }
      />

      <PageBody className="space-y-6">
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
              <h2 className="text-base font-bold text-foreground">Section 14 Individual Exercise Progression Registry</h2>
              <p className="text-xs text-muted-foreground">
                Independent test progression targets, quality rubrics, and coach advancement authorizations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fetchProgressions()}
              disabled={loadingProgressions}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
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
            <div className="rounded-xl border border-border bg-card/40 p-8 text-center text-xs text-muted-foreground">
              Loading active exercise progressions...
            </div>
          )}

          {!loadingProgressions && progressions.length === 0 && !progressionsError && (
            <div className="rounded-xl border border-border bg-card/40 p-8 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">No Active Progressions Found</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
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
      </PageBody>
    </div>
  );
}
