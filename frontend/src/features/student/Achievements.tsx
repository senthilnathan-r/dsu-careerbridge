import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Plus, Star, Code, Award, X, Loader2,
  CheckCircle2, XCircle, Github, ExternalLink, Briefcase, Medal,
  Users, FlaskConical, Mic2, Heart, AlertCircle,
} from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import {
  useStudentProfile,
  useAddAchievement, useDeleteAchievement,
  useAddProject, useDeleteProject,
  useAddCertification, useDeleteCertification,
} from '@/hooks/api';
import type { Achievement, Project, Certification, AchievementType } from '@/types';

// ─── Config ──────────────────────────────────────────────────────────────────

const ACHIEVEMENT_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  HACKATHON:       { icon: Code,         color: 'text-purple-600', bg: 'bg-purple-50',     label: 'Hackathon' },
  INTERNSHIP:      { icon: Briefcase,    color: 'text-blue-600',   bg: 'bg-blue-50',       label: 'Internship' },
  PROJECT:         { icon: Github,       color: 'text-gray-700',   bg: 'bg-gray-100',      label: 'Project' },
  RESEARCH_PAPER:  { icon: FlaskConical, color: 'text-teal-600',   bg: 'bg-teal-50',       label: 'Research Paper' },
  CERTIFICATION:   { icon: Award,        color: 'text-blue-600',   bg: 'bg-blue-50',       label: 'Certification' },
  CLUB_LEADERSHIP: { icon: Users,        color: 'text-indigo-600', bg: 'bg-indigo-50',     label: 'Club Leadership' },
  AWARD:           { icon: Medal,        color: 'text-amber-600',  bg: 'bg-amber-50',      label: 'Award' },
  WORKSHOP:        { icon: Mic2,         color: 'text-green-600',  bg: 'bg-green-50',      label: 'Workshop' },
  TECHNICAL_EVENT: { icon: Trophy,       color: 'text-amber-600',  bg: 'bg-amber-50',      label: 'Technical Event' },
  VOLUNTEERING:    { icon: Heart,        color: 'text-rose-500',   bg: 'bg-rose-50',       label: 'Volunteering' },
  OTHER:           { icon: Star,         color: 'text-gray-600',   bg: 'bg-gray-100',      label: 'Other' },
};

// What category to add
type AddCategory = 'achievement' | 'project' | 'certification';

const CATEGORY_TABS: { id: AddCategory; label: string; icon: React.ElementType }[] = [
  { id: 'achievement', label: 'Achievement', icon: Trophy },
  { id: 'project',     label: 'Project',     icon: Github },
  { id: 'certification', label: 'Certification', icon: Award },
];

// ─── GitHub Verification ──────────────────────────────────────────────────────

type GitHubStatus = 'idle' | 'verifying' | 'valid' | 'invalid';

