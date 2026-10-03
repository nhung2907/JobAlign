import { norm, phraseRegExp } from "./text";

/**
 * Từ điển kỹ năng chuẩn hoá (Taxonomy — URD R2, giả định G2).
 * Bắt đầu từ một tập nhỏ cho các nhóm ngành mục tiêu: marketing, phân tích dữ liệu / BA,
 * phần mềm, thiết kế, văn phòng và kỹ năng mềm. Alias viết không dấu hoặc có dấu đều được.
 */
export type SkillCategory = "tool" | "hard" | "soft";

export interface SkillDef {
  id: string;
  name: string;
  category: SkillCategory;
  aliases: string[];
}

export const SKILLS: SkillDef[] = [
  // Marketing
  { id: "content-marketing", name: "Content Marketing", category: "hard", aliases: ["content marketing", "viết content", "sáng tạo nội dung", "content creation", "nội dung marketing"] },
  { id: "copywriting", name: "Copywriting", category: "hard", aliases: ["copywriting", "copywriter", "viết quảng cáo"] },
  { id: "seo", name: "SEO", category: "hard", aliases: ["seo", "search engine optimization", "tối ưu công cụ tìm kiếm"] },
  { id: "sem", name: "SEM", category: "hard", aliases: ["sem", "search engine marketing"] },
  { id: "google-analytics", name: "Google Analytics", category: "tool", aliases: ["google analytics", "ga4", "universal analytics"] },
  { id: "google-ads", name: "Google Ads", category: "tool", aliases: ["google ads", "google adwords", "adwords"] },
  { id: "meta-ads", name: "Facebook / Meta Ads", category: "tool", aliases: ["facebook ads", "meta ads", "fb ads", "quảng cáo facebook", "chạy ads facebook"] },
  { id: "tiktok-ads", name: "TikTok Ads", category: "tool", aliases: ["tiktok ads", "quảng cáo tiktok"] },
  { id: "ab-testing", name: "A/B testing", category: "hard", aliases: ["a/b testing", "a/b test", "ab testing", "ab test", "split test", "split testing", "thử nghiệm a/b"] },
  { id: "social-media", name: "Social media", category: "hard", aliases: ["social media", "mạng xã hội", "fanpage", "quản trị fanpage"] },
  { id: "email-marketing", name: "Email marketing", category: "hard", aliases: ["email marketing", "email campaign", "mailchimp"] },
  { id: "digital-marketing", name: "Digital marketing", category: "hard", aliases: ["digital marketing", "marketing online", "marketing số", "tiếp thị số"] },
  { id: "market-research", name: "Nghiên cứu thị trường", category: "hard", aliases: ["nghiên cứu thị trường", "market research", "khảo sát thị trường", "consumer insight"] },
  { id: "brand-management", name: "Quản lý thương hiệu", category: "hard", aliases: ["brand management", "quản lý thương hiệu", "xây dựng thương hiệu", "branding"] },
  { id: "event", name: "Tổ chức sự kiện", category: "hard", aliases: ["tổ chức sự kiện", "event", "sự kiện", "event management"] },
  { id: "pr", name: "PR / Truyền thông", category: "hard", aliases: ["pr", "public relations", "quan hệ công chúng", "truyền thông báo chí"] },
  { id: "campaign-planning", name: "Lập kế hoạch chiến dịch", category: "hard", aliases: ["lên kế hoạch chiến dịch", "lập kế hoạch chiến dịch", "campaign planning", "kế hoạch truyền thông", "kế hoạch marketing", "marketing plan"] },
  { id: "budget-management", name: "Quản lý ngân sách", category: "hard", aliases: ["quản lý ngân sách", "budget management", "ngân sách quảng cáo", "phân bổ ngân sách"] },
  { id: "kpi-reporting", name: "Báo cáo hiệu quả / KPI", category: "hard", aliases: ["báo cáo hiệu quả", "đo lường hiệu quả", "kpi", "báo cáo kpi", "performance report", "reporting"] },
  { id: "crm", name: "CRM", category: "tool", aliases: ["crm", "hubspot", "salesforce"] },
  { id: "wordpress", name: "WordPress", category: "tool", aliases: ["wordpress"] },
  // Thiết kế
  { id: "canva", name: "Canva", category: "tool", aliases: ["canva"] },
  { id: "figma", name: "Figma", category: "tool", aliases: ["figma"] },
  { id: "photoshop", name: "Photoshop", category: "tool", aliases: ["photoshop", "adobe photoshop"] },
  { id: "illustrator", name: "Illustrator", category: "tool", aliases: ["illustrator", "adobe illustrator"] },
  { id: "video-editing", name: "Dựng video", category: "tool", aliases: ["premiere", "adobe premiere", "capcut", "dựng video", "edit video", "video editing", "after effects"] },
  { id: "ui-ux", name: "UI/UX", category: "hard", aliases: ["ui/ux", "ux/ui", "ui ux", "user experience", "thiết kế giao diện", "wireframe", "prototype"] },
  // Dữ liệu & văn phòng
  { id: "excel", name: "Excel", category: "tool", aliases: ["excel", "ms excel", "microsoft excel", "google sheets", "spreadsheet", "pivot table", "vlookup"] },
  { id: "powerpoint", name: "PowerPoint", category: "tool", aliases: ["powerpoint", "power point", "google slides"] },
  { id: "ms-office", name: "Tin học văn phòng", category: "tool", aliases: ["tin học văn phòng", "ms office", "microsoft office", "microsoft word"] },
  { id: "sql", name: "SQL", category: "tool", aliases: ["sql", "mysql", "postgresql", "sql server", "truy vấn dữ liệu"] },
  { id: "python", name: "Python", category: "tool", aliases: ["python", "pandas", "numpy"] },
  { id: "power-bi", name: "Power BI", category: "tool", aliases: ["power bi", "powerbi"] },
  { id: "tableau", name: "Tableau", category: "tool", aliases: ["tableau"] },
  { id: "looker-studio", name: "Looker Studio", category: "tool", aliases: ["looker studio", "data studio", "google data studio", "looker"] },
  { id: "data-analysis", name: "Phân tích dữ liệu", category: "hard", aliases: ["phân tích dữ liệu", "data analysis", "data analytics", "phân tích số liệu", "xử lý dữ liệu"] },
  { id: "data-visualization", name: "Trực quan hoá dữ liệu", category: "hard", aliases: ["trực quan hóa dữ liệu", "trực quan hoá dữ liệu", "data visualization", "dashboard"] },
  { id: "statistics", name: "Thống kê", category: "hard", aliases: ["thống kê", "statistics", "spss", "xác suất thống kê"] },
  { id: "machine-learning", name: "Machine learning", category: "hard", aliases: ["machine learning", "học máy", "deep learning"] },
  { id: "requirement-analysis", name: "Phân tích yêu cầu", category: "hard", aliases: ["phân tích yêu cầu", "requirement analysis", "requirements gathering", "thu thập yêu cầu", "business analysis", "phân tích nghiệp vụ", "brd", "srs"] },
  { id: "user-story", name: "User story", category: "hard", aliases: ["user story", "user stories", "use case"] },
  { id: "process-modeling", name: "Mô hình hoá quy trình (BPMN/UML)", category: "hard", aliases: ["bpmn", "uml", "mô hình hóa quy trình", "process modeling", "flowchart", "sơ đồ quy trình"] },
  { id: "agile", name: "Agile / Scrum", category: "hard", aliases: ["agile", "scrum", "kanban"] },
  { id: "jira", name: "Jira", category: "tool", aliases: ["jira", "confluence"] },
  { id: "project-management", name: "Quản lý dự án", category: "hard", aliases: ["quản lý dự án", "project management", "điều phối dự án"] },
  { id: "accounting", name: "Kế toán", category: "hard", aliases: ["kế toán", "accounting", "misa", "báo cáo tài chính", "financial statement"] },
  { id: "financial-analysis", name: "Phân tích tài chính", category: "hard", aliases: ["phân tích tài chính", "financial analysis", "financial modeling", "mô hình tài chính"] },
  { id: "sales", name: "Bán hàng", category: "hard", aliases: ["bán hàng", "sales", "telesales", "tư vấn bán hàng", "chăm sóc khách hàng", "customer service"] },
  { id: "recruitment", name: "Tuyển dụng", category: "hard", aliases: ["tuyển dụng", "recruitment", "recruiting", "talent acquisition"] },
  // Phần mềm
  { id: "javascript", name: "JavaScript", category: "tool", aliases: ["javascript", "js", "es6"] },
  { id: "typescript", name: "TypeScript", category: "tool", aliases: ["typescript"] },
  { id: "react", name: "React", category: "tool", aliases: ["react", "reactjs", "react.js", "next.js", "nextjs"] },
  { id: "nodejs", name: "Node.js", category: "tool", aliases: ["node.js", "nodejs", "express", "nestjs"] },
  { id: "java", name: "Java", category: "tool", aliases: ["java", "spring boot", "spring"] },
  { id: "csharp", name: "C# / .NET", category: "tool", aliases: ["c#", ".net", "asp.net", "dotnet"] },
  { id: "php", name: "PHP", category: "tool", aliases: ["php", "laravel"] },
  { id: "html-css", name: "HTML/CSS", category: "tool", aliases: ["html", "css", "html/css", "tailwind"] },
  { id: "git", name: "Git", category: "tool", aliases: ["git", "github", "gitlab"] },
  { id: "docker", name: "Docker", category: "tool", aliases: ["docker", "kubernetes"] },
  { id: "cloud", name: "Cloud (AWS/GCP/Azure)", category: "tool", aliases: ["aws", "gcp", "azure", "google cloud", "cloud"] },
  { id: "testing", name: "Kiểm thử phần mềm", category: "hard", aliases: ["kiểm thử", "software testing", "tester", "qa", "qc", "test case", "automation test"] },
  { id: "rest-api", name: "REST API", category: "tool", aliases: ["rest api", "restful", "restful api"] },
  // Kỹ năng mềm
  { id: "communication", name: "Giao tiếp", category: "soft", aliases: ["giao tiếp", "communication", "communication skills"] },
  { id: "teamwork", name: "Làm việc nhóm", category: "soft", aliases: ["làm việc nhóm", "teamwork", "team work", "phối hợp", "collaboration"] },
  { id: "presentation", name: "Thuyết trình", category: "soft", aliases: ["thuyết trình", "presentation", "trình bày"] },
  { id: "problem-solving", name: "Giải quyết vấn đề", category: "soft", aliases: ["giải quyết vấn đề", "problem solving", "problem-solving"] },
  { id: "time-management", name: "Quản lý thời gian", category: "soft", aliases: ["quản lý thời gian", "time management", "sắp xếp công việc"] },
  { id: "negotiation", name: "Đàm phán", category: "soft", aliases: ["đàm phán", "negotiation", "thương lượng"] },
  { id: "analytical-thinking", name: "Tư duy phân tích", category: "soft", aliases: ["tư duy phân tích", "analytical thinking", "analytical skills", "tư duy logic", "logical thinking", "critical thinking"] },
  { id: "pressure", name: "Chịu áp lực", category: "soft", aliases: ["chịu áp lực", "chịu được áp lực", "work under pressure", "áp lực cao"] },
  { id: "detail", name: "Cẩn thận, tỉ mỉ", category: "soft", aliases: ["cẩn thận", "tỉ mỉ", "attention to detail", "detail-oriented"] },
  { id: "proactive", name: "Chủ động", category: "soft", aliases: ["chủ động", "proactive", "tự giác", "self-motivated"] },
  { id: "creativity", name: "Sáng tạo", category: "soft", aliases: ["sáng tạo", "creative", "creativity"] },
  { id: "leadership", name: "Lãnh đạo", category: "soft", aliases: ["lãnh đạo", "leadership", "dẫn dắt", "quản lý đội", "quản lý nhóm", "team lead"] },
  { id: "learning", name: "Ham học hỏi", category: "soft", aliases: ["ham học hỏi", "học hỏi nhanh", "fast learner", "willing to learn", "cầu tiến"] },
];

