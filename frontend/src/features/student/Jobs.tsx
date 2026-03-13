import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Briefcase, MapPin, Clock, Users, IndianRupee,
  CheckCircle, AlertCircle, XCircle, GraduationCap,
  CalendarDays, ArrowLeft, Building2, ExternalLink,
  Sparkles, BookOpen, ListChecks, Tag, ChevronRight,
} from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import EligibilityBadge from '@/components/shared/EligibilityBadge';
import SkillChip from '@/components/shared/SkillChip';
import { MOCK_JOBS, MOCK_MATCH_RESULTS } from '@/lib/mock-data';
import { useJobs, useApplyToJob } from '@/hooks/api';
import { cn } from '@/lib/utils';
import type { Job, EligibilityStatus } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMatchColor(score: number) {
  if (score >= 75) return { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', bar: 'bg-green-500' };
  if (score >= 50) return { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500' };
  return { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-400' };
}

function getCompanyInitialColor(name: string) {
  const colors = [
    'bg-violet-100 text-violet-700',
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-indigo-100 text-indigo-700',
    'bg-teal-100 text-teal-700',
    'bg-orange-100 text-orange-700',
  ];
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
  return colors[idx];
}

function formatCTC(min?: number | null, max?: number | null) {
  if (!min && !max) return null;
  if (min && max) return `₹${min}–${max} LPA`;
  if (min) return `₹${min}+ LPA`;
  return `Up to ₹${max} LPA`;
}

function daysAgo(date: string) {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Compact list card (left panel) ─────────────────────────────────────────

function JobListCard({
  job, matchScore, eligibility, selected, onClick,
}: {
  job: Job;
  matchScore?: number;
  eligibility?: EligibilityStatus;
  selected: boolean;
  onClick: () => void;
}) {
  const requiredSkills = job.jobSkills?.filter(s => s.type === 'REQUIRED') ?? [];
  const mc = matchScore !== undefined ? getMatchColor(matchScore) : null;
  const initColor = getCompanyInitialColor(job.company?.name ?? '');
  const ctc = formatCTC(job.ctcMin, job.ctcMax);
  const isNew = job.createdAt && (Date.now() - new Date(job.createdAt).getTime()) < 3 * 86400000;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-5 py-4 border-b border-border transition-all duration-150 hover:bg-gray-50 relative',
        selected ? 'bg-blue-50/60 border-l-[3px] border-l-brand-oxford' : 'border-l-[3px] border-l-transparent',
      )}
    >
      {/* Top row: company avatar + name + match score */}
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black', initColor)}>
          {(job.company?.name ?? 'C').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate leading-tight">{job.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{job.company?.name}</p>
            </div>
            {mc && matchScore !== undefined && (
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border flex-shrink-0', mc.bg, mc.text, mc.border)}>
                {matchScore}%
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2">
            {job.location && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="w-3 h-3 flex-shrink-0" />{job.location}
              </span>
            )}
            {job.jobType && (
              <span className="text-[11px] text-muted-foreground capitalize">
                {job.jobType.replace('_', ' ').toLowerCase()}
              </span>
            )}
            {ctc && <span className="text-[11px] font-semibold text-brand-oxford">{ctc}</span>}
          </div>

          {/* Skills row */}
          {requiredSkills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {requiredSkills.slice(0, 3).map(s => (
                <span key={s.skillId} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-md font-medium">
                  {s.skill?.name ?? s.skillId}
                </span>
              ))}
              {requiredSkills.length > 3 && (
                <span className="text-[10px] text-muted-foreground self-center">+{requiredSkills.length - 3}</span>
              )}
            </div>
          )}

          {/* Bottom row: eligibility + date + new badge */}
          <div className="flex items-center gap-2 mt-2">
            {eligibility && <EligibilityBadge status={eligibility} size="sm" />}
            <div className="ml-auto flex items-center gap-1.5">
              {isNew && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">NEW</span>
              )}
              {job.createdAt && (
                <span className="text-[10px] text-muted-foreground">{daysAgo(job.createdAt)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Full JD detail panel (right panel) ──────────────────────────────────────

function JobDetailPanel({
  job, matchScore, eligibility, onApply, onBack, applying,
}: {
  job: Job;
  matchScore?: number;
  eligibility?: EligibilityStatus;
  onApply: () => void;
  onBack?: () => void;
  applying: boolean;
}) {
  const requiredSkills = job.jobSkills?.filter(s => s.type === 'REQUIRED') ?? [];
  const preferredSkills = job.jobSkills?.filter(s => s.type === 'PREFERRED') ?? [];
  const mc = matchScore !== undefined ? getMatchColor(matchScore) : null;
  const initColor = getCompanyInitialColor(job.company?.name ?? '');
  const ctc = formatCTC(job.ctcMin, job.ctcMax);

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* Mobile back button */}
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground p-4 hover:text-foreground lg:hidden">
            <ArrowLeft className="w-4 h-4" /> Back to jobs
          </button>
        )}

        {/* ── Company + Job Header ── */}
        <div className="px-6 pt-6 pb-5 border-b border-border">
          <div className="flex items-start gap-4">
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-black', initColor)}>
              {(job.company?.name ?? 'C').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-black text-foreground leading-snug">{job.title}</h1>
              <p className="text-sm font-semibold text-brand-oxford mt-0.5">{job.company?.name}</p>
              {job.company?.industry && (
                <p className="text-xs text-muted-foreground mt-0.5">{job.company.industry}</p>
              )}
            </div>
            {mc && matchScore !== undefined && (
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className={cn('text-base font-black px-3 py-1 rounded-xl border', mc.bg, mc.text, mc.border)}>
                  {matchScore}% Match
                </span>
                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', mc.bar)} style={{ width: `${matchScore}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {job.location && (
              <MetaPill icon={MapPin}>{job.location}</MetaPill>
            )}
            {job.jobType && (
              <MetaPill icon={Briefcase}>
                {job.jobType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </MetaPill>
            )}
            {ctc && (
              <MetaPill icon={IndianRupee}>{ctc}</MetaPill>
            )}
            {job._count?.applications != null && (
              <MetaPill icon={Users}>{job._count.applications} applicants</MetaPill>
            )}
            {job.applicationDeadline && (
              <MetaPill icon={CalendarDays}>
                Deadline: {new Date(job.applicationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </MetaPill>
            )}
            {job.driveDate && (
              <MetaPill icon={CalendarDays} highlight>
                Drive: {new Date(job.driveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </MetaPill>
            )}
          </div>

          {/* Eligibility */}
          {eligibility && (
            <div className="mt-3">
              <EligibilityBadge status={eligibility} size="md" />
            </div>
          )}
        </div>

        {/* ── Eligibility Criteria ── */}
        {(job.minCgpa || job.maxBacklogs !== null || job.eligibleBranches?.length || job.allowedGraduationYears?.length) && (
          <Section icon={GraduationCap} title="Eligibility Criteria">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {job.minCgpa != null && (
                <CriteriaCard label="Min CGPA" value={String(job.minCgpa)} />
              )}
              {job.maxBacklogs != null && (
                <CriteriaCard label="Max Backlogs" value={String(job.maxBacklogs)} />
              )}
              {job.eligibleBranches?.length > 0 && (
                <CriteriaCard label="Eligible Branches" value={job.eligibleBranches.join(', ')} wide />
              )}
              {job.allowedGraduationYears?.length > 0 && (
                <CriteriaCard label="Graduation Year" value={job.allowedGraduationYears.join(', ')} />
              )}
            </div>
          </Section>
        )}

        {/* ── About the Role / JD ── */}
        {(job.description || (job as any).rawJdText) && (
          <Section icon={BookOpen} title="About the Role">
            <div className="text-sm text-muted-foreground leading-7 whitespace-pre-line">
              {(job as any).rawJdText || job.description}
            </div>
          </Section>
        )}

        {/* ── Responsibilities ── */}
        {job.responsibilities?.length > 0 && (
          <Section icon={ListChecks} title="Responsibilities">
            <ul className="space-y-2.5">
              {job.responsibilities.map((r, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-oxford mt-2 flex-shrink-0" />
                  <span className="leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ── Required Skills ── */}
        {requiredSkills.length > 0 && (
          <Section icon={Sparkles} title="Required Skills">
            <div className="flex flex-wrap gap-2">
              {requiredSkills.map(s => (
                <SkillChip key={s.skillId} name={s.skill?.name ?? s.skillId} variant="solid" size="md" />
              ))}
            </div>
          </Section>
        )}

        {/* ── Preferred Skills ── */}
        {preferredSkills.length > 0 && (
          <Section icon={Sparkles} title="Good to Have" subtitle="Preferred but not mandatory">
            <div className="flex flex-wrap gap-2">
              {preferredSkills.map(s => (
                <SkillChip key={s.skillId} name={s.skill?.name ?? s.skillId} variant="outline" size="md" />
              ))}
            </div>
          </Section>
        )}

        {/* ── Keywords / Tags ── */}
        {job.keywords?.length > 0 && (
          <Section icon={Tag} title="Keywords">
            <div className="flex flex-wrap gap-1.5">
              {job.keywords.map((k, i) => (
                <span key={i} className="text-xs text-muted-foreground bg-gray-100 px-2.5 py-1 rounded-lg">{k}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Bottom padding for sticky footer */}
        <div className="h-6" />
      </div>

      {/* ── Sticky Apply Footer ── */}
      <div className="flex-shrink-0 border-t border-border bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{job.title}</p>
            <p className="text-[11px] text-muted-foreground truncate">{job.company?.name}</p>
          </div>
          <button
            onClick={onApply}
            disabled={applying}
            className="flex items-center gap-2 bg-brand-oxford hover:bg-brand-oxford/90 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {applying ? 'Applying…' : 'Apply Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaPill({ icon: Icon, children, highlight }: { icon: React.ElementType; children: React.ReactNode; highlight?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border',
      highlight
        ? 'bg-brand-oxford/8 text-brand-oxford border-brand-oxford/20'
        : 'bg-gray-50 text-muted-foreground border-border',
    )}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {children}
    </span>
  );
}

function Section({ icon: Icon, title, subtitle, children }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-5 border-b border-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-brand-oxford/8 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-brand-oxford" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function CriteriaCard({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn('bg-gray-50 rounded-xl border border-border px-3 py-3', wide && 'col-span-2')}>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const FILTERS = ['All', 'High Match', 'Eligible', 'Internship', 'Full Time'];

export default function StudentJobs() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  const { data: liveJobs } = useJobs({ status: 'OPEN' });
  const applyMutation = useApplyToJob();

  const allJobs = liveJobs ?? MOCK_JOBS;

  const jobsWithMatch = allJobs.map(job => {
    const match = MOCK_MATCH_RESULTS.find(m => m.jobId === job.id);
    return { job, matchScore: match?.overallMatchPercentage, eligibility: match?.eligibilityStatus };
  });

  const filtered = jobsWithMatch.filter(({ job, matchScore, eligibility }) => {
    const q = search.toLowerCase();
    if (q && !job.title?.toLowerCase().includes(q) && !job.company?.name?.toLowerCase().includes(q)) return false;
    if (activeFilter === 'Internship') return job.jobType === 'INTERNSHIP';
    if (activeFilter === 'Full Time') return job.jobType === 'FULL_TIME';
    if (activeFilter === 'High Match') return (matchScore ?? 0) >= 75;
    if (activeFilter === 'Eligible') return eligibility === 'ELIGIBLE';
    return true;
  });

  // Auto-select first job on load / filter change
  useEffect(() => {
    if (filtered.length > 0 && !filtered.find(f => f.job.id === selectedJobId)) {
      setSelectedJobId(filtered[0].job.id);
    }
  }, [filtered.length, activeFilter, search]);

  const selectedEntry = filtered.find(f => f.job.id === selectedJobId) ?? filtered[0] ?? null;

  const handleSelectJob = (id: string) => {
    setSelectedJobId(id);
    setMobileView('detail');
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* ── Top bar (always visible) ── */}
      <div className="flex-shrink-0 pb-4 space-y-3">
        <div>
          <h1 className="text-xl font-black text-brand-oxford">Job Opportunities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} of {allJobs.length} positions · Select a job to view full details
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by job title or company..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-border bg-white outline-none focus:border-brand-oxford focus:ring-2 focus:ring-brand-oxford/10 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                'text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all',
                activeFilter === f
                  ? 'bg-brand-oxford text-white border-brand-oxford'
                  : 'bg-white text-muted-foreground border-border hover:border-brand-oxford/30',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Master-Detail layout ── */}
      {filtered.length === 0 ? (
        <EmptyState icon={Briefcase} title="No jobs found" description="Try a different search or filter." />
      ) : (
        <div className="flex-1 flex gap-4 min-h-0">

          {/* Left: Job list */}
          <div className={cn(
            'flex-shrink-0 w-full lg:w-[380px] bg-white rounded-2xl border border-border overflow-hidden flex flex-col',
            mobileView === 'detail' ? 'hidden lg:flex' : 'flex',
          )}>
            {/* List header */}
            <div className="px-5 py-3 border-b border-border bg-gray-50 flex-shrink-0">
              <p className="text-xs font-semibold text-muted-foreground">{filtered.length} results</p>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto divide-y-0">
              {filtered.map(({ job, matchScore, eligibility }) => (
                <JobListCard
                  key={job.id}
                  job={job}
                  matchScore={matchScore}
                  eligibility={eligibility as EligibilityStatus | undefined}
                  selected={job.id === selectedJobId}
                  onClick={() => handleSelectJob(job.id)}
                />
              ))}
            </div>
          </div>

          {/* Right: Detail panel */}
          <div className={cn(
            'flex-1 bg-white rounded-2xl border border-border overflow-hidden min-h-0',
            mobileView === 'list' ? 'hidden lg:block' : 'block',
          )}>
            {selectedEntry ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedEntry.job.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="h-full"
                >
                  <JobDetailPanel
                    job={selectedEntry.job}
                    matchScore={selectedEntry.matchScore}
                    eligibility={selectedEntry.eligibility as EligibilityStatus | undefined}
                    onApply={() => applyMutation.mutate(selectedEntry.job.id)}
                    onBack={() => setMobileView('list')}
                    applying={applyMutation.isPending}
                  />
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Select a job from the list
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
