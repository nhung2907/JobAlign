import type { JobConditions, JobExtraction, Requirement, RequirementKind, Seniority } from "../schema";
import {
  findCities,
  findDistricts,
  findDomainIds,
  findLanguage,
  findSkillIds,
  isSoftSkill,
  parseLanguageTest,
  skillDef,
  skillName,
} from "../taxonomy";
import { norm, uid } from "../text";

/**
 * Bộ bóc tách JD dựa trên quy tắc — dùng khi không có Gemini hoặc Gemini lỗi (NFR-8).
 * Không suy đoán: trường nào không tìm thấy thì để null (Unknown, NT-3).
 */

type Section = "intro" | "resp" | "req" | "pref" | "benefit" | "info";

const HEADINGS: [Section, RegExp][] = [
  ["pref", /^(uu tien|diem cong|nice to have|preferred|bonus|loi the|uu tien ung vien)/],
  ["req", /^(yeu cau|requirements?|qualifications?|your skills|skills and experience|what we are looking for|what you need|tieu chuan|dieu kien ung tuyen|ky nang can co|must have|ung vien can co|candidate requirements)/],
  ["resp", /^(mo ta cong viec|job description|trach nhiem|nhiem vu|responsibilities|what you will do|what you'll do|cong viec chinh|cong viec cu the|your role|chi tiet cong viec|mo ta|cong viec)/],
  ["benefit", /^(quyen loi|phuc loi|benefits?|che do|dai ngo|why you.ll love|what we offer|chung toi mang lai|ban se nhan duoc|perks)/],
  ["info", /^(thong tin chung|thong tin khac|thong tin tuyen dung|dia diem|noi lam viec|thoi gian lam viec|muc luong|luong|general information|location|working time|working hours)/],
];

interface RawLine {
  text: string;
  norm: string;
}

function splitLines(text: string): RawLine[] {
  return text
    .replace(/\r/g, "")
    .split(/\n|(?<=[.;])\s+(?=[-•●▪+*]\s)/)
    .map((l) => l.replace(/^[\s•●○◦▪▫■□✓✔➢➤►▸\-–—*+·]+/, "").replace(/^\d{1,2}[.)]\s+/, "").trim())
    .filter((l) => l.length > 0)
    .map((l) => ({ text: l, norm: norm(l) }));
}

function headingOf(line: RawLine): Section | null {
  const n = line.norm.replace(/[:：]$/, "").trim();
  if (n.length > 60) return null;
  // Dòng tiêu đề thường ngắn hoặc kết thúc bằng dấu hai chấm.
  const looksLikeHeading = line.text.trim().endsWith(":") || n.split(" ").length <= 7;
  if (!looksLikeHeading) return null;
  for (const [sec, re] of HEADINGS) if (re.test(n)) return sec;
  return null;
}

const PREFERRED_CUE = /(uu tien|la mot loi the|la loi the|loi the|diem cong|is a plus|nice to have|preferred|bonus|khuyen khich|a plus)/;
const REQUIREMENT_CUE = /(kinh nghiem|ky nang|thanh thao|su dung|tot nghiep|yeu cau|ielts|toeic|tieng anh|english|biet|hieu biet|co kha nang|experience|proficient|knowledge|degree|bachelor)/;

function parseMinYears(n: string): number | null {
  if (/(khong yeu cau kinh nghiem|no experience required|chua co kinh nghiem)/.test(n)) return null;
  if (!/(kinh nghiem|experience|nam lam viec)/.test(n)) return null;
  // "2–4 năm", "2 đến 4 năm": yêu cầu tối thiểu là cận dưới.
  let m = /(\d+(?:[.,]\d+)?)\s*(?:-|–|—|~|den|to)\s*\d+(?:[.,]\d+)?\s*\+?\s*(?:nam|years?|yrs?)/.exec(n);
  if (m) return Number(m[1].replace(",", "."));
  m = /(\d+(?:[.,]\d+)?)\s*\+?\s*(?:nam|years?|yrs?)/.exec(n);
  if (m) return Number(m[1].replace(",", "."));
  m = /(\d+)\s*thang/.exec(n);
  if (m) return Math.round((Number(m[1]) / 12) * 100) / 100;
  if (/(mot nam|one year)/.test(n)) return 1;
  return null;
}

function parseDegree(n: string): Requirement["degree"] {
  if (/(thac si|master)/.test(n)) return "master";
  if (/(cao dang|college)/.test(n)) return "college";
  if (/(dai hoc|cu nhan|bachelor|university|ky su)/.test(n)) return "bachelor";
  return null;
}

function parseMajors(text: string): string[] {
  const m = /(?:chuyên ngành|chuyen nganh|ngành|nganh|khối ngành|major(?:s)? in|majoring in|degree in|in)\s+(.+)$/i.exec(text);
  if (!m) return [];
  return m[1]
    .replace(/[.;]$/, "")
    .split(/\s*(?:\/|,|;|\bhoặc\b|\bhoac\b|\bor\b|\bvà\b|\bva\b|\band\b)\s*/i)
    .map((s) => s.replace(/(hoặc|các|ngành|liên quan|tương đương|related( fields?)?|equivalent)/gi, "").trim())
    .filter((s) => s.length > 1 && s.length < 40);
}

function classify(line: string, n: string, level: Requirement["level"]): Requirement | null {
  const base = {
    id: uid("req"),
    text: line.replace(/[.;]$/, ""),
    level,
    skills: [] as string[],
    skillMatch: "any" as const,
    minYears: null,
    domains: [] as string[],
    degree: null,
    majors: [] as string[],
    language: null,
    languageTest: null,
  };
  const make = (kind: RequirementKind, extra: Partial<Requirement> = {}): Requirement => ({ ...base, kind, ...extra });

  const skillIds = findSkillIds(line);
  const minYears = parseMinYears(n);
  const domains = findDomainIds(line);
  const lang = findLanguage(line);

  if (/(tot nghiep|bang cap|degree|bachelor|cu nhan|thac si)/.test(n) && parseDegree(n) && !/sinh vien/.test(n)) {
    return make("qualification", { degree: parseDegree(n), majors: parseMajors(line) });
  }
  // "Sinh viên năm cuối hoặc mới tốt nghiệp ngành X": chỉ yêu cầu chuyên ngành, không yêu cầu đã có bằng.
  if (/(sinh vien|moi tot nghiep|tot nghiep)/.test(n) && /(chuyen nganh|nganh|major)/.test(n) && parseMajors(line).length) {
    return make("qualification", { degree: null, majors: parseMajors(line) });
  }
  if (lang && /(tieng|english|ielts|toeic|toefl|ngoai ngu|japanese|jlpt|korean|topik|chinese|hsk|french|n[1-5])/.test(n)) {
    return make("language", { language: lang, languageTest: parseLanguageTest(line) });
  }
  if (/(chung chi|certificate|certification|chung nhan)/.test(n)) {
    return make("certification", { skills: skillIds.map(skillName) });
  }
  if (minYears !== null) {
    return make("experience", { minYears, domains });
  }
  if (domains.length && /(kinh nghiem|tung lam|experience|moi truong|nganh|linh vuc)/.test(n) && !skillIds.some((id) => !isSoftSkill(id))) {
    return make("experience", { domains });
  }
  if (skillIds.length) {
    const hard = skillIds.filter((id) => !isSoftSkill(id));
    const ids = hard.length ? hard : skillIds;
    const allTools = ids.length > 1 && ids.every((id) => skillDef(id)?.category === "tool");
    const joined = /( va | and |,)/.test(n) && !/(hoac| or |\/|\()/.test(n);
    return make(hard.length ? "skill" : "soft", {
      skills: ids.map(skillName),
      skillMatch: allTools && joined ? "all" : "any",
    });
  }
  if (/(sinh vien|intern|thuc tap)/.test(n)) return make("other");
  if (n.length < 6) return null;
  return make("other");
}

function parseNumber(raw: string): number {
  const s = raw.replace(/\s|\$/g, "");
  // 13.000.000 hoặc 13,000,000 → dấu phân cách hàng nghìn.
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ""));
  return Number(s.replace(",", "."));
}