function parseGitHubRepo(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.replace(/^\//, '').split('/');
    if (parts.length >= 2 && parts[0] && parts[1]) return `${parts[0]}/${parts[1]}`;
  } catch { /* not a URL */ }
  // Maybe they typed "owner/repo" directly
  const direct = url.trim().replace(/^github\.com\//, '');
  if (/^[\w.-]+\/[\w.-]+$/.test(direct)) return direct;
  return null;
}

function GitHubVerifier({
  url, onStatusChange,
}: { url: string; onStatusChange: (status: GitHubStatus, meta?: { stars: number; language: string; description: string }) => void }) {
  const [status, setStatus] = useState<GitHubStatus>('idle');
  const [meta, setMeta] = useState<{ stars: number; language: string; description: string } | null>(null);

  const verify = async () => {
    const repo = parseGitHubRepo(url);
    if (!repo) { setStatus('invalid'); onStatusChange('invalid'); return; }
    setStatus('verifying');
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}`);
      if (res.ok) {
        const data = await res.json();
        const m = { stars: data.stargazers_count, language: data.language ?? '', description: data.description ?? '' };
        setMeta(m);
        setStatus('valid');
        onStatusChange('valid', m);
      } else {
        setStatus('invalid');
        onStatusChange('invalid');
      }
    } catch {
      setStatus('invalid');
      onStatusChange('invalid');
    }
  };

  useEffect(() => {
    setStatus('idle');
    setMeta(null);
    onStatusChange('idle');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (!url.trim()) return null;

  return (
    <div className="mt-2 space-y-2">
      {status === 'idle' && (
        <button
          type="button"
          onClick={verify}
          className="flex items-center gap-1.5 text-xs font-semibold text-brand-oxford border border-brand-oxford/30 px-3 py-1.5 rounded-lg hover:bg-brand-oxford/5 transition-colors"
        >
          <Github className="w-3.5 h-3.5" /> Verify GitHub Repo
        </button>
      )}
      {status === 'verifying' && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying repository...
        </div>
      )}
      {status === 'valid' && meta && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-green-800">Repository verified</p>
            {meta.description && <p className="text-[11px] text-green-700 mt-0.5 leading-relaxed">{meta.description}</p>}
            <div className="flex gap-3 mt-1 text-[11px] text-green-700">
              {meta.language && <span>{meta.language}</span>}
              <span>★ {meta.stars}</span>
            </div>
          </div>
        </div>
      )}
      {status === 'invalid' && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <XCircle className="w-4 h-4 text-red-500" />
          <p className="text-xs text-red-700">Repository not found or is private</p>
        </div>
      )}
    </div>
  );
}

// ─── Add Modal ────────────────────────────────────────────────────────────────

interface AddModalProps { onClose: () => void }

function AddModal({ onClose }: AddModalProps) {
  const [category, setCategory] = useState<AddCategory>('achievement');

  // Achievement form
  const [achType, setAchType] = useState<AchievementType>('HACKATHON');
  const [achTitle, setAchTitle] = useState('');
  const [achOrg, setAchOrg] = useState('');
  const [achDesc, setAchDesc] = useState('');
  const [achPosition, setAchPosition] = useState('');
  const [achUrl, setAchUrl] = useState('');
  const [achStart, setAchStart] = useState('');
  const [achEnd, setAchEnd] = useState('');
  const [achOngoing, setAchOngoing] = useState(false);

  // Project form
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projRepo, setProjRepo] = useState('');
  const [projLive, setProjLive] = useState('');
  const [projTech, setProjTech] = useState('');
  const [projHighlights, setProjHighlights] = useState('');
  const [projStart, setProjStart] = useState('');
  const [projEnd, setProjEnd] = useState('');
  const [projOngoing, setProjOngoing] = useState(false);
  const [ghStatus, setGhStatus] = useState<GitHubStatus>('idle');

  // Certification form
  const [certName, setCertName] = useState('');
  const [certOrg, setCertOrg] = useState('');
  const [certIssueDate, setCertIssueDate] = useState('');
  const [certExpiry, setCertExpiry] = useState('');
  const [certId, setCertId] = useState('');
  const [certUrl, setCertUrl] = useState('');
  const [certDesc, setCertDesc] = useState('');

  const addAchievement = useAddAchievement();
  const addProject = useAddProject();
  const addCertification = useAddCertification();

  const isPending = addAchievement.isPending || addProject.isPending || addCertification.isPending;

  const handleSubmit = async () => {
    try {
      if (category === 'achievement') {
        await addAchievement.mutateAsync({
          type: achType,
          title: achTitle,
          description: achDesc || undefined,
          organization: achOrg || undefined,
          position: achPosition || undefined,
          url: achUrl || undefined,
          startDate: achStart || undefined,
          endDate: achOngoing ? undefined : (achEnd || undefined),
          isOngoing: achOngoing,
        });
      } else if (category === 'project') {
        const repoUrl = projRepo
          ? (projRepo.startsWith('http') ? projRepo : `https://github.com/${projRepo}`)
          : undefined;
        await addProject.mutateAsync({
          title: projTitle,
          description: projDesc,
          techStack: projTech ? projTech.split(',').map(s => s.trim()).filter(Boolean) : [],
          repoUrl,
          liveUrl: projLive || undefined,
          startDate: projStart || undefined,
          endDate: projOngoing ? undefined : (projEnd || undefined),
          isOngoing: projOngoing,
          highlights: projHighlights ? projHighlights.split('\n').map(s => s.trim()).filter(Boolean) : [],
        });
      } else {
        await addCertification.mutateAsync({
          name: certName,
          issuingOrganization: certOrg,
          issueDate: certIssueDate || undefined,
          expiryDate: certExpiry || undefined,
          credentialId: certId || undefined,
          credentialUrl: certUrl || undefined,
          description: certDesc || undefined,
        });
      }
      onClose();
    } catch { /* errors shown via toast if wired */ }
  };

  const canSubmit = (() => {
    if (category === 'achievement') return achTitle.trim().length > 0;
    if (category === 'project') return projTitle.trim().length > 0 && projDesc.trim().length > 0;
    return certName.trim().length > 0 && certOrg.trim().length > 0;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-black text-brand-oxford">Add to Profile</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-3 flex-shrink-0">
          {CATEGORY_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCategory(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all flex-1 justify-center',
                  category === tab.id
                    ? 'bg-brand-oxford text-white border-brand-oxford'
                    : 'bg-white text-muted-foreground border-border hover:border-brand-oxford/30',
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-4">

          {/* ── Achievement Form ── */}
          {category === 'achievement' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(ACHIEVEMENT_TYPE_CONFIG) as [AchievementType, typeof ACHIEVEMENT_TYPE_CONFIG[string]][])
                    .filter(([k]) => k !== 'PROJECT' && k !== 'CERTIFICATION')
                    .map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setAchType(key)}
                          className={cn(
                            'flex flex-col items-center gap-1 p-2.5 rounded-xl border text-[10px] font-semibold transition-all',
                            achType === key
                              ? 'border-brand-oxford bg-brand-oxford/5 text-brand-oxford'
                              : 'border-border text-muted-foreground hover:border-brand-oxford/30',
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {cfg.label}
                        </button>
                      );
                    })}
                </div>
              </div>

              <Field label="Title *" required>
                <input value={achTitle} onChange={e => setAchTitle(e.target.value)} placeholder={`e.g. ${ACHIEVEMENT_TYPE_CONFIG[achType]?.label} title`} />
              </Field>
              <Field label="Organization / Institution">
                <input value={achOrg} onChange={e => setAchOrg(e.target.value)} placeholder="e.g. IIT Bombay, Smart India Hackathon" />
              </Field>
              <Field label="Description">
                <textarea value={achDesc} onChange={e => setAchDesc(e.target.value)} rows={3} placeholder="Briefly describe this achievement..." />
              </Field>
              <Field label="Position / Result">
                <input value={achPosition} onChange={e => setAchPosition(e.target.value)} placeholder="e.g. Winner, Finalist, 1st Place" />
              </Field>
              <Field label="Link / URL">
                <input value={achUrl} onChange={e => setAchUrl(e.target.value)} placeholder="https://..." type="url" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date">
                  <input type="date" value={achStart} onChange={e => setAchStart(e.target.value)} />
                </Field>
                <Field label="End Date">
                  <input type="date" value={achEnd} onChange={e => setAchEnd(e.target.value)} disabled={achOngoing} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={achOngoing} onChange={e => setAchOngoing(e.target.checked)} className="rounded" />
                Currently ongoing
              </label>
            </>
          )}

          {/* ── Project Form ── */}
          {category === 'project' && (
            <>
              <Field label="Project Title *" required>
                <input value={projTitle} onChange={e => setProjTitle(e.target.value)} placeholder="e.g. AI Resume Builder" />
              </Field>
              <Field label="Description *" required>
                <textarea value={projDesc} onChange={e => setProjDesc(e.target.value)} rows={3} placeholder="What does this project do? What problem does it solve?" />
              </Field>
              <div>
                <Field label="GitHub Repository URL">
                  <input
                    value={projRepo}
                    onChange={e => { setProjRepo(e.target.value); setGhStatus('idle'); }}
                    placeholder="https://github.com/username/repo"
                    type="url"
                  />
                </Field>
                <GitHubVerifier url={projRepo} onStatusChange={(s) => setGhStatus(s)} />
              </div>
              <Field label="Live Demo URL">
                <input value={projLive} onChange={e => setProjLive(e.target.value)} placeholder="https://myproject.vercel.app" type="url" />
              </Field>
              <Field label="Tech Stack" hint="comma-separated">
                <input value={projTech} onChange={e => setProjTech(e.target.value)} placeholder="React, Node.js, PostgreSQL, OpenAI" />
              </Field>
              <Field label="Key Highlights" hint="one per line">
                <textarea value={projHighlights} onChange={e => setProjHighlights(e.target.value)} rows={3} placeholder={"Reduced latency by 40%\nHandled 1000+ concurrent users\nIntegrated 3 AI models"} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date">
                  <input type="date" value={projStart} onChange={e => setProjStart(e.target.value)} />
                </Field>
                <Field label="End Date">
                  <input type="date" value={projEnd} onChange={e => setProjEnd(e.target.value)} disabled={projOngoing} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={projOngoing} onChange={e => setProjOngoing(e.target.checked)} className="rounded" />
                Currently working on this
              </label>
            </>
          )}

          {/* ── Certification Form ── */}
          {category === 'certification' && (
            <>
              <Field label="Certification Name *" required>
                <input value={certName} onChange={e => setCertName(e.target.value)} placeholder="e.g. AWS Certified Cloud Practitioner" />
              </Field>
              <Field label="Issuing Organization *" required>
                <input value={certOrg} onChange={e => setCertOrg(e.target.value)} placeholder="e.g. Amazon Web Services, Coursera, Google" />
              </Field>
              <Field label="Description">
                <textarea value={certDesc} onChange={e => setCertDesc(e.target.value)} rows={2} placeholder="What skills does this certification validate?" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Issue Date">
                  <input type="date" value={certIssueDate} onChange={e => setCertIssueDate(e.target.value)} />
                </Field>
                <Field label="Expiry Date">
                  <input type="date" value={certExpiry} onChange={e => setCertExpiry(e.target.value)} />
                </Field>
              </div>
              <Field label="Credential ID">
                <input value={certId} onChange={e => setCertId(e.target.value)} placeholder="e.g. ABC-123-XYZ" />
              </Field>
              <Field label="Credential URL">
                <input value={certUrl} onChange={e => setCertUrl(e.target.value)} placeholder="https://www.credly.com/badges/..." type="url" />
              </Field>
            </>
          )}
        </div>

        {/* Unverified repo warning */}
        {category === 'project' && projRepo.trim() && ghStatus === 'idle' && (
          <div className="mx-6 mb-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">GitHub repo not verified yet — click "Verify GitHub Repo" above to confirm it's real.</p>
          </div>
        )}
        {category === 'project' && projRepo.trim() && ghStatus === 'invalid' && (
          <div className="mx-6 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700">Repo could not be verified. It may be private or the URL is incorrect. You can still save.</p>
          </div>
        )}
        {category === 'project' && projRepo.trim() && ghStatus === 'valid' && (
          <div className="mx-6 mb-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-green-700 font-semibold">GitHub repository verified successfully.</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 text-xs font-semibold border border-border text-muted-foreground py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold bg-brand-oxford text-white py-2.5 rounded-xl disabled:opacity-50 transition-opacity"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save {category === 'achievement' ? 'Achievement' : category === 'project' ? 'Project' : 'Certification'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactElement;
}) {
  const INPUT_CLS = 'w-full text-sm px-3.5 py-2.5 rounded-xl border border-border bg-white outline-none focus:border-brand-oxford transition-all resize-none';
  const child = children as React.ReactElement<{ className?: string }>;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-foreground">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {/* clone child and inject className */}
      {child.type === 'input' || child.type === 'textarea' || child.type === 'select'
        ? <child.type {...child.props} className={cn(INPUT_CLS, (child.props as any).disabled && 'opacity-40 cursor-not-allowed')} />
        : children}
    </div>
  );
}

