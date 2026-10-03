import type { Job, Preferences, Profile, ScoreSnapshot } from "../schema";
import { buildActions, type BuildItem, type FixSuggestion } from "./actions";
import { decide, QUADRANTS, type Decision, type Quadrant } from "./decision";
import { analyzeGaps, type GapAnalysis } from "./gaps";
import { evaluateReadiness, type ReadinessResult } from "./readiness";
import { evaluateWorkFit, type WorkFitResult } from "./workfit";

export * from "./config";
export * from "./decision";
export * from "./gaps";
export * from "./readiness";
export * from "./workfit";
export * from "./actions";
export * from "./guardrail";

export interface JobEvaluation {
  readiness: ReadinessResult;
  workFit: WorkFitResult;
  decision: Decision;
  gaps: GapAnalysis;
  fixNow: FixSuggestion[];
  buildFirst: BuildItem[];
}

/**
 * Chấm một JD theo hai chiều. Hàm thuần: cùng hồ sơ + JD + kỳ vọng luôn cho cùng kết quả
 * (NFR-5). Không gọi LLM ở bất kỳ bước nào của việc chấm điểm (G4).
 */
export function evaluateJob(profile: Profile, prefs: Preferences, job: Job, now = new Date()): JobEvaluation {
  const readiness = evaluateReadiness(profile, job.requirements, now);
  const workFit = evaluateWorkFit(prefs, job);
  const decision = decide(readiness, workFit);
  const gaps = analyzeGaps(readiness);
  const { fixNow, buildFirst } = buildActions(profile, readiness, gaps);
  return { readiness, workFit, decision, gaps, fixNow, buildFirst };
}

export function snapshot(ev: JobEvaluation, at = new Date().toISOString()): ScoreSnapshot {
  return { at, readiness: ev.readiness.score, workFit: ev.workFit.score, quadrant: ev.decision.quadrant };
}

export interface PortfolioItem {
  job: Job;
  ev: JobEvaluation;
}

/** Tổng hợp nhiều JD: sắp xếp hub, đếm ô ma trận, năng lực chặn nhiều JD nhất. */
export function portfolio(items: PortfolioItem[]) {
  const sorted = [...items].sort(
    (a, b) =>
      QUADRANTS[a.ev.decision.quadrant].rank - QUADRANTS[b.ev.decision.quadrant].rank ||
      (b.ev.readiness.score ?? 0) + (b.ev.workFit.score ?? 0) - ((a.ev.readiness.score ?? 0) + (a.ev.workFit.score ?? 0)),
  );
  const counts: Record<Quadrant, number> = { diamond: 0, challenge: 0, safe: 0, low: 0 };
  for (const i of items) counts[i.ev.decision.quadrant]++;

  const blockerCount = new Map<string, { label: string; jobs: Set<string> }>();
  for (const i of items) {
    for (const b of i.ev.readiness.blockers) {
      const entry = blockerCount.get(b.key) ?? { label: b.req.text, jobs: new Set<string>() };
      entry.jobs.add(i.job.id);
      blockerCount.set(b.key, entry);
    }
  }
  const topBlocker =
    [...blockerCount.entries()]
      .map(([key, v]) => ({ key, label: v.label, count: v.jobs.size }))
      .sort((a, b) => b.count - a.count)[0] ?? null;

  /** Số JD mà một yêu cầu (theo khoá) đang là khoảng trống. */
  const affects = (key: string) =>
    items.filter((i) => i.ev.readiness.results.some((r) => r.key === key && r.status !== "met")).length;

  return { sorted, counts, topBlocker, affects, total: items.length };
}
