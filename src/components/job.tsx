"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { Page } from "@/components/app-shell";
import { QUADRANTS, SCORING, STATUS_LABEL, IMPORTANCE_LABEL, type JobEvaluation, type Quadrant } from "@/lib/engine";
import { locationText, relativeDay, salaryText, SENIORITY_LABEL, workModeText } from "@/lib/format";
import type { Job } from "@/lib/schema";
import { IconBanknote, IconBookmark, IconBriefcase, IconExternal, IconMapPin, IconTrending } from "./icons";
import { Button, Card, CompanyLogo, cx, Loading, Notice, PageTitle, QuadrantBadge, UR } from "./ui";
import { useEvaluations, useWorkspace } from "./workspace";

/** Nạp JD theo [id] trên URL và kết quả chấm của nó; lo sẵn các trạng thái thiếu dữ liệu. */
export function JobGate({ children }: { children: (job: Job, ev: JobEvaluation) => ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const ws = useWorkspace();
  const evals = useEvaluations();
  if (!ws.ready) return <Loading />;
  if (!ws.profile || !ws.preferences) {
    return (
      <Page narrow>
        <PageTitle title="Chưa đủ dữ liệu để chấm" />
        <Notice>
          Cần có hồ sơ năng lực và kỳ vọng nghề nghiệp trước khi xem kết quả.
          <div className="mt-3">
            <Button variant="primary" href={ws.profile ? "/preferences" : "/cv"}>
              {ws.profile ? "Khai kỳ vọng" : "Tải CV"}
            </Button>
          </div>
        </Notice>
      </Page>
    );
  }
  const job = ws.jobs.find((j) => j.id === id);
  const ev = job ? evals.get(job.id) : undefined;
  if (!job || !ev) {
    return (
      <Page narrow>
        <PageTitle title="Không tìm thấy JD" />
        <Notice>
          JD này không có trong danh sách của bạn — có thể đã bị xoá.
          <div className="mt-3">
            <Button href="/jobs">Về danh sách JD</Button>
          </div>
        </Notice>
      </Page>
    );
  }
  return <>{children(job, ev)}</>;
}

export type JobTab = "result" | "breakdown" | "gaps" | "clarify" | "actions";

const SOURCE_LABEL: Record<Job["source"], string> = { paste: "dán tay", file: "tải tệp", url: "nhập từ link", sample: "JD mẫu" };

/**
 * Đầu trang của mọi màn về một JD — như thẻ tin tuyển dụng: logo, tên vị trí, công ty, điều kiện
 * chính, nút lưu, và các tab chuyển qua lại giữa kết quả, bóc tách, khoảng trống, làm rõ, việc cần làm.
 */
export function JobHeader({ job, ev, active, actions }: { job: Job; ev: JobEvaluation; active: JobTab; actions?: ReactNode }) {
  const ws = useWorkspace();
  const unknown = ev.readiness.results.filter((r) => r.status === "unknown").length;
  const tabs: { id: JobTab; label: string; href: string; count?: number }[] = [
    { id: "result", label: "Kết quả hai chiều", href: `/jobs/${job.id}` },
    { id: "breakdown", label: "JD đã bóc tách", href: `/jobs/${job.id}/breakdown` },
    { id: "gaps", label: "Khoảng trống", href: `/jobs/${job.id}/gaps`, count: ev.gaps.items.length },
    { id: "clarify", label: "Làm rõ", href: `/jobs/${job.id}/clarify`, count: unknown },
    { id: "actions", label: "Việc cần làm", href: `/jobs/${job.id}/actions`, count: ev.fixNow.length + ev.buildFirst.length },
  ];
  const facts: { icon: typeof IconMapPin; text: string }[] = [];
  const wm = workModeText(job);
  const sal = salaryText(job);
  if (wm) facts.push({ icon: IconBriefcase, text: wm });
  if (sal) facts.push({ icon: IconBanknote, text: sal });
  if (job.seniority.level !== "unknown") facts.push({ icon: IconTrending, text: SENIORITY_LABEL[job.seniority.level] });
  const place = locationText(job);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start md:px-6 md:pt-6">
        <CompanyLogo name={job.company || job.title} size={56} />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-ink-2">{job.company || "Công ty chưa rõ"}</div>
          <h1 className="mt-0.5 text-2xl leading-tight font-semibold tracking-[-0.01em]">{job.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-ink-3">
            {place && (
              <>
                <span className="inline-flex items-center gap-1">
                  <IconMapPin size={14} /> {place}
                </span>
                <span aria-hidden>·</span>
              </>
            )}
            <span>
              phân tích {relativeDay(job.createdAt)} · {SOURCE_LABEL[job.source]}
            </span>
            {job.url && (
              <>
                <span aria-hidden>·</span>
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1 font-normal">
                  tin gốc <IconExternal size={12} />
                </a>
              </>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <QuadrantBadge q={ev.decision.quadrant} withAction />
            {facts.map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-[3px] text-xs font-semibold text-ink-2">
                <Icon size={13} /> {text}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {actions}
          <Button
            onClick={async () => {
              await ws.saveJob({ ...job, saved: !job.saved });
              ws.toast(job.saved ? "Đã bỏ khỏi danh sách quan tâm." : "Đã lưu vào danh sách quan tâm.");
            }}
            aria-label={job.saved ? "Bỏ lưu JD" : "Lưu JD"}
          >
            <IconBookmark filled={job.saved} size={15} /> {job.saved ? "Đã lưu" : "Lưu"}
          </Button>
        </div>
      </div>
      <nav className="flex overflow-x-auto border-t border-line-soft px-2 md:px-4" aria-label="Các màn của JD này">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={active === t.id ? "page" : undefined}
            className={cx(
              "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold whitespace-nowrap",
              active === t.id ? "border-success-strong text-success-strong" : "border-transparent text-ink-3 hover:bg-subtle hover:text-ink",
            )}
          >
            {t.label}
            {!!t.count && <span className={cx("rounded-full px-1.5 text-[11px] leading-5", active === t.id ? "bg-success-soft" : "bg-muted text-ink-3")}>{t.count}</span>}
          </Link>
        ))}
      </nav>
    </Card>
  );
}

const LAYOUT: Quadrant[][] = [
  ["safe", "diamond"],
  ["low", "challenge"],
];

const CELL_ON: Record<Quadrant, string> = {
  diamond: "border-success bg-success-soft",
  challenge: "border-accent bg-accent-soft",
  safe: "border-warning-bright bg-warning-soft",
  low: "border-ink-4 bg-muted",
};
const DOT: Record<Quadrant, string> = { diamond: "bg-success", challenge: "bg-accent", safe: "bg-warning-bright", low: "bg-ink-5" };

/**
 * Ma trận hai chiều (UR-1.6.1). Hàng trên = mức sẵn sàng cao, cột phải = đáp ứng kỳ vọng cao.
 * Dùng cho một JD (highlight) hoặc cả danh sách (counts).
 */
export function FitMatrix({ highlight, counts, compact }: { highlight?: Quadrant; counts?: Record<Quadrant, number>; compact?: boolean }) {
  return (
    <div>
      <div className="flex gap-2.5">
        <div className="flex w-4 items-center justify-center">
          <span className="-rotate-90 text-[11px] font-semibold tracking-wide whitespace-nowrap text-ink-4 uppercase">Mức sẵn sàng ↑</span>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2">
          {LAYOUT.flat().map((q) => {
            const on = highlight === q;
            const n = counts?.[q] ?? 0;
            const filled = counts ? n > 0 : on;
            return (
              <div
                key={q}
                className={cx(
                  "relative flex flex-col justify-between rounded-md border p-3 transition-colors",
                  compact ? "min-h-[88px]" : "min-h-[108px]",
                  filled ? cx(CELL_ON[q], on && "border-2") : "border-line-soft bg-subtle",
                )}
              >
                <div className={cx("text-[13px]", filled ? "font-semibold text-ink" : "font-medium text-ink-3", on && "pr-5")}>{QUADRANTS[q].name}</div>
                {counts ? (
                  <div className="flex items-center gap-1.5 text-xs text-ink-3">
                    {Array.from({ length: Math.min(n, 6) }).map((_, i) => (
                      <span key={i} className={cx("h-2.5 w-2.5 rounded-full ring-2 ring-surface", DOT[q])} />
                    ))}
                    <span className={cx(n > 0 && "font-semibold text-ink-2")}>{n} JD</span>
                  </div>
                ) : (
                  <div className="text-xs leading-snug text-ink-3">{QUADRANTS[q].short}</div>
                )}
                {on && <span className={cx("absolute top-3 right-3 h-3 w-3 rounded-full ring-4 ring-white/70", DOT[q])} aria-label="JD này" />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 pl-6 text-center text-[11px] font-semibold tracking-wide text-ink-4 uppercase">Đáp ứng kỳ vọng →</div>
    </div>
  );
}

/** "Xem cách tính" — mọi điểm số mở ra được phần giải thích thành phần (NFR-4). */
export function ScoreExplainer({ ev }: { ev: JobEvaluation }) {
  const { readiness: r, workFit: w } = ev;
  const credit = SCORING.statusCredit;
  return (
    <div className="flex flex-col gap-6 text-sm">
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-base font-semibold">Mức sẵn sàng ứng tuyển</h3>
          <UR code="UR-1.4.7 · 1.4.8" />
        </div>
        <p className="mb-3 leading-relaxed text-ink-3">
          Mỗi yêu cầu có trọng số: bắt buộc × {SCORING.requirementWeight.must}, ưu tiên × {SCORING.requirementWeight.preferred} (kỹ năng mềm luôn tính như ưu tiên). Đạt được{" "}
          {credit.met} điểm, một phần {credit.partial}, chưa đạt {credit.missing}. Yêu cầu <b>chưa rõ</b> không tính vào mẫu số — không trừ điểm oan — nhưng làm giảm
          độ tin cậy.
        </p>
        <div className="overflow-x-auto rounded-md border border-line-soft">
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead className="bg-subtle">
              <tr className="text-xs text-ink-3">
                <th className="px-3 py-2 font-semibold">Yêu cầu</th>
                <th className="px-2 py-2 font-semibold">Trọng số</th>
                <th className="px-2 py-2 font-semibold">Trạng thái</th>
                <th className="px-3 py-2 text-right font-semibold">Điểm</th>
              </tr>
            </thead>
            <tbody>
              {r.results.map((x) => (
                <tr key={x.req.id} className="border-t border-line-soft">
                  <td className="px-3 py-2">{x.req.text}</td>
                  <td className="px-2 py-2 text-ink-3">× {x.weight}</td>
                  <td className="px-2 py-2 text-ink-3">{STATUS_LABEL[x.status]}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {x.status === "unknown" ? "—" : `${x.weight * credit[x.status as keyof typeof credit]} / ${x.weight}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 leading-relaxed text-ink-2">
          {r.score === null ? (
            "Chưa có yêu cầu nào đủ dữ liệu để tính điểm."
          ) : (
            <>
              Điểm = {r.points.toLocaleString("vi-VN")} / {r.maxPoints} = <b>{r.score}</b>. Ngưỡng cao: {r.threshold}.
            </>
          )}{" "}
          {r.blockers.length > 0 && `Còn ${r.blockers.length} yêu cầu bắt buộc chưa đạt hoặc chưa có bằng chứng, nên chưa xếp vào nhóm sẵn sàng cao dù điểm thế nào.`}
        </p>
        <p className="mt-2 text-ink-3">
          Độ tin cậy: {r.confidence.assessed} / {r.confidence.total} tiêu chí có đủ dữ liệu (cao khi ≥ {SCORING.confidence.high * 100}%, trung bình khi ≥{" "}
          {SCORING.confidence.medium * 100}%).
        </p>
      </section>
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-base font-semibold">Mức đáp ứng kỳ vọng</h3>
          <UR code="UR-1.5.3" />
        </div>
        <p className="mb-3 leading-relaxed text-ink-3">
          Trọng số theo mức quan trọng bạn chọn: Must-have × {SCORING.importanceWeight.must}, Important × {SCORING.importanceWeight.important}, Nice-to-have ×{" "}
          {SCORING.importanceWeight.nice}. Tiêu chí JD không nêu được liệt kê riêng, không tính là đạt. Vi phạm deal-breaker thì không xếp vào nhóm cao.
        </p>
        <ul className="flex flex-col divide-y divide-line-soft rounded-md border border-line-soft">
          {w.criteria.map((c) => (
            <li key={c.key} className="flex justify-between gap-3 px-3 py-2">
              <span>
                {c.label} · <span className="text-ink-3">{IMPORTANCE_LABEL[c.importance]} × {c.weight}</span>
              </span>
              <span className="text-ink-3">{{ met: "Đạt", partial: "Một phần", not_met: "Không đạt", unknown: "JD không nêu" }[c.status]}</span>
            </li>
          ))}
          {w.criteria.length === 0 && <li className="px-3 py-2 text-ink-4">Bạn chưa đặt kỳ vọng nào.</li>}
        </ul>
        <p className="mt-3 text-ink-2">
          {w.score === null ? "Chưa có tiêu chí nào đánh giá được." : <>Điểm = <b>{w.score}</b>, ngưỡng cao: {w.threshold}.</>}
        </p>
      </section>
      <p className="border-t border-line-soft pt-4 text-xs leading-relaxed text-ink-4">
        Điểm do bộ quy tắc tính, không dùng AI — cùng CV, JD và kỳ vọng luôn cho cùng kết quả. Ngưỡng cấu hình trong <code>src/lib/engine/config.ts</code>.
      </p>
    </div>
  );
}
