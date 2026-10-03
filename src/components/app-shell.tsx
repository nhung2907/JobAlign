"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { IconBriefcase, IconChevronDown, IconPlusSquare, IconSearch, IconSliders, IconTrash, IconUser } from "./icons";
import { Avatar, Button, cx, Dialog } from "./ui";
import { useWorkspace } from "./workspace";

const NAV = [
  { href: "/jobs", label: "Việc làm", icon: IconBriefcase, exact: true },
  { href: "/jobs/new", label: "Phân tích JD", icon: IconPlusSquare, exact: true },
  { href: "/profile", label: "Hồ sơ", icon: IconUser },
  { href: "/preferences", label: "Kỳ vọng", icon: IconSliders },
];

const STEPS = [
  { href: "/cv", label: "Tải CV" },
  { href: "/profile", label: "Hồ sơ năng lực" },
  { href: "/preferences", label: "Kỳ vọng" },
];

function isActive(path: string, href: string, exact?: boolean) {
  if (href === "/jobs" && exact) return path === "/jobs" || (path.startsWith("/jobs/") && !path.startsWith("/jobs/new"));
  return exact ? path === href : path === href || path.startsWith(`${href}/`);
}

/** Logo JobAlign: ô xanh bo góc với chữ JA. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-md bg-accent font-bold tracking-[-0.04em] text-white"
      style={{ width: size, height: size, fontSize: size * 0.44 }}
      aria-hidden
    >
      JA
    </span>
  );
}

function Stepper({ path }: { path: string }) {
  const current = Math.max(0, STEPS.findIndex((s) => isActive(path, s.href)));
  return (
    <ol className="flex items-center gap-2 text-[13px] md:gap-3" aria-label="Các bước bắt đầu">
      {STEPS.map((s, i) => (
        <li key={s.href} className="flex items-center gap-2 md:gap-3">
          {i > 0 && <span className={cx("hidden h-0.5 w-8 rounded-full sm:block", i <= current ? "bg-accent" : "bg-line")} aria-hidden />}
          <span className={cx("flex items-center gap-2", i === current ? "font-semibold text-ink" : "text-ink-3")} aria-current={i === current ? "step" : undefined}>
            <span
              className={cx(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                i < current ? "bg-success text-white" : i === current ? "bg-accent text-white" : "border border-line-strong text-ink-3",
              )}
            >
              {i < current ? "✓" : i + 1}
            </span>
            <span className={cx(i !== current && "hidden sm:inline")}>{s.label}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const path = usePathname();
  const [q, setQ] = useState(path === "/jobs" ? (params.get("q") ?? "") : "");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/jobs?q=${encodeURIComponent(q.trim())}` : "/jobs");
      }}
      className="hidden h-[34px] w-[280px] items-center gap-2 rounded-md bg-muted px-3 text-ink-3 focus-within:w-[340px] focus-within:shadow-[0_0_0_2px_var(--color-ink)] focus-within:bg-surface md:flex [transition:width_.2s]"
    >
      <IconSearch size={16} className="shrink-0" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm JD đã phân tích"
        aria-label="Tìm JD đã phân tích"
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
      />
    </form>
  );
}

function AccountMenu() {
  const ws = useWorkspace();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const name = ws.profile?.basics.name || ws.userEmail || "";

  const loadSamples = async () => {
    setBusy(true);
    try {
      await ws.loadSamples();
      setConfirmSample(false);
      ws.toast("Đã nạp hồ sơ, kỳ vọng và 5 JD mẫu.");
      router.push("/jobs");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const headline = ws.profile?.experience.find((e) => e.onCv)?.title ?? (ws.profile ? "Chưa có kinh nghiệm trên CV" : "Chưa có hồ sơ");

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Tài khoản"
        className="flex flex-col items-center text-ink-3 hover:text-ink md:min-w-[64px] md:gap-0.5 md:pt-1"
      >
        <span className="md:hidden">
          <Avatar name={name} size={32} />
        </span>
        <span className="hidden md:block">
          <Avatar name={name} size={24} />
        </span>
        <span className="hidden items-center gap-0.5 text-xs md:flex">
          Tôi <IconChevronDown size={12} />
        </span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-lg bg-surface text-sm shadow-[var(--shadow-pop)]">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Avatar name={name} size={52} />
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{ws.profile?.basics.name || ws.userEmail || "Chế độ demo"}</div>
                <div className="truncate text-[13px] text-ink-3">{headline}</div>
              </div>
            </div>
            <Button href="/profile" size="sm" block className="mt-3" onClick={() => setOpen(false)}>
              Xem hồ sơ năng lực
            </Button>
          </div>
          <div className="border-t border-line-soft px-4 py-3">
            <div className="font-semibold">Dữ liệu</div>
            <p className="mt-1 text-xs leading-relaxed text-ink-3">
              {ws.mode === "local" ? "Chế độ demo — dữ liệu chỉ lưu trên trình duyệt này, không gửi lên máy chủ." : "Dữ liệu lưu trên Supabase, chỉ tài khoản của bạn xem được."}
            </p>
            <p className="mt-1 text-xs text-ink-3">
              Đọc CV/JD: {ws.health === null ? "…" : ws.health.gemini ? `Gemini (${ws.health.model})` : "bộ đọc quy tắc — chưa cấu hình Gemini"}
            </p>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-line-soft px-4 py-3 text-ink-3 hover:bg-subtle hover:text-ink">
            <span>Hiện mã yêu cầu URD</span>
            <input type="checkbox" checked={ws.showUR} onChange={(e) => ws.setShowUR(e.target.checked)} className="h-4 w-4 accent-accent" />
          </label>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-4 py-3 text-left text-ink-3 hover:bg-subtle hover:text-ink"
            onClick={() => {
              setOpen(false);
              if (ws.profile || ws.preferences) setConfirmSample(true);
              else loadSamples();
            }}
          >
            Dùng dữ liệu mẫu
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-danger hover:bg-danger-soft"
            onClick={() => {
              setOpen(false);
              setConfirm(true);
            }}
          >
            <IconTrash size={14} /> Xoá CV và toàn bộ dữ liệu
          </button>
          {ws.mode === "supabase" && (
            <button type="button" role="menuitem" className="block w-full border-t border-line-soft px-4 py-3 text-left text-ink-3 hover:bg-subtle hover:text-ink" onClick={() => ws.signOut()}>
              Đăng xuất
            </button>
          )}
        </div>
      )}
      <Dialog open={confirmSample} onClose={() => setConfirmSample(false)} title="Dùng dữ liệu mẫu?">
        <p className="text-sm leading-relaxed text-ink-2">
          Hồ sơ năng lực và kỳ vọng hiện tại sẽ được thay bằng bản mẫu (ứng viên Marketing). 5 JD mẫu được thêm vào danh sách, các JD bạn đã phân tích vẫn giữ nguyên.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="muted" onClick={() => setConfirmSample(false)}>
            Huỷ
          </Button>
          <Button variant="primary" disabled={busy} onClick={loadSamples}>
            Thay bằng dữ liệu mẫu
          </Button>
        </div>
      </Dialog>
      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Xoá toàn bộ dữ liệu?">
        <p className="text-sm leading-relaxed text-ink-2">Hồ sơ năng lực, tệp CV, kỳ vọng và mọi JD đã phân tích sẽ bị xoá vĩnh viễn. Không hoàn tác được.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="muted" onClick={() => setConfirm(false)}>
            Huỷ
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await ws.deleteAll();
                setConfirm(false);
                ws.toast("Đã xoá toàn bộ dữ liệu.");
                router.push("/");
              } finally {
                setBusy(false);
              }
            }}
          >
            Xoá vĩnh viễn
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const ws = useWorkspace();
  const bare = path === "/" || path === "/login";
  const onboarding = ws.ready && !ws.preferences && STEPS.some((s) => isActive(path, s.href));

  if (bare) return <>{children}</>;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-[52px] max-w-[1160px] items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <Link href={ws.preferences ? "/jobs" : "/"} aria-label="JobAlign — trang chính" className="flex items-center gap-2">
              <Logo />
              <span className="text-[17px] font-bold tracking-[-0.02em] text-accent sm:hidden lg:inline">JobAlign</span>
            </Link>
            {!onboarding && (
              <Suspense>
                <SearchBox />
              </Suspense>
            )}
          </div>
          {onboarding ? (
            <Stepper path={path} />
          ) : (
            <nav className="hidden h-full items-stretch md:flex" aria-label="Điều hướng chính">
              {NAV.map(({ href, label, icon: Icon, exact }) => {
                const on = isActive(path, href, exact);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={on ? "page" : undefined}
                    className={cx(
                      "flex min-w-[80px] flex-col items-center justify-center gap-0.5 border-b-2 px-2 text-xs",
                      on ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink",
                    )}
                  >
                    <Icon size={22} strokeWidth={on ? 1.9 : 1.5} />
                    {label}
                  </Link>
                );
              })}
              <span className="mx-2 my-2 w-px bg-line" aria-hidden />
            </nav>
          )}
          <div className="flex items-center gap-3">
            {ws.mode === "local" && (
              <span className="hidden rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-semibold text-warning lg:inline" title="Dữ liệu chỉ lưu trên trình duyệt này">
                Demo
              </span>
            )}
            <AccountMenu />
          </div>
        </div>
      </header>
      <main className={cx("flex-1 md:pb-10", onboarding ? "pb-10" : "pb-24")}>{children}</main>
      {!onboarding && (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface md:hidden" aria-label="Điều hướng">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const on = isActive(path, href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cx("flex flex-1 flex-col items-center gap-1 border-t-2 py-2 text-[11px]", on ? "border-ink font-semibold text-ink" : "border-transparent text-ink-3")}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

/** Khung nội dung: rộng 1128px như LinkedIn, lề 16px trên điện thoại. */
export function Page({ children, className, narrow }: { children: ReactNode; className?: string; narrow?: boolean }) {
  return <div className={cx("mx-auto flex w-full flex-col gap-4 px-4 py-6", narrow ? "max-w-[1012px]" : "max-w-[1160px]", className)}>{children}</div>;
}