const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

interface CompiledAlias {
  id: string;
  alias: string;
  re: RegExp;
}

let compiled: CompiledAlias[] | null = null;

function aliases(): CompiledAlias[] {
  if (!compiled) {
    compiled = SKILLS.flatMap((s) =>
      [s.name, ...s.aliases].map((a) => ({ id: s.id, alias: norm(a), re: phraseRegExp(a) })),
    ).sort((a, b) => b.alias.length - a.alias.length);
  }
  return compiled;
}

/** Id kỹ năng cho các tên không có trong taxonomy — vẫn so khớp được theo đúng tên. */
export function adHocSkillId(name: string): string {
  return `x:${norm(name)}`;
}

/** Tìm mọi kỹ năng taxonomy xuất hiện trong một đoạn văn bản. */
export function findSkillIds(text: string): string[] {
  const n = norm(text);
  const found: string[] = [];
  let rest = n;
  for (const a of aliases()) {
    if (a.re.test(rest)) {
      if (!found.includes(a.id)) found.push(a.id);
      // Xoá cụm đã khớp để alias ngắn hơn không khớp lại bên trong cụm dài.
      rest = rest.replace(new RegExp(a.re.source, "g"), " ");
    }
  }
  return found;
}

/** Chuẩn hoá tên kỹ năng về id taxonomy; tên lạ giữ nguyên dưới dạng id ad-hoc. */
export function resolveSkill(name: string): string {
  const n = norm(name);
  const exact = aliases().find((a) => a.alias === n);
  if (exact) return exact.id;
  const inside = findSkillIds(name);
  if (inside.length === 1) return inside[0];
  return adHocSkillId(name);
}

