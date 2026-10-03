import { describe, expect, it } from "vitest";
import { sampleJobs } from "../jobs";
import { samplePreferences, sampleProfile } from "../samples";
import type { Clarification, Job, Profile } from "../schema";
import { checkDraft, evaluateJob, portfolio, SCORING } from "./index";

const NOW = new Date("2026-09-23T08:00:00Z");
const jobs = sampleJobs(NOW);
const byTitle = (t: string) => jobs.find((j) => j.title === t)!;
const marketingExec = byTitle("Marketing Executive");

function withClarification(profile: Profile, key: string, answer: Clarification["answer"], extra: Partial<Clarification> = {}): Profile {
  return {
    ...profile,
    clarifications: [...profile.clarifications, { key, requirementText: key, answer, where: "", result: "", period: "", answeredAt: NOW.toISOString(), ...extra }],
  };
}

describe("ma trận hai chiều trên dữ liệu mẫu (khớp wireframe màn 10)", () => {
  const expected: Record<string, string> = {
    "Content Specialist": "diamond",
    "Marketing Executive": "challenge",
    "Brand Assistant": "challenge",
    "Digital Marketing Intern": "safe",
    "Growth Executive": "low",
  };
  for (const [title, quadrant] of Object.entries(expected)) {
    it(`${title} → ${quadrant}`, () => {
      const ev = evaluateJob(sampleProfile(NOW), samplePreferences(NOW), byTitle(title), NOW);
      expect(ev.decision.quadrant).toBe(quadrant);
    });
  }
});

describe("Role Readiness (UR-1.4)", () => {
  it("tái lập: cùng CV + JD + kỳ vọng luôn cho cùng kết quả (NFR-5)", () => {
    const a = evaluateJob(sampleProfile(NOW), samplePreferences(NOW), marketingExec, NOW);
    const b = evaluateJob(sampleProfile(NOW), samplePreferences(NOW), marketingExec, NOW);
    expect(a.readiness.score).toBe(b.readiness.score);
    expect(a.workFit.score).toBe(b.workFit.score);
    expect(a.decision).toEqual(b.decision);
  });

  it("không có bằng chứng → Unknown, không bị tính là thiếu năng lực (NT-3)", () => {
    const ev = evaluateJob(sampleProfile(NOW), samplePreferences(NOW), marketingExec, NOW);
    const ab = ev.readiness.results.find((r) => r.key === "skill:ab-testing")!;
    expect(ab.status).toBe("unknown");
    expect(ab.blocker).toBe(true);
    // Unknown không vào mẫu số: điểm không bị trừ oan.
    const assessed = ev.readiness.results.filter((r) => r.status !== "unknown").length;
    expect(ev.readiness.confidence.assessed).toBe(assessed);
    expect(ev.readiness.confidence.total).toBe(7);
  });

  it("must-have chưa có bằng chứng chặn nhóm ưu tiên dù điểm vượt ngưỡng (UR-1.4.6)", () => {
    const ev = evaluateJob(sampleProfile(NOW), samplePreferences(NOW), marketingExec, NOW);
    expect(ev.readiness.score!).toBeGreaterThanOrEqual(SCORING.readinessThreshold);
    expect(ev.readiness.blockers).toHaveLength(1);
    expect(ev.readiness.high).toBe(false);
  });

  it("chỉ có tên kỹ năng trong mục Kỹ năng → một phần, bằng chứng yếu", () => {
    const ev = evaluateJob(sampleProfile(NOW), samplePreferences(NOW), marketingExec, NOW);
    const ga = ev.readiness.results.find((r) => r.req.text.startsWith("Thành thạo Google Analytics"))!;
    expect(ga.status).toBe("partial");
    expect(ga.strength).toBe("weak");
  });

  it("cộng dồn kinh nghiệm, không đếm trùng; 11 tháng / 1 năm là thiếu về lượng", () => {
    const ev = evaluateJob(sampleProfile(NOW), samplePreferences(NOW), marketingExec, NOW);
    const exp = ev.readiness.results.find((r) => r.key === "exp:years")!;
    expect(exp.months).toMatchObject({ have: 11, need: 12, fromCv: 6 });
    expect(exp.status).toBe("partial");
    expect(exp.shortfall).toBe(true);
  });

  it("trả lời làm rõ được lưu theo khoá và áp dụng cho JD sau (UR-2.2)", () => {
    const p = withClarification(sampleProfile(NOW), "skill:ab-testing", "never");
    const ev = evaluateJob(p, samplePreferences(NOW), marketingExec, NOW);
    const ab = ev.readiness.results.find((r) => r.key === "skill:ab-testing")!;
    expect(ab.status).toBe("missing");
    const gap = ev.gaps.items.find((g) => g.result.key === "skill:ab-testing")!;
    expect(gap.type).toBe("skill");
    expect(gap.severity).toBe("critical");
  });

  it("\"Đã từng làm\" → Evidence Gap, có gợi ý đưa vào CV", () => {
    const p = withClarification(sampleProfile(NOW), "skill:ab-testing", "done", { where: "Thực tập ở Công ty ABC", result: "tăng tỉ lệ mở mail 18%" });
    const ev = evaluateJob(p, samplePreferences(NOW), marketingExec, NOW);
    const gap = ev.gaps.items.find((g) => g.result.key === "skill:ab-testing")!;
    expect(gap.type).toBe("evidence");
    expect(ev.readiness.blockers).toHaveLength(0);
    const fix = ev.fixNow.find((f) => f.reqKey === "skill:ab-testing")!;
    expect(fix.kind).toBe("add-evidence");
    expect(fix.draft).toContain("18%");
  });

  it("\"Bỏ qua\" giữ nguyên trạng thái chưa đủ dữ liệu", () => {
    const p = withClarification(sampleProfile(NOW), "skill:ab-testing", "skip");
    const ev = evaluateJob(p, samplePreferences(NOW), marketingExec, NOW);
    expect(ev.gaps.items.find((g) => g.result.key === "skill:ab-testing")!.type).toBe("information");
  });
});

