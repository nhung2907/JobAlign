"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/app-shell";
import { IconCheckCircle, IconMapPin, IconSparkle, IconWarning } from "@/components/icons";
import { FitMatrix } from "@/components/job";
import { Button, Card, CompanyLogo, QuadrantBadge, ScoreBar, Spinner } from "@/components/ui";
import { useWorkspace } from "@/components/workspace";

const PRINCIPLES = [
  { title: "Hai chiều", body: "Mỗi JD được chấm cả mức sẵn sàng của bạn lẫn mức công việc đáp ứng kỳ vọng của bạn." },
  { title: "Hai loại khoảng trống", body: "Tách việc bạn đã làm nhưng CV chưa nói ra khỏi năng lực thật sự còn thiếu." },
  { title: "Không suy đoán", body: "JD không nêu thì ghi là chưa rõ. CV không nhắc thì hỏi lại, không kết luận bạn thiếu." },
  { title: "Ra hành động", body: "Mỗi kết luận đi kèm lý do và việc cần làm: sửa CV hôm nay, hay xây năng lực tháng tới." },
];

const STEPS = [
  { n: 1, title: "Tải CV một lần", body: "Hệ thống đọc CV thành hồ sơ năng lực; bạn sửa và bổ sung việc đã làm nhưng CV chưa ghi." },
  { n: 2, title: "Khai kỳ vọng", body: "Lương, khu vực, hình thức làm việc, cơ hội phát triển — và những điều bạn không chấp nhận." },
  { n: 3, title: "Dán JD hoặc link tin", body: "Yêu cầu bắt buộc, yêu cầu ưu tiên và điều kiện làm việc được tách ra để bạn kiểm tra." },
  { n: 4, title: "Biết nên làm gì", body: "JD rơi vào một ô của ma trận, kèm danh sách sửa được ngay và năng lực cần xây dựng." },
];