function toMillion(value: number, unit: string, currency: "VND" | "USD"): number {
  if (currency === "USD") return unit === "k" ? value * 1000 : value;
  if (value >= 100000) return value / 1_000_000;
  if (unit === "k") return value / 1000;
  return value;
}

export function parseSalary(text: string): JobConditions["salary"] {
  const lines = splitLines(text);
  const cand = lines.filter((l) => /(luong|salary|thu nhap|tro cap|allowance|dai ngo|compensation)/.test(l.norm));
  const withMoney = lines.filter((l) => /\d/.test(l.norm) && /(trieu|\btr\b|usd|\$|vnd|\bm\b|000\.000|000,000)/.test(l.norm));
  const pool = [...cand, ...withMoney.filter((l) => !cand.includes(l))];
  for (const l of pool) {
    const n = l.norm;
    const currency: "VND" | "USD" = /(usd|\$)/.test(n) ? "USD" : "VND";
    const num = "(\\$?\\s*\\d[\\d.,]*)";
    const unit = "\\s*(trieu|tr|m|k|usd|vnd|vnđ|d|\\$)?";
    const range = new RegExp(`${num}${unit}\\s*(?:-|–|—|~|den|toi|to)\\s*${num}${unit}`).exec(n);
    if (range) {
      const u = range[4] ?? range[2] ?? "";
      const a = toMillion(parseNumber(range[1]), u, currency);
      const b = toMillion(parseNumber(range[3]), u, currency);
      if (a > 0 && b > 0 && b >= a) return { min: a, max: b, currency, text: l.text };
    }
    const single = new RegExp(`${num}${unit}`).exec(n);
    if (single && /(trieu|tr|m|k|usd|\$|vnd|000)/.test(single[0]) && /(luong|salary|thu nhap|tro cap|allowance|trieu|usd|\$)/.test(n)) {
      const v = toMillion(parseNumber(single[1]), single[2] ?? "", currency);
      if (!(v > 0)) continue;
      if (/(len den|toi da|up ?to|den)\s*\$?\s*\d/.test(n)) return { min: null, max: v, currency, text: l.text };
      if (/(tu|tren|from|toi thieu|>=|at least)\s*\$?\s*\d/.test(n)) return { min: v, max: null, currency, text: l.text };
      return { min: v, max: v, currency, text: l.text };
    }
    if (cand.includes(l) && /(thoa thuan|thuong luong|canh tranh|negotiable|competitive)/.test(n)) return null;
  }
  return null;
}