// ─── Item Cards ───────────────────────────────────────────────────────────────

function AchievementCard({ item, onDelete }: { item: Achievement; onDelete: () => void }) {
  const cfg = ACHIEVEMENT_TYPE_CONFIG[item.type] ?? ACHIEVEMENT_TYPE_CONFIG.OTHER;
  const Icon = cfg.icon;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-border shadow-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
            <Icon className={cn('w-4 h-4', cfg.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.organization ?? cfg.label}</p>
          </div>
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-red-500 flex-shrink-0 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {item.description && <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{item.description}</p>}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        {item.position && <span className="text-[11px] font-bold text-amber-600">{item.position}</span>}
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-brand-oxford hover:underline ml-auto">
            <ExternalLink className="w-3 h-3" /> View
          </a>
        )}
        {(item.startDate ?? item.endDate) && !item.url && (
          <span className="text-[11px] text-muted-foreground ml-auto">
            {new Date(item.endDate ?? item.startDate!).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function ProjectCard({ item, onDelete }: { item: Project; onDelete: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-border shadow-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100">
            <Github className="w-4 h-4 text-gray-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">{item.title}</p>
            {item.techStack?.length > 0 && (
              <p className="text-xs text-muted-foreground">{item.techStack.slice(0, 4).join(' · ')}</p>
            )}
          </div>
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-red-500 flex-shrink-0 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-3 leading-relaxed line-clamp-2">{item.description}</p>
      {item.highlights?.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {item.highlights.slice(0, 2).map((h, i) => (
            <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
              <span className="text-brand-oxford">•</span>{h}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
        {item.repoUrl && (
          <a href={item.repoUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 hover:text-brand-oxford transition-colors">
            <Github className="w-3 h-3" /> GitHub
          </a>
        )}
        {item.liveUrl && (
          <a href={item.liveUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold text-brand-oxford hover:underline">
            <ExternalLink className="w-3 h-3" /> Live
          </a>
        )}
        {item.isOngoing && <span className="text-[11px] text-green-600 font-semibold ml-auto">Ongoing</span>}
      </div>
    </motion.div>
  );
}

function CertificationCard({ item, onDelete }: { item: Certification; onDelete: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-border shadow-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50">
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.issuingOrganization}</p>
          </div>
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-red-500 flex-shrink-0 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {item.description && <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{item.description}</p>}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
        {item.issueDate && (
          <span className="text-[11px] text-muted-foreground">
            Issued {new Date(item.issueDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
          </span>
        )}
        {item.credentialUrl && (
          <a href={item.credentialUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold text-brand-oxford hover:underline ml-auto">
            <ExternalLink className="w-3 h-3" /> Verify
          </a>
        )}
      </div>
    </motion.div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-sm font-black text-brand-oxford">{title}</h2>
      <span className="text-[11px] font-semibold text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentAchievements() {
  const [showModal, setShowModal] = useState(false);
  const { data: profile } = useStudentProfile();
  const deleteAchievement = useDeleteAchievement();
  const deleteProject = useDeleteProject();
  const deleteCertification = useDeleteCertification();

  const achievements = profile?.achievements ?? [];
  const projects = profile?.projects ?? [];
  const certifications = profile?.certifications ?? [];
  const total = achievements.length + projects.length + certifications.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-brand-oxford">Achievements & Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Hackathons, projects, certifications, and more</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-brand-oxford text-white px-3.5 py-2 rounded-xl hover:bg-brand-oxford/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: total },
          { label: 'Projects', value: projects.length },
          { label: 'Certifications', value: certifications.length },
          { label: 'Awards', value: achievements.filter(a => ['AWARD', 'HACKATHON', 'TECHNICAL_EVENT'].includes(a.type)).length },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-border shadow-card p-4 text-center">
            <p className="text-2xl font-black text-brand-oxford">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {total === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Nothing added yet"
          description="Add your hackathons, projects, certifications, and awards to boost your profile."
        />
      ) : (
        <div className="space-y-8">
          {/* Projects section */}
          {projects.length > 0 && (
            <div className="space-y-3">
              <SectionHeader title="Projects" count={projects.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map(p => (
                  <ProjectCard key={p.id} item={p} onDelete={() => deleteProject.mutate(p.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Certifications section */}
          {certifications.length > 0 && (
            <div className="space-y-3">
              <SectionHeader title="Certifications" count={certifications.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {certifications.map(c => (
                  <CertificationCard key={c.id} item={c} onDelete={() => deleteCertification.mutate(c.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Achievements section */}
          {achievements.length > 0 && (
            <div className="space-y-3">
              <SectionHeader title="Achievements" count={achievements.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {achievements.map(a => (
                  <AchievementCard key={a.id} item={a} onDelete={() => deleteAchievement.mutate(a.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && <AddModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </div>
  );
}
