import type { Clarification, Profile, Requirement, Source } from "../schema";
import {
  LANGUAGE_GOOD_LEVEL,
  findDomainIds,
  isSoftSkill,
  languageName,
  majorsMatch,
  mentionsSkill,
  parseLanguageTest,
  resolveSkill,
  skillName,
  findLanguage,
  domainName,
} from "../taxonomy";
import { findDateRange, formatMonths, formatYears, hasNumber, mergedMonths, norm } from "../text";
import { SCORING } from "./config";

export type ReqStatus = "met" | "partial" | "missing" | "unknown";
/** Độ mạnh bằng chứng theo tiêu chí công khai (UR-2.1.3). */
export type Strength = "strong" | "medium" | "declared" | "weak" | "none";
export type ReqGroup = "skill" | "experience" | "qualification";

export interface EvidenceItem {
  where: string;
  text: string;
  source: Source;
  strength: Strength;
  experienceId?: string;
  bulletIndex?: number;
}

export interface RequirementResult {
  req: Requirement;
  key: string;
  group: ReqGroup;
  status: ReqStatus;
  strength: Strength;
  evidence: EvidenceItem[];
  /** Vì sao kết luận như vậy — hiển thị ở phần đối chiếu (NFR-4). */
  reason: string;
  weight: number;
  /** Yêu cầu bắt buộc thật sự (kỹ năng mềm không bao giờ là điều kiện loại). */
  countsAsMust: boolean;
  blocker: boolean;
  /** Thiếu về lượng (vd. 11 tháng / 1 năm) — khoảng trống thật, không phải chuyện câu chữ. */
  shortfall: boolean;
  months?: { have: number; need: number; fromCv: number; entries: string[] };
  clarification: Clarification | null;
  skillIds: string[];
}

export interface GroupSummary {
  total: number;
  met: number;
  partial: number;
  missing: number;
  unknown: number;
  summary: string;
}

export interface ReadinessResult {
  score: number | null;
  points: number;
  maxPoints: number;
  high: boolean;
  threshold: number;
  results: RequirementResult[];
  blockers: RequirementResult[];
  groups: Record<ReqGroup, GroupSummary>;
  confidence: { level: "high" | "medium" | "low"; assessed: number; total: number };
}

const STRENGTH_RANK: Record<Strength, number> = { strong: 4, medium: 3, declared: 2, weak: 1, none: 0 };

export const STATUS_LABEL: Record<ReqStatus, string> = {
  met: "Đạt",
  partial: "Một phần",
  missing: "Chưa đạt",
  unknown: "Chưa rõ",
};

export const STRENGTH_LABEL: Record<Strength, string> = {
  strong: "Bằng chứng mạnh",
  medium: "Bằng chứng vừa",
  declared: "Bạn tự khai",
  weak: "Bằng chứng yếu",
  none: "Chưa có bằng chứng",
};

function groupOf(req: Requirement): ReqGroup {
  if (req.kind === "experience") return "experience";
  if (req.kind === "qualification" || req.kind === "language" || req.kind === "certification") return "qualification";
  return "skill";
}

export function requirementSkillIds(req: Requirement): string[] {
  return [...new Set(req.skills.map(resolveSkill))];
}

/** Khoá ổn định của một yêu cầu — dùng để lưu câu trả lời làm rõ và đếm chéo nhiều JD. */
export function requirementKey(req: Requirement): string {
  if (req.kind === "experience" && req.minYears) return "exp:years";
  if (req.kind === "experience" && req.domains.length) return `exp:domain:${[...req.domains].sort().join("+")}`;
  if (req.kind === "language" && req.language) return `lang:${req.language}`;
  if (req.kind === "qualification" && req.degree) return `degree:${req.degree}`;
  if (req.kind === "qualification" && req.majors.length) return `major:${req.majors.map((m) => norm(m)).sort().join("+")}`;
  const ids = requirementSkillIds(req);
  if ((req.kind === "skill" || req.kind === "soft") && ids.length) return `skill:${[...ids].sort().join("+")}`;
  return `text:${norm(req.text).replace(/[^a-z0-9 ]/g, "").slice(0, 80)}`;
}