export function skillDef(id: string): SkillDef | undefined {
  return SKILL_BY_ID.get(id);
}

export function skillName(id: string): string {
  return SKILL_BY_ID.get(id)?.name ?? id.replace(/^x:/, "");
}

/** Các cụm dùng để tìm bằng chứng cho một kỹ năng trong văn bản CV. */
export function skillPatterns(id: string): RegExp[] {
  const def = SKILL_BY_ID.get(id);
  if (!def) return [phraseRegExp(id.replace(/^x:/, ""))];
  return [def.name, ...def.aliases].map((a) => phraseRegExp(a));
}

export function mentionsSkill(text: string, id: string): boolean {
  const n = norm(text);
  return skillPatterns(id).some((re) => re.test(n));
}

export function isSoftSkill(id: string): boolean {
  return SKILL_BY_ID.get(id)?.category === "soft";
}

/* ---------------------------------------------------------------- Ngành / lĩnh vực */

export const DOMAINS: { id: string; name: string; aliases: string[] }[] = [
  { id: "retail", name: "Bán lẻ", aliases: ["bán lẻ", "retail", "chuỗi cửa hàng", "siêu thị"] },
  { id: "ecommerce", name: "Thương mại điện tử", aliases: ["thương mại điện tử", "tmđt", "e-commerce", "ecommerce", "shopee", "lazada", "tiki", "sàn tmđt"] },
  { id: "fmcg", name: "FMCG", aliases: ["fmcg", "hàng tiêu dùng nhanh", "hàng tiêu dùng"] },
  { id: "finance", name: "Tài chính – Ngân hàng", aliases: ["ngân hàng", "banking", "tài chính", "fintech", "bảo hiểm", "chứng khoán"] },
  { id: "education", name: "Giáo dục", aliases: ["giáo dục", "education", "edtech", "trung tâm anh ngữ"] },
  { id: "logistics", name: "Logistics", aliases: ["logistics", "vận tải", "chuỗi cung ứng", "supply chain", "xuất nhập khẩu"] },
  { id: "real-estate", name: "Bất động sản", aliases: ["bất động sản", "real estate"] },
  { id: "healthcare", name: "Y tế", aliases: ["y tế", "healthcare", "dược", "bệnh viện", "pharma"] },
  { id: "tech", name: "Công nghệ", aliases: ["công nghệ thông tin", "phần mềm", "software", "saas", "startup công nghệ"] },
  { id: "fnb", name: "F&B", aliases: ["f&b", "nhà hàng", "đồ uống", "food and beverage", "chuỗi cà phê"] },
  { id: "agency", name: "Agency", aliases: ["agency", "digital agency", "creative agency"] },
];

