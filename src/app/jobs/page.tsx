"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Page } from "@/components/app-shell";
import { IconBookmark, IconChevronRight, IconClock, IconMapPin, IconPlusSquare, IconSliders, IconWarning, IconX, IconXCircle } from "@/components/icons";
import { FitMatrix } from "@/components/job";
import { Avatar, Button, Card, cx, CompanyLogo, Loading, Notice, PageTitle, QuadrantBadge, ScoreBar, scoreTone, Spinner, UR } from "@/components/ui";
import { useEvaluations, useWorkspace } from "@/components/workspace";
import { portfolio, QUADRANTS, type JobEvaluation, type Quadrant } from "@/lib/engine";
import { locationText, relativeDay, salaryText, workModeText } from "@/lib/format";
import type { Job } from "@/lib/schema";
import { norm } from "@/lib/text";

type Filter = "all" | Quadrant | "saved";

function warning(ev: JobEvaluation): { text: string; kind: "db" | "blocker" } | null {
  if (ev.workFit.violated.length) return { text: `Vi phạm deal-breaker: ${ev.workFit.violated[0].label.toLowerCase()}`, kind: "db" };
  const n = ev.readiness.blockers.length;
  if (n) return { text: `${n} yêu cầu bắt buộc chưa đạt`, kind: "blocker" };
  return null;
}

function Delta({ job, ev }: { job: Job; ev: JobEvaluation }) {
  const last = job.scoreHistory.at(-1);
  if (!last || last.readiness === null || ev.readiness.score === null || last.readiness === ev.readiness.score) return null;
  const d = ev.readiness.score - last.readiness;
  return <span className={cx("ml-1 text-[11px] font-semibold", d > 0 ? "text-success" : "text-danger")}>{d > 0 ? `▲${d}` : `▼${-d}`}</span>;
}