function best(items: EvidenceItem[]): Strength {
  return items.reduce<Strength>((acc, i) => (STRENGTH_RANK[i.strength] > STRENGTH_RANK[acc] ? i.strength : acc), "none");
}

function statusFromStrength(s: Strength): ReqStatus {
  if (s === "strong" || s === "medium") return "met";
  if (s === "declared" || s === "weak") return "partial";
  return "unknown";
}

function expLabel(title: string, company: string): string {
  return company ? `${title} — ${company}` : title;
}

/** Tìm mọi dòng trong hồ sơ nhắc tới một kỹ năng (UR-2.1.2). */
export function skillEvidence(profile: Profile, skillId: string): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  for (const exp of profile.experience) {
    const where = `Kinh nghiệm · ${expLabel(exp.title, exp.company)}`;
    exp.bullets.forEach((b, i) => {
      if (!mentionsSkill(b, skillId)) return;
      items.push({
        where,
        text: b,
        source: exp.source,
        strength: !exp.onCv ? "declared" : hasNumber(b) ? "strong" : "medium",
        experienceId: exp.id,
        bulletIndex: i,
      });
    });
    if (!exp.bullets.some((b) => mentionsSkill(b, skillId)) && mentionsSkill(exp.title, skillId)) {
      items.push({ where, text: exp.title, source: exp.source, strength: exp.onCv ? "medium" : "declared", experienceId: exp.id });
    }
  }
  for (const p of profile.projects) {
    const text = `${p.name}. ${p.description}`;
    if (mentionsSkill(text, skillId)) {
      items.push({ where: `Dự án · ${p.name}`, text: p.description || p.name, source: p.source, strength: hasNumber(p.description) ? "strong" : "medium" });
    }
  }
  for (const a of profile.achievements) {
    if (mentionsSkill(a.text, skillId)) {
      items.push({ where: "Thành tích", text: a.text, source: a.source, strength: hasNumber(a.text) ? "strong" : "medium" });
    }
  }
  for (const c of profile.certifications) {
    if (mentionsSkill(c.name, skillId)) {
      items.push({ where: "Chứng chỉ", text: c.name, source: c.source, strength: "medium" });
    }
  }
  for (const s of profile.skills) {
    if (resolveSkill(s.name) === skillId || mentionsSkill(s.name, skillId)) {
      items.push({ where: "Kỹ năng", text: s.name, source: s.source, strength: "weak" });
    }
  }
  return items;
}

function clarificationEvidence(c: Clarification | null): EvidenceItem[] {
  if (!c || c.answer !== "done") return [];
  const parts = [c.where, c.result, c.period].filter((x) => x.trim().length > 0);
  return [
    {
      where: "Bạn xác nhận khi làm rõ",
      text: parts.length ? parts.join(" · ") : "Đã từng làm (chưa kể chi tiết)",
      source: "user",
      strength: "declared",
    },
  ];
}

interface Partial0 {
  status: ReqStatus;
  strength: Strength;
  evidence: EvidenceItem[];
  reason: string;
  shortfall?: boolean;
  months?: RequirementResult["months"];
}

