import type { Certification, CvExtraction, Education, Experience, Project } from "../schema";
import { findLanguage, parseLanguageTest } from "../taxonomy";
import { findDateRange, norm, parseYm, uid } from "../text";

/**
 * Bộ đọc CV dựa trên quy tắc — dùng khi không có Gemini hoặc Gemini lỗi (NFR-8).
 * Mọi trường không đọc được để trống; người dùng sửa ở màn Hồ sơ năng lực (UR-1.1).
 */

type Section = "header" | "summary" | "education" | "experience" | "activities" | "skills" | "projects" | "certs" | "awards" | "ignore";

const HEADINGS: [Section, RegExp][] = [
  ["education", /^(hoc van|trinh do hoc van|qua trinh hoc tap|education|academic background)$/],
  ["experience", /^(kinh nghiem lam viec|kinh nghiem|work experience|professional experience|experience|employment( history)?|qua trinh cong tac|lich su lam viec)$/],
  ["activities", /^(hoat dong|hoat dong ngoai khoa|activities|extracurricular( activities)?|tinh nguyen|volunteer(ing)?|leadership)$/],
  ["skills", /^(ky nang|cac ky nang|skills|technical skills|ky nang chuyen mon|cong cu|tools|ky nang mem|soft skills)$/],
  ["projects", /^(du an|cac du an|projects|du an ca nhan|personal projects)$/],
  ["certs", /^(chung chi|certifications?|certificates?|ngoai ngu|languages?|chung chi & ngoai ngu|chung chi va ngoai ngu)$/],
  ["awards", /^(giai thuong|thanh tich|awards?|achievements?|honou?rs?( & awards)?|danh hieu)$/],
  ["summary", /^(muc tieu nghe nghiep|muc tieu|gioi thieu( ban than)?|objective|career objective|summary|profile|about me|tom tat)$/],
  ["ignore", /^(thong tin ca nhan|personal (information|details)|lien he|contact|so thich|interests|hobbies|nguoi tham chieu|references?)$/],
];

interface Line {
  text: string;
  norm: string;
  bullet: boolean;
}

const BULLET_RE = /^[\s]*[•●○◦▪▫■□✓✔➢➤►▸\-–—*+·]\s*/;

function toLines(text: string): Line[] {
  const out: Line[] = [];
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const bullet = BULLET_RE.test(raw);
    const t = raw.replace(BULLET_RE, "").trim();
    if (!t) continue;
    const prev = out[out.length - 1];
    // PDF ngắt một câu dài thành nhiều dòng: dòng dài chưa hết câu + dòng sau viết thường → cùng một ý.
    if (prev && !bullet && prev.text.length >= 45 && !/[.!?;:]$/.test(prev.text) && /^\p{Ll}/u.test(t) && !headingOf(prev)) {
      prev.text = `${prev.text} ${t}`;
      prev.norm = norm(prev.text);
      continue;
    }
    out.push({ text: t, norm: norm(t), bullet });
  }
  return out;
}

function headingOf(l: Line): Section | null {
  const n = l.norm.replace(/[:：]$/, "").replace(/[^a-z0-9& ]/g, "").trim();
  if (n.length > 40) return null;
  for (const [s, re] of HEADINGS) if (re.test(n)) return s;
  return null;
}

const COMPANY_CUE = /(cong ty|cty|company|jsc|ltd|tap doan|group|agency|ngan hang|bank|startup|corp|inc\b|clb|cau lac bo|du an|studio|to chuc|vien|truong|trung tam)/;
const SCHOOL_CUE = /(dai hoc|truong|university|college|hoc vien|academy|cao dang|thpt|high school)/;
const ROLE_CUE =
  /\b(intern|internship|thuc tap( sinh)?|analyst|manager|engineer|developer|designer|specialist|executive|assistant|officer|lead|leader|coordinator|consultant|associate|director|staff|nhan vien|chuyen vien|truong nhom|tro giang|tro ly|cong tac vien|ctv|tester|fresher)\b/;
// Mốc tháng/năm (09/2023, Sep 2023) — năm trơn như "2024" hay nằm trong tên giải thưởng nên không tính.
const MONTH_YEAR =
  /(?<!\d)(?:\d{1,2}\s*[/.]\s*\d{4}|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*\d{4})(?!\d)/i;

function splitHeader(text: string): { title: string; company: string } {
  const parts = text
    .split(/\s+(?:—|–|-|\||@|tại|tai|at)\s+|\s*[|,]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const ci = parts.findIndex((p) => COMPANY_CUE.test(norm(p)));
    if (ci >= 0) {
      return { company: parts[ci], title: parts.filter((_, i) => i !== ci).join(" — ") };
    }
    return { title: parts[0], company: parts.slice(1).join(" — ") };
  }
  return COMPANY_CUE.test(norm(text)) ? { title: "", company: text } : { title: text, company: "" };
}

