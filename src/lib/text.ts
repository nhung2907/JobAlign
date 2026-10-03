/** Chuẩn hoá chuỗi để so khớp: bỏ dấu tiếng Việt, chữ thường, gộp khoảng trắng. */
export function norm(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/** Regex tìm một cụm đã chuẩn hoá, có ranh giới từ (không khớp "java" trong "javascript"). */
export function phraseRegExp(phrase: string, flags = ""): RegExp {
  return new RegExp(`(?<![a-z0-9])${escapeRegExp(norm(phrase))}(?![a-z0-9])`, flags);
}

export function containsPhrase(normalizedHaystack: string, phrase: string): boolean {
  return phraseRegExp(phrase).test(normalizedHaystack);
}

export function uid(prefix = ""): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return prefix ? `${prefix}_${rand}` : rand;
}

/** Hash nội dung JD để phát hiện JD đã phân tích (NFR-2). FNV-1a 64-bit, đủ cho khử trùng lặp. */
export function contentHash(text: string): string {
  const s = norm(text).replace(/[^a-z0-9]/g, "");
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

export function hasNumber(text: string): boolean {
  return /\d/.test(text);
}

export function clampText(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Tách văn bản thành dòng, bỏ ký hiệu gạch đầu dòng. */
export function toLines(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/^[\s•●○◦▪▫■□✓✔➢➤►▸\-–—*+·]+/, "").replace(/^\d{1,2}[.)]\s+/, "").trim())
    .filter((l) => l.length > 0);
}

const VN_MONTHS = 12;

/** "2024-06" → số tháng tuyệt đối. */
export function ymToIndex(ym: string): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return null;
  return Number(m[1]) * VN_MONTHS + (Number(m[2]) - 1);
}

export function currentYm(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Số tháng giữa hai mốc, tính cả tháng bắt đầu và tháng kết thúc (06/2024–12/2024 = 7). */
export function monthsBetween(start: string | null, end: string | null, now = new Date()): number {
  if (!start) return 0;
  const a = ymToIndex(start);
  const b = ymToIndex(end === "present" || !end ? currentYm(now) : end);
  if (a === null || b === null || b < a) return 0;
  return b - a + 1;
}

/** Gộp các khoảng thời gian chồng nhau để không đếm trùng kinh nghiệm. */
export function mergedMonths(ranges: { start: string | null; end: string | null }[], now = new Date()): number {
  const spans = ranges
    .map((r) => {
      const a = r.start ? ymToIndex(r.start) : null;
      const b = ymToIndex(r.end === "present" || !r.end ? currentYm(now) : r.end);
      return a === null || b === null || b < a ? null : [a, b];
    })
    .filter((x): x is number[] => x !== null)
    .sort((x, y) => x[0] - y[0]);
  let total = 0;
  let cur: number[] | null = null;
  for (const s of spans) {
    if (!cur || s[0] > cur[1] + 1) {
      if (cur) total += cur[1] - cur[0] + 1;
      cur = [s[0], s[1]];
    } else {
      cur[1] = Math.max(cur[1], s[1]);
    }
  }
  if (cur) total += cur[1] - cur[0] + 1;
  return total;
}

export function formatYm(ym: string | null): string {
  if (!ym) return "?";
  if (ym === "present") return "nay";
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  return m ? `${m[2]}/${m[1]}` : ym;
}

export function formatMonths(months: number): string {
  if (months <= 0) return "0 tháng";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} tháng`;
  if (m === 0) return `${y} năm`;
  return `${y} năm ${m} tháng`;
}

export function formatYears(years: number): string {
  return Number.isInteger(years) ? `${years} năm` : `${years.toString().replace(".", ",")} năm`;
}

/** Đọc mốc thời gian dạng "06/2024", "6/2024", "2024", "T6/2024", "Jun 2024". */
export function parseYm(raw: string, endOfYear = false): string | null {
  const s = norm(raw);
  if (/(hien tai|nay|present|now|current)/.test(s)) return "present";
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  let m = /(?:t|thang\s*)?(\d{1,2})\s*[/.\-]\s*(\d{4})/.exec(s);
  if (m) {
    const mm = Number(m[1]);
    if (mm >= 1 && mm <= 12) return `${m[2]}-${String(mm).padStart(2, "0")}`;
  }
  m = /(\d{4})\s*[/.\-]\s*(\d{1,2})(?!\d)/.exec(s);
  if (m) {
    const mm = Number(m[2]);
    if (mm >= 1 && mm <= 12) return `${m[1]}-${String(mm).padStart(2, "0")}`;
  }
  m = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{4})/.exec(s);
  if (m) return `${m[2]}-${String(months[m[1]]).padStart(2, "0")}`;
  m = /(?<!\d)(19|20)(\d{2})(?!\d)/.exec(s);
  if (m) return `${m[1]}${m[2]}-${endOfYear ? "12" : "01"}`;
  return null;
}

const DATE_TOKEN =
  "(?:(?:t|th[aá]ng\\s*)?\\d{1,2}\\s*[/.\\-]\\s*\\d{4}|\\d{4}\\s*[/.\\-]\\s*\\d{1,2}(?!\\d)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?\\s*\\d{4}|(?:19|20)\\d{2})";
const END_TOKEN = `(?:${DATE_TOKEN}|hi[eệ]n\\s*t[aạ]i|nay|present|now|current)`;

/** Tìm khoảng thời gian "06/2024 - 12/2024" trong một dòng. */
export function findDateRange(line: string): { start: string; end: string; match: string } | null {
  const re = new RegExp(`(${DATE_TOKEN})\\s*(?:-|–|—|~|đến|den|to)\\s*(${END_TOKEN})`, "i");
  const m = re.exec(line);
  if (!m) return null;
  const start = parseYm(m[1]);
  const end = parseYm(m[2], true);
  if (!start || start === "present" || !end) return null;
  return { start, end, match: m[0] };
}
