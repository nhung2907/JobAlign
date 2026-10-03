import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findDateRange, mergedMonths } from "../text";
import { parseCvHeuristic } from "./cv-heuristic";
import { fileToText } from "./file-text";
import { parseJdHeuristic, parseSalary } from "./jd-heuristic";
import { extractJobPosting, jobPostingToText } from "./jsonld";
import { extractVietnamWorks, nextRedirect } from "./vietnamworks";

describe("bóc tách JD bằng quy tắc (UR-1.3)", () => {
  const jd = parseJdHeuristic(`Marketing Executive
Công ty D
Yêu cầu:
- Tốt nghiệp đại học chuyên ngành Marketing / Truyền thông
- Tối thiểu 1 năm kinh nghiệm
- Có kinh nghiệm chạy A/B testing
Ưu tiên:
- Tiếng Anh đọc hiểu tài liệu chuyên ngành
Mức lương: 13 - 16 triệu
Địa điểm: Cầu Giấy, Hà Nội
Hình thức: Hybrid — 2 ngày onsite/tuần`);

  it("tách must-have / preferred theo mục", () => {
    expect(jd.requirements.map((r) => [r.kind, r.level])).toEqual([
      ["qualification", "must"],
      ["experience", "must"],
      ["skill", "must"],
      ["language", "preferred"],
    ]);
  });

  it("khoảng số năm lấy cận dưới", () => {
    const years = (line: string) => parseJdHeuristic(`BA\nCông ty E\nYêu cầu:\n- ${line}`).requirements[0]?.minYears;
    expect(years("Có từ 2–4 năm kinh nghiệm làm Business Analyst")).toBe(2);
    expect(years("3 - 5 years of experience in data analysis")).toBe(3);
    expect(years("Tối thiểu 1 năm kinh nghiệm")).toBe(1);
  });

  it("điều kiện làm việc có cấu trúc", () => {
    expect(jd.conditions.salary).toMatchObject({ min: 13, max: 16, currency: "VND" });
    expect(jd.conditions.location).toMatchObject({ cities: ["hanoi"], districts: ["Cầu Giấy"] });
    expect(jd.conditions.workMode).toMatchObject({ mode: "hybrid", onsiteDays: 2 });
  });

  it("thông tin JD không nêu giữ Unknown, không tự điền (UR-1.3.7)", () => {
    expect(jd.conditions.benefits).toBeNull();
    expect(jd.conditions.growth).toBeNull();
    expect(jd.conditions.hours).toBeNull();
  });

  it("seniority suy ra từ số năm kinh nghiệm, không từ chức danh", () => {
    expect(jd.seniority.level).toBe("junior");
    const senior = parseJdHeuristic("Senior Marketing Manager\nYêu cầu:\n- Tốt nghiệp đại học");
    expect(senior.seniority.level).toBe("unknown");
  });

  it("JD nhận sinh viên: chỉ yêu cầu chuyên ngành, không yêu cầu đã có bằng", () => {
    const r = parseJdHeuristic("Yêu cầu:\n- Sinh viên năm cuối hoặc mới tốt nghiệp chuyên ngành Hệ thống thông tin, CNTT").requirements[0];
    expect(r).toMatchObject({ kind: "qualification", degree: null });
    expect(r.majors).toEqual(["Hệ thống thông tin", "CNTT"]);
  });

  it("nhiều cách viết lương", () => {
    expect(parseSalary("Lương: 13.000.000 - 16.000.000 VNĐ")).toMatchObject({ min: 13, max: 16 });
    expect(parseSalary("Salary: $1,000 - $1,500")).toMatchObject({ min: 1000, max: 1500, currency: "USD" });
    expect(parseSalary("Thu nhập: lên đến 20 triệu")).toMatchObject({ min: null, max: 20 });
    expect(parseSalary("Mức lương: Thỏa thuận")).toBeNull();
  });
});