function parseExperience(lines: Line[]): Experience[] {
  const out: Experience[] = [];
  let cur: Experience | null = null;
  let pending: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const range = !l.bullet ? findDateRange(l.text) : null;
    if (range) {
      const rest = l.text.replace(range.match, "").replace(/[()|,\-–—:\s]+$/g, "").replace(/^[()|,\-–—:\s]+/g, "").trim();
      const headerText = rest || pending.join(" — ");
      let { title, company } = splitHeader(headerText);
      // Tiêu đề/công ty có thể nằm ở dòng ngay sau.
      const next = lines[i + 1];
      if (next && !next.bullet && !findDateRange(next.text) && next.text.length < 90) {
        if (!title) {
          title = next.text;
          i++;
        } else if (!company && COMPANY_CUE.test(next.norm)) {
          company = next.text;
          i++;
        } else if (!company && ROLE_CUE.test(next.norm) && !ROLE_CUE.test(norm(title))) {
          // "FPT TELECOM  05/2026 – nay" rồi "IT Business Analyst Intern": dòng đầu là công ty.
          company = title;
          title = next.text;
          i++;
        }
      }
      cur = {
        id: uid("exp"),
        title: title || company || "Vị trí chưa rõ",
        company: title ? company : "",
        start: range.start,
        end: range.end === "present" ? "present" : range.end,
        bullets: [],
        onCv: true,
        source: "cv",
      };
      out.push(cur);
      pending = [];
      continue;
    }
    if (cur && (l.bullet || l.text.length > 60 || /[.;]$/.test(l.text))) {
      cur.bullets.push(l.text);
    } else if (!l.bullet) {
      pending.push(l.text);
      if (pending.length > 2) {
        // Dòng thường không phải tiêu đề mục tiếp theo → là mô tả của mục hiện tại.
        if (cur) cur.bullets.push(pending.shift()!);
        else pending.shift();
      }
    }
  }
  if (cur && pending.length) cur.bullets.push(...pending);
  return out;
}

