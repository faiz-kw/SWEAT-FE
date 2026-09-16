import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package as PackageIcon,
  Plus,
  Layers,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  ShieldCheck,
  Tag,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { catalogApi } from '@/services/catalogApi';
import type { Package, Program, TermsDocument } from '@/types/catalog';

export const PackagesWorkspace: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'packages' | 'programs' | 'terms'>('packages');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isNewPackageOpen, setIsNewPackageOpen] = useState(false);
  const [isNewVersionOpen, setIsNewVersionOpen] = useState(false);
  const [isNewProgramOpen, setIsNewProgramOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  // Form states
  const [newPkgCode, setNewPkgCode] = useState('');
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgProgram, setNewPkgProgram] = useState('');

  const [newVerName, setNewVerName] = useState('');
  const [newVerDurationVal, setNewVerDurationVal] = useState(1);
  const [newVerDurationUnit, setNewVerDurationUnit] = useState('MONTH');
  const [newVerValidity, setNewVerValidity] = useState(30);

  const [newProgCode, setNewProgCode] = useState('');
  const [newProgName, setNewProgName] = useState('');
  const [newProgType, setNewProgType] = useState('MEMBERSHIP');

  // Queries
  const {
    data: packages = [],
    isLoading: isPackagesLoading,
    isError: isPackagesError,
    refetch: refetchPackages,
  } = useQuery({
    queryKey: ['packages'],
    queryFn: () => catalogApi.getPackages(),
  });

  const {
    data: programs = [],
    isLoading: isProgramsLoading,
    refetch: refetchPrograms,
  } = useQuery({
    queryKey: ['programs'],
    queryFn: () => catalogApi.getPrograms(),
  });

  const {
    data: termsDocs = [],
    isLoading: isTermsLoading,
  } = useQuery({
    queryKey: ['terms-documents'],
    queryFn: () => catalogApi.getTermsDocuments(),
  });

  // Mutations
  const createPackageMutation = useMutation({
    mutationFn: catalogApi.createPackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setIsNewPackageOpen(false);
      setNewPkgCode('');
      setNewPkgName('');
      setNewPkgProgram('');
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: ({ pkgId, payload }: { pkgId: string; payload: any }) =>
      catalogApi.createPackageVersion(pkgId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setIsNewVersionOpen(false);
      setSelectedPackage(null);
    },
  });

  const createProgramMutation = useMutation({
    mutationFn: catalogApi.createProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      setIsNewProgramOpen(false);
      setNewProgCode('');
      setNewProgName('');
    },
  });

  // Filtered packages
  const filteredPackages = packages.filter((pkg) => {
    const q = searchQuery.toLowerCase();
    return pkg.name.toLowerCase().includes(q) || pkg.code.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <PackageIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Catalog & Commercial Packages
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Manage commercial memberships, immutable published versions, programs, and legal policies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'packages' && (
            <button
              onClick={() => setIsNewPackageOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              New Package
            </button>
          )}
          {activeTab === 'programs' && (
            <button
              onClick={() => setIsNewProgramOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              New Program
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('packages')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'packages'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <PackageIcon className="w-4 h-4" />
          Packages ({packages.length})
        </button>
        <button
          onClick={() => setActiveTab('programs')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'programs'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Programs ({programs.length})
        </button>
        <button
          onClick={() => setActiveTab('terms')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            activeTab === 'terms'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Legal Terms & Policies ({termsDocs.length})
        </button>
      </div>

      {/* TAB 1: PACKAGES */}
      {activeTab === 'packages' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search packages by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Loading */}
          {isPackagesLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-slate-900/60 rounded-2xl border border-slate-800/80 animate-pulse p-5" />
              ))}
            </div>
          )}

          {/* Error */}
          {isPackagesError && (
            <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <p className="text-rose-200 font-medium">Failed to load packages from tenant database.</p>
              <button
                onClick={() => refetchPackages()}
                className="mt-3 px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isPackagesLoading && !isPackagesError && filteredPackages.length === 0 && (
            <div className="p-12 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
              <PackageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-200">No packages configured</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-5">
                Create commercial packages with immutable published versions, session allocations, and branch availability.
              </p>
              <button
                onClick={() => setIsNewPackageOpen(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-sm transition"
              >
                Create First Package
              </button>
            </div>
          )}

          {/* Cards Grid */}
          {!isPackagesLoading && !isPackagesError && filteredPackages.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {pkg.code}
                        </span>
                        <h3 className="text-lg font-bold text-white mt-1.5">{pkg.name}</h3>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          pkg.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {pkg.status}
                      </span>
                    </div>

                    {pkg.program_name && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Tag className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Program: {pkg.program_name}</span>
                      </div>
                    )}

                    {/* Active Version Info */}
                    {pkg.active_version ? (
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            Active Version: v{pkg.active_version.version_number}
                          </span>
                          <span className="text-slate-300 font-mono">
                            {pkg.active_version.duration_value} {pkg.active_version.duration_unit.toLowerCase()}(s)
                          </span>
                        </div>
                        {pkg.active_version.prices.length > 0 && (
                          <div className="text-sm font-bold text-emerald-400">
                            {pkg.active_version.prices[0].currency} {pkg.active_version.prices[0].total_price}
                            <span className="text-xs text-slate-500 font-normal ml-1">incl. tax</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span>No active version published yet (Draft state).</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      Version Immutability
                    </span>
                    <button
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setIsNewVersionOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                    >
                      New Version <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROGRAMS */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          {isProgramsLoading ? (
            <div className="p-8 text-center text-slate-400">Loading programs...</div>
          ) : programs.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
              <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-200">No programs registered</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-5">
                Programs group packages and classes (e.g. Strength, Pilates, Personal Training).
              </p>
              <button
                onClick={() => setIsNewProgramOpen(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl text-sm transition"
              >
                Create Program
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {programs.map((prog) => (
                <div key={prog.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">{prog.code}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                      {prog.program_type}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white">{prog.name}</h4>
                  {prog.description && <p className="text-xs text-slate-400">{prog.description}</p>}
                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-800/60">
                    {prog.packages_count ?? 0} packages linked
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TERMS & LEGAL */}
      {activeTab === 'terms' && (
        <div className="space-y-4">
          {isTermsLoading ? (
            <div className="p-8 text-center text-slate-400">Loading terms documents...</div>
          ) : termsDocs.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-200">No legal policies registered</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                Configure membership terms, attendance cancellation policies, and privacy notices.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {termsDocs.map((doc) => (
                <div key={doc.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">{doc.code}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                      {doc.document_type}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white">{doc.name}</h4>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs space-y-1">
                    <div className="text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Active Version: {doc.active_version ? `v${doc.active_version.version_number}` : 'None'}
                    </div>
                    <div className="text-slate-500">Total Versions: {doc.versions_count ?? 0}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: NEW PACKAGE */}
      {isNewPackageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Create New Package</h3>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Package Code</label>
                <input
                  type="text"
                  placeholder="e.g. GOLD-ANNUAL"
                  value={newPkgCode}
                  onChange={(e) => setNewPkgCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Package Name</label>
                <input
                  type="text"
                  placeholder="e.g. Gold Annual Membership"
                  value={newPkgName}
                  onChange={(e) => setNewPkgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Program (Optional)</label>
                <select
                  value={newPkgProgram}
                  onChange={(e) => setNewPkgProgram(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">No Program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsNewPackageOpen(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                disabled={!newPkgCode || !newPkgName || createPackageMutation.isPending}
                onClick={() =>
                  createPackageMutation.mutate({
                    code: newPkgCode,
                    name: newPkgName,
                    program: newPkgProgram || null,
                  })
                }
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-sm transition"
              >
                {createPackageMutation.isPending ? 'Saving...' : 'Create Package'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NEW VERSION */}
      {isNewVersionOpen && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div>
              <h3 className="text-lg font-bold text-white">Create New Package Version</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Target: <span className="font-mono text-emerald-400">{selectedPackage.name}</span>
              </p>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Version Name Snapshot</label>
                <input
                  type="text"
                  placeholder={selectedPackage.name}
                  value={newVerName}
                  onChange={(e) => setNewVerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Duration Value</label>
                  <input
                    type="number"
                    min={1}
                    value={newVerDurationVal}
                    onChange={(e) => setNewVerDurationVal(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Duration Unit</label>
                  <select
                    value={newVerDurationUnit}
                    onChange={(e) => setNewVerDurationUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="DAY">Day(s)</option>
                    <option value="WEEK">Week(s)</option>
                    <option value="MONTH">Month(s)</option>
                    <option value="YEAR">Year(s)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Validity (Days)</label>
                <input
                  type="number"
                  min={1}
                  value={newVerValidity}
                  onChange={(e) => setNewVerValidity(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsNewVersionOpen(false);
                  setSelectedPackage(null);
                }}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                disabled={createVersionMutation.isPending}
                onClick={() =>
                  createVersionMutation.mutate({
                    pkgId: selectedPackage.id,
                    payload: {
                      name_snapshot: newVerName || selectedPackage.name,
                      duration_value: newVerDurationVal,
                      duration_unit: newVerDurationUnit,
                      validity_days: newVerValidity,
                      status: 'DRAFT',
                    },
                  })
                }
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-sm transition"
              >
                {createVersionMutation.isPending ? 'Saving...' : 'Create Draft Version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NEW PROGRAM */}
      {isNewProgramOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Create New Program</h3>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Program Code</label>
                <input
                  type="text"
                  placeholder="e.g. STRENGTH"
                  value={newProgCode}
                  onChange={(e) => setNewProgCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Program Name</label>
                <input
                  type="text"
                  placeholder="e.g. Strength & Conditioning"
                  value={newProgName}
                  onChange={(e) => setNewProgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Program Type</label>
                <select
                  value={newProgType}
                  onChange={(e) => setNewProgType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="MEMBERSHIP">Membership</option>
                  <option value="FITNESS">Fitness</option>
                  <option value="PERSONAL_TRAINING">Personal Training</option>
                  <option value="PILATES">Pilates</option>
                  <option value="ONLINE">Online</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsNewProgramOpen(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                disabled={!newProgCode || !newProgName || createProgramMutation.isPending}
                onClick={() =>
                  createProgramMutation.mutate({
                    code: newProgCode,
                    name: newProgName,
                    program_type: newProgType,
                  })
                }
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-xl text-sm transition"
              >
                {createProgramMutation.isPending ? 'Saving...' : 'Create Program'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
