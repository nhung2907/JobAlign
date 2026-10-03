import * as cheerio from "cheerio";

/** Các trường cần dùng từ schema.org/JobPosting (07-lua-chon-cong-nghe.md, mục 4). */
export interface JobPostingData {
  title: string;
  company: string;
  descriptionHtml: string;
  salary: { min: number | null; max: number | null; currency: string; unit: string } | null;
  locations: string[];
  remote: boolean;
  employmentType: string | null;
  validThrough: string | null;
  skills: string | null;
}

type Json = Record<string, unknown>;

function asArray<T>(x: T | T[] | undefined | null): T[] {
  return x === undefined || x === null ? [] : Array.isArray(x) ? x : [x];
}

function str(x: unknown): string {
  return typeof x === "string" ? x : typeof x === "number" ? String(x) : "";
}

function findPosting(node: unknown): Json | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findPosting(n);
      if (f) return f;
    }
    return null;
  }
  const obj = node as Json;
  const types = asArray(obj["@type"] as string | string[]);
  if (types.includes("JobPosting")) return obj;
  if (obj["@graph"]) return findPosting(obj["@graph"]);
  return null;
}

export function extractJobPosting(html: string): JobPostingData | null {
  const $ = cheerio.load(html);
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    const raw = $(el).contents().text().trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const jp = findPosting(parsed);
    if (!jp) continue;
    const org = jp.hiringOrganization as Json | string | undefined;
    const base = jp.baseSalary as Json | undefined;
    const value = (base?.value ?? null) as Json | number | null;
    let salary: JobPostingData["salary"] = null;
    if (base && value !== null) {
      const v = typeof value === "number" ? { value } : value;
      const min = Number(v.minValue ?? v.value ?? NaN);
      const max = Number(v.maxValue ?? v.value ?? NaN);
      if (Number.isFinite(min) || Number.isFinite(max)) {
        salary = {
          min: Number.isFinite(min) ? min : null,
          max: Number.isFinite(max) ? max : null,
          currency: str(base.currency) || "VND",
          unit: str(v.unitText) || "MONTH",
        };
      }
    }
    const locations = asArray(jp.jobLocation as Json | Json[])
      .map((loc) => {
        const a = (loc?.address ?? {}) as Json;
        return [str(a.streetAddress), str(a.addressLocality), str(a.addressRegion)].filter(Boolean).join(", ");
      })
      .filter(Boolean);
    return {
      title: str(jp.title),
      company: typeof org === "string" ? org : str(org?.name),
      descriptionHtml: [str(jp.description), str(jp.qualifications), str(jp.responsibilities)].filter(Boolean).join("\n"),
      salary,
      locations,
      remote: str(jp.jobLocationType).toUpperCase() === "TELECOMMUTE",
      employmentType: asArray(jp.employmentType as string | string[]).join(", ") || null,
      validThrough: str(jp.validThrough) || null,
      skills: str(jp.skills) || null,
    };
  }
  return null;
}

/** HTML → văn bản giữ xuống dòng theo khối, để bộ bóc tách nhận ra mục và gạch đầu dòng. */
export function htmlToText(html: string): string {
  const $ = cheerio.load(`<div id="__root">${html}</div>`);
  $("script, style, noscript, svg, nav, header, footer, form, iframe").remove();
  $("br").replaceWith("\n");
  $("li").each((_, el) => {
    $(el).prepend("- ");
    $(el).append("\n");
  });
  $("p, div, h1, h2, h3, h4, h5, h6, tr, section, article, ul, ol").each((_, el) => {
    $(el).append("\n");
  });
  return $("#__root")
    .text()
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fmtMoney(n: number): string {
  return Math.round(n).toLocaleString("de-DE");
}

/** Dựng lại văn bản JD từ JSON-LD để đi qua cùng bộ bóc tách với JD dán tay. */
export function jobPostingToText(jp: JobPostingData): string {
  const lines = [jp.title, jp.company, "", htmlToText(jp.descriptionHtml)];
  if (jp.skills) lines.push("", `Kỹ năng: ${htmlToText(jp.skills)}`);
  lines.push("", "Thông tin chung:");
  if (jp.salary) {
    const { min, max, currency } = jp.salary;
    const range = min !== null && max !== null && min !== max ? `${fmtMoney(min)} - ${fmtMoney(max)}` : fmtMoney((min ?? max)!);
    lines.push(`- Mức lương: ${min === null && max !== null ? "lên đến " : ""}${range} ${currency}`);
  }
  if (jp.locations.length) lines.push(`- Địa điểm làm việc: ${jp.locations.join("; ")}`);
  if (jp.remote) lines.push("- Hình thức: Remote");
  if (jp.validThrough) {
    const d = new Date(jp.validThrough);
    if (!Number.isNaN(d.getTime())) lines.push(`- Hạn nộp: ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`);
  }
  return lines.join("\n").trim();
}

/** Khi trang không có JSON-LD: lấy văn bản vùng nội dung chính. */
export function pageToText(html: string): string {
  const $ = cheerio.load(html);
  const main = $("main").first().html() ?? $("article").first().html() ?? $("body").html() ?? "";
  return htmlToText(main).slice(0, 20000);
}