describe("Work Fit (UR-1.5)", () => {
  it("vi phạm deal-breaker được đánh dấu và kéo Work Fit xuống thấp", () => {
    const ev = evaluateJob(sampleProfile(NOW), samplePreferences(NOW), byTitle("Digital Marketing Intern"), NOW);
    expect(ev.workFit.violated.map((d) => d.db.kind)).toEqual(["salary_below"]);
    expect(ev.workFit.high).toBe(false);
  });

  it("JD không nêu thì là Unknown và không được tính là đạt", () => {
    const ev = evaluateJob(sampleProfile(NOW), samplePreferences(NOW), marketingExec, NOW);
    const growth = ev.workFit.criteria.find((c) => c.key === "growth")!;
    expect(growth.status).toBe("unknown");
    expect(ev.workFit.unknown).toContain(growth);
  });

  it("JD không nêu lương → deal-breaker lương là \"chưa kiểm tra được\", không phải vi phạm", () => {
    const job: Job = { ...marketingExec, conditions: { ...marketingExec.conditions, salary: null } };
    const ev = evaluateJob(sampleProfile(NOW), samplePreferences(NOW), job, NOW);
    expect(ev.workFit.dealBreakers.find((d) => d.db.kind === "salary_below")!.status).toBe("unknown");
  });
});

describe("khoảng trống & việc cần làm (UR-2.3 → 2.6)", () => {
  it("Evidence Gap và gap năng lực thật không gộp chung (NT-2)", () => {
    const p = withClarification(sampleProfile(NOW), "skill:ab-testing", "never");
    const ev = evaluateJob(p, samplePreferences(NOW), marketingExec, NOW);
    expect(ev.gaps.evidence.every((g) => g.type === "evidence")).toBe(true);
    expect(ev.gaps.real.every((g) => g.type !== "evidence" && g.type !== "information")).toBe(true);
    expect(ev.buildFirst.map((b) => b.gap.result.key)).toContain("skill:ab-testing");
    expect(ev.fixNow.map((f) => f.kind)).toContain("rewrite");
  });

  it("gap gắn với must-have luôn đứng trước tiêu chí ưu tiên (UR-2.4)", () => {
    const ev = evaluateJob(sampleProfile(NOW), samplePreferences(NOW), marketingExec, NOW);
    const firstPreferred = ev.gaps.items.findIndex((g) => !g.result.countsAsMust);
    const lastMust = ev.gaps.items.map((g) => g.result.countsAsMust).lastIndexOf(true);
    expect(firstPreferred === -1 || lastMust < firstPreferred).toBe(true);
  });

  it("\"Đã từng làm\" + nơi làm khớp công ty → gợi ý thêm dòng vào đúng mục kinh nghiệm", () => {
    const p = withClarification(sampleProfile(NOW), "skill:ab-testing", "done", { where: "Khi thực tập ở ABC", result: "tăng tỉ lệ mở mail 18%" });
    const fix = evaluateJob(p, samplePreferences(NOW), marketingExec, NOW).fixNow.find((f) => f.reqKey === "skill:ab-testing")!;
    expect(fix.experienceId).toBe("exp_1");
    expect(fix.draft).toBe("Khi thực tập ở ABC — tăng tỉ lệ mở mail 18%.");
  });

  it("gợi ý viết lại chỉ quanh kỹ năng người dùng đã có", () => {
    const ev = evaluateJob(sampleProfile(NOW), samplePreferences(NOW), marketingExec, NOW);
    const rewrite = ev.fixNow.find((f) => f.kind === "rewrite")!;
    expect(rewrite.skillId).toBe("google-analytics");
    expect(rewrite.draft).toContain("Google Analytics");
  });
});

describe("guardrail (UR-2.5.6)", () => {
  const profile = sampleProfile(NOW);
  it("chặn kỹ năng chưa có trong hồ sơ", () => {
    const c = checkDraft("Chạy A/B testing và báo cáo bằng Python.", profile, []);
    expect(c.unsupportedSkills).toEqual(expect.arrayContaining(["A/B testing", "Python"]));
    expect(c.blocking).toBe(true);
  });
  it("chặn khi còn chỗ trống cần tự điền", () => {
    expect(checkDraft("Theo dõi chiến dịch bằng Google Analytics — [số liệu].", profile, []).blocking).toBe(true);
  });
  it("cảnh báo số liệu không có trong nội dung gốc", () => {
    const c = checkDraft("Theo dõi 8 chiến dịch bằng Google Analytics.", profile, ["Hỗ trợ theo dõi hiệu quả các chiến dịch."]);
    expect(c.newNumbers).toEqual(["8"]);
    expect(c.blocking).toBe(false);
  });
});

describe("hub nhiều JD (UR-1.6 · màn 10)", () => {
  it("xếp theo mức đáng ưu tiên và tìm năng lực chặn nhiều JD nhất", () => {
    const profile = sampleProfile(NOW);
    const prefs = samplePreferences(NOW);
    const pf = portfolio(jobs.map((job) => ({ job, ev: evaluateJob(profile, prefs, job, NOW) })));
    expect(pf.sorted[0].job.title).toBe("Content Specialist");
    expect(pf.sorted.at(-1)!.job.title).toBe("Growth Executive");
    expect(pf.counts).toEqual({ diamond: 1, challenge: 2, safe: 1, low: 1 });
    expect(pf.topBlocker).toMatchObject({ key: "skill:ab-testing", count: 2 });
  });
});