export function findDomainIds(text: string): string[] {
  const n = norm(text);
  return DOMAINS.filter((d) => d.aliases.some((a) => phraseRegExp(a).test(n))).map((d) => d.id);
}

export function domainName(id: string): string {
  return DOMAINS.find((d) => d.id === id)?.name ?? id;
}

/* ---------------------------------------------------------------- Ngoại ngữ */

export const LANGUAGES: { id: string; name: string; aliases: string[]; tests: string[] }[] = [
  { id: "english", name: "Tiếng Anh", aliases: ["tiếng anh", "english", "anh văn", "ngoại ngữ"], tests: ["ielts", "toeic", "toefl", "cambridge", "sat"] },
  { id: "japanese", name: "Tiếng Nhật", aliases: ["tiếng nhật", "japanese"], tests: ["jlpt", "n1", "n2", "n3", "n4", "n5"] },
  { id: "korean", name: "Tiếng Hàn", aliases: ["tiếng hàn", "korean"], tests: ["topik"] },
  { id: "chinese", name: "Tiếng Trung", aliases: ["tiếng trung", "chinese", "tiếng hoa"], tests: ["hsk"] },
  { id: "french", name: "Tiếng Pháp", aliases: ["tiếng pháp", "french"], tests: ["delf", "dalf"] },
];