function parseEducation(lines: Line[]): Education[] {
  const out: Education[] = [];
  let cur: Education | null = null;
  for (const l of lines) {
    const n = l.norm;
    const range = findDateRange(l.text);
    const isSchool = SCHOOL_CUE.test(n) && !/(gpa|diem)/.test(n);
    if (isSchool && (!cur || cur.school)) {
      cur = { id: uid("edu"), degree: "", school: "", major: "", start: null, end: null, gpa: null, source: "cv" };
      out.push(cur);
    }
    if (!cur) {
      cur = { id: uid("edu"), degree: "", school: "", major: "", start: null, end: null, gpa: null, source: "cv" };
      out.push(cur);
    }
    if (range) {
      cur.start = range.start;
      cur.end = range.end;
    } else if (!cur.end) {
      const year = /(?<!\d)(20\d{2}|19\d{2})(?!\d)/.exec(l.text);
      if (year && /(tot nghiep|graduat|du kien|expected)/.test(n)) cur.end = parseYm(year[1], true);
    }
    const gpa = /(gpa|diem trung binh|dtb|cpa)[^0-9]{0,10}(\d(?:[.,]\d{1,2})?)\s*(?:\/\s*(\d+(?:[.,]\d+)?))?/.exec(n);
    if (gpa) cur.gpa = gpa[3] ? `${gpa[2].replace(",", ".")} / ${gpa[3].replace(",", ".")}` : gpa[2].replace(",", ".");
    const text = (range ? l.text.replace(range.match, "").trim() : l.text).replace(/\s*[·|,;]?\s*(gpa|cpa|điểm trung bình|dtb|đtb)\b.*$/i, "").trim();
    if (isSchool && !cur.school) {
      const parts = text.split(/\s+(?:—|–|-|\|)\s+|\s*\|\s*/);
      cur.school = parts.find((p) => SCHOOL_CUE.test(norm(p)))?.trim() ?? text;
      const other = parts.find((p) => !SCHOOL_CUE.test(norm(p)) && p.trim().length > 2);
      if (other && !cur.degree) cur.degree = other.trim();
    }
    const deg = /(cử nhân|cu nhan|kỹ sư|ky su|thạc sĩ|thac si|bachelor|master|engineer|cao đẳng|cao dang)[^,|–—\-]*/i.exec(text);
    if (deg && !cur.degree) cur.degree = deg[0].trim();
    const major = /(?:chuyên ngành|chuyen nganh|ngành|nganh|major)\s*:?\s*([^,|–—(]+)/i.exec(text);
    if (major && !cur.major) cur.major = major[1].trim();
  }
  for (const e of out) {
    if (!e.major && e.degree) {
      const m = /(?:cử nhân|cu nhan|kỹ sư|ky su|thạc sĩ|thac si|bachelor of|master of|bachelor|master)\s+(?:ngành\s+)?(.+)/i.exec(e.degree);
      if (m && m[1].length < 50) {
        e.major = m[1].replace(/^(in|of)\s+/i, "").trim();
        e.degree = e.degree.slice(0, e.degree.length - m[1].length).replace(/\s+(ngành|of|in)$/i, "").trim();
      }
    }
    if (!e.degree) e.degree = e.school ? "Đại học" : "";
  }
  return out.filter((e) => e.school || e.degree);
}

function parseSkills(lines: Line[]): string[] {
  const items: string[] = [];
  for (const l of lines) {
    const body = l.text.includes(":") ? l.text.split(":").slice(1).join(":") : l.text;
    for (const raw of body.split(/[,;•|·]|\s+-\s+|\s+–\s+/)) {
      const s = raw.replace(/[.()]+$/g, "").trim();
      if (s.length >= 2 && s.length <= 40 && !items.some((x) => norm(x) === norm(s))) items.push(s);
    }
  }
  return items;
}

function projectHeader(text: string): { name: string; year: string | null } {
  const range = findDateRange(text);
  const year = /(?<!\d)(20\d{2})(?!\d)/.exec(range ? range.match : text)?.[1] ?? null;
  const name = (range ? text.replace(range.match, "") : text)
    .replace(MONTH_YEAR, "")
    .replace(/[\s(|–—-]*\b20\d{2}\b.*$/, "")
    .replace(/[\s(|,–—:-]+$/, "")
    .trim();
  return { name: name || text, year };
}

function parseProjects(lines: Line[]): Project[] {
  const out: Project[] = [];
  let cur: Project | null = null;
  let roleLine = false;
  const add = (text: string) => {
    if (cur) cur.description = cur.description ? `${cur.description}${/[.!?]$/.test(cur.description) ? "" : "."} ${text}` : text;
  };
  // CV ghi mốc tháng/năm cho từng dự án → chỉ dòng có mốc mới mở dự án mới; các dòng khác
  // (vai trò, mô tả, giải thưởng) thuộc dự án đang đọc.
  const dated = lines.some((l) => !l.bullet && MONTH_YEAR.test(l.norm));
  for (const l of lines) {
    const isHeader = dated
      ? !l.bullet && MONTH_YEAR.test(l.norm)
      : // Dòng ngắn, không kết thúc bằng dấu chấm → tên dự án mới; còn lại là mô tả (PDF hay mất ký hiệu gạch đầu dòng).
        !l.bullet && l.text.length <= 90 && !/[.;]$/.test(l.text);
    if (isHeader || !cur) {
      const { name, year } = projectHeader(l.text);
      cur = { id: uid("prj"), name: isHeader ? name : l.text.slice(0, 80), year, description: isHeader ? "" : l.text, source: "cv" };
      out.push(cur);
      roleLine = isHeader && dated;
    } else if (roleLine && !l.bullet && l.text.length <= 90 && !/[.;]$/.test(l.text) && !cur.description) {
      add(`Vai trò: ${l.text}`);
      roleLine = false;
    } else {
      add(l.text);
      roleLine = false;
    }
  }
  return out;
}

function parseCerts(lines: Line[]): Certification[] {
  return lines
    .flatMap((l) => l.text.split(/\s*[;|]\s*/))
    .filter((t) => t.length > 1)
    .map((t) => {
      const test = parseLanguageTest(t);
      const isLang = !!findLanguage(t) || !!test;
      return {
        id: uid("cert"),
        name: t.replace(/[.]$/, ""),
        kind: isLang ? ("language" as const) : ("cert" as const),
        score: test ? String(test.score) : null,
        source: "cv" as const,
      };
    });
}

export function parseCvHeuristic(text: string): CvExtraction {
  const lines = toLines(text);
  const sections: Record<Section, Line[]> = {
    header: [], summary: [], education: [], experience: [], activities: [], skills: [], projects: [], certs: [], awards: [], ignore: [],
  };
  let sec: Section = "header";
  for (const l of lines) {
    const h = headingOf(l);
    if (h) {
      sec = h;
      continue;
    }
    sections[sec].push(l);
  }

  const email = /[\w.+-]+@[\w-]+(\.[\w-]+)+/.exec(text)?.[0] ?? "";
  const phone = /(?:\+84|0)(?:[\s.]?\d){9,10}/.exec(text)?.[0]?.replace(/\s+/g, " ").trim() ?? "";
  const headerLines = [...sections.header, ...sections.ignore];
  const nameLine = headerLines.find(
    (l) => !/[@\d]/.test(l.text) && l.text.split(/\s+/).length <= 6 && l.text.length >= 4 && !/(cv|curriculum|resume|ho so)/.test(l.norm) && !l.text.includes(":"),
  );

  const projects = [...parseProjects(sections.projects), ...parseProjects(sections.activities)];
  return {
    basics: { name: nameLine?.text ?? "", email, phone },
    education: parseEducation(sections.education),
    experience: parseExperience(sections.experience),
    skills: parseSkills(sections.skills).map((name) => ({ id: uid("skl"), name, source: "cv" as const })),
    projects,
    certifications: parseCerts(sections.certs),
    achievements: sections.awards.map((l) => ({ id: uid("ach"), text: l.text, source: "cv" as const })),
  };
}