function parseLocation(lines: RawLine[], full: string): JobConditions["location"] {
  const locLines = lines.filter((l) => /(dia diem|noi lam viec|location|dia chi|van phong|work at|lam viec tai|office)/.test(l.norm));
  for (const l of locLines) {
    const cities = findCities(l.text);
    if (cities.length) return { cities, districts: findDistricts(l.text, cities), text: l.text };
  }
  const cities = findCities(full);
  if (cities.length === 1) return { cities, districts: findDistricts(full, cities), text: "" };
  return null;
}

function parseWorkMode(full: string): JobConditions["workMode"] {
  const n = norm(full);
  const daysMatch = /(\d)\s*(?:ngay|buoi)\s*(?:\/\s*tuan\s*)?(?:onsite|tai van phong|len van phong|lam viec tai van phong|o van phong|lam viec tai cong ty)/.exec(n) ?? /onsite\s*(\d)\s*ngay/.exec(n);
  const onsiteDays = daysMatch ? Number(daysMatch[1]) : null;
  if (/(hybrid|ket hop (lam viec )?(tai )?van phong|linh hoat giua van phong)/.test(n)) {
    return { mode: "hybrid", onsiteDays, text: "Hybrid" };
  }
  if (/(full[- ]?remote|100% remote|lam viec tu xa|work from home|\bwfh\b|remote)/.test(n)) {
    return { mode: "remote", onsiteDays: null, text: "Remote" };
  }
  if (/(onsite|on-site|lam viec tai van phong|tai van phong|at the office|lam viec tai cong ty|lam viec truc tiep)/.test(n)) {
    let days = onsiteDays;
    if (days === null && /(thu 2|t2)\s*(?:-|–|den)\s*(thu 6|t6)/.test(n)) days = 5;
    if (days === null && /(thu 2|t2)\s*(?:-|–|den)\s*(thu 7|t7)/.test(n)) days = 6;
    return { mode: "onsite", onsiteDays: days, text: "Onsite" };
  }
  return null;
}

