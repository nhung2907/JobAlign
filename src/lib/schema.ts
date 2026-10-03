import { z } from "zod";

/* ---------------------------------------------------------------- Hồ sơ năng lực (UR-1.1) */

/** Nguồn của một thông tin: đọc từ CV hay do người dùng bổ sung (UR-1.1.4). */
export const SourceSchema = z.enum(["cv", "user"]);
export type Source = z.infer<typeof SourceSchema>;

const ym = z.string().regex(/^\d{4}-\d{2}$/);

export const EducationSchema = z.object({
  id: z.string(),
  degree: z.string(),
  school: z.string().default(""),
  major: z.string().default(""),
  start: ym.nullable().default(null),
  end: z.union([ym, z.literal("present")]).nullable().default(null),
  gpa: z.string().nullable().default(null),
  source: SourceSchema,
});
export type Education = z.infer<typeof EducationSchema>;

export const ExperienceSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string().default(""),
  start: ym.nullable().default(null),
  end: z.union([ym, z.literal("present")]).nullable().default(null),
  bullets: z.array(z.string()).default([]),
  /** false = việc đã làm nhưng chưa có trên CV (người dùng khai ở bước hồ sơ). */
  onCv: z.boolean().default(true),
  source: SourceSchema,
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: SourceSchema,
});
export type Skill = z.infer<typeof SkillSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  year: z.string().nullable().default(null),
  description: z.string().default(""),
  source: SourceSchema,
});
export type Project = z.infer<typeof ProjectSchema>;

export const CertificationSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["cert", "language"]),
  score: z.string().nullable().default(null),
  source: SourceSchema,
});
export type Certification = z.infer<typeof CertificationSchema>;

export const AchievementSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: SourceSchema,
});
export type Achievement = z.infer<typeof AchievementSchema>;

/** Câu trả lời ở Clarification Assistant, lưu vào hồ sơ để JD sau không hỏi lại (UR-2.2). */
export const ClarificationSchema = z.object({
  key: z.string(),
  requirementText: z.string(),
  answer: z.enum(["done", "never", "skip"]),
  where: z.string().default(""),
  result: z.string().default(""),
  period: z.string().default(""),
  answeredAt: z.string(),
});
export type Clarification = z.infer<typeof ClarificationSchema>;