describe("đọc CV (UR-1.1.1)", () => {
  it("đọc CV PDF mẫu thành hồ sơ có cấu trúc", async () => {
    const buf = fs.readFileSync(path.resolve(import.meta.dirname, "../../../public/samples/cv-mau.pdf"));
    const text = await fileToText(new File([buf], "cv-mau.pdf", { type: "application/pdf" }));
    const cv = parseCvHeuristic(text);
    expect(cv.basics.email).toBe("thuha.tran@example.com");
    expect(cv.education[0]).toMatchObject({ school: "Đại học Kinh tế Quốc dân", major: "Hệ thống thông tin quản lý", gpa: "3.52 / 4.0", end: "2025-06" });
    expect(cv.experience.map((e) => [e.title, e.company, e.start, e.end])).toEqual([
      ["Thực tập sinh Business Analyst", "Công ty Cổ phần Phần mềm XYZ", "2025-01", "2025-06"],
      ["Trợ giảng Tin học văn phòng", "Trung tâm Tin học ABC", "2024-07", "2024-12"],
    ]);
    expect(cv.experience[0].bullets).toHaveLength(3);
    expect(cv.skills.map((s) => s.name)).toContain("Power BI");
    expect(cv.projects).toHaveLength(1);
    expect(cv.projects[0].description).toContain("dashboard Power BI");
    expect(cv.certifications.find((c) => c.kind === "language")).toMatchObject({ name: "TOEIC 780", score: "780" });
    expect(cv.achievements).toHaveLength(1);
  });

  it("gộp dòng bị ngắt, tách đúng công ty/vị trí và dự án có mốc tháng", () => {
    const cv = parseCvHeuristic(`NGUYEN TRAM ANH
tramanh@example.com | 0912 345 678
WORK EXPERIENCE
FPT TELECOM 05/2026 - Present
IT Business Analyst Intern
• Workflow Automation: Designed and deployed automated workflows that streamlined cross-functional
processes, eliminating operational bottlenecks and reducing manual execution time by 25%.
• Technical Translation: Translated strategic corporate objectives into actionable technical specifications and
structured database schemas, effectively bridging the gap between business stakeholders and engineering
teams.
PROJECTS
INTELLILEX - AI for Dyslexia Support 09/2023 - 2024
Project manager, UI/ UX Design
Defined and drove the product strategy for an AI-powered learning solution, overseeing the integration of machine
learning to effectively support children with dyslexia.
Top 10 globally - Microsoft Imagine Cup Junior 2024
VNDROPS - Automatic Blood Donation System 09/2023 - 2024
Project manager, UI/UX Design, Resesarch & Development
Directed end-to-end research for a smart matching system, optimizing the logic for donor-recipient matching
and internal workflows`);
    expect(cv.basics.name).toBe("NGUYEN TRAM ANH");
    expect(cv.experience).toHaveLength(1);
    expect(cv.experience[0]).toMatchObject({ title: "IT Business Analyst Intern", company: "FPT TELECOM", start: "2026-05", end: "present" });
    expect(cv.experience[0].bullets).toEqual([
      "Workflow Automation: Designed and deployed automated workflows that streamlined cross-functional processes, eliminating operational bottlenecks and reducing manual execution time by 25%.",
      "Technical Translation: Translated strategic corporate objectives into actionable technical specifications and structured database schemas, effectively bridging the gap between business stakeholders and engineering teams.",
    ]);
    expect(cv.projects.map((p) => [p.name, p.year])).toEqual([
      ["INTELLILEX - AI for Dyslexia Support", "2023"],
      ["VNDROPS - Automatic Blood Donation System", "2023"],
    ]);
    expect(cv.projects[0].description).toMatch(/^Vai trò: Project manager, UI\/ UX Design\. Defined .* children with dyslexia\. Top 10 globally/);
    expect(cv.projects[1].description).toMatch(/donor-recipient matching and internal workflows$/);
  });

  it("từ chối tệp không đúng định dạng", async () => {
    await expect(fileToText(new File(["hello"], "cv.exe", { type: "application/octet-stream" }))).rejects.toThrow();
    await expect(fileToText(new File(["not a pdf at all, just text"], "cv.pdf", { type: "application/pdf" }))).rejects.toThrow();
  });
});

describe("thời gian", () => {
  it("đọc khoảng thời gian nhiều định dạng", () => {
    expect(findDateRange("06/2024 - 12/2024")).toMatchObject({ start: "2024-06", end: "2024-12" });
    expect(findDateRange("T1/2025 – Hiện tại")).toMatchObject({ start: "2025-01", end: "present" });
    expect(findDateRange("Jun 2023 - Aug 2023")).toMatchObject({ start: "2023-06", end: "2023-08" });
  });
  it("gộp khoảng chồng nhau", () => {
    expect(mergedMonths([{ start: "2024-01", end: "2024-06" }, { start: "2024-04", end: "2024-09" }])).toBe(9);
  });
});

