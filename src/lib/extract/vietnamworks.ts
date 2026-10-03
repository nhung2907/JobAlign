import type { JobPostingData } from "./jsonld";

/**
 * VietnamWorks (Next.js App Router) không có JSON-LD: tin tuyển dụng nằm trong luồng RSC
 * `self.__next_f.push([1, "..."])` của trang. Luồng gồm các dòng `id:json\n` và khối văn bản
 * `id:T<độ dài byte hex>,<nội dung>`; giá trị "$id" trỏ sang dòng khác.
 */

type Json = Record<string, unknown>;

function flightText(html: string): string {
  let flight = "";
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try {
      flight += JSON.parse(m[1]) as string;
    } catch {
      return "";
    }
  }
  return flight;
}

/** Link sai slug trả 200 kèm lệnh chuyển hướng phía client (`NEXT_REDIRECT`) sang link chuẩn. */
export function nextRedirect(html: string): string | null {
  if (!html.includes("NEXT_REDIRECT")) return null;
  return /NEXT_REDIRECT;(?:replace|push);([^;]+);30[78]/.exec(flightText(html))?.[1] ?? null;
}

function decodeFlight(html: string): Map<string, string> | null {
  const flight = flightText(html);
  if (!flight) return null;
  const buf = Buffer.from(flight, "utf8");
  const rows = new Map<string, string>();
  let pos = 0;
  while (pos < buf.length) {
    const colon = buf.indexOf(0x3a, pos);
    if (colon < 0) break;
    const id = buf.toString("utf8", pos, colon);
    if (!/^[0-9a-f]+$/.test(id)) break;
    if (buf[colon + 1] === 0x54) {
      // Khối văn bản: độ dài tính theo byte UTF-8, không có dấu xuống dòng kết thúc.
      const comma = buf.indexOf(0x2c, colon);
      const len = parseInt(buf.toString("utf8", colon + 2, comma), 16);
      if (comma < 0 || !Number.isFinite(len)) break;
      rows.set(id, JSON.stringify(buf.toString("utf8", comma + 1, comma + 1 + len)));
      pos = comma + 1 + len;
      continue;
    }
    const nl = buf.indexOf(0x0a, colon);
    const end = nl < 0 ? buf.length : nl;
    rows.set(id, buf.toString("utf8", colon + 1, end));
    pos = end + 1;
  }
  return rows;
}

function resolver(rows: Map<string, string>) {
  const cache = new Map<string, unknown>();
  const resolve = (v: unknown, depth = 0): unknown => {
    if (depth > 8) return v;
    if (typeof v === "string") {
      const ref = /^\$([0-9a-f]+)$/.exec(v)?.[1];
      if (!ref) return v;
      if (!cache.has(ref)) {
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(rows.get(ref) ?? "null");
        } catch {
          // Dòng không phải JSON (module, gợi ý tải trước…) — bỏ qua.
        }
        cache.set(ref, resolve(parsed, depth + 1));
      }
      return cache.get(ref);
    }
    if (Array.isArray(v)) return v.map((x) => resolve(x, depth + 1));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x, depth + 1)]));
    return v;
  };
  return resolve;
}

function findJob(node: unknown, jobId: number | null): Json | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findJob(n, jobId);
      if (f) return f;
    }
    return null;
  }
  const obj = node as Json;
  if ("jobDescription" in obj && "jobTitle" in obj && (jobId === null || obj.jobId === jobId)) return obj;
  for (const v of Object.values(obj)) {
    const f = findJob(v, jobId);
    if (f) return f;
  }
  return null;
}

const str = (x: unknown) => (typeof x === "string" ? x : "");
const list = (x: unknown) => (Array.isArray(x) ? (x as Json[]) : []);

export function extractVietnamWorks(html: string, url: string): JobPostingData | null {
  const rows = decodeFlight(html);
  if (!rows) return null;
  const idMatch = /-(\d+)-jv\b/.exec(url)?.[1];
  const jobId = idMatch ? Number(idMatch) : null;
  const resolve = resolver(rows);
  let raw: Json | null = null;
  for (const text of rows.values()) {
    if (!text.includes('"jobDescription"')) continue;
    try {
      raw = findJob(JSON.parse(text), jobId);
    } catch {
      continue;
    }
    if (raw) break;
  }
  if (!raw) return null;
  const job = resolve(raw) as Json;

  const benefits = list(job.benefits)
    .map((b) => [str(b.benefitNameVI) || str(b.benefitName), str(b.benefitValue)].filter(Boolean).join(": "))
    .filter(Boolean);
  const description = [
    "<h3>Mô tả công việc</h3>",
    str(job.jobDescription),
    "<h3>Yêu cầu công việc</h3>",
    str(job.jobRequirement),
    benefits.length ? `<h3>Phúc lợi</h3><ul>${benefits.map((b) => `<li>${b}</li>`).join("")}</ul>` : "",
  ].join("\n");

  const min = Number(job.salaryMin) || null;
  const max = Number(job.salaryMax) || null;
  const salary = job.isSalaryVisible !== false && (min || max) ? { min, max, currency: str(job.salaryCurrency) || "VND", unit: "MONTH" } : null;
  const locations = list(job.workingLocations)
    .map((l) => str(l.cityNameVI) || str(l.cityName))
    .filter((l, i, all) => l && all.indexOf(l) === i);
  const skills = list(job.skills)
    .map((s) => str(s.skillName))
    .filter(Boolean)
    .join(", ");

  return {
    title: str(job.jobTitle),
    company: str(job.companyName),
    descriptionHtml: description,
    salary,
    locations,
    remote: false,
    employmentType: null,
    validThrough: str(job.expiredOn) || null,
    skills: skills || null,
  };
}