function parseHours(full: string): string | null {
  const t = full.replace(/\r/g, "");
  const m = /(\d{1,2})\s*(?:h|:|g|giờ)\s*(\d{2})?\s*(?:-|–|—|đến|den|to)\s*(\d{1,2})\s*(?:h|:|g|giờ)\s*(\d{2})?/i.exec(t);
  const days = /(thứ\s*2|t2|monday|mon)\s*(?:-|–|—|đến|to)\s*(thứ\s*[67]|t[67]|friday|saturday|fri|sat)/i.exec(t);
  if (!m && !days) return null;
  const hours = m ? `${m[1]}h${m[2] ?? ""} – ${m[3]}h${m[4] ?? ""}` : "";
  const d = days ? `${days[1].replace(/\s+/g, " ")} – ${days[2].replace(/\s+/g, " ")}` : "";
  return [hours, d].filter(Boolean).join(", ");
}

function parseGrowth(text: string): JobConditions["growth"] {
  const n = norm(text);
  const g = {
    training: /(dao tao|training|khoa hoc noi bo|onboarding bai ban)/.test(n),
    promotion: /(thang tien|lo trinh phat trien|lo trinh su nghiep|career path|promotion|co hoi phat trien)/.test(n),
    mentor: /(mentor|kem cap|huong dan truc tiep|coaching)/.test(n),
    learningBudget: /(ngan sach hoc|hoc phi|learning budget|tai tro (khoa hoc|chung chi)|ho tro chi phi (hoc|khoa hoc|chung chi)|ho tro thi chung chi)/.test(n),
  };
  if (!g.training && !g.promotion && !g.mentor && !g.learningBudget) return null;
  return { ...g, text: "" };
}

export function inferSeniority(requirements: Requirement[], full: string): Seniority {
  const years = requirements.filter((r) => r.minYears !== null).map((r) => r.minYears!);
  const yearsMin = years.length ? Math.max(...years) : null;
  const n = norm(full);
  if (yearsMin === null) {
    if (/(thuc tap|intern|sinh vien nam)/.test(n)) return { level: "intern", yearsMin: null, basis: "JD tuyển thực tập / sinh viên, không yêu cầu số năm kinh nghiệm." };
    if (/(khong yeu cau kinh nghiem|chua co kinh nghiem|moi tot nghiep|fresher)/.test(n)) return { level: "fresher", yearsMin: null, basis: "JD không yêu cầu kinh nghiệm hoặc nhận người mới tốt nghiệp." };
    return { level: "unknown", yearsMin: null, basis: "JD không nêu số năm kinh nghiệm — không suy ra từ tên chức danh." };
  }
  const basis = `Suy ra từ số năm kinh nghiệm yêu cầu (${yearsMin} năm), không phải từ tên chức danh.`;
  if (yearsMin < 1) return { level: "fresher", yearsMin, basis };
  if (yearsMin < 3) return { level: "junior", yearsMin, basis };
  if (yearsMin < 5) return { level: "mid", yearsMin, basis };
  return { level: "senior", yearsMin, basis };
}