function evaluateSkillReq(profile: Profile, req: Requirement, ids: string[], clar: Clarification | null): Partial0 {
  const perSkill = ids.map((id) => ({ id, items: skillEvidence(profile, id) }));
  const clarItems = clarificationEvidence(clar);
  const withClar = perSkill.map((s) => ({ ...s, strength: best([...s.items, ...clarItems]) }));
  const evidence = [...perSkill.flatMap((s) => s.items), ...clarItems];

  let strength: Strength;
  let missingNames: string[] = [];
  if (req.skillMatch === "all" && withClar.length > 1) {
    const covered = withClar.filter((s) => s.strength !== "none");
    missingNames = withClar.filter((s) => s.strength === "none").map((s) => skillName(s.id));
    if (covered.length === 0) strength = "none";
    else if (missingNames.length > 0) {
      if (clar?.answer === "never") {
        return {
          status: "partial",
          strength: "medium",
          evidence,
          reason: `Có bằng chứng cho ${covered.map((s) => skillName(s.id)).join(", ")}; bạn xác nhận chưa từng làm ${missingNames.join(", ")}.`,
        };
      }
      return {
        status: "partial",
        strength: best(covered.flatMap((s) => perSkill.find((p) => p.id === s.id)!.items)),
        evidence,
        reason: `Có bằng chứng cho ${covered.map((s) => skillName(s.id)).join(", ")}; chưa có thông tin về ${missingNames.join(", ")}.`,
      };
    } else {
      strength = withClar.reduce<Strength>((acc, s) => (STRENGTH_RANK[s.strength] < STRENGTH_RANK[acc] ? s.strength : acc), "strong");
    }
  } else {
    strength = withClar.reduce<Strength>((acc, s) => (STRENGTH_RANK[s.strength] > STRENGTH_RANK[acc] ? s.strength : acc), "none");
  }

  if (strength === "none") {
    if (clar?.answer === "never") {
      return { status: "missing", strength, evidence, reason: "Bạn đã xác nhận chưa từng làm việc này." };
    }
    return {
      status: "unknown",
      strength,
      evidence,
      reason:
        clar?.answer === "skip"
          ? "Bạn đã bỏ qua câu hỏi làm rõ — giữ nguyên trạng thái chưa đủ dữ liệu."
          : "Hồ sơ chưa có bằng chứng nào cho tiêu chí này — cần làm rõ trước khi kết luận bạn thiếu năng lực.",
    };
  }
  const reasons: Record<Strength, string> = {
    strong: "Có trong phần mô tả công việc/dự án, kèm số liệu hoặc kết quả.",
    medium: "Có trong phần mô tả công việc/dự án nhưng chưa kèm kết quả hay số liệu.",
    declared: "Bạn xác nhận đã làm, nhưng CV chưa thể hiện điều này.",
    weak: "Chỉ có tên kỹ năng trong mục Kỹ năng, không gắn với công việc hay kết quả nào.",
    none: "",
  };
  return { status: statusFromStrength(strength), strength, evidence, reason: reasons[strength] };
}

function periodMonths(period: string): { start: string; end: string } | null {
  const r = findDateRange(period);
  return r ? { start: r.start, end: r.end } : null;
}

