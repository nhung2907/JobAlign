import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { RequirementKindSchema, WorkModeSchema, type CvExtraction, type JobExtraction, type Requirement } from "../schema";
import { findCities, findDistricts, findDomainIds, findLanguage, parseLanguageTest } from "../taxonomy";
import { norm, parseYm, uid } from "../text";
import { inferSeniority, parseSalary } from "./jd-heuristic";

/**
 * Gemini chỉ dùng để hiểu ngôn ngữ tự nhiên: trích xuất CV/JD và viết lại câu chữ (G4).
 * Không bao giờ dùng để chấm điểm. Kết quả luôn qua Zod; sai schema → thử lại một lần rồi báo lỗi.
 * API key chỉ đọc ở server (mục 6 — bảo mật).
 */

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

export function geminiAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export class GeminiError extends Error {}

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) throw new GeminiError("Chưa cấu hình GEMINI_API_KEY.");
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/** Zod → JSON Schema theo tập con Gemini hỗ trợ (bỏ $schema, đổi type ["x","null"] thành anyOf). */
export function toGeminiSchema(schema: z.ZodType): unknown {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "$schema") continue;
      out[k] = walk(v);
    }
    if (Array.isArray(out.type)) {
      const types = out.type as string[];
      delete out.type;
      const rest = { ...out };
      for (const k of Object.keys(out)) delete out[k];
      out.anyOf = types.map((t) => (t === "null" ? { type: "null" } : { ...rest, type: t }));
    }
    return out;
  };
  return walk(z.toJSONSchema(schema, { target: "draft-7" }));
}

async function generate<T>(schema: z.ZodType<T>, system: string, input: string): Promise<T> {
  const jsonSchema = toGeminiSchema(schema);
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string | undefined;
    try {
      const res = await ai().models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: input }] }],
        config: {
          systemInstruction: system,
          temperature: 0,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          httpOptions: { timeout: 25_000 },
        },
      });
      text = res.text;
    } catch (e) {
      throw new GeminiError(`Gemini lỗi hoặc quá thời gian: ${e instanceof Error ? e.message : String(e)}`);
    }
    try {
      const parsed = schema.safeParse(JSON.parse(text ?? ""));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.message;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new GeminiError(`Gemini trả kết quả sai cấu trúc: ${lastError.slice(0, 200)}`);
}

/* ---------------------------------------------------------------- JD */

const LlmJd = z.object({
  title: z.string(),
  company: z.string(),
  requirements: z.array(
    z.object({
      text: z.string(),
      level: z.enum(["must", "preferred"]),
      kind: RequirementKindSchema,
      skills: z.array(z.string()),
      skillMatch: z.enum(["any", "all"]),
      minYears: z.number().nullable(),
      industries: z.array(z.string()),
      degree: z.enum(["college", "bachelor", "master"]).nullable(),
      majors: z.array(z.string()),
    }),
  ),
  responsibilities: z.array(z.string()),
  salary: z
    .object({ min: z.number().nullable(), max: z.number().nullable(), currency: z.enum(["VND", "USD"]), quote: z.string() })
    .nullable(),
  location: z.string().nullable(),
  workMode: z.object({ mode: WorkModeSchema, onsiteDaysPerWeek: z.number().nullable() }).nullable(),
  workingHours: z.string().nullable(),
  benefits: z.array(z.string()).nullable(),
  growth: z.object({ training: z.boolean(), promotion: z.boolean(), mentor: z.boolean(), learningBudget: z.boolean() }).nullable(),
  validThrough: z.string().nullable(),
});

