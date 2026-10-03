"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Page } from "@/components/app-shell";
import { IconCheckCircle, IconChevronRight, IconDashedCircle, IconInfo, IconSparkle, IconWarning, IconXCircle } from "@/components/icons";
import { FitMatrix, JobGate, JobHeader, ScoreExplainer } from "@/components/job";
import { Button, Card, cx, Dialog, IMPORTANCE_SHORT, LevelTag, ScoreBar, ScoreRing, scoreTone, SectionTitle, StatusIcon, Tag, UR } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";
import { CONFIDENCE_LABEL, snapshot, STATUS_LABEL, type JobEvaluation } from "@/lib/engine";
import type { Job } from "@/lib/schema";

function statusText(status: string, level: "must" | "preferred") {
  if (status === "unknown") return level === "must" ? "Chưa có bằng chứng" : "Chưa rõ";
  return STATUS_LABEL[status as keyof typeof STATUS_LABEL];
}

function Result({ job, ev }: { job: Job; ev: JobEvaluation }) {
  const ws = useWorkspace();
  const router = useRouter();
  const [explain, setExplain] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { readiness: r, workFit: w, decision: d } = ev;
  const last = job.scoreHistory.at(-1);
  const blockers = r.blockers;
  const unknownBlockers = blockers.filter((b) => b.status === "unknown");
  const unknownCount = r.results.filter((x) => x.status === "unknown").length;

  const rescore = async () => {
    const snap = snapshot(ev);
    const changed = !last || last.readiness !== snap.readiness || last.workFit !== snap.workFit || last.quadrant !== snap.quadrant;
    if (changed) await ws.saveJob({ ...job, scoreHistory: [...job.scoreHistory, snap].slice(-20) });
    ws.toast(
      last && changed
        ? `Đã chấm lại: sẵn sàng ${last.readiness ?? "—"} → ${snap.readiness ?? "—"}, kỳ vọng ${last.workFit ?? "—"} → ${snap.workFit ?? "—"}.`
        : "Đã chấm lại theo hồ sơ và kỳ vọng hiện tại — kết quả không đổi.",
    );
  };

  const readinessNote =
    r.score === null ? "Chưa đủ dữ liệu" : r.high ? "Trên ngưỡng" : r.score >= r.threshold && blockers.length ? `Chưa đạt — còn ${blockers.length} yêu cầu bắt buộc` : "Dưới ngưỡng";
  const workNote = w.score === null ? "Chưa đủ dữ liệu" : w.high ? "Trên ngưỡng" : w.violated.length ? "Vi phạm deal-breaker" : "Dưới ngưỡng";
  const rTone = scoreTone(r.score, r.high);
  const wTone = scoreTone(w.score, w.high);
  const matched = r.results.filter((x) => x.status === "met").length;

  const nextSteps = [
    unknownCount > 0 && { href: `/jobs/${job.id}/clarify`, label: `Làm rõ ${unknownCount} tiêu chí thiếu dữ liệu`, sub: "Để không bị kết luận nhầm là thiếu năng lực" },
    ev.fixNow.length > 0 && { href: `/jobs/${job.id}/actions`, label: `${ev.fixNow.length} việc sửa được ngay trên CV`, sub: "Năng lực đã có, chỉ là CV chưa nói ra" },
    ev.buildFirst.length > 0 && { href: `/jobs/${job.id}/actions`, label: `${ev.buildFirst.length} năng lực cần xây dựng`, sub: "Phải làm thật rồi mới đưa vào CV" },
    { href: `/jobs/${job.id}/gaps`, label: "Xem khoảng trống chi tiết", sub: "Đối chiếu từng yêu cầu với dòng CV" },
  ].filter(Boolean) as { href: string; label: string; sub: string }[];

  return (
    <Page>
      <JobHeader
        job={job}
        ev={ev}
        active="result"
        actions={
          <>
            <Button variant="muted" onClick={rescore}>
              Chấm lại
            </Button>
            <Button variant="primary" href={`/jobs/${job.id}/actions`}>
              Xem việc cần làm
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_330px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Phân loại + khuyến nghị (UR-1.6.2 → 1.6.4) */}
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-accent via-success to-warning-bright" aria-hidden />
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-3">
                <IconSparkle size={15} className="text-accent" /> Đánh giá hai chiều của JobAlign
                <UR code="UR-1.6.2 · 1.6.3 · 1.6.4" />
              </div>
              <h2 className="mt-2 text-xl leading-snug font-semibold">{d.headline}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{d.explanation.join(" ")}</p>
              <p className="mt-3 text-[13px] text-ink-3">
                Hồ sơ của bạn khớp <b className="text-ink-2">{matched}</b> / {r.results.length} yêu cầu của JD
                {w.criteria.length > 0 && (
                  <>
                    {" "}
                    và đáp ứng <b className="text-ink-2">{w.criteria.filter((c) => c.status === "met").length}</b> / {w.criteria.length} tiêu chí kỳ vọng
                  </>
                )}
                .
              </p>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Chiều 1 */}
            <Card className="flex flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-ink-3">Chiều 1 · Bạn hợp với công việc?</div>
                <UR code="UR-1.4.7" />
              </div>
              <div className="mt-3 flex items-center gap-4">
                <ScoreRing value={r.score} tone={rTone} size={92} />
                <div>
                  <div className="text-base font-semibold">Mức sẵn sàng ứng tuyển</div>
                  <div className={cx("mt-0.5 text-sm font-semibold", rTone === "success" ? "text-success" : rTone === "muted" ? "text-ink-3" : "text-warning")}>{readinessNote}</div>
                  <div className="mt-1 text-xs text-ink-3">Ngưỡng {r.threshold}</div>
                </div>
              </div>
              <dl className="mt-4 flex flex-col gap-2 border-t border-line-soft pt-3 text-sm">
                {(
                  [
                    ["Kỹ năng", r.groups.skill],
                    ["Kinh nghiệm", r.groups.experience],
                    ["Trình độ & ngoại ngữ", r.groups.qualification],
                  ] as const
                ).map(([k, g]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-ink-3">{k}</dt>
                    <dd className="text-right font-semibold">{g.summary}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto flex items-end justify-between gap-3 pt-4 text-[13px]">
                <div>
                  <div>
                    Độ tin cậy: <b>{CONFIDENCE_LABEL[r.confidence.level]}</b> <UR code="UR-1.4.8" />
                  </div>
                  <div className="text-ink-3">
                    {r.confidence.assessed} / {r.confidence.total} tiêu chí có đủ dữ liệu
                  </div>
                </div>
                <button type="button" className="link shrink-0" onClick={() => setExplain(true)}>
                  Xem cách tính
                </button>
              </div>
            </Card>

            {/* Chiều 2 */}
            <Card className="flex flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-ink-3">Chiều 2 · Công việc hợp với bạn?</div>
                <UR code="UR-1.5.3" />
              </div>
              <div className="mt-3 flex items-center gap-4">
                <ScoreRing value={w.score} tone={wTone} size={92} />
                <div>
                  <div className="text-base font-semibold">Mức đáp ứng kỳ vọng</div>
                  <div className={cx("mt-0.5 text-sm font-semibold", wTone === "success" ? "text-success" : wTone === "muted" ? "text-ink-3" : w.violated.length ? "text-danger" : "text-warning")}>
                    {workNote}
                  </div>
                  <div className="mt-1 text-xs text-ink-3">Ngưỡng {w.threshold}</div>
                </div>
              </div>
              <dl className="mt-4 flex flex-col gap-2 border-t border-line-soft pt-3 text-sm">
                {(
                  [
                    ["Must-have của bạn", w.byImportance.must],
                    ["Important", w.byImportance.important],
                    ["Nice-to-have", w.byImportance.nice],
                  ] as const
                ).map(([k, g]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-ink-3">{k}</dt>
                    <dd className="text-right font-semibold">
                      {g.total === 0 ? <span className="font-normal text-ink-4">Không đặt</span> : g.assessed === 0 ? "Chưa đánh giá được" : `${g.met} / ${g.total} đạt`}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto flex flex-col gap-1.5 pt-4 text-[13px]">
                {w.violated.length ? (
                  w.violated.map((v) => (
                    <div key={v.db.id} className="flex items-start gap-2 font-semibold text-danger">
                      <IconXCircle size={15} className="mt-px shrink-0" /> Vi phạm deal-breaker: {v.label.toLowerCase()}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-success">
                    <IconCheckCircle size={15} /> {w.dealBreakers.length ? "Không vi phạm deal-breaker nào" : "Bạn chưa đặt deal-breaker"}
                  </div>
                )}
                {w.dealBreakers
                  .filter((x) => x.status === "unknown")
                  .map((x) => (
                    <div key={x.db.id} className="flex items-start gap-2 text-ink-3">
                      <IconDashedCircle size={15} className="mt-px shrink-0" /> {x.label}: {x.reason.toLowerCase()}
                    </div>
                  ))}
                {w.unknown.length > 0 && (
                  <div className="flex items-center gap-2 text-ink-3">
                    <IconDashedCircle size={15} /> {w.unknown.length} tiêu chí chưa đánh giá được vì JD không nêu
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Blocker (UR-1.4.6) */}
          {blockers.length > 0 && (
            <Card className="overflow-hidden border-danger/30">
              <div className="flex flex-col gap-4 bg-danger-soft/60 p-5 md:flex-row md:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
                  <IconWarning size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-danger-strong">
                    {unknownBlockers.length ? "Yêu cầu bắt buộc chưa có bằng chứng" : "Yêu cầu bắt buộc chưa đạt"} ({blockers.length})
                    <UR code="UR-1.4.6" />
                  </div>
                  <div className="mt-1 text-[15px] font-semibold text-ink">{blockers[0].req.text}</div>
                  <p className="mt-0.5 text-[13px] text-ink-3">
                    {unknownBlockers.length ? "Chưa kết luận bạn thiếu năng lực — nhưng đây có thể là điều kiện loại ngay từ vòng hồ sơ." : blockers[0].reason}
                    {blockers.length > 1 && ` Và ${blockers.length - 1} yêu cầu khác.`}
                  </p>
                </div>
                {unknownBlockers.length ? (
                  <Button variant="primary" href={`/jobs/${job.id}/clarify?key=${encodeURIComponent(unknownBlockers[0].key)}`}>
                    Làm rõ ngay
                  </Button>
                ) : (
                  <Button href={`/jobs/${job.id}/actions`}>Xem cần làm gì</Button>
                )}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <SectionTitle title="Đối chiếu từng yêu cầu của JD" ur="UR-1.4.1" sub={`${matched} đạt · ${r.results.filter((x) => x.status === "partial").length} một phần · ${unknownCount} chưa rõ`} />
            <ul className="mt-3 divide-y divide-line-soft">
              {r.results.map((x) => (
                <li key={x.req.id} className="flex items-center gap-3 py-3">
                  <StatusIcon status={x.status} className="shrink-0" size={18} />
                  <span className="min-w-0 flex-1 text-[15px] leading-snug">{x.req.text}</span>
                  <span className="hidden sm:block">
                    <LevelTag level={x.countsAsMust ? "must" : "preferred"} />
                  </span>
                  <span
                    className={cx(
                      "w-24 shrink-0 text-right text-[13px] leading-tight font-semibold",
                      x.blocker ? "text-danger" : x.status === "met" ? "text-success" : x.status === "partial" ? "text-warning" : "text-ink-4",
                    )}
                  >
                    {statusText(x.status, x.countsAsMust ? "must" : "preferred")}
                  </span>
                </li>
              ))}
            </ul>
            {r.results.length === 0 && <p className="py-3 text-sm text-ink-4">JD chưa có yêu cầu nào — hãy sửa kết quả bóc tách.</p>}
            <Link href={`/jobs/${job.id}/gaps#mapping`} className="link mt-2 inline-flex items-center gap-1 text-sm">
              Xem đối chiếu chi tiết với từng dòng trong CV <IconChevronRight size={14} />
            </Link>
          </Card>

          <Card className="p-5">
            <SectionTitle title="So với kỳ vọng của bạn" ur="UR-1.5.1" />
            <ul className="mt-3 divide-y divide-line-soft">
              {w.criteria.map((c) => (
                <li key={c.key} className="flex items-center gap-3 py-3">
                  <StatusIcon status={c.status === "not_met" ? "missing" : c.status} className="shrink-0" size={18} />
                  <span className="min-w-0 flex-1 text-[15px] leading-snug">
                    <span className="font-semibold">{c.label}</span> · {c.status === "unknown" ? <span className="text-ink-4">JD không nêu</span> : c.jdText}
                    {c.status !== "unknown" && c.compare && <span className="block text-[13px] text-ink-3">{c.compare}</span>}
                  </span>
                  <Tag tone={c.status === "unknown" ? "dashed" : c.importance === "must" ? "solid" : "neutral"}>{IMPORTANCE_SHORT[c.importance]}</Tag>
                </li>
              ))}
            </ul>
            {w.criteria.length === 0 && (
              <p className="py-3 text-sm text-ink-4">
                Bạn chưa đặt kỳ vọng nào.{" "}
                <Link href="/preferences" className="link">
                  Khai kỳ vọng
                </Link>
              </p>
            )}
            <p className="mt-2 flex gap-2 text-[13px] leading-relaxed text-ink-3">
              <IconInfo size={14} className="mt-0.5 shrink-0" /> Tiêu chí JD không công bố được liệt kê riêng, không được tính là đạt.
            </p>
          </Card>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-[68px]">
          <Card className="p-5">
            <SectionTitle title="Ma trận hai chiều" ur="UR-1.6.1" />
            <div className="mt-4">
              <FitMatrix highlight={d.quadrant} compact />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-3">
              Ngưỡng hai trục ({r.threshold} và {w.threshold}) là tham số cấu hình được, không gán cứng trong mã.
            </p>
          </Card>

          <Card className="overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-base font-semibold">Bước tiếp theo</h2>
            </div>
            <ul>
              {nextSteps.map((s) => (
                <li key={s.label}>
                  <Link href={s.href} className="flex items-center gap-3 border-t border-line-soft px-5 py-3 hover:bg-subtle">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{s.label}</span>
                      <span className="block text-xs text-ink-3">{s.sub}</span>
                    </span>
                    <IconChevronRight size={16} className="text-ink-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 text-[13px] leading-relaxed text-ink-3">
            Hai con số là <b className="text-ink-2">mức sẵn sàng ứng tuyển</b> và <b className="text-ink-2">mức đáp ứng kỳ vọng</b> — không phải xác suất trúng tuyển. Cùng
            một CV, JD và kỳ vọng luôn cho ra cùng kết quả.
            {last && (
              <div className="mt-3 border-t border-line-soft pt-3">
                <div className="font-semibold text-ink-2">Lần chấm gần nhất · {new Date(last.at).toLocaleDateString("vi-VN")}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="w-16">Sẵn sàng</span>
                  <ScoreBar value={last.readiness} tone="muted" />
                  <span className="w-6 text-right">{last.readiness ?? "—"}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="w-16">Kỳ vọng</span>
                  <ScoreBar value={last.workFit} tone="muted" />
                  <span className="w-6 text-right">{last.workFit ?? "—"}</span>
                </div>
              </div>
            )}
            <div className="mt-3 border-t border-line-soft pt-3">
              <button type="button" className="font-semibold text-ink-3 hover:text-danger hover:underline" onClick={() => setConfirmDelete(true)}>
                Xoá JD này
              </button>
            </div>
          </Card>
        </aside>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" size="lg" href={`/jobs/${job.id}/gaps`}>
          Phân tích khoảng trống
        </Button>
      </div>

      <Dialog open={explain} onClose={() => setExplain(false)} title="Cách tính điểm" wide>
        <ScoreExplainer ev={ev} />
      </Dialog>
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Xoá JD này?">
        <p className="text-sm text-ink-2">Kết quả bóc tách và mọi gợi ý của JD này sẽ bị xoá. Câu trả lời làm rõ vẫn giữ trong hồ sơ.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="muted" onClick={() => setConfirmDelete(false)}>
            Huỷ
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await ws.deleteJob(job.id);
              router.push("/jobs");
            }}
          >
            Xoá JD
          </Button>
        </div>
      </Dialog>
    </Page>
  );
}

export default function ResultPage() {
  return <JobGate>{(job, ev) => <Result job={job} ev={ev} />}</JobGate>;
}
