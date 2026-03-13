/**
 * React Query hooks mapped to every backend endpoint.
 * - All GET endpoints use useQuery with staleTime defaults
 * - All mutations (POST/PUT/PATCH/DELETE) use useMutation with cache invalidation
 * - Falls back gracefully when backend is unreachable (demo mode)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api';
import type {
  StudentProfile, Job, Application, Resume, MatchResult,
  Achievement, Project, Certification, Company, AnalyticsOverview,
} from '@/types';

// ─── Query Keys ────────────────────────────────────────────────────────────────
export const QK = {
  me: ['auth', 'me'] as const,
  studentProfile: ['student', 'profile'] as const,
  studentApplications: ['student', 'applications'] as const,
  studentResumes: ['student', 'resumes'] as const,
  jobs: (params?: Record<string, unknown>) => ['jobs', params] as const,
  job: (id: string) => ['jobs', id] as const,
  jobMatches: (jobId: string) => ['jobs', jobId, 'matches'] as const,
  jobShortlist: (jobId: string) => ['jobs', jobId, 'shortlist'] as const,
  matchResults: (jobId: string) => ['matching', jobId, 'results'] as const,
  companies: ['companies'] as const,
  company: (id: string) => ['companies', id] as const,
  adminAnalytics: ['admin', 'analytics'] as const,
  adminStudents: ['admin', 'students'] as const,
  adminJobs: ['admin', 'jobs'] as const,
  adminCompanies: ['admin', 'companies'] as const,
};

const STALE_30S = 30_000;
const STALE_1M = 60_000;
const STALE_5M = 5 * 60_000;

// ─── Auth ───────────────────────────────────────────────────────────────────────
export function useMe() {
  return useQuery({
    queryKey: QK.me,
    queryFn: () => apiGet<{ id: string; email: string; role: string }>('/auth/me'),
    staleTime: STALE_5M,
    retry: 1,
  });
}

// ─── Student ────────────────────────────────────────────────────────────────────
export function useStudentProfile() {
  return useQuery({
    queryKey: QK.studentProfile,
    queryFn: () => apiGet<StudentProfile>('/students/me'),
    staleTime: STALE_1M,
    retry: 1,
  });
}

export function useUpdateStudentProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<StudentProfile>) => apiPatch<StudentProfile>('/students/me', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentProfile }),
  });
}

export function useStudentApplications() {
  return useQuery({
    queryKey: QK.studentApplications,
    queryFn: () => apiGet<Application[]>('/students/me/applications'),
    staleTime: STALE_30S,
    retry: 1,
  });
}

export function useApplyToJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => apiPost<Application>(`/students/me/applications/${jobId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentApplications }),
  });
}

export function useWithdrawApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => apiDelete<void>(`/students/me/applications/${applicationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentApplications }),
  });
}

// Achievements
export function useAddAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Achievement>) => apiPost<Achievement>('/students/me/achievements', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentProfile }),
  });
}

export function useUpdateAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Achievement> }) =>
      apiPatch<Achievement>(`/students/me/achievements/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentProfile }),
  });
}

export function useDeleteAchievement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/students/me/achievements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentProfile }),
  });
}

// Projects
export function useAddProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project>) => apiPost<Project>('/students/me/projects', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentProfile }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      apiPatch<Project>(`/students/me/projects/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentProfile }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/students/me/projects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentProfile }),
  });
}

// Certifications
export function useAddCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Certification>) => apiPost<Certification>('/students/me/certifications', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentProfile }),
  });
}

export function useUpdateCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Certification> }) =>
      apiPatch<Certification>(`/students/me/certifications/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentProfile }),
  });
}

export function useDeleteCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/students/me/certifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentProfile }),
  });
}

// ─── Resumes ────────────────────────────────────────────────────────────────────
export function useStudentResumes() {
  return useQuery({
    queryKey: QK.studentResumes,
    queryFn: () => apiGet<Resume[]>('/students/me/resume'),
    staleTime: STALE_1M,
    retry: 1,
  });
}

export function useUploadResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return apiPost<Resume>('/students/me/resume/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentResumes }),
  });
}

export function useGenerateResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params?: { targetRole?: string; additionalNotes?: string }) =>
      apiPost<Resume>('/students/me/resume/generate', params ?? {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentResumes }),
  });
}

export function useSetMasterResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resumeId: string) => apiPut<Resume>(`/students/me/resume/${resumeId}/set-master`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentResumes }),
  });
}

export function useDeleteResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resumeId: string) => apiDelete<void>(`/students/me/resume/${resumeId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentResumes }),
  });
}

export function useEnhanceResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (resumeId: string) => apiPost<Resume>(`/students/me/resume/${resumeId}/enhance`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentResumes }),
  });
}

export function useTailorResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, resumeId }: { jobId: string; resumeId?: string }) =>
      apiPost<Resume>(`/students/me/resume/tailor/${jobId}`, resumeId ? { resumeId } : undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.studentResumes }),
  });
}

// ─── Jobs ───────────────────────────────────────────────────────────────────────
export function useJobs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: QK.jobs(params),
    queryFn: () => apiGet<Job[]>('/jobs', { params }),
    staleTime: STALE_1M,
    retry: 1,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: QK.job(id),
    queryFn: () => apiGet<Job>(`/jobs/${id}`),
    enabled: !!id,
    staleTime: STALE_5M,
    retry: 1,
  });
}

export function useJobMatches(jobId: string) {
  return useQuery({
    queryKey: QK.jobMatches(jobId),
    queryFn: () => apiGet<MatchResult[]>(`/jobs/${jobId}/matches`),
    enabled: !!jobId,
    staleTime: STALE_1M,
    retry: 1,
  });
}

export function useJobShortlist(jobId: string) {
  return useQuery({
    queryKey: QK.jobShortlist(jobId),
    queryFn: () => apiGet<MatchResult[]>(`/jobs/${jobId}/shortlist`),
    enabled: !!jobId,
    staleTime: STALE_1M,
    retry: 1,
  });
}

export function useParseJD() {
  return useMutation({
    mutationFn: ({ jobId, text }: { jobId: string; text: string }) =>
      apiPost<Partial<Job>>(`/jobs/${jobId}/parse-jd/text`, { text }),
  });
}

export interface ParsedJDPreview {
  jobTitle?: string; location?: string; jobType?: string;
  ctcMin?: number; ctcMax?: number; minCgpa?: number; maxBacklogs?: number;
  eligibleBranches?: string[]; allowedGraduationYears?: number[];
  requiredSkills?: string[]; preferredSkills?: string[]; softSkills?: string[];
  responsibilities?: string[]; keywords?: string[];
}

export function usePreviewParseJD() {
  return useMutation({
    mutationFn: (rawText: string) =>
      apiPost<{ parsedData: ParsedJDPreview }>('/jobs/parse-jd/preview', { rawText }),
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Job>) => apiPost<Job>('/jobs', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.jobs() });
      qc.invalidateQueries({ queryKey: QK.adminJobs });
    },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Job> }) => apiPatch<Job>(`/jobs/${id}`, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QK.job(id) });
      qc.invalidateQueries({ queryKey: QK.jobs() });
      qc.invalidateQueries({ queryKey: QK.adminJobs });
    },
  });
}

// ─── Matching ────────────────────────────────────────────────────────────────────
export function useMatchResults(jobId: string) {
  return useQuery({
    queryKey: QK.matchResults(jobId),
    queryFn: () => apiGet<MatchResult[]>(`/matching/jobs/${jobId}/results`),
    enabled: !!jobId,
    staleTime: STALE_1M,
    retry: 1,
  });
}

export function useRunMatching() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => apiPost<{ processed: number }>(`/matching/jobs/${jobId}/run`),
    onSuccess: (_, jobId) => {
      qc.invalidateQueries({ queryKey: QK.matchResults(jobId) });
      qc.invalidateQueries({ queryKey: QK.jobMatches(jobId) });
    },
  });
}

export function useGenerateShortlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, topN }: { jobId: string; topN?: number }) =>
      apiPost<MatchResult[]>(`/matching/jobs/${jobId}/shortlist/generate`, { topN }),
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: QK.jobShortlist(jobId) });
    },
  });
}

// ─── Companies ──────────────────────────────────────────────────────────────────
export function useCompanies() {
  return useQuery({
    queryKey: QK.companies,
    queryFn: () => apiGet<Company[]>('/companies'),
    staleTime: STALE_5M,
    retry: 1,
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: QK.company(id),
    queryFn: () => apiGet<Company>(`/companies/${id}`),
    enabled: !!id,
    staleTime: STALE_5M,
    retry: 1,
  });
}

// ─── Admin ───────────────────────────────────────────────────────────────────────
export function useAdminAnalytics() {
  return useQuery({
    queryKey: QK.adminAnalytics,
    queryFn: () => apiGet<AnalyticsOverview>('/admin/analytics/overview'),
    staleTime: STALE_1M,
    retry: 1,
  });
}

export function useAdminStudents(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...QK.adminStudents, params],
    queryFn: () => apiGet<StudentProfile[]>('/admin/students', { params }),
    staleTime: STALE_1M,
    retry: 1,
  });
}

export function useAdminJobs() {
  return useQuery({
    queryKey: QK.adminJobs,
    queryFn: () => apiGet<Job[]>('/admin/jobs'),
    staleTime: STALE_1M,
    retry: 1,
  });
}

export function useAdminCompanies() {
  return useQuery({
    queryKey: QK.adminCompanies,
    queryFn: () => apiGet<Company[]>('/admin/companies'),
    staleTime: STALE_5M,
    retry: 1,
  });
}

export function useAdminRunMatching() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => apiPost<{ processed: number }>(`/admin/jobs/${jobId}/run-matching`),
    onSuccess: (_, jobId) => {
      qc.invalidateQueries({ queryKey: QK.matchResults(jobId) });
      qc.invalidateQueries({ queryKey: QK.jobMatches(jobId) });
    },
  });
}