function evaluateExperienceYears(profile: Profile, req: Requirement, clar: Clarification | null, now: Date): Partial0 {
  const need = Math.round((req.minYears ?? 0) * 12);
  const cvExp = profile.experience.filter((e) => e.onCv);
  const allRanges = profile.experience.map((e) => ({ start: e.start, end: e.end }));
  const clarRange = clar?.answer === "done" ? periodMonths(clar.period) : null;
  if (clarRange) allRanges.push(clarRange);
  const have = mergedMonths(allRanges, now);
  const fromCv = mergedMonths(cvExp.map((e) => ({ start: e.start, end: e.end })), now);
  const entries = profile.experience
    .filter((e) => e.start)
    .map((e) => `${e.title} ${formatMonths(mergedMonths([{ start: e.start, end: e.end }], now))} (${e.onCv ? "từ CV" : "bạn tự khai"})`);
  if (clarRange) entries.push(`${clar!.where || "Trải nghiệm bạn khai khi làm rõ"} ${formatMonths(mergedMonths([clarRange], now))} (bạn tự khai)`);
  const months = { have, need, fromCv, entries };
  const evidence: EvidenceItem[] = profile.experience
    .filter((e) => e.start)
    .map((e) => ({
      where: "Kinh nghiệm",
      text: `${expLabel(e.title, e.company)} · ${formatMonths(mergedMonths([{ start: e.start, end: e.end }], now))}`,
      source: e.source,
      strength: e.onCv ? "medium" : "declared",
      experienceId: e.id,
    }));
  evidence.push(...clarificationEvidence(clar));

  if (need === 0) return { status: "met", strength: "medium", evidence, reason: "JD không yêu cầu số năm kinh nghiệm cụ thể.", months };
  if (have >= need) {
    if (fromCv >= need) {
      return { status: "met", strength: "strong", evidence, reason: `Tổng ${formatMonths(have)} kinh nghiệm, đủ mức tối thiểu ${formatYears(req.minYears!)}.`, months };
    }
    return {
      status: "partial",
      strength: "declared",
      evidence,
      reason: `Đủ ${formatMonths(have)} nếu tính cả phần bạn tự khai, nhưng CV mới thể hiện ${formatMonths(fromCv)}.`,
      months,
    };
  }
  if (have > 0) {
    return {
      status: "partial",
      strength: "medium",
      evidence,
      shortfall: true,
      reason: `Bạn có ${formatMonths(have)} cộng dồn, JD yêu cầu tối thiểu ${formatYears(req.minYears!)} — còn thiếu ${formatMonths(need - have)}.`,
      months,
    };
  }
  if (clar?.answer === "never") {
    return { status: "missing", strength: "none", evidence, reason: "Bạn xác nhận chưa có kinh nghiệm làm việc tương đương.", months };
  }
  return {
    status: "unknown",
    strength: "none",
    evidence,
    reason: "Hồ sơ chưa ghi mốc thời gian kinh nghiệm nào — chưa tính được số năm.",
    months,
  };
}

function evaluateDomain(profile: Profile, req: Requirement, clar: Clarification | null): Partial0 {
  const evidence: EvidenceItem[] = [];
  for (const e of profile.experience) {
    const text = [e.title, e.company, ...e.bullets].join(". ");
    const hits = findDomainIds(text).filter((d) => req.domains.includes(d));
    if (hits.length) {
      evidence.push({
        where: `Kinh nghiệm · ${expLabel(e.title, e.company)}`,
        text: e.bullets.find((b) => findDomainIds(b).some((d) => req.domains.includes(d))) ?? expLabel(e.title, e.company),
        source: e.source,
        strength: e.onCv ? "medium" : "declared",
        experienceId: e.id,
      });
    }
  }
  for (const p of profile.projects) {
    if (findDomainIds(`${p.name}. ${p.description}`).some((d) => req.domains.includes(d))) {
      evidence.push({ where: `Dự án · ${p.name}`, text: p.description || p.name, source: p.source, strength: "medium" });
    }
  }
  evidence.push(...clarificationEvidence(clar));
  const s = best(evidence);
  const names = req.domains.map(domainName).join(" / ");
  if (s === "none") {
    if (clar?.answer === "never") return { status: "missing", strength: s, evidence, reason: `Bạn xác nhận chưa từng làm trong ngành ${names}.` };
    return { status: "unknown", strength: s, evidence, reason: `CV không cho biết bạn đã làm trong ngành ${names} hay chưa.` };
  }
  return {
    status: statusFromStrength(s),
    strength: s,
    evidence,
    reason: s === "declared" ? `Bạn xác nhận có kinh nghiệm ngành ${names}, nhưng CV chưa thể hiện.` : `Có kinh nghiệm liên quan tới ngành ${names}.`,
  };
}

const DEGREE_RANK = { college: 1, bachelor: 2, master: 3 } as const;

function degreeRank(text: string): number {
  const n = norm(text);
  if (/(thac si|master|mba|tien si|phd)/.test(n)) return 3;
  if (/(cu nhan|dai hoc|bachelor|ky su|engineer|university)/.test(n)) return 2;
  if (/(cao dang|college)/.test(n)) return 1;
  return 0;
}