describe("JSON-LD JobPosting (nhập JD từ URL)", () => {
  const html = `<html><head><script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "Data Analyst",
    description: "<p>Yêu cầu:</p><ul><li>Thành thạo SQL</li></ul>",
    hiringOrganization: { "@type": "Organization", name: "Công ty X" },
    jobLocation: { "@type": "Place", address: { addressLocality: "Hà Nội", addressRegion: "Hà Nội" } },
    baseSalary: { "@type": "MonetaryAmount", currency: "VND", value: { minValue: 15000000, maxValue: 20000000, unitText: "MONTH" } },
    validThrough: "2026-10-30",
  })}</script></head><body></body></html>`;

  it("đọc trường có cấu trúc, không tốn token", () => {
    const jp = extractJobPosting(html)!;
    expect(jp.title).toBe("Data Analyst");
    const text = jobPostingToText(jp);
    expect(text).toContain("Thành thạo SQL");
    expect(text).toContain("15.000.000 - 20.000.000 VND");
    expect(text).toContain("Hà Nội");
    const parsed = parseJdHeuristic(text, { title: jp.title, company: jp.company });
    expect(parsed.conditions.salary).toMatchObject({ min: 15, max: 20 });
  });
});

describe("VietnamWorks (luồng RSC, không có JSON-LD)", () => {
  const desc = "<p>- Thu thập, phân tích yêu cầu nghiệp vụ.</p><p>- Viết tài liệu SRS, FRD và Use Case.</p>";
  const flight = [
    '1:I["x",[],""]\n',
    '27:{"jobId":2100793,"jobTitle":"Business Analyst (IT)","companyName":"Viện VIST","jobDescription":"$29","jobRequirement":"<p>- Có 2–4 năm kinh nghiệm BA.</p>","isSalaryVisible":true,"salaryMin":0,"salaryMax":1600,"salaryCurrency":"USD","skills":"$2a","benefits":"$30","workingLocations":"$34","expiredOn":"2026-10-01T23:59:59+07:00"}\n',
    // Khối T: độ dài tính theo byte UTF-8, dòng kế tiếp nối liền không xuống dòng.
    `29:T${Buffer.byteLength(desc).toString(16)},${desc}`,
    '2a:["$2b"]\n2b:{"skillName":"Agile"}\n30:["$31"]\n31:{"benefitNameVI":"Thưởng","benefitValue":"Thưởng theo dự án"}\n34:["$35"]\n35:{"cityNameVI":"Hà Nội"}\n',
  ].join("");
  const page = (f: string) =>
    `<html><body>${(f.match(/[\s\S]{1,37}/g) ?? []).map((c) => `<script>self.__next_f.push([1,${JSON.stringify(c).replace(/</g, "\\u003c")}])</script>`).join("")}</body></html>`;

  it("dựng lại JD đầy đủ từ luồng RSC", () => {
    const jp = extractVietnamWorks(page(flight), "https://www.vietnamworks.com/business-analyst-it--2100793-jv?source=searchResults")!;
    expect(jp).toMatchObject({ title: "Business Analyst (IT)", company: "Viện VIST", locations: ["Hà Nội"], skills: "Agile", salary: { min: null, max: 1600, currency: "USD" } });
    const text = jobPostingToText(jp);
    expect(text).toContain("Viết tài liệu SRS, FRD và Use Case.");
    expect(text).toContain("Có 2–4 năm kinh nghiệm BA.");
    expect(text).toContain("Thưởng: Thưởng theo dự án");
    expect(text).toContain("Hạn nộp: 1/10/2026");
  });

  it("nhận lệnh chuyển hướng phía client của link sai slug", () => {
    const html = page('b:E{"digest":"NEXT_REDIRECT;replace;https://www.vietnamworks.com/business-analyst-it--2100793-jv;307;"}\n');
    expect(nextRedirect(html)).toBe("https://www.vietnamworks.com/business-analyst-it--2100793-jv");
    expect(extractVietnamWorks(html, "https://www.vietnamworks.com/x-2100793-jv")).toBeNull();
  });
});