export const ProfileSchema = z.object({
  basics: z.object({
    name: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
  }),
  education: z.array(EducationSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  skills: z.array(SkillSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  achievements: z.array(AchievementSchema).default([]),
  clarifications: z.array(ClarificationSchema).default([]),
  cv: z
    .object({
      fileName: z.string(),
      path: z.string().nullable().default(null),
      parsedAt: z.string(),
      parser: z.enum(["gemini", "heuristic", "manual"]),
    })
    .nullable()
    .default(null),
  updatedAt: z.string(),
});
export type Profile = z.infer<typeof ProfileSchema>;

/* ---------------------------------------------------------------- Kỳ vọng (UR-1.2) */

export const ImportanceSchema = z.enum(["must", "important", "nice"]);
export type Importance = z.infer<typeof ImportanceSchema>;

export const WorkModeSchema = z.enum(["onsite", "hybrid", "remote"]);
export type WorkMode = z.infer<typeof WorkModeSchema>;

export const GrowthKeySchema = z.enum(["training", "promotion", "mentor", "learningBudget"]);
export type GrowthKey = z.infer<typeof GrowthKeySchema>;

export const DealBreakerSchema = z.object({
  id: z.string(),
  kind: z.enum(["salary_below", "onsite_full", "outside_city", "keyword"]),
  value: z.number().nullable().default(null),
  keyword: z.string().nullable().default(null),
});
export type DealBreaker = z.infer<typeof DealBreakerSchema>;

export const PreferencesSchema = z.object({
  salary: z.object({
    desired: z.number().nullable(),
    minimum: z.number().nullable(),
    negotiable: z.boolean().default(false),
    importance: ImportanceSchema,
  }),
  location: z.object({
    cities: z.array(z.string()).default([]),
    districts: z.array(z.string()).default([]),
    maxCommute: z.union([z.literal(15), z.literal(30), z.literal(45)]).nullable().default(null),
    importance: ImportanceSchema,
  }),
  workMode: z.object({
    modes: z.array(WorkModeSchema).default([]),
    importance: ImportanceSchema,
  }),
  growth: z.object({
    wants: z.array(GrowthKeySchema).default([]),
    importance: ImportanceSchema,
  }),
  dealBreakers: z.array(DealBreakerSchema).default([]),
  updatedAt: z.string(),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

/* ---------------------------------------------------------------- JD (UR-1.3) */

export const RequirementKindSchema = z.enum([
  "skill",
  "experience",
  "qualification",
  "language",
  "certification",
  "soft",
  "other",
]);
export type RequirementKind = z.infer<typeof RequirementKindSchema>;

export const RequirementSchema = z.object({
  id: z.string(),
  text: z.string(),
  level: z.enum(["must", "preferred"]),
  kind: RequirementKindSchema,
  /** Tên kỹ năng như JD viết; bộ chấm tự chuẩn hoá qua taxonomy. */
  skills: z.array(z.string()).default([]),
  skillMatch: z.enum(["any", "all"]).default("any"),
  minYears: z.number().nullable().default(null),
  /** Ngành/lĩnh vực kinh nghiệm (retail, ecommerce…). */
  domains: z.array(z.string()).default([]),
  degree: z.enum(["college", "bachelor", "master"]).nullable().default(null),
  majors: z.array(z.string()).default([]),
  language: z.string().nullable().default(null),
  languageTest: z
    .object({ test: z.string(), score: z.number() })
    .nullable()
    .default(null),
});
export type Requirement = z.infer<typeof RequirementSchema>;

export const JobConditionsSchema = z.object({
  /** Lương quy về triệu đồng / tháng. null = JD không nêu (Unknown). */
  salary: z
    .object({
      min: z.number().nullable(),
      max: z.number().nullable(),
      currency: z.enum(["VND", "USD"]),
      text: z.string(),
    })
    .nullable()
    .default(null),
  location: z
    .object({
      cities: z.array(z.string()),
      districts: z.array(z.string()),
      text: z.string(),
    })
    .nullable()
    .default(null),
  workMode: z
    .object({
      mode: WorkModeSchema,
      onsiteDays: z.number().nullable(),
      text: z.string(),
    })
    .nullable()
    .default(null),
  hours: z.string().nullable().default(null),
  benefits: z.array(z.string()).nullable().default(null),
  growth: z
    .object({
      training: z.boolean(),
      promotion: z.boolean(),
      mentor: z.boolean(),
      learningBudget: z.boolean(),
      text: z.string(),
    })
    .nullable()
    .default(null),
});
export type JobConditions = z.infer<typeof JobConditionsSchema>;

export const SenioritySchema = z.object({
  level: z.enum(["intern", "fresher", "junior", "mid", "senior", "unknown"]),
  yearsMin: z.number().nullable(),
  basis: z.string(),
});
export type Seniority = z.infer<typeof SenioritySchema>;

/** Kết quả trích xuất JD — dùng chung cho Gemini và bộ đọc dự phòng. */
export const JobExtractionSchema = z.object({
  title: z.string(),
  company: z.string(),
  requirements: z.array(RequirementSchema),
  responsibilities: z.array(z.string()),
  seniority: SenioritySchema,
  conditions: JobConditionsSchema,
  validThrough: z.string().nullable().default(null),
});
export type JobExtraction = z.infer<typeof JobExtractionSchema>;

export const SuggestionStateSchema = z.object({
  status: z.enum(["approved", "dismissed"]),
  text: z.string().default(""),
  applied: z.boolean().default(false),
});
export type SuggestionState = z.infer<typeof SuggestionStateSchema>;

export const ScoreSnapshotSchema = z.object({
  at: z.string(),
  readiness: z.number().nullable(),
  workFit: z.number().nullable(),
  quadrant: z.string(),
});
export type ScoreSnapshot = z.infer<typeof ScoreSnapshotSchema>;

export const JobSchema = JobExtractionSchema.extend({
  id: z.string(),
  source: z.enum(["paste", "file", "url", "sample"]),
  url: z.string().nullable().default(null),
  rawText: z.string(),
  contentHash: z.string(),
  extractedBy: z.enum(["gemini", "heuristic"]),
  /** Người dùng đã sửa kết quả bóc tách (UR-1.3). */
  editedAt: z.string().nullable().default(null),
  saved: z.boolean().default(false),
  suggestions: z.record(z.string(), SuggestionStateSchema).default({}),
  scoreHistory: z.array(ScoreSnapshotSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Job = z.infer<typeof JobSchema>;

/* ---------------------------------------------------------------- Trích xuất CV (UR-1.1.1) */

export const CvExtractionSchema = ProfileSchema.pick({
  basics: true,
  education: true,
  experience: true,
  skills: true,
  projects: true,
  certifications: true,
  achievements: true,
});
export type CvExtraction = z.infer<typeof CvExtractionSchema>;