function evaluateQualification(profile: Profile, req: Requirement, clar: Clarification | null, now: Date): Partial0 {
  const need = req.degree ? DEGREE_RANK[req.degree] : 0;
  const edus = profile.education;
  const evidence: EvidenceItem[] = edus.map((e) => ({
    where: "Học vấn",
    text: [e.degree, e.major, e.school].filter(Boolean).join(" · "),
    source: e.source,
    strength: "medium" as Strength,
  }));
  if (edus.length === 0) {
    evidence.push(...clarificationEvidence(clar));
    if (clar?.answer === "done") return { status: "partial", strength: "declared", evidence, reason: "Bạn xác nhận đáp ứng, nhưng hồ sơ chưa có mục Học vấn." };
    if (clar?.answer === "never") return { status: "missing", strength: "none", evidence, reason: "Bạn xác nhận chưa đáp ứng yêu cầu bằng cấp." };
    return { status: "unknown", strength: "none", evidence, reason: "Hồ sơ chưa có thông tin học vấn." };
  }
  if (!req.degree) {
    // Chỉ yêu cầu chuyên ngành (JD nhận cả sinh viên) → không xét bằng cấp hay đã tốt nghiệp chưa.
    const match = req.majors.length === 0 || edus.some((e) => !e.major || majorsMatch(e.major, req.majors));
    return match
      ? { status: "met", strength: "strong", evidence, reason: "Chuyên ngành phù hợp với nhóm ngành JD nêu." }
      : { status: "partial", strength: "medium", evidence, reason: `Chuyên ngành không nằm trong nhóm JD nêu (${req.majors.join(", ")}).` };
  }
  const bestEdu = [...edus].sort((a, b) => degreeRank(`${b.degree} ${b.school}`) - degreeRank(`${a.degree} ${a.school}`))[0];
  const rank = degreeRank(`${bestEdu.degree} ${bestEdu.school}`);
  const nowYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const inProgress = bestEdu.end === "present" || (bestEdu.end !== null && bestEdu.end > nowYm);
  if (rank > 0 && rank < need) {
    return { status: "missing", strength: "medium", evidence, reason: "Bằng cấp hiện có thấp hơn mức JD yêu cầu." };
  }
  const majorOk = req.majors.length === 0 || !bestEdu.major || majorsMatch(bestEdu.major, req.majors);
  if (inProgress) {
    return { status: "partial", strength: "medium", evidence, reason: `Bạn đang học, dự kiến tốt nghiệp ${bestEdu.end === "present" ? "sắp tới" : bestEdu.end!.split("-").reverse().join("/")}.` };
  }
  if (!majorOk) {
    return { status: "partial", strength: "medium", evidence, reason: `Chuyên ngành "${bestEdu.major}" không nằm trong nhóm JD nêu (${req.majors.join(", ")}).` };
  }
  return {
    status: "met",
    strength: "strong",
    evidence,
    reason: req.majors.length && !bestEdu.major ? "Đủ bằng cấp; hồ sơ chưa ghi chuyên ngành để so." : "Bằng cấp và chuyên ngành phù hợp.",
  };
}

function languageEvidence(profile: Profile, lang: string): { items: EvidenceItem[]; tests: { test: string; score: number }[] } {
  const items: EvidenceItem[] = [];
  const tests: { test: string; score: number }[] = [];
  for (const c of profile.certifications) {
    const text = `${c.name} ${c.score ?? ""}`;
    if (findLanguage(text) === lang) {
      const t = parseLanguageTest(text);
      if (t) tests.push(t);
      items.push({ where: "Chứng chỉ & ngoại ngữ", text: text.trim(), source: c.source, strength: t ? "strong" : "medium" });
    }
  }
  for (const s of profile.skills) {
    if (findLanguage(s.name) === lang) {
      const t = parseLanguageTest(s.name);
      if (t) tests.push(t);
      items.push({ where: "Kỹ năng", text: s.name, source: s.source, strength: t ? "medium" : "weak" });
    }
  }
  for (const e of profile.education) {
    if (findLanguage(e.major) === lang) items.push({ where: "Học vấn", text: e.major, source: e.source, strength: "medium" });
  }
  return { items, tests };
}

