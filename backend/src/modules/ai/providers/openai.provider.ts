import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  IAIProvider,
  ParsedResumeContent,
  ExtractedSkill,
  ParsedJobDescription,
  ResumeGenerationInput,
  GeneratedResume,
  EnhancedResume,
  TailoredResume,
} from '../interfaces/ai-provider.interface';
import { RESUME_TEMPLATE_HTML } from '../templates/resume.template';

@Injectable()
export class OpenAIProvider implements IAIProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly embeddingModel: string;
  private readonly logger = new Logger('OpenAIProvider');

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('app.openai.apiKey'),
    });
    this.model = this.configService.get<string>('app.openai.model', 'gpt-4o');
    this.embeddingModel = this.configService.get<string>('app.openai.embeddingModel', 'text-embedding-3-small');
  }

  private async chat(systemPrompt: string, userContent: string, temperature = 0.2): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature,
        response_format: { type: 'json_object' },
        max_tokens: this.configService.get<number>('app.openai.maxTokens', 4096),
      });
      return response.choices[0]?.message?.content || '{}';
    } catch (error) {
      this.logger.error('OpenAI API error:', error.message);
      throw error;
    }
  }

  async parseResume(rawText: string): Promise<ParsedResumeContent> {
    const system = `You are an expert resume parser. Extract structured information from the resume text.
Return a JSON object with these fields:
- summary (string): professional summary if present
- contactInfo: { name, email, phone, linkedin, github, portfolio }
- education: array of { institution, degree, field, cgpa, year }
- experience: array of { company, role, duration, description, bullets[] }
- projects: array of { title, description, techStack[], bullets[] }
- skills: array of strings
- certifications: array of { name, issuer, year }
- achievements: array of strings
Return ONLY valid JSON.`;

    const result = await this.chat(system, `Parse this resume:\n\n${rawText}`);
    return JSON.parse(result) as ParsedResumeContent;
  }

  async extractSkillsFromText(text: string, context: string): Promise<ExtractedSkill[]> {
    const system = `You are an expert technical skills extractor for campus placement systems.

Extract ALL skills from the provided text. This includes:
1. EXPLICIT skills: directly mentioned technologies, tools, languages
2. INFERRED skills: skills implied by project descriptions, certifications, or work
3. DERIVED skills: logical derivations (e.g., "built REST API" => REST API development, HTTP, API design)

For each skill return:
- name: canonical normalized skill name
- rawName: exactly as found in text
- confidence: "HIGH" (explicit), "MEDIUM" (inferred), "LOW" (weak inference)
- category: one of [PROGRAMMING_LANGUAGE, FRAMEWORK_LIBRARY, DATABASE, CLOUD_DEVOPS, AI_ML, DATA_ANALYTICS, CS_FUNDAMENTALS, SOFT_SKILLS, DOMAIN_SKILLS, TOOLS_PLATFORMS, OTHER]
- source: "explicit" or "inferred"
- inferenceReason: (only for inferred) brief explanation
- aliases: common aliases/alternate names

Return JSON: { "skills": [...] }`;

    const result = await this.chat(system, `Context: ${context}\n\nText to analyze:\n${text}`);
    const parsed = JSON.parse(result);
    return parsed.skills || [];
  }

  async parseJobDescription(rawText: string): Promise<ParsedJobDescription> {
    const system = `You are an expert at parsing campus placement job descriptions for Indian universities.

Extract structured information from the JD. Return JSON with:
- jobTitle (string)
- company (string)
- location (string)
- jobType: "FULL_TIME" | "INTERNSHIP" | "CONTRACT" | "PART_TIME"
- ctcMin (number in LPA, null if not mentioned)
- ctcMax (number in LPA, null if not mentioned)
- ctcCurrency: "INR"
- experienceLevel: "fresher" (default for campus)
- eligibleBranches: array of strings (e.g. ["CSE", "ISE", "AI&DS"])
- minCgpa (number, e.g. 7.5)
- maxBacklogs (number, e.g. 0)
- allowedGraduationYears: array of numbers
- requiredSkills: array of technical/domain skill strings
- preferredSkills: array of optional technical skill strings
- softSkills: array of interpersonal/behavioral skill strings (e.g. ["Communication", "Teamwork", "Leadership", "Problem Solving", "Time Management"])
- responsibilities: array of strings
- keywords: array of important keywords
- additionalNotes: string

Return ONLY valid JSON.`;

    const result = await this.chat(system, `Parse this JD:\n\n${rawText}`);
    return JSON.parse(result) as ParsedJobDescription;
  }

  async generateResume(input: ResumeGenerationInput): Promise<GeneratedResume> {
    const system = `You are an expert resume writer specializing in ATS-optimized resumes for freshers and campus placement.

Given student profile data, generate a professional resume. Rules:
- Use action-oriented bullet points (start with strong verbs)
- Be truthful — only use provided information
- Optimize for ATS systems
- Follow reverse chronological order
- Include quantified achievements where possible
- Keep summary concise (3-4 lines)

Return JSON:
{
  "summary": "Professional summary text",
  "sections": [
    {
      "type": "education|experience|projects|skills|certifications|achievements",
      "title": "Section Title",
      "content": <structured content for section>,
      "order": 1
    }
  ],
  "atsKeywords": ["keyword1", "keyword2"]
}`;

    const userContent = JSON.stringify(input, null, 2);
    const result = await this.chat(system, `Generate resume for:\n${userContent}`, 0.4);
    const parsed = JSON.parse(result) as GeneratedResume;
    const sp = input.studentProfile;
    const name = [sp.firstName, sp.lastName].filter(Boolean).join(' ') || 'Student';
    const contactParts = [sp.email, sp.phone, sp.linkedinUrl, sp.githubUrl].filter(Boolean);
    parsed.htmlContent = RESUME_TEMPLATE_HTML({ ...parsed, name, contactLine: contactParts.join(' | ') });
    return parsed;
  }

  async enhanceResume(parsedContent: ParsedResumeContent, rawText: string): Promise<EnhancedResume> {
    const system = `You are an expert resume enhancement specialist for campus placements.

Analyze the resume and:
1. Identify weak/passive bullet points and rewrite them with action verbs + impact
2. Identify missing standard sections
3. Infer skills from project/experience descriptions
4. Improve the professional summary
5. NEVER fabricate experiences or skills not implied by provided content
6. Label inferred skills clearly

Return JSON:
{
  "originalContent": <the parsed resume>,
  "improvedSummary": "Enhanced summary",
  "improvedBullets": [{ "original": "...", "improved": "...", "section": "projects|experience" }],
  "missingSections": ["Certifications", "GitHub Projects"],
  "suggestedSkills": [{ "name": "...", "rawName": "...", "confidence": "MEDIUM", "category": "...", "source": "inferred", "inferenceReason": "..." }],
  "enhancementNotes": ["Note 1", "Note 2"],
  "htmlContent": ""
}`;

    const result = await this.chat(
      system,
      `Parsed resume: ${JSON.stringify(parsedContent)}\n\nRaw text: ${rawText.substring(0, 3000)}`,
      0.4,
    );
    const enhanced = JSON.parse(result) as EnhancedResume;
    // Build sections from improved bullets grouped by section type
    const sectionMap: Record<string, string[]> = {};
    for (const b of enhanced.improvedBullets || []) {
      const key = b.section || 'experience';
      if (!sectionMap[key]) sectionMap[key] = [];
      sectionMap[key].push(b.improved);
    }
    const enhancedSections = Object.entries(sectionMap).map(([type, bullets], i) => ({
      type,
      title: type.charAt(0).toUpperCase() + type.slice(1),
      content: bullets,
      order: i + 1,
    }));
    const contactInfo = (parsedContent as any)?.contactInfo || {};
    enhanced.htmlContent = RESUME_TEMPLATE_HTML({
      summary: enhanced.improvedSummary,
      sections: enhancedSections.length ? enhancedSections : [],
      name: contactInfo.name || '',
      contactLine: [contactInfo.email, contactInfo.phone, contactInfo.linkedin, contactInfo.github]
        .filter(Boolean).join(' | '),
    });
    return enhanced;
  }

  async tailorResumeToJob(
    studentData: Record<string, any>,
    jobDescription: ParsedJobDescription,
    rawJdText: string,
  ): Promise<TailoredResume> {
    const system = `You are an expert at tailoring resumes to specific job descriptions for campus placements.

Given student profile + parsed JD, create a tailored resume that:
1. Leads with most relevant skills/projects for this specific role
2. Adjusts summary to target this role
3. Prioritizes relevant experience/projects
4. Highlights matching skills truthfully
5. Improves ATS match for the JD keywords
6. NEVER fabricate or exaggerate — only reorganize and reframe existing truths
7. Assign relevanceScore (0-100) to each section

Return JSON:
{
  "jobTitle": "Target job title",
  "targetedSummary": "Role-specific summary",
  "prioritizedSections": [
    { "type": "...", "title": "...", "content": {...}, "order": 1, "relevanceScore": 85 }
  ],
  "highlightedSkills": ["skill1", "skill2"],
  "tailoringNotes": ["Note explaining key changes"],
  "htmlContent": ""
}`;

    const result = await this.chat(
      system,
      `Student data: ${JSON.stringify(studentData)}\n\nJob Description: ${JSON.stringify(jobDescription)}\n\nRaw JD: ${rawJdText.substring(0, 2000)}`,
      0.5,
    );
    const tailored = JSON.parse(result) as TailoredResume;

    // Extract student name/contact from whichever studentData shape was passed
    const prof = studentData.profile;
    const ci = studentData.structuredContent?.contactInfo;
    const name = prof
      ? [prof.firstName, prof.lastName].filter(Boolean).join(' ')
      : ci?.name || '';
    const contactLine = prof
      ? [prof.linkedinUrl, prof.githubUrl, prof.phone].filter(Boolean).join(' | ')
      : [ci?.email, ci?.phone, ci?.linkedin, ci?.github].filter(Boolean).join(' | ');

    tailored.htmlContent = RESUME_TEMPLATE_HTML({
      summary: tailored.targetedSummary,
      sections: tailored.prioritizedSections || [],
      name,
      contactLine,
    });
    return tailored;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text.substring(0, 8000), // max tokens
    });
    return response.data[0].embedding;
  }

  async normalizeSkillName(rawSkillName: string): Promise<string> {
    // First try deterministic normalization
    const normalized = SKILL_NORMALIZATIONS[rawSkillName.toLowerCase().trim()];
    if (normalized) return normalized;

    // Fall back to LLM
    const system = `You are a skill name normalizer. Given a raw skill name, return the canonical normalized version.
Examples: "JS" => "JavaScript", "Postgres" => "PostgreSQL", "Node" => "Node.js", "ML" => "Machine Learning"
Return ONLY the canonical name as JSON: { "canonical": "..." }`;

    const result = await this.chat(system, `Normalize: "${rawSkillName}"`);
    const parsed = JSON.parse(result);
    return parsed.canonical || rawSkillName;
  }
}

