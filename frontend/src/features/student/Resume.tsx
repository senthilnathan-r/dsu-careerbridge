import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, Sparkles, Wand2, Target, Download, Eye,
  Loader2, CheckCircle, XCircle, Star, StarOff, Trash2, X,
  AlertTriangle, ChevronDown, Plus,
} from 'lucide-react';
import SectionCard from '@/components/shared/SectionCard';
import UploadDropzone from '@/components/shared/UploadDropzone';
import StepWizard from '@/components/shared/StepWizard';
import SkillChip from '@/components/shared/SkillChip';
import {
  useStudentResumes, useUploadResume, useGenerateResume,
  useEnhanceResume, useTailorResume, useSetMasterResume, useDeleteResume,
  useJobs,
} from '@/hooks/api';
import type { Resume } from '@/types';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type Flow = null | 'upload' | 'generate' | 'enhance' | 'tailor';

// ─── Constants ───────────────────────────────────────────────────────────────

const AI_FLOWS = [
  {
    id: 'upload' as const,
    icon: Upload,
    title: 'Upload & Parse',
    description: 'Upload your existing resume. AI extracts skills, projects, and experience automatically.',
    color: 'border-blue-200 hover:border-blue-400',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    badge: 'Parse',
  },
  {
    id: 'generate' as const,
    icon: Sparkles,
    title: 'Generate from Profile',
    description: 'AI builds a polished resume from your profile data, skills, projects, and achievements.',
    color: 'border-brand-oxford/20 hover:border-brand-oxford',
    iconBg: 'bg-brand-oxford/8',
    iconColor: 'text-brand-oxford',
    badge: 'AI',
  },
  {
    id: 'enhance' as const,
    icon: Wand2,
    title: 'Enhance Existing',
    description: 'AI rewrites bullet points to be more impactful with stronger action verbs and metrics.',
    color: 'border-purple-200 hover:border-purple-400',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    badge: 'Enhance',
  },
  {
    id: 'tailor' as const,
    icon: Target,
    title: 'Tailor to JD',
    description: 'Select a job and AI customizes your resume to match the job description precisely.',
    color: 'border-green-200 hover:border-green-400',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    badge: 'Tailor',
  },
];

const UPLOAD_STEPS = ['Upload File', 'AI Parsing', 'Review Skills', 'Done'];
const GENERATE_STEPS = ['Configure', 'AI Generates', 'Done'];
const ENHANCE_STEPS = ['Select Resume', 'AI Enhancing', 'Review', 'Done'];
const TAILOR_STEPS = ['Select Job', 'AI Tailoring', 'Done'];