function evaluateLanguage(profile: Profile, req: Requirement, clar: Clarification | null): Partial0 {
  const lang = req.language ?? findLanguage(req.text) ?? "english";
  const { items, tests } = languageEvidence(profile, lang);
  const evidence = [...items, ...clarificationEvidence(clar)];
  const name = languageName(lang);
  if (req.languageTest) {
    const same = tests.filter((t) => t.test === req.languageTest!.test);
    if (same.length) {
      const top = Math.max(...same.map((t) => t.score));
      if (top >= req.languageTest.score) return { status: "met", strength: "strong", evidence, reason: `${req.languageTest.test.toUpperCase()} ${top} ≥ ${req.languageTest.score} theo yêu cầu.` };
      return { status: "partial", strength: "medium", evidence, reason: `${req.languageTest.test.toUpperCase()} ${top}, JD yêu cầu ${req.languageTest.score}.`, shortfall: true };
    }
    if (tests.length) return { status: "partial", strength: "medium", evidence, reason: `Bạn có chứng chỉ ${name} khác loại JD nêu (${req.languageTest.test.toUpperCase()}) — cần tự quy đổi.` };
  } else if (tests.length) {
    const good = tests.some((t) => t.score >= (LANGUAGE_GOOD_LEVEL[t.test] ?? 0));
    if (good) return { status: "met", strength: "strong", evidence, reason: `Có chứng chỉ ${name} ở mức sử dụng tốt.` };
    return { status: "partial", strength: "medium", evidence, reason: `Có chứng chỉ ${name} nhưng điểm còn thấp so với mức sử dụng thành thạo.` };
  }
  const s = best(evidence);
  if (s === "none") {
    if (clar?.answer === "never") return { status: "missing", strength: s, evidence, reason: `Bạn xác nhận chưa đáp ứng yêu cầu ${name}.` };
    return { status: "unknown", strength: s, evidence, reason: `CV không cho biết trình độ ${name} của bạn.` };
  }
  return { status: "partial", strength: s, evidence, reason: `Có nhắc tới ${name} nhưng không có chứng chỉ hay mô tả mức độ sử dụng.` };
}

function evaluateCertification(profile: Profile, req: Requirement, clar: Clarification | null): Partial0 {
  const rn = norm(req.text);
  const ids = requirementSkillIds(req);
  const evidence: EvidenceItem[] = profile.certifications
    .filter((c) => {
      const cn = norm(c.name);
      return cn.length > 2 && (rn.includes(cn) || ids.some((id) => mentionsSkill(c.name, id)));
    })
    .map((c) => ({ where: "Chứng chỉ", text: c.name, source: c.source, strength: "strong" as Strength }));
  evidence.push(...clarificationEvidence(clar));
  const s = best(evidence);
  if (s === "none") {
    if (clar?.answer === "never") return { status: "missing", strength: s, evidence, reason: "Bạn xác nhận chưa có chứng chỉ này." };
    return { status: "unknown", strength: s, evidence, reason: "Hồ sơ chưa có chứng chỉ tương ứng." };
  }
  return { status: statusFromStrength(s), strength: s, evidence, reason: s === "declared" ? "Bạn xác nhận có chứng chỉ, nhưng CV chưa ghi." : "Có chứng chỉ tương ứng trong hồ sơ." };
}

function evaluateOther(req: Requirement, clar: Clarification | null): Partial0 {
  const evidence = clarificationEvidence(clar);
  if (clar?.answer === "done") return { status: "met", strength: "medium", evidence, reason: "Bạn xác nhận đáp ứng được yêu cầu này." };
  if (clar?.answer === "never") return { status: "missing", strength: "none", evidence, reason: "Bạn xác nhận chưa đáp ứng yêu cầu này." };
  return { status: "unknown", strength: "none", evidence, reason: "Tiêu chí này không đối chiếu tự động được với CV — cần bạn xác nhận." };
}