function parseValidThrough(text: string): string | null {
  const m = /(hạn nộp|han nop|deadline|hạn chót|han chot|hạn ứng tuyển)[^0-9]{0,20}(\d{1,2})\/(\d{1,2})\/(\d{4})/i.exec(text);
  if (!m) return null;
  return `${m[4]}-${m[3].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

function guessTitleCompany(lines: RawLine[]): { title: string; company: string } {
  let title = "";
  let company = "";
  for (const l of lines.slice(0, 6)) {
    if (headingOf(l)) break;
    const n = l.norm;
    if (!company && /^(cong ty|cty|company|tap doan|ngan hang)/.test(n)) {
      company = l.text.replace(/^(công ty|cty)\s*:\s*/i, "");
      continue;
    }
    const at = /^(.{3,80}?)\s+(?:tại|tai|at|-|–|—|\|)\s+((?:công ty|cty|company|tập đoàn)?.{2,60})$/i.exec(l.text);
    if (!title && at && /(cong ty|cty|company|tap doan|jsc|ltd|group|corp|inc)/.test(norm(at[2]))) {
      title = at[1].trim();
      company = company || at[2].trim();
      continue;
    }
    if (!title && l.text.length <= 80 && !/[:：]$/.test(l.text) && !/\d{3,}/.test(l.text)) title = l.text;
  }
  return { title, company };
}

export function parseJdHeuristic(text: string, hints: { title?: string; company?: string } = {}): JobExtraction {
  const lines = splitLines(text);
  let section: Section = "intro";
  const buckets: Record<Section, RawLine[]> = { intro: [], resp: [], req: [], pref: [], benefit: [], info: [] };
  let sawReqHeading = false;
  for (const l of lines) {
    const h = headingOf(l);
    if (h) {
      section = h;
      if (h === "req" || h === "pref") sawReqHeading = true;
      // "Yêu cầu: Tối thiểu 1 năm..." — tiêu đề và nội dung cùng dòng.
      const rest = l.text.split(/[:：]/).slice(1).join(":").trim();
      if (rest.length > 8) buckets[h].push({ text: rest, norm: norm(rest) });
      continue;
    }
    buckets[section].push(l);
  }

  const isConditionLine = (n: string) => /^(muc luong|luong|salary|thu nhap|tro cap|dia diem|noi lam viec|thoi gian lam viec|han nop|hinh thuc)/.test(n);
  let reqLines: { line: RawLine; forced: "must" | "preferred" | null }[] = [
    ...buckets.req.map((line) => ({ line, forced: null })),
    ...buckets.pref.map((line) => ({ line, forced: "preferred" as const })),
  ];
  if (!sawReqHeading) {
    // Không có tiêu đề "Yêu cầu": lấy các dòng mang dấu hiệu yêu cầu ở bất kỳ đâu.
    reqLines = lines.filter((l) => !headingOf(l) && REQUIREMENT_CUE.test(l.norm) && l.text.length < 220).map((line) => ({ line, forced: null }));
  }

  const requirements: Requirement[] = [];
  for (const { line, forced } of reqLines) {
    if (isConditionLine(line.norm)) continue;
    const level = forced ?? (PREFERRED_CUE.test(line.norm) ? "preferred" : "must");
    const r = classify(line.text, line.norm, level);
    if (r) requirements.push(r);
  }

  const responsibilities = buckets.resp.map((l) => l.text.replace(/[.;]$/, "")).filter((t) => t.length > 5 && !isConditionLine(norm(t)));
  const benefitText = buckets.benefit.map((l) => l.text).join("\n");
  const growth = parseGrowth(buckets.benefit.length ? benefitText : text);
  const location = parseLocation(lines, text);
  const guessed = guessTitleCompany(lines);

  return {
    title: hints.title?.trim() || guessed.title || "Vị trí chưa đặt tên",
    company: hints.company?.trim() || guessed.company || "",
    requirements,
    responsibilities,
    seniority: inferSeniority(requirements, text),
    conditions: {
      salary: parseSalary(text),
      location,
      workMode: parseWorkMode(text),
      hours: parseHours(text),
      benefits: buckets.benefit.length ? buckets.benefit.filter((l) => !isConditionLine(l.norm)).map((l) => l.text.replace(/[.;]$/, "")) : null,
      growth: growth ? { ...growth, text: buckets.benefit.length ? "Theo mục quyền lợi" : "" } : null,
    },
    validThrough: parseValidThrough(text),
  };
}

/**
 * Tính lại các trường suy ra (kỹ năng, số năm, bằng cấp…) khi người dùng sửa một yêu cầu
 * ở màn bóc tách JD. Loại yêu cầu và mức bắt buộc/ưu tiên người dùng chọn được giữ nguyên.
 */
export function deriveRequirement(
  prev: Requirement,
  edit: { text: string; level: Requirement["level"]; kind: RequirementKind; skills?: string[]; minYears?: number | null },
): Requirement {
  const text = edit.text.trim();
  const n = norm(text);
  const auto = classify(text, n, edit.level) ?? { ...prev, text };
  return {
    ...auto,
    id: prev.id,
    text,
    level: edit.level,
    kind: edit.kind,
    skills: edit.skills && edit.skills.length ? edit.skills : auto.skills.length ? auto.skills : findSkillIds(text).map(skillName),
    minYears: edit.kind === "experience" ? (edit.minYears ?? auto.minYears ?? parseMinYears(`${n} kinh nghiem`)) : null,
    degree: edit.kind === "qualification" ? (auto.degree ?? parseDegree(n) ?? "bachelor") : null,
    majors: edit.kind === "qualification" ? (auto.majors.length ? auto.majors : parseMajors(text)) : [],
    language: edit.kind === "language" ? (auto.language ?? findLanguage(text) ?? "english") : null,
    languageTest: edit.kind === "language" ? parseLanguageTest(text) : null,
    domains: edit.kind === "experience" ? findDomainIds(text) : [],
  };
}