const JD_SYSTEM = `Bạn là bộ trích xuất JD (tin tuyển dụng) cho JobAlign. Trả về JSON đúng schema.
Quy tắc bắt buộc:
- KHÔNG suy đoán. Thông tin JD không nêu rõ thì để null (hoặc mảng rỗng). Không tự điền lương, địa điểm, hình thức làm việc, phúc lợi.
- requirements: mỗi yêu cầu ứng viên là một phần tử, giữ nguyên câu chữ của JD ở "text".
  level = "preferred" nếu JD nói là ưu tiên / lợi thế / điểm cộng / nice to have; còn lại là "must".
  kind: skill (kỹ năng/công cụ), experience (số năm hoặc ngành/lĩnh vực đã làm), qualification (bằng cấp),
  language (ngoại ngữ), certification (chứng chỉ chuyên môn), soft (kỹ năng mềm), other (còn lại).
  skills: tên kỹ năng/công cụ đúng như JD viết. skillMatch = "all" chỉ khi JD yêu cầu có đủ tất cả, ngược lại "any".
  minYears: số năm kinh nghiệm tối thiểu nếu JD nêu (6 tháng = 0.5). industries: ngành JD yêu cầu đã làm (vd. bán lẻ).
  degree: college (cao đẳng) / bachelor (đại học) / master nếu JD yêu cầu bằng cấp; majors: các chuyên ngành JD liệt kê.
- responsibilities: các nhiệm vụ của vị trí.
- salary: min/max theo TRIỆU ĐỒNG/THÁNG nếu là VND (13.000.000 → 13), hoặc USD/tháng nếu là USD. quote = trích nguyên văn câu nói về lương. "Thoả thuận"/"cạnh tranh" → null.
- location: trích nguyên văn địa điểm làm việc. workMode: chỉ khi JD nói rõ onsite/hybrid/remote.
- benefits: danh sách quyền lợi nếu JD có mục quyền lợi. growth: đánh dấu true chỉ khi JD nhắc rõ đào tạo / thăng tiến / mentor / ngân sách học tập.
- validThrough: hạn nộp dạng YYYY-MM-DD nếu có.`;

const MODE_CUE = /(remote|hybrid|onsite|on-site|tu xa|work from home|wfh|tai van phong|len van phong|ket hop)/;

export async function extractJdWithGemini(text: string, hints: { title?: string; company?: string }): Promise<JobExtraction> {
  const r = await generate(LlmJd, JD_SYSTEM, text.slice(0, 30_000));
  const n = norm(text);
  const requirements: Requirement[] = r.requirements
    .filter((q) => q.text.trim().length > 2)
    .map((q) => ({
      id: uid("req"),
      text: q.text.trim(),
      level: q.level,
      kind: q.kind,
      skills: q.skills,
      skillMatch: q.skillMatch,
      minYears: q.minYears,
      domains: findDomainIds([q.text, ...q.industries].join(". ")),
      degree: q.degree,
      majors: q.majors,
      language: q.kind === "language" ? findLanguage(q.text) ?? "english" : null,
      languageTest: q.kind === "language" ? parseLanguageTest(q.text) : null,
    }));
  // Đối chiếu lại với văn bản gốc: điều kiện nào không có trong JD thì bỏ, giữ Unknown (NT-3).
  const salaryOk = r.salary && (r.salary.min !== null || r.salary.max !== null) && (n.includes(norm(r.salary.quote)) || parseSalary(text) !== null);
  const cities = r.location ? findCities(r.location).filter((c) => findCities(text).includes(c)) : [];
  const growthAny = r.growth && (r.growth.training || r.growth.promotion || r.growth.mentor || r.growth.learningBudget);
  return {
    title: hints.title?.trim() || r.title.trim() || "Vị trí chưa đặt tên",
    company: hints.company?.trim() || r.company.trim(),
    requirements,
    responsibilities: r.responsibilities.filter((x) => x.trim().length > 2),
    seniority: inferSeniority(requirements, text),
    conditions: {
      salary: salaryOk ? { min: r.salary!.min, max: r.salary!.max, currency: r.salary!.currency, text: r.salary!.quote } : null,
      location: cities.length ? { cities, districts: findDistricts(r.location!, cities), text: r.location! } : null,
      workMode: r.workMode && MODE_CUE.test(n) ? { mode: r.workMode.mode, onsiteDays: r.workMode.onsiteDaysPerWeek, text: r.workMode.mode } : null,
      hours: r.workingHours,
      benefits: r.benefits && r.benefits.length ? r.benefits : null,
      growth: growthAny ? { ...r.growth!, text: "" } : null,
    },
    validThrough: r.validThrough && /^\d{4}-\d{2}-\d{2}$/.test(r.validThrough) ? r.validThrough : null,
  };
}

/* ---------------------------------------------------------------- CV */