export function evaluateRequirement(profile: Profile, req: Requirement, now = new Date()): RequirementResult {
  const key = requirementKey(req);
  const clar = profile.clarifications.find((c) => c.key === key) ?? null;
  const ids = requirementSkillIds(req);
  const soft = req.kind === "soft" || (ids.length > 0 && ids.every(isSoftSkill));
  let r: Partial0;
  if (req.kind === "experience" && req.minYears) r = evaluateExperienceYears(profile, req, clar, now);
  else if (req.kind === "experience" && req.domains.length) r = evaluateDomain(profile, req, clar);
  else if (req.kind === "qualification") r = evaluateQualification(profile, req, clar, now);
  else if (req.kind === "language") r = evaluateLanguage(profile, req, clar);
  else if (req.kind === "certification") r = evaluateCertification(profile, req, clar);
  else if (ids.length) r = evaluateSkillReq(profile, req, ids, clar);
  else r = evaluateOther(req, clar);

  const countsAsMust = req.level === "must" && !soft;
  const weight = countsAsMust ? SCORING.requirementWeight.must : SCORING.requirementWeight.preferred;
  return {
    req,
    key,
    group: soft ? "skill" : groupOf(req),
    status: r.status,
    strength: r.strength,
    evidence: r.evidence,
    reason: r.reason,
    weight,
    countsAsMust,
    blocker: countsAsMust && (r.status === "missing" || r.status === "unknown"),
    shortfall: r.shortfall ?? false,
    months: r.months,
    clarification: clar,
    skillIds: ids,
  };
}

function summarize(results: RequirementResult[], group: ReqGroup): GroupSummary {
  const list = results.filter((r) => r.group === group);
  const count = (s: ReqStatus) => list.filter((r) => r.status === s).length;
  const g = { total: list.length, met: count("met"), partial: count("partial"), missing: count("missing"), unknown: count("unknown") };
  let summary: string;
  if (g.total === 0) summary = "JD không yêu cầu";
  else if (group === "experience" && list.length === 1 && list[0].months && list[0].months.need > 0) {
    const m = list[0].months;
    summary = `${STATUS_LABEL[list[0].status]} — ${formatMonths(m.have)} / ${formatYears(m.need / 12)}`;
  } else if (g.total === 1) {
    summary = STATUS_LABEL[list[0].status];
  } else {
    const parts = [`${g.met} / ${g.total} đạt`];
    if (g.partial) parts.push(`${g.partial} một phần`);
    if (g.missing) parts.push(`${g.missing} chưa đạt`);
    if (g.unknown) parts.push(`${g.unknown} chưa rõ`);
    summary = parts.join(" · ");
  }
  return { ...g, summary };
}

export function evaluateReadiness(profile: Profile, requirements: Requirement[], now = new Date()): ReadinessResult {
  const results = requirements.map((r) => evaluateRequirement(profile, r, now));
  const assessed = results.filter((r) => r.status !== "unknown");
  const credit = SCORING.statusCredit;
  const points = assessed.reduce((s, r) => s + r.weight * credit[r.status as "met" | "partial" | "missing"], 0);
  const maxPoints = assessed.reduce((s, r) => s + r.weight, 0);
  const score = maxPoints > 0 ? Math.round((100 * points) / maxPoints) : null;
  const blockers = results.filter((r) => r.blocker);
  const ratio = results.length ? assessed.length / results.length : 0;
  const level = ratio >= SCORING.confidence.high ? "high" : ratio >= SCORING.confidence.medium ? "medium" : "low";
  return {
    score,
    points,
    maxPoints,
    threshold: SCORING.readinessThreshold,
    high: score !== null && score >= SCORING.readinessThreshold && blockers.length === 0,
    results,
    blockers,
    groups: {
      skill: summarize(results, "skill"),
      experience: summarize(results, "experience"),
      qualification: summarize(results, "qualification"),
    },
    confidence: { level, assessed: assessed.length, total: results.length },
  };
}

export const CONFIDENCE_LABEL = { high: "Cao", medium: "Trung bình", low: "Thấp" } as const;