export function findLanguage(text: string): string | null {
  const n = norm(text);
  for (const l of LANGUAGES) {
    if (l.aliases.some((a) => a !== "ngoại ngữ" && phraseRegExp(a).test(n))) return l.id;
    if (l.tests.some((t) => phraseRegExp(t).test(n))) return l.id;
  }
  if (phraseRegExp("ngoại ngữ").test(n)) return "english";
  return null;
}

export function languageName(id: string): string {
  return LANGUAGES.find((l) => l.id === id)?.name ?? id;
}

/** Ngưỡng "sử dụng tốt" mặc định khi JD không nêu điểm cụ thể. */
export const LANGUAGE_GOOD_LEVEL: Record<string, number> = {
  ielts: 6.0,
  toeic: 650,
  toefl: 80,
  topik: 4,
  hsk: 4,
};

/** Đọc điểm chứng chỉ ngoại ngữ trong chuỗi: "IELTS 7.0", "TOEIC 750", "JLPT N2". */
export function parseLanguageTest(text: string): { test: string; score: number } | null {
  const n = norm(text);
  let m = /(ielts|toeic|toefl|topik|hsk)[^0-9]{0,12}(\d+(?:[.,]\d)?)/.exec(n);
  if (m) return { test: m[1], score: Number(m[2].replace(",", ".")) };
  m = /(?:jlpt\s*)?(?<![a-z0-9])n([1-5])(?![0-9])/.exec(n);
  if (m && /(jlpt|tieng nhat|japanese|(?<![a-z0-9])n[1-5](?![0-9]))/.test(n)) return { test: "jlpt", score: 6 - Number(m[1]) };
  return null;
}

/* ---------------------------------------------------------------- Địa điểm */