/** Thẻ JD trong danh sách — bố cục như thẻ việc làm: logo, tên vị trí màu xanh, công ty, địa điểm, điểm. */
function JobCard({ job, ev }: { job: Job; ev: JobEvaluation }) {
  const w = warning(ev);
  const meta = [locationText(job), workModeText(job)].filter(Boolean).join(" · ");
  const sal = salaryText(job);
  return (
    <Link href={`/jobs/${job.id}`} className="group flex gap-3 border-t border-line-soft px-4 py-4 first:border-t-0 hover:bg-subtle sm:px-5">
      <CompanyLogo name={job.company || job.title} size={52} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-accent group-hover:underline">{job.title}</div>
            <div className="truncate text-sm text-ink">{job.company || "Công ty chưa rõ"}</div>
            {meta && (
              <div className="mt-0.5 flex items-center gap-1 truncate text-sm text-ink-3">
                <IconMapPin size={13} className="shrink-0" /> {meta}
              </div>
            )}
          </div>
          {job.saved && <IconBookmark filled size={16} className="mt-1 shrink-0 text-ink-3" />}
        </div>

        <div className="mt-2.5 grid max-w-md grid-cols-2 gap-x-5 gap-y-1">
          {(
            [
              ["Sẵn sàng", ev.readiness.score, scoreTone(ev.readiness.score, ev.readiness.high)],
              ["Kỳ vọng", ev.workFit.score, scoreTone(ev.workFit.score, ev.workFit.high)],
            ] as const
          ).map(([label, v, tone]) => (
            <div key={label}>
              <div className="flex justify-between text-xs">
                <span className="text-ink-3">{label}</span>
                <span className="font-semibold">
                  {v ?? "—"}
                  {label === "Sẵn sàng" && <Delta job={job} ev={ev} />}
                </span>
              </div>
              <div className="mt-1">
                <ScoreBar value={v} tone={tone} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <QuadrantBadge q={ev.decision.quadrant} withAction />
          {sal && <span className="text-ink-3">{sal}</span>}
          {w && (
            <span className={cx("inline-flex items-center gap-1 font-semibold", w.kind === "db" ? "text-danger" : "text-warning")} title={w.text}>
              {w.kind === "db" ? <IconXCircle size={13} /> : <IconWarning size={13} />} {w.text}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-ink-4">
            <IconClock size={12} /> {relativeDay(job.createdAt)}
          </span>
        </div>
      </div>
      <IconChevronRight size={18} className="mt-1 hidden shrink-0 text-ink-4 sm:block" />
    </Link>
  );
}

function ProfileRail() {
  const ws = useWorkspace();
  const p = ws.profile!;
  const headline = p.experience.find((e) => e.onCv) ?? p.experience[0];
  const saved = ws.jobs.filter((j) => j.saved).length;
  return (
    <Card className="overflow-hidden">
      <div className="h-14 bg-gradient-to-r from-[#a0b4b7] via-[#c6d6db] to-[#e9e5df]" aria-hidden />
      <div className="-mt-9 px-4 pb-4">
        <div className="rounded-full border-2 border-surface bg-surface" style={{ width: 72, height: 72 }}>
          <Avatar name={p.basics.name} size={68} />
        </div>
        <Link href="/profile" className="mt-2 block text-base font-semibold hover:underline">
          {p.basics.name || "Hồ sơ của bạn"}
        </Link>
        <div className="text-[13px] leading-snug text-ink-3">
          {headline ? [headline.title, headline.company].filter(Boolean).join(" tại ") : "Chưa có kinh nghiệm trên hồ sơ"}
        </div>
      </div>
      <dl className="border-t border-line-soft py-2 text-[13px]">
        <div className="flex justify-between px-4 py-1">
          <dt className="text-ink-3">Kỹ năng trong hồ sơ</dt>
          <dd className="font-semibold text-accent">{p.skills.length}</dd>
        </div>
        <div className="flex justify-between px-4 py-1">
          <dt className="text-ink-3">Câu đã làm rõ</dt>
          <dd className="font-semibold text-accent">{p.clarifications.filter((c) => c.answer !== "skip").length}</dd>
        </div>
        <div className="flex justify-between px-4 py-1">
          <dt className="text-ink-3">JD đã lưu</dt>
          <dd className="font-semibold text-accent">{saved}</dd>
        </div>
      </dl>
      <nav className="flex flex-col border-t border-line-soft py-1 text-sm font-semibold">
        <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-ink-2 hover:bg-subtle">
          <IconBookmark size={15} /> Hồ sơ năng lực
        </Link>
        <Link href="/preferences" className="flex items-center gap-2 px-4 py-2 text-ink-2 hover:bg-subtle">
          <IconSliders size={15} /> Kỳ vọng · {ws.preferences?.dealBreakers.length ?? 0} deal-breaker
        </Link>
        <Link href="/jobs/new" className="flex items-center gap-2 px-4 py-2 text-ink-2 hover:bg-subtle">
          <IconPlusSquare size={15} /> Phân tích JD mới
        </Link>
      </nav>
    </Card>
  );
}

function JobsList() {
  const ws = useWorkspace();
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const evals = useEvaluations();
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => ws.jobs.map((job) => ({ job, ev: evals.get(job.id)! })).filter((x) => x.ev), [ws.jobs, evals]);
  const pf = useMemo(() => portfolio(items), [items]);

  if (!ws.ready) return <Loading />;

  const loadSamples = async () => {
    setBusy(true);
    try {
      await ws.loadSamples();
    } finally {
      setBusy(false);
    }
  };

  if (!ws.profile || !ws.preferences) {
    return (
      <Page narrow>
        <PageTitle title="JD đã phân tích" />
        <Notice tone="accent">
          Bắt đầu bằng việc tải CV và khai kỳ vọng — mọi JD sẽ được chấm theo hai thứ này.
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" href={ws.profile ? "/preferences" : "/cv"}>
              {ws.profile ? "Khai kỳ vọng" : "Tải CV"}
            </Button>
            <Button disabled={busy} onClick={loadSamples}>
              {busy && <Spinner />} Dùng dữ liệu mẫu
            </Button>
          </div>
        </Notice>
      </Page>
    );
  }

  const nq = norm(q);
  const filtered = pf.sorted
    .filter((x) => (filter === "all" ? true : filter === "saved" ? x.job.saved : x.ev.decision.quadrant === filter))
    .filter((x) => !nq || norm(`${x.job.title} ${x.job.company}`).includes(nq));
  const tabs: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: "Tất cả", n: items.length },
    { id: "diamond", label: QUADRANTS.diamond.action, n: pf.counts.diamond },
    { id: "challenge", label: QUADRANTS.challenge.action, n: pf.counts.challenge },
    { id: "safe", label: QUADRANTS.safe.action, n: pf.counts.safe },
    { id: "low", label: QUADRANTS.low.action, n: pf.counts.low },
    { id: "saved", label: "Đã lưu", n: items.filter((x) => x.job.saved).length },
  ];

  return (
    <Page className="lg:grid lg:grid-cols-[225px_1fr_300px] lg:items-start lg:gap-5">
      <aside className="hidden lg:sticky lg:top-[68px] lg:block">
        <ProfileRail />
      </aside>

      <div className="flex min-w-0 flex-col gap-3">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 px-4 pt-4 pb-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
            <div>
              <h1 className="text-xl font-semibold">JD đã phân tích</h1>
              <p className="text-sm text-ink-3">{items.length} công việc, xếp theo mức đáng ưu tiên. Kỳ vọng đổi thì cả danh sách được chấm lại.</p>
            </div>
            <Button variant="primary" href="/jobs/new">
              <IconPlusSquare size={15} /> Phân tích JD mới
            </Button>
          </div>
          {items.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-4 sm:flex-wrap sm:px-5" role="tablist" aria-label="Lọc theo phân loại">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === t.id}
                  onClick={() => setFilter(t.id)}
                  className={cx(
                    "h-8 shrink-0 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                    filter === t.id ? "border-success-strong bg-success-strong text-white" : "border-line-strong/70 text-ink-3 hover:bg-muted hover:text-ink",
                  )}
                >
                  {t.label} · {t.n}
                </button>
              ))}
            </div>
          )}
          {q && (
            <div className="flex items-center justify-between gap-3 border-t border-line-soft bg-subtle px-5 py-2.5 text-sm">
              <span>
                Kết quả tìm “<b>{q}</b>”: {filtered.length} JD
              </span>
              <button type="button" className="inline-flex items-center gap-1 font-semibold text-ink-3 hover:text-ink" onClick={() => router.push("/jobs")}>
                <IconX size={13} /> Bỏ tìm
              </button>
            </div>
          )}
          {items.length === 0 ? (
            <div className="border-t border-line-soft px-5 py-10 text-center">
              <div className="text-base font-semibold">Chưa có JD nào</div>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-3">Dán một tin tuyển dụng để xem nó rơi vào ô nào của ma trận hai chiều.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="primary" href="/jobs/new">
                  Phân tích JD mới
                </Button>
                <Button disabled={busy} onClick={loadSamples}>
                  {busy && <Spinner />} Thêm 5 JD mẫu
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-t border-line-soft">
              {filtered.map((x) => (
                <JobCard key={x.job.id} job={x.job} ev={x.ev} />
              ))}
              {filtered.length === 0 && <p className="px-5 py-8 text-center text-sm text-ink-3">Không có JD nào khớp bộ lọc.</p>}
            </div>
          )}
        </Card>
      </div>

      {items.length > 0 && (
        <aside className="flex flex-col gap-4 lg:sticky lg:top-[68px]">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Toàn bộ JD trên ma trận</h2>
              <UR code="UR-1.6.2" />
            </div>
            <FitMatrix counts={pf.counts} compact />
          </Card>
          {pf.topBlocker && pf.topBlocker.count > 1 && (
            <Card className="overflow-hidden">
              <div className="p-4">
                <div className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Năng lực chặn nhiều JD nhất</div>
                <div className="mt-2 text-[15px] leading-snug font-semibold">{pf.topBlocker.label}</div>
                <div className="mt-2 flex items-center gap-2">
                  <ScoreBar value={(pf.topBlocker.count / pf.total) * 100} tone="warning" />
                  <span className="shrink-0 text-xs font-semibold text-ink-2">
                    {pf.topBlocker.count} / {pf.total} JD
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-3">Xử lý một lần, {pf.topBlocker.count} công việc trong danh sách cùng được cải thiện.</p>
              </div>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1 border-t border-line-soft py-2.5 text-sm font-semibold text-ink-3 hover:bg-subtle hover:text-ink"
                onClick={() => {
                  const target = pf.sorted.find((x) => x.ev.readiness.blockers.some((b) => b.key === pf.topBlocker!.key));
                  const blocker = target?.ev.readiness.blockers.find((b) => b.key === pf.topBlocker!.key);
                  if (!target || !blocker) return;
                  router.push(blocker.status === "unknown" ? `/jobs/${target.job.id}/clarify?key=${encodeURIComponent(blocker.key)}` : `/jobs/${target.job.id}/actions`);
                }}
              >
                Xem cần làm gì với tiêu chí này <IconChevronRight size={14} />
              </button>
            </Card>
          )}
          <p className="px-2 text-center text-xs leading-relaxed text-ink-4">Điểm là mức sẵn sàng và mức đáp ứng kỳ vọng — không phải xác suất trúng tuyển.</p>
        </aside>
      )}
    </Page>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <JobsList />
    </Suspense>
  );
}