const TYPE_CONFIG: Record<Resume['type'], { label: string; color: string; bg: string }> = {
  UPLOADED:  { label: 'Uploaded',  color: 'text-blue-700',   bg: 'bg-blue-50'   },
  GENERATED: { label: 'Generated', color: 'text-brand-oxford', bg: 'bg-brand-oxford/8' },
  ENHANCED:  { label: 'Enhanced',  color: 'text-purple-700', bg: 'bg-purple-50'  },
  TAILORED:  { label: 'Tailored',  color: 'text-green-700',  bg: 'bg-green-50'   },
};

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  const isAiError = message.toLowerCase().includes('openai') ||
    message.toLowerCase().includes('api key') ||
    message.toLowerCase().includes('ai');

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
      {isAiError
        ? <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      }
      <div>
        <p className="text-sm font-semibold text-red-800">
          {isAiError ? 'AI service unavailable' : 'Something went wrong'}
        </p>
        <p className="text-xs text-red-600 mt-0.5">
          {isAiError
            ? 'The OpenAI API key is not configured. Contact your administrator to enable AI features.'
            : message}
        </p>
      </div>
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ resume, onClose }: { resume: Resume; onClose: () => void }) {
  const handlePrint = useCallback(() => {
    if (!resume.htmlContent) return;
    const blob = new Blob([resume.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.addEventListener('load', () => {
        win.print();
        URL.revokeObjectURL(url);
      });
    }
  }, [resume.htmlContent]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border flex-shrink-0">
        <div>
          <p className="text-sm font-bold text-foreground">{resume.title}</p>
          <p className="text-xs text-muted-foreground">{TYPE_CONFIG[resume.type].label} Resume</p>
        </div>
        <div className="flex items-center gap-2">
          {resume.htmlContent && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-oxford px-3 py-1.5 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-gray-100">
        {resume.htmlContent ? (
          <iframe
            srcDoc={resume.htmlContent}
            className="w-full h-full border-0"
            title="Resume Preview"
            sandbox="allow-same-origin"
          />
        ) : resume.extractedText ? (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-xl p-8 shadow-sm">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {resume.extractedText}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No preview available for this resume.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Upload Flow ──────────────────────────────────────────────────────────────

function UploadFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Resume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadMutation = useUploadResume();

  const handleParse = () => {
    if (!file) return;
    setStep(1);
    setError(null);
    uploadMutation.mutate(file, {
      onSuccess: (data) => { setResult(data); setStep(2); },
      onError: (err: any) => {
        setError(err?.response?.data?.message ?? err?.message ?? 'Upload failed.');
        setStep(0);
      },
    });
  };

  const extractedSkills: string[] = Array.isArray(result?.extractedSkills)
    ? result.extractedSkills
    : typeof result?.extractedSkills === 'object' && result?.extractedSkills !== null
      ? Object.values(result.extractedSkills).flat() as string[]
      : [];

  return (
    <div className="space-y-5">
      <StepWizard steps={UPLOAD_STEPS.map(l => ({ label: l }))} current={step} />

      {step === 0 && (
        <div className="space-y-4">
          <UploadDropzone onFile={setFile} hint="PDF, DOCX · Max 5MB" />
          {error && <ErrorBanner message={error} />}
          <button
            disabled={!file || uploadMutation.isPending}
            onClick={handleParse}
            className="w-full bg-brand-oxford text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
          >
            {uploadMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</>
              : <><Upload className="w-4 h-4" /> Parse Resume with AI</>}
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col items-center py-10 gap-3">
          <Loader2 className="w-8 h-8 text-brand-oxford animate-spin" />
          <p className="text-sm font-semibold text-foreground">Parsing resume with AI...</p>
          <p className="text-xs text-muted-foreground">Extracting skills, experience, and education</p>
        </div>
      )}

      {step === 2 && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <p className="text-sm font-semibold">
              {extractedSkills.length > 0
                ? `${extractedSkills.length} skills extracted from your resume`
                : 'Resume parsed successfully'}
            </p>
          </div>
          {extractedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {extractedSkills.map((s: string) => (
                <SkillChip key={s} name={s} variant="matched" />
              ))}
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Resume saved as: <span className="text-brand-oxford">{result.title}</span></p>
            <p>Type: Uploaded · Version {result.version}</p>
          </div>
          <button
            onClick={() => setStep(3)}
            className="w-full bg-brand-oxford text-white text-sm font-semibold py-3 rounded-xl"
          >
            Done — View in Saved Resumes
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center py-8 gap-2">
          <CheckCircle className="w-10 h-10 text-green-500" />
          <p className="text-sm font-semibold text-foreground">Resume uploaded successfully!</p>
          <button onClick={onClose} className="mt-1 text-xs font-semibold text-brand-oxford hover:underline">
            Close
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Generate Flow ────────────────────────────────────────────────────────────

function GenerateFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [targetRole, setTargetRole] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [result, setResult] = useState<Resume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);
  const generateMutation = useGenerateResume();

  const handleGenerate = () => {
    setStep(1);
    setError(null);
    generateMutation.mutate(
      { targetRole: targetRole.trim() || undefined, additionalNotes: additionalNotes.trim() || undefined },
      {
        onSuccess: (data) => { setResult(data); setStep(2); },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? err?.message ?? 'Generation failed.';
          setError(msg);
          setStep(0);
        },
      }
    );
  };

  return (
    <>
      <div className="space-y-5">
        <StepWizard steps={GENERATE_STEPS.map(l => ({ label: l }))} current={step} />

        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              AI will build a polished resume from your profile, skills, projects, and achievements.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Target Role <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  placeholder="e.g. Software Engineer, Data Analyst..."
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-border bg-white outline-none focus:border-brand-oxford focus:ring-2 focus:ring-brand-oxford/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Additional Notes <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={e => setAdditionalNotes(e.target.value)}
                  rows={3}
                  placeholder="Emphasize internship experience, highlight leadership roles..."
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-border bg-white outline-none focus:border-brand-oxford focus:ring-2 focus:ring-brand-oxford/10 transition-all resize-none"
                />
              </div>
            </div>
            {error && <ErrorBanner message={error} />}
            <button
              onClick={handleGenerate}
              className="w-full bg-brand-oxford text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Generate with AI
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col items-center py-10 gap-3">
            <Loader2 className="w-8 h-8 text-brand-oxford animate-spin" />
            <p className="text-sm font-semibold text-foreground">Generating your resume...</p>
            <p className="text-xs text-muted-foreground">Building from your profile data and skills</p>
          </div>
        )}

        {step === 2 && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <p className="text-sm font-semibold">Resume generated successfully!</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">{result.title}</p>
              <p>AI-generated · Version {result.version}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPreviewResume(result)}
                className="flex-1 border border-brand-oxford/30 text-brand-oxford text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-brand-oxford text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {previewResume && (
          <PreviewModal resume={previewResume} onClose={() => setPreviewResume(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Enhance Flow ─────────────────────────────────────────────────────────────

function EnhanceFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [result, setResult] = useState<Resume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);
  const { data: resumes = [] } = useStudentResumes();
  const enhanceMutation = useEnhanceResume();

  const eligibleResumes = resumes.filter(r => r.type === 'UPLOADED' || r.type === 'GENERATED');

  const handleEnhance = () => {
    if (!selectedId) return;
    setStep(1);
    setError(null);
    enhanceMutation.mutate(selectedId, {
      onSuccess: (data) => { setResult(data); setStep(2); },
      onError: (err: any) => {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Enhancement failed.';
        setError(msg);
        setStep(0);
      },
    });
  };

  // Parse enhancement notes from backend
  const notes: string[] = (() => {
    if (!result?.enhancementNotes) return [];
    const n = result.enhancementNotes;
    if (Array.isArray(n)) return n as string[];
    if (typeof n === 'object') {
      const vals = Object.values(n).flat();
      return vals.filter(v => typeof v === 'string') as string[];
    }
    return [];
  })();

  return (
    <>
      <div className="space-y-5">
        <StepWizard steps={ENHANCE_STEPS.map(l => ({ label: l }))} current={step} />

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Select Resume to Enhance</label>
              {eligibleResumes.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No uploaded or generated resumes found. Upload a resume first.
                </div>
              ) : (
                <div className="space-y-2">
                  {eligibleResumes.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        'w-full text-left p-3 rounded-xl border-2 transition-all',
                        selectedId === r.id
                          ? 'border-purple-400 bg-purple-50'
                          : 'border-border hover:border-purple-200'
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_CONFIG[r.type].label} · v{r.version} · {new Date(r.updatedAt).toLocaleDateString('en-IN')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {error && <ErrorBanner message={error} />}
            <button
              disabled={!selectedId || eligibleResumes.length === 0}
              onClick={handleEnhance}
              className="w-full bg-purple-600 text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Wand2 className="w-4 h-4" /> Enhance with AI
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col items-center py-10 gap-3">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            <p className="text-sm font-semibold text-foreground">Enhancing your resume...</p>
            <p className="text-xs text-muted-foreground">Rewriting bullet points with stronger action verbs</p>
          </div>
        )}

        {step === 2 && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <p className="text-sm font-semibold">Resume enhanced successfully!</p>
            </div>
            {notes.length > 0 && (
              <div className="bg-purple-50 rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-bold text-purple-800 mb-2">Improvements made:</p>
                {notes.map((n, i) => (
                  <p key={i} className="text-xs text-purple-700 flex items-start gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {n}
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setPreviewResume(result)}
                className="flex-1 border border-purple-300 text-purple-700 text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-purple-600 text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {previewResume && (
          <PreviewModal resume={previewResume} onClose={() => setPreviewResume(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Tailor Flow ──────────────────────────────────────────────────────────────

function TailorFlow({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [showJobDrop, setShowJobDrop] = useState(false);
  const [showResumeDrop, setShowResumeDrop] = useState(false);
  const [result, setResult] = useState<Resume | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);
  const { data: jobs = [] } = useJobs({ status: 'OPEN' });
  const { data: resumes = [] } = useStudentResumes();
  const tailorMutation = useTailorResume();

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const selectedResume = resumes.find(r => r.id === selectedResumeId);

  const handleTailor = () => {
    if (!selectedJobId) return;
    setStep(1);
    setError(null);
    tailorMutation.mutate(
      { jobId: selectedJobId, resumeId: selectedResumeId || undefined },
      {
        onSuccess: (data) => { setResult(data); setStep(2); },
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? err?.message ?? 'Tailoring failed.';
          setError(msg);
          setStep(0);
        },
      }
    );
  };

  return (
    <>
      <div className="space-y-5">
        <StepWizard steps={TAILOR_STEPS.map(l => ({ label: l }))} current={step} />

        {step === 0 && (
          <div className="space-y-4">
            {/* Job picker */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Select Job *</label>
              <div className="relative">
                <button
                  onClick={() => { setShowJobDrop(p => !p); setShowResumeDrop(false); }}
                  className="w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm hover:border-green-400 transition-all"
                >
                  <span className={selectedJob ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                    {selectedJob ? selectedJob.title : 'Choose a job position...'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
                {showJobDrop && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-white border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {jobs.length === 0 ? (
                      <p className="text-sm text-muted-foreground px-3.5 py-3">No open jobs available.</p>
                    ) : (
                      jobs.map(j => (
                        <button
                          key={j.id}
                          onClick={() => { setSelectedJobId(j.id); setShowJobDrop(false); }}
                          className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-gray-50 border-b border-border last:border-0"
                        >
                          <p className="font-semibold text-foreground">{j.title}</p>
                          <p className="text-xs text-muted-foreground">{(j as any).company?.name ?? 'Company'}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Resume picker (optional) */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Base Resume <span className="font-normal text-muted-foreground">(optional — uses master if not set)</span>
              </label>
              <div className="relative">
                <button
                  onClick={() => { setShowResumeDrop(p => !p); setShowJobDrop(false); }}
                  className="w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl border border-border bg-white text-sm hover:border-green-400 transition-all"
                >
                  <span className={selectedResume ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                    {selectedResume ? selectedResume.title : 'Auto-select master resume...'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
                {showResumeDrop && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-white border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    <button
                      onClick={() => { setSelectedResumeId(''); setShowResumeDrop(false); }}
                      className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-gray-50 border-b border-border text-muted-foreground"
                    >
                      Auto-select master resume
                    </button>
                    {resumes.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { setSelectedResumeId(r.id); setShowResumeDrop(false); }}
                        className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-gray-50 border-b border-border last:border-0"
                      >
                        <p className="font-semibold text-foreground">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{TYPE_CONFIG[r.type].label}{r.isMaster ? ' · Master' : ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && <ErrorBanner message={error} />}

            <button
              disabled={!selectedJobId}
              onClick={handleTailor}
              className="w-full bg-green-600 text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Target className="w-4 h-4" /> Tailor Resume with AI
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col items-center py-10 gap-3">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
            <p className="text-sm font-semibold text-foreground">Tailoring resume to job...</p>
            <p className="text-xs text-muted-foreground">Analyzing JD keywords and rewriting content</p>
          </div>
        )}

        {step === 2 && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <p className="text-sm font-semibold">Resume tailored to {selectedJob?.title ?? 'the job'}!</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">{result.title}</p>
              <p>Tailored · Version {result.version} · Saved to your resumes</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPreviewResume(result)}
                className="flex-1 border border-green-300 text-green-700 text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {previewResume && (
          <PreviewModal resume={previewResume} onClose={() => setPreviewResume(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Resume Card ──────────────────────────────────────────────────────────────

function ResumeCard({
  resume,
  index,
  onPreview,
}: {
  resume: Resume;
  index: number;
  onPreview: (r: Resume) => void;
}) {
  const setMasterMutation = useSetMasterResume();
  const deleteMutation = useDeleteResume();
  const cfg = TYPE_CONFIG[resume.type];

  const handleDownload = () => {
    if (!resume.htmlContent) return;
    const blob = new Blob([resume.htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.addEventListener('load', () => {
        win.print();
        URL.revokeObjectURL(url);
      });
    }
  };

  const hasContent = !!(resume.htmlContent || resume.extractedText);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn(
        'flex items-center gap-3 p-3.5 rounded-xl border transition-all',
        resume.isMaster
          ? 'bg-brand-oxford/5 border-brand-oxford/30'
          : 'bg-gray-50/80 border-border hover:border-brand-oxford/20'
      )}
    >
      <div className="w-9 h-9 rounded-lg bg-brand-oxford/8 flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-brand-oxford" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground truncate">{resume.title}</p>
          {resume.isMaster && (
            <span className="text-xs font-bold text-brand-oxford bg-brand-oxford/10 px-1.5 py-0.5 rounded-full">
              Master
            </span>
          )}
          <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-full', cfg.color, cfg.bg)}>
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          v{resume.version} · {new Date(resume.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {/* Set master */}
        {!resume.isMaster && (
          <button
            onClick={() => setMasterMutation.mutate(resume.id)}
            disabled={setMasterMutation.isPending}
            title="Set as master resume"
            className="p-1.5 rounded-lg hover:bg-brand-oxford/10 text-muted-foreground hover:text-brand-oxford transition-colors"
          >
            <StarOff className="w-3.5 h-3.5" />
          </button>
        )}
        {resume.isMaster && (
          <span title="Master resume" className="p-1.5">
            <Star className="w-3.5 h-3.5 text-brand-oxford fill-brand-oxford" />
          </span>
        )}

        {/* Preview */}
        <button
          onClick={() => onPreview(resume)}
          disabled={!hasContent}
          title={hasContent ? 'Preview' : 'No preview available'}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {/* Download PDF */}
        <button
          onClick={handleDownload}
          disabled={!resume.htmlContent}
          title={resume.htmlContent ? 'Download PDF' : 'No PDF available for uploaded resumes'}
          className="p-1.5 rounded-lg hover:bg-brand-oxford/10 text-brand-oxford transition-colors disabled:opacity-30"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        <button
          onClick={() => {
            if (window.confirm('Delete this resume? This cannot be undone.')) {
              deleteMutation.mutate(resume.id);
            }
          }}
          disabled={deleteMutation.isPending}
          title="Delete resume"
          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentResume() {
  const [activeFlow, setActiveFlow] = useState<Flow>(null);
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);
  const { data: resumes = [], isLoading } = useStudentResumes();

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-black text-brand-oxford">Resume Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Build, enhance, and tailor your resume with AI</p>
        </div>

        {/* AI Flow cards */}
        <SectionCard title="AI Resume Tools" icon={Sparkles}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AI_FLOWS.map(flow => (
              <button
                key={flow.id}
                onClick={() => setActiveFlow(flow.id)}
                className={cn(
                  'text-left p-4 rounded-xl border-2 transition-all hover:shadow-sm',
                  activeFlow === flow.id ? 'border-brand-oxford bg-brand-oxford/5' : flow.color,
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', flow.iconBg)}>
                    <flow.icon className={cn('w-4 h-4', flow.iconColor)} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{flow.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{flow.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Active flow wizard */}
        <AnimatePresence mode="wait">
          {activeFlow && (
            <motion.div
              key={activeFlow}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <SectionCard
                title={AI_FLOWS.find(f => f.id === activeFlow)?.title ?? ''}
                action={
                  <button
                    onClick={() => setActiveFlow(null)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                }
              >
                {activeFlow === 'upload'   && <UploadFlow   onClose={() => setActiveFlow(null)} />}
                {activeFlow === 'generate' && <GenerateFlow onClose={() => setActiveFlow(null)} />}
                {activeFlow === 'enhance'  && <EnhanceFlow  onClose={() => setActiveFlow(null)} />}
                {activeFlow === 'tailor'   && <TailorFlow   onClose={() => setActiveFlow(null)} />}
              </SectionCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved resumes */}
        <SectionCard
          title={`Saved Resumes${resumes.length > 0 ? ` (${resumes.length})` : ''}`}
          action={
            <button
              onClick={() => setActiveFlow('upload')}
              className="text-xs font-semibold text-brand-oxford flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Upload New
            </button>
          }
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-brand-oxford" />
            </div>
          ) : resumes.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-semibold text-muted-foreground">No resumes yet</p>
              <p className="text-xs text-muted-foreground">Upload your resume or generate one with AI</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {resumes.map((r, i) => (
                <ResumeCard key={r.id} resume={r} index={i} onPreview={setPreviewResume} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Global preview modal */}
      <AnimatePresence>
        {previewResume && (
          <PreviewModal resume={previewResume} onClose={() => setPreviewResume(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