export const CITIES: { id: string; name: string; aliases: string[]; districts: string[] }[] = [
  {
    id: "hanoi",
    name: "Hà Nội",
    aliases: ["hà nội", "ha noi", "hanoi", "hn"],
    districts: ["Ba Đình", "Hoàn Kiếm", "Tây Hồ", "Long Biên", "Cầu Giấy", "Đống Đa", "Hai Bà Trưng", "Hoàng Mai", "Thanh Xuân", "Nam Từ Liêm", "Bắc Từ Liêm", "Hà Đông"],
  },
  {
    id: "hcm",
    name: "TP. Hồ Chí Minh",
    aliases: ["hồ chí minh", "tp.hcm", "tp hcm", "tphcm", "hcm", "hcmc", "sài gòn", "saigon", "ho chi minh"],
    districts: ["Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 7", "Quận 10", "Bình Thạnh", "Phú Nhuận", "Tân Bình", "Gò Vấp", "Thủ Đức", "Tân Phú"],
  },
  { id: "danang", name: "Đà Nẵng", aliases: ["đà nẵng", "da nang", "danang"], districts: ["Hải Châu", "Thanh Khê", "Sơn Trà", "Ngũ Hành Sơn", "Liên Chiểu", "Cẩm Lệ"] },
  { id: "haiphong", name: "Hải Phòng", aliases: ["hải phòng", "hai phong"], districts: [] },
  { id: "cantho", name: "Cần Thơ", aliases: ["cần thơ", "can tho"], districts: [] },
  { id: "binhduong", name: "Bình Dương", aliases: ["bình dương", "binh duong"], districts: [] },
  { id: "dongnai", name: "Đồng Nai", aliases: ["đồng nai", "dong nai", "biên hòa"], districts: [] },
  { id: "bacninh", name: "Bắc Ninh", aliases: ["bắc ninh", "bac ninh"], districts: [] },
  { id: "hungyen", name: "Hưng Yên", aliases: ["hưng yên", "hung yen"], districts: [] },
  { id: "khanhhoa", name: "Khánh Hoà", aliases: ["khánh hòa", "khánh hoà", "nha trang"], districts: [] },
];

export function cityName(id: string): string {
  return CITIES.find((c) => c.id === id)?.name ?? id;
}

export function findCities(text: string): string[] {
  const n = norm(text);
  const hits = CITIES.filter((c) => c.aliases.some((a) => (a === "hn" || a === "hcm" ? phraseRegExp(a).test(n) : n.includes(norm(a)))));
  const ids = hits.map((c) => c.id);
  // Tên quận đặc trưng cũng đủ nhận ra thành phố.
  for (const c of CITIES) {
    if (!ids.includes(c.id) && c.districts.some((d) => !/^quan \d+$/.test(norm(d)) && phraseRegExp(d).test(n))) ids.push(c.id);
  }
  return ids;
}

export function findDistricts(text: string, cityIds: string[]): string[] {
  const n = norm(text);
  const out: string[] = [];
  for (const c of CITIES.filter((x) => cityIds.includes(x.id))) {
    for (const d of c.districts) {
      if (phraseRegExp(d).test(n)) out.push(d);
    }
  }
  return out;
}

/* ---------------------------------------------------------------- Chuyên ngành */

/** Nhóm chuyên ngành gần nhau để so khớp "chuyên ngành Marketing / Truyền thông / Kinh tế". */
export const MAJOR_GROUPS: string[][] = [
  ["marketing", "tiếp thị", "truyền thông", "communication", "quan hệ công chúng", "pr", "báo chí", "digital marketing"],
  ["kinh tế", "economics", "quản trị kinh doanh", "business administration", "kinh doanh", "thương mại", "commerce", "kinh tế đối ngoại", "business"],
  ["tài chính", "finance", "ngân hàng", "banking", "kế toán", "accounting", "kiểm toán"],
  ["công nghệ thông tin", "cntt", "it", "khoa học máy tính", "computer science", "kỹ thuật phần mềm", "software engineering", "hệ thống thông tin", "information systems", "tin học"],
  ["toán", "thống kê", "statistics", "mathematics", "toán tin", "khoa học dữ liệu", "data science"],
  ["thiết kế", "design", "mỹ thuật", "đồ họa"],
  ["ngôn ngữ anh", "english", "ngôn ngữ"],
];

export function majorsMatch(profileMajor: string, jdMajors: string[]): boolean {
  const p = norm(profileMajor);
  if (!p) return false;
  return jdMajors.some((m) => {
    const j = norm(m);
    if (!j) return false;
    if (p.includes(j) || j.includes(p)) return true;
    return MAJOR_GROUPS.some((g) => {
      const inGroup = (x: string) => g.some((k) => phraseRegExp(k).test(x));
      return inGroup(p) && inGroup(j);
    });
  });
}