function PreviewJobCard() {
  return (
    <Card className="p-4 shadow-[var(--shadow-pop)]">
      <div className="flex gap-3">
        <CompanyLogo name="Công ty D" size={48} />
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-accent">Marketing Executive</div>
          <div className="text-sm">Công ty D</div>
          <div className="flex items-center gap-1 text-sm text-ink-3">
            <IconMapPin size={13} /> Cầu Giấy, Hà Nội · Hybrid
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-3">Sẵn sàng</span>
                <b>73</b>
              </div>
              <div className="mt-1">
                <ScoreBar value={73} tone="warning" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-3">Kỳ vọng</span>
                <b>100</b>
              </div>
              <div className="mt-1">
                <ScoreBar value={100} tone="success" />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <QuadrantBadge q="challenge" withAction />
            <span className="inline-flex items-center gap-1 font-semibold text-warning">
              <IconWarning size={13} /> 1 yêu cầu bắt buộc chưa đạt
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Landing() {
  const ws = useWorkspace();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const needsLogin = ws.mode === "supabase" && ws.ready && !ws.userEmail;
  const hasData = !!ws.profile && !!ws.preferences;
  const start = needsLogin ? "/login" : hasData ? "/jobs" : ws.profile ? "/preferences" : "/cv";

  return (
    <div className="min-h-dvh bg-surface">
      <header className="bg-surface">
        <div className="mx-auto flex h-[72px] max-w-[1160px] items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={36} />
            <span className="text-[22px] font-bold tracking-[-0.03em] text-accent">JobAlign</span>
          </Link>
          {ws.ready && (
            <div className="flex items-center gap-2">
              {!hasData && !needsLogin && (
                <Link href="/cv" className="hidden rounded-full px-4 py-2 text-[15px] font-semibold text-ink-3 hover:bg-muted hover:text-ink sm:block">
                  Bắt đầu
                </Link>
              )}
              <Button href={start} size="lg">
                {needsLogin ? "Đăng nhập" : hasData ? "Vào danh sách JD" : "Tải CV"}
              </Button>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1160px] items-center gap-12 px-4 pt-8 pb-16 md:grid-cols-[1.05fr_1fr] md:pt-16 md:pb-24">
          <div className="flex flex-col gap-7">
            <h1 className="text-[36px] leading-[1.15] font-light tracking-[-0.01em] text-[#8f5849] md:text-[52px]">
              Biết nên nộp JD nào, CV cần sửa gì, và cần làm gì tiếp theo.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-ink-3">
              JobAlign không chỉ chấm CV khớp JD tới đâu. Hệ thống còn hỏi ngược lại: công việc có đáp ứng mức lương, địa điểm và cách làm việc bạn muốn không —
              rồi xếp mỗi JD vào đúng một ô để bạn quyết định.
            </p>
            <div className="flex max-w-md flex-col gap-3">
              <Button variant="primary" size="lg" href={start} className={ws.ready ? "h-12 text-base" : "pointer-events-none h-12 text-base opacity-60"}>
                {needsLogin ? "Đăng nhập để bắt đầu" : hasData ? "Vào danh sách JD" : "Tải CV để bắt đầu"}
              </Button>
              {!needsLogin && (
                <Button
                  variant="muted"
                  size="lg"
                  className="h-12 text-base"
                  disabled={!ws.ready || busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await ws.loadSamples();
                      router.push("/jobs");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy && <Spinner />} Xem với dữ liệu mẫu
                </Button>
              )}
            </div>
            <p className="max-w-md text-xs leading-relaxed text-ink-3">
              Điểm số là mức sẵn sàng ứng tuyển và mức đáp ứng kỳ vọng — không phải xác suất trúng tuyển. CV chỉ chủ tài khoản xem được và xoá được bất cứ lúc nào.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-3 rounded-[28px] md:-inset-6 bg-gradient-to-br from-accent-soft via-[#f3f6f8] to-success-soft" aria-hidden />
            <div className="relative flex flex-col gap-4">
              <PreviewJobCard />
              <Card className="p-4 shadow-[var(--shadow-pop)] md:ml-12">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-3">
                  <IconSparkle size={14} className="text-accent" /> Ma trận hai chiều
                </div>
                <FitMatrix highlight="challenge" compact />
              </Card>
            </div>
          </div>
        </section>

        <section className="bg-canvas">
          <div className="mx-auto max-w-[1160px] px-4 py-16">
            <h2 className="text-3xl font-light text-ink md:text-[40px]">Mỗi JD, hai câu hỏi</h2>
            <p className="mt-2 max-w-2xl text-lg text-ink-3">Ứng tuyển là chuyện hai chiều — JobAlign trả lời cả hai trước khi bạn bấm nộp.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                { t: "Bạn có hợp với công việc không?", b: "Từng yêu cầu JD được đối chiếu với đúng dòng trong CV. Yêu cầu bắt buộc chưa có bằng chứng được nêu riêng, không bị chìm trong điểm tổng." },
                { t: "Công việc có hợp với bạn không?", b: "Lương, khu vực, hình thức làm việc và cơ hội phát triển được so với kỳ vọng bạn đặt. Vi phạm deal-breaker được cảnh báo trước khi chấm." },
              ].map((x, i) => (
                <Card key={x.t} className="p-6">
                  <div className="text-sm font-semibold text-accent">Chiều {i + 1}</div>
                  <div className="mt-1 text-xl font-semibold">{x.t}</div>
                  <p className="mt-2 leading-relaxed text-ink-3">{x.b}</p>
                </Card>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PRINCIPLES.map((p) => (
                <Card key={p.title} className="p-5">
                  <IconCheckCircle size={20} className="text-success" />
                  <div className="mt-3 text-base font-semibold">{p.title}</div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-3">{p.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1160px] px-4 py-16">
          <h2 className="text-3xl font-light md:text-[40px]">Cách hoạt động</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex flex-col gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-base font-semibold text-accent">{s.n}</span>
                <div className="text-base font-semibold">{s.title}</div>
                <p className="text-sm leading-relaxed text-ink-3">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <footer className="border-t border-line bg-canvas">
          <div className="mx-auto flex max-w-[1160px] flex-col gap-2 px-4 py-6 text-xs text-ink-3 md:flex-row md:items-center md:justify-between">
            <span className="flex items-center gap-2">
              <Logo size={20} /> <b className="text-accent">JobAlign</b> · TIN314 · Nhóm 11
            </span>
            <span>{ws.mode === "local" ? "Chế độ demo: dữ liệu chỉ lưu trên trình duyệt này." : "Dữ liệu lưu trên Supabase, chỉ chủ tài khoản xem được."}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
