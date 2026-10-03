import "server-only";
import { nextRedirect } from "./vietnamworks";

/**
 * Lấy trang tin tuyển dụng từ URL người dùng dán vào (07-lua-chon-cong-nghe.md, trường hợp 1).
 * Chống SSRF: chỉ HTTPS, chỉ domain trong whitelist, tự theo redirect và kiểm tra lại từng bước,
 * timeout 15 giây. Dùng impit (giả TLS Chrome) khi có, nếu không thì fetch thường.
 */

export const ALLOWED_DOMAINS = [
  "itviec.com",
  "topdev.vn",
  "vietnamworks.com",
  "careerlink.vn",
  "topcv.vn",
  "jobsgo.vn",
  "glints.com",
  "careerviet.vn",
  "linkedin.com",
];

const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 4;
const MAX_BYTES = 3 * 1024 * 1024;

export class ImportError extends Error {
  constructor(
    message: string,
    public code: "invalid_url" | "not_allowed" | "blocked" | "not_found" | "network",
  ) {
    super(message);
  }
}

export function isAllowedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  return ALLOWED_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`));
}

/** Chuẩn hoá URL theo nguồn; LinkedIn chuyển sang endpoint guest công khai. */
export function normalizeJobUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ImportError("Đường dẫn không hợp lệ.", "invalid_url");
  }
  if (url.protocol !== "https:") throw new ImportError("Chỉ nhận đường dẫn HTTPS.", "invalid_url");
  if (url.username || url.password || (url.port && url.port !== "443")) throw new ImportError("Đường dẫn không hợp lệ.", "invalid_url");
  if (!isAllowedHost(url.hostname)) {
    throw new ImportError(`Chưa hỗ trợ trang này. Các trang hỗ trợ: ${ALLOWED_DOMAINS.join(", ")}.`, "not_allowed");
  }
  if (url.hostname.endsWith("linkedin.com")) {
    const id = /\/jobs\/view\/(?:[^/]*-)?(\d+)/.exec(url.pathname)?.[1] ?? url.searchParams.get("currentJobId");
    if (!id || !/^\d+$/.test(id)) throw new ImportError("Không tìm thấy mã tin trong đường dẫn LinkedIn.", "invalid_url");
    return new URL(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`);
  }
  url.hash = "";
  return url;
}

interface Fetched {
  status: number;
  location: string | null;
  body: string;
}

type Fetcher = (url: string) => Promise<Fetched>;

let impitFetcher: Fetcher | null | undefined;

async function getImpit(): Promise<Fetcher | null> {
  if (impitFetcher !== undefined) return impitFetcher;
  try {
    const { Impit } = await import("impit");
    const client = new Impit({ browser: "chrome", timeout: TIMEOUT_MS, followRedirects: false });
    impitFetcher = async (url) => {
      const res = await client.fetch(url);
      return { status: res.status, location: res.headers.get("location"), body: res.status === 200 ? await res.text() : "" };
    };
  } catch {
    impitFetcher = null;
  }
  return impitFetcher;
}

const plainFetch: Fetcher = async (url) => {
  const res = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; JobAlignBot/0.1; student project)",
      "accept-language": "vi,en;q=0.8",
      accept: "text/html,application/xhtml+xml",
    },
  });
  return { status: res.status, location: res.headers.get("location"), body: res.status === 200 ? await res.text() : "" };
};

export async function fetchJobPage(raw: string): Promise<{ html: string; finalUrl: string }> {
  let url = normalizeJobUrl(raw);
  const fetcher = (await getImpit()) ?? plainFetch;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: Fetched;
    try {
      res = await fetcher(url.toString());
    } catch {
      throw new ImportError("Không kết nối được tới trang tuyển dụng (quá 15 giây hoặc lỗi mạng).", "network");
    }
    if (res.status >= 300 && res.status < 400 && res.location) {
      const next = new URL(res.location, url);
      if (next.protocol !== "https:" || !isAllowedHost(next.hostname)) {
        throw new ImportError("Trang chuyển hướng ra ngoài phạm vi cho phép.", "not_allowed");
      }
      url = next;
      continue;
    }
    if (res.status === 404 || res.status === 410) throw new ImportError("Tin tuyển dụng không còn tồn tại hoặc đã hết hạn.", "not_found");
    if (res.status === 403 || res.status === 429) throw new ImportError("Trang tuyển dụng chặn truy cập tự động.", "blocked");
    if (res.status !== 200) throw new ImportError(`Trang trả về lỗi ${res.status}.`, "network");
    if (res.body.length > MAX_BYTES) throw new ImportError("Trang quá lớn.", "network");
    const soft = nextRedirect(res.body);
    if (soft) {
      const next = new URL(soft, url);
      if (next.protocol !== "https:" || !isAllowedHost(next.hostname)) {
        throw new ImportError("Trang chuyển hướng ra ngoài phạm vi cho phép.", "not_allowed");
      }
      if (next.toString() !== url.toString()) {
        url = next;
        continue;
      }
    }
    return { html: res.body, finalUrl: url.toString() };
  }
  throw new ImportError("Trang chuyển hướng quá nhiều lần.", "network");
}