const LlmCv = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  education: z.array(z.object({ degree: z.string(), school: z.string(), major: z.string(), start: z.string().nullable(), end: z.string().nullable(), gpa: z.string().nullable() })),
  experience: z.array(z.object({ title: z.string(), company: z.string(), start: z.string().nullable(), end: z.string().nullable(), bullets: z.array(z.string()) })),
  skills: z.array(z.string()),
  projects: z.array(z.object({ name: z.string(), year: z.string().nullable(), description: z.string() })),
  certifications: z.array(z.object({ name: z.string(), isLanguage: z.boolean(), score: z.string().nullable() })),
  achievements: z.array(z.string()),
});

const CV_SYSTEM = `Bạn là bộ đọc CV cho JobAlign. Trả về JSON đúng schema.
Quy tắc bắt buộc:
- Chỉ lấy thông tin CÓ TRONG CV. Không suy đoán, không thêm kỹ năng hay thành tích. Thiếu thì để chuỗi rỗng / null / mảng rỗng.
- experience: công việc, thực tập, cộng tác viên. start/end dạng YYYY-MM; đang làm thì end = "present". bullets giữ nguyên câu chữ trong CV.
- skills: đúng như CV liệt kê. projects: dự án, hoạt động. certifications: chứng chỉ; isLanguage = true với chứng chỉ ngoại ngữ (IELTS, TOEIC…), score là điểm nếu có.
- achievements: giải thưởng, thành tích.`;

function ymOrNull(v: string | null, end = false): string | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}$/.test(v)) return v;
  if (/present|hiện tại|nay/i.test(v)) return end ? "present" : null;
  const p = parseYm(v, end);
  return p === "present" && !end ? null : p;
}

export async function extractCvWithGemini(text: string): Promise<CvExtraction> {
  const r = await generate(LlmCv, CV_SYSTEM, text.slice(0, 30_000));
  return {
    basics: { name: r.name, email: r.email, phone: r.phone },
    education: r.education.map((e) => ({ id: uid("edu"), degree: e.degree, school: e.school, major: e.major, start: ymOrNull(e.start), end: ymOrNull(e.end, true), gpa: e.gpa, source: "cv" })),
    experience: r.experience.map((e) => ({
      id: uid("exp"),
      title: e.title,
      company: e.company,
      start: ymOrNull(e.start),
      end: ymOrNull(e.end, true),
      bullets: e.bullets,
      onCv: true,
      source: "cv",
    })),
    skills: r.skills.map((name) => ({ id: uid("skl"), name, source: "cv" })),
    projects: r.projects.map((p) => ({ id: uid("prj"), name: p.name, year: p.year, description: p.description, source: "cv" })),
    certifications: r.certifications.map((c) => ({ id: uid("cert"), name: c.name, kind: c.isLanguage ? "language" : "cert", score: c.score, source: "cv" })),
    achievements: r.achievements.map((t) => ({ id: uid("ach"), text: t, source: "cv" })),
  };
}

/* ---------------------------------------------------------------- Viết lại bullet (UR-2.5.3) */

const LlmRewrite = z.object({ rewritten: z.string() });

const REWRITE_SYSTEM = `Bạn giúp ứng viên viết lại MỘT dòng (bullet) trong CV cho rõ ràng và hướng kết quả, bằng tiếng Việt, một câu.
Quy tắc bắt buộc:
- Chỉ dùng thông tin có trong bullet gốc và phần bối cảnh được cung cấp.
- KHÔNG thêm số liệu, kỹ năng, công cụ, chức danh hay thành tích mới.
- Chỗ nên có số liệu/kết quả mà chưa có thì để trong ngoặc vuông cho ứng viên tự điền, ví dụ [số chiến dịch].
- Được nhắc tới kỹ năng mục tiêu vì ứng viên đã xác nhận có kỹ năng đó.`;

export async function rewriteWithGemini(input: { bullet: string; skill: string; requirement: string; role: string }): Promise<string> {
  const r = await generate(
    LlmRewrite,
    REWRITE_SYSTEM,
    `Bullet gốc: ${input.bullet || "(chưa có)"}\nVị trí trong CV: ${input.role}\nKỹ năng mục tiêu: ${input.skill}\nYêu cầu JD cần thể hiện: ${input.requirement}`,
  );
  return r.rewritten.trim();
}