// Deterministic skill normalization table (fast path before LLM)
const SKILL_NORMALIZATIONS: Record<string, string> = {
  'js': 'JavaScript',
  'javascript': 'JavaScript',
  'ts': 'TypeScript',
  'typescript': 'TypeScript',
  'node': 'Node.js',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'react': 'React.js',
  'reactjs': 'React.js',
  'react.js': 'React.js',
  'next': 'Next.js',
  'nextjs': 'Next.js',
  'vue': 'Vue.js',
  'vuejs': 'Vue.js',
  'python': 'Python',
  'java': 'Java',
  'c++': 'C++',
  'cpp': 'C++',
  'golang': 'Go',
  'go': 'Go',
  'rust': 'Rust',
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'mysql': 'MySQL',
  'mongodb': 'MongoDB',
  'mongo': 'MongoDB',
  'redis': 'Redis',
  'aws': 'AWS',
  'gcp': 'Google Cloud Platform',
  'azure': 'Microsoft Azure',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',
  'ml': 'Machine Learning',
  'ai': 'Artificial Intelligence',
  'dl': 'Deep Learning',
  'nlp': 'Natural Language Processing',
  'cv': 'Computer Vision',
  'sql': 'SQL',
  'nosql': 'NoSQL',
  'rest': 'REST API',
  'graphql': 'GraphQL',
  'git': 'Git',
  'github': 'GitHub',
  'gitlab': 'GitLab',
  'linux': 'Linux',
  'html': 'HTML',
  'css': 'CSS',
  'sass': 'Sass',
  'tailwind': 'Tailwind CSS',
  'express': 'Express.js',
  'expressjs': 'Express.js',
  'fastapi': 'FastAPI',
  'django': 'Django',
  'flask': 'Flask',
  'spring': 'Spring Boot',
  'springboot': 'Spring Boot',
  'tensorflow': 'TensorFlow',
  'pytorch': 'PyTorch',
  'pandas': 'Pandas',
  'numpy': 'NumPy',
  'sklearn': 'scikit-learn',
  'scikit-learn': 'scikit-learn',
};
