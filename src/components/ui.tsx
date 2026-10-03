"use client";
import Link from "next/link";
import { useEffect, useRef, type ButtonHTMLAttributes, type MouseEventHandler, type ReactNode } from "react";
import { QUADRANTS, type Quadrant, type ReqStatus, type Severity } from "@/lib/engine";
import type { Importance, Source } from "@/lib/schema";
import { IconCheckCircle, IconDashedCircle, IconHalfCircle, IconInfo, IconX, IconXCircle } from "./icons";
import { useWorkspace } from "./workspace";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------------- Nút (dạng viên thuốc) */

type Variant = "primary" | "secondary" | "muted" | "danger" | "ghost";
const VARIANT: Record<Variant, string> = {
  primary: "bg-accent border-accent text-white hover:bg-accent-strong hover:border-accent-strong",
  secondary: "bg-surface border-accent text-accent hover:bg-accent-soft hover:shadow-[inset_0_0_0_1px_var(--color-accent)]",
  muted: "bg-surface border-line-strong text-ink-3 hover:bg-subtle hover:text-ink hover:shadow-[inset_0_0_0_1px_var(--color-line-strong)]",
  danger: "bg-surface border-danger text-danger hover:bg-danger-soft",
  ghost: "bg-transparent border-transparent text-ink-3 hover:bg-muted hover:text-ink",
};
const SIZE = { sm: "h-8 px-3.5 text-[13px]", md: "h-9 px-4 text-sm", lg: "h-10 px-5 text-[15px]" };

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof SIZE;
  href?: string;
  block?: boolean;
}

export function Button({ variant = "secondary", size = "md", href, block, className, children, ...rest }: BtnProps) {
  const cls = cx(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border font-semibold whitespace-nowrap transition-[background-color,box-shadow,color] disabled:cursor-not-allowed disabled:border-line disabled:bg-muted disabled:text-ink-5 disabled:shadow-none",
    VARIANT[variant],
    SIZE[size],
    block && "w-full",
    className,
  );
  if (href) {
    const onClick = rest.onClick as unknown as MouseEventHandler<HTMLAnchorElement> | undefined;
    return (
      <Link href={href} className={cls} onClick={onClick} aria-label={rest["aria-label"]}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Khung */

export function Card({ className, children, as: As = "section" }: { className?: string; children: ReactNode; as?: "section" | "div" | "article" }) {
  return <As className={cx("rounded-lg border border-line bg-surface", className)}>{children}</As>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("eyebrow", className)}>{children}</div>;
}

export function SectionTitle({ title, sub, action, ur, count, className }: { title: string; sub?: ReactNode; action?: ReactNode; ur?: string; count?: number; className?: string }) {
  return (
    <div className={cx("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          {count !== undefined && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-ink-3">{count}</span>}
          {ur && <UR code={ur} />}
        </div>
        {sub && <div className="mt-0.5 text-sm text-ink-3">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

/** Mã yêu cầu URD (vd. UR-1.4.7). Ẩn mặc định; bật ở menu tài khoản để đối chiếu với URD. */
export function UR({ code, className }: { code: string; className?: string }) {
  const { showUR } = useWorkspace();
  if (!showUR) return null;
  return (
    <span className={cx("inline-block rounded border border-dashed border-dash px-1.5 py-0.5 font-mono text-[10px] leading-tight font-normal whitespace-nowrap text-ink-4", className)}>
      {code}
    </span>
  );
}

export function PageTitle({ title, ur, back, sub, actions, level = 1 }: { title: string; ur?: string; back?: { href: string; label: string }; sub?: ReactNode; actions?: ReactNode; level?: 1 | 2 }) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {back && (
          <Link href={back.href} className="flex items-center gap-1.5 text-sm font-semibold text-ink-3 hover:text-accent">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="m9.5 4-4 4 4 4" />
            </svg>
            <span className="truncate">{back.label}</span>
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <H className={cx("font-semibold tracking-[-0.01em] text-ink", level === 1 ? "text-2xl" : "text-xl")}>{title}</H>
          {ur && <UR code={ur} />}
        </div>
        {sub && <div className="max-w-2xl text-[15px] leading-relaxed text-ink-3">{sub}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- Nhãn */

type TagTone = "neutral" | "solid" | "accent" | "danger" | "dashed" | "dangerSolid" | "dark" | "success" | "warning";
const TAG: Record<TagTone, string> = {
  neutral: "border-line-strong/60 text-ink-3 bg-surface",
  solid: "border-transparent bg-muted text-ink-2",
  accent: "border-transparent bg-accent-soft text-accent-strong",
  danger: "border-transparent bg-danger-soft text-danger-strong",
  dashed: "border-dashed border-ink-5 text-ink-4 bg-surface",
  dangerSolid: "border-danger bg-danger text-white",
  dark: "border-ink-2 bg-ink-2 text-white",
  success: "border-transparent bg-success-soft text-success",
  warning: "border-transparent bg-warning-soft text-warning",
};

export function Tag({ tone = "neutral", children, className, title }: { tone?: TagTone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-[3px] text-xs leading-4 font-semibold whitespace-nowrap", TAG[tone], className)}>
      {children}
    </span>
  );
}

export function SourceTag({ source, onCv = true }: { source: Source | "unknown"; onCv?: boolean }) {
  if (source === "unknown") return <Tag tone="dashed">Chưa đủ dữ liệu</Tag>;
  if (source === "user" || !onCv) return <Tag tone="accent">Bạn bổ sung</Tag>;
  return <Tag tone="solid">Từ CV</Tag>;
}

export function LevelTag({ level }: { level: "must" | "preferred" }) {
  return level === "must" ? <Tag tone="solid">Bắt buộc</Tag> : <Tag tone="neutral">Ưu tiên</Tag>;
}

const SEV: Record<Severity, TagTone> = { critical: "dangerSolid", high: "warning", medium: "accent", low: "solid" };
export function SeverityTag({ severity }: { severity: Severity }) {
  const label = { critical: "Critical", high: "High", medium: "Medium", low: "Low" }[severity];
  return <Tag tone={SEV[severity]}>{label}</Tag>;
}

export const IMPORTANCE_SHORT: Record<Importance, string> = { must: "Must", important: "Important", nice: "Nice" };

const QUADRANT_TONE: Record<Quadrant, TagTone> = { diamond: "success", challenge: "accent", safe: "warning", low: "solid" };
const QUADRANT_DOT: Record<Quadrant, string> = { diamond: "bg-success", challenge: "bg-accent", safe: "bg-warning-bright", low: "bg-ink-5" };

export function QuadrantBadge({ q, withAction, className }: { q: Quadrant; withAction?: boolean; className?: string }) {
  return (
    <Tag tone={QUADRANT_TONE[q]} className={className}>
      <span className={cx("h-1.5 w-1.5 rounded-full", QUADRANT_DOT[q])} aria-hidden />
      {QUADRANTS[q].name}
      {withAction && <span className="font-normal opacity-80">· {QUADRANTS[q].action}</span>}
    </Tag>
  );
}

/* ---------------------------------------------------------------- Ảnh đại diện & logo */

const LOGO_COLORS = ["#0a66c2", "#057642", "#915907", "#8f5849", "#5f4b8b", "#b24020", "#00798c", "#38434f"];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function companyInitials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  const last = words.at(-1) ?? "?";
  if (last.length <= 3 && last === last.toUpperCase()) return last;
  return last[0].toUpperCase();
}

/** Logo công ty dạng ô màu có chữ cái — màu cố định theo tên để cùng công ty luôn cùng màu. */
export function CompanyLogo({ name, size = 48, className }: { name: string; size?: number; className?: string }) {
  const label = name.trim() || "?";
  const color = LOGO_COLORS[hashString(label) % LOGO_COLORS.length];
  const initials = companyInitials(label);
  return (
    <span
      aria-hidden
      className={cx("inline-flex shrink-0 items-center justify-center rounded-md font-bold text-white", className)}
      style={{ width: size, height: size, background: color, fontSize: size * (initials.length > 2 ? 0.3 : initials.length === 2 ? 0.36 : 0.44) }}
    >
      {initials}
    </span>
  );
}

export function Avatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length ? (parts.length > 1 ? parts[0][0] + parts.at(-1)![0] : parts[0][0]).toUpperCase() : "";
  const color = LOGO_COLORS[hashString(name || "?") % LOGO_COLORS.length];
  return (
    <span
      aria-hidden
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
    >
      {initials || (
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="5.6" r="2.6" />
          <path d="M2.9 13.6c.6-2.4 2.6-3.9 5.1-3.9s4.5 1.5 5.1 3.9" />
        </svg>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------- Trạng thái & điểm */

export function StatusIcon({ status, className, size = 16 }: { status: ReqStatus | "not_met"; className?: string; size?: number }) {
  if (status === "met") return <IconCheckCircle size={size} className={cx("text-success", className)} />;
  if (status === "partial") return <IconHalfCircle size={size} className={cx("text-warning-bright", className)} />;
  if (status === "missing" || status === "not_met") return <IconXCircle size={size} className={cx("text-danger", className)} />;
  return <IconDashedCircle size={size} className={cx("text-ink-5", className)} />;
}

export type ScoreTone = "success" | "warning" | "danger" | "accent" | "muted";
const TONE_BG: Record<ScoreTone, string> = { success: "bg-success", warning: "bg-warning-bright", danger: "bg-danger", accent: "bg-accent", muted: "bg-bar" };
const TONE_STROKE: Record<ScoreTone, string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning-bright)",
  danger: "var(--color-danger)",
  accent: "var(--color-accent)",
  muted: "var(--color-bar)",
};

/** Màu cho một điểm: đạt nhóm cao → xanh lá, dưới ngưỡng → cam, quá thấp → đỏ. */
export function scoreTone(value: number | null, high: boolean): ScoreTone {
  if (value === null) return "muted";
  if (high) return "success";
  return value >= 50 ? "warning" : "danger";
}

export function ScoreBar({ value, threshold, tone = "accent" }: { value: number | null; threshold?: number; tone?: ScoreTone }) {
  return (
    <div className="relative h-2 w-full rounded-full bg-muted" role="presentation">
      {value !== null && <div className={cx("absolute inset-y-0 left-0 rounded-full", TONE_BG[tone])} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />}
      {threshold !== undefined && <div className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink-3" style={{ left: `${threshold}%` }} title={`Ngưỡng ${threshold}`} />}
    </div>
  );
}

export function ScoreRing({ value, tone, size = 96, label }: { value: number | null; tone: ScoreTone; size?: number; label?: string }) {
  const stroke = size * 0.1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label ?? `${value ?? "—"} trên 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="leading-none font-semibold tracking-[-0.02em]" style={{ fontSize: size * 0.3 }}>
          {value ?? "—"}
        </span>
        <span className="text-ink-4" style={{ fontSize: size * 0.12 }}>
          / 100
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Điều khiển */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "sm",
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange(v: T): void;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cx("inline-flex gap-0.5 rounded-full border border-line-strong/60 bg-surface p-0.5", size === "md" && "flex w-full")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-full font-semibold transition-colors",
            size === "sm" ? "h-7 px-3 text-[12.5px]" : "h-9 flex-1 px-4 text-sm",
            value === o.value ? "bg-accent text-white" : "text-ink-3 hover:bg-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Nút lọc dạng viên thuốc; khi chọn chuyển sang nền xanh lá có dấu ✓ (như bộ lọc việc làm của LinkedIn). */
export function Chip({ selected, onClick, children, removable, onRemove, tone }: { selected?: boolean; onClick?(): void; children: ReactNode; removable?: boolean; onRemove?(): void; tone?: "danger" }) {
  return (
    <span
      className={cx(
        "inline-flex h-8 items-center rounded-full border text-sm font-semibold transition-colors",
        tone === "danger"
          ? "border-danger/40 bg-danger-soft text-danger-strong"
          : selected
            ? "border-success-strong bg-success-strong text-white"
            : "border-line-strong/70 bg-surface text-ink-3 hover:bg-muted hover:text-ink",
      )}
    >
      <button type="button" onClick={onClick} aria-pressed={onClick ? !!selected : undefined} className={cx("flex h-full items-center gap-1.5 px-3.5", !onClick && "cursor-default", removable && "pr-1")}>
        {selected && tone !== "danger" && (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m3.5 8.4 3 3 6-6.6" />
          </svg>
        )}
        {children}
      </button>
      {removable && (
        <button type="button" onClick={onRemove} aria-label="Xoá" className="flex h-full items-center rounded-r-full pr-3 pl-1 opacity-80 hover:opacity-100">
          <IconX size={13} />
        </button>
      )}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} aria-hidden />;
}

export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose(): void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx("m-auto w-[calc(100%-32px)] rounded-xl bg-surface p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-black/50", wide ? "max-w-3xl" : "max-w-lg")}
    >
      <div className="flex items-center justify-between border-b border-line-soft px-6 py-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-full p-2 text-ink-3 hover:bg-muted hover:text-ink">
          <IconX size={18} />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  );
}

export function Loading({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-sm text-ink-3">
      <Spinner className="text-accent" /> {label}
    </div>
  );
}

type NoticeTone = "neutral" | "danger" | "accent" | "success" | "warning";
const NOTICE: Record<NoticeTone, { box: string; icon: string }> = {
  neutral: { box: "border-line bg-surface", icon: "text-ink-3" },
  accent: { box: "border-accent/25 bg-accent-soft", icon: "text-accent" },
  danger: { box: "border-danger/25 bg-danger-soft", icon: "text-danger" },
  success: { box: "border-success/25 bg-success-soft", icon: "text-success" },
  warning: { box: "border-warning-bright/40 bg-warning-soft", icon: "text-warning" },
};

export function Notice({ tone = "neutral", icon, children, className }: { tone?: NoticeTone; icon?: ReactNode; children: ReactNode; className?: string }) {
  const t = NOTICE[tone];
  return (
    <div className={cx("flex items-start gap-3 rounded-lg border px-4 py-3.5 text-sm leading-relaxed text-ink-2", t.box, className)}>
      <span className={cx("mt-0.5 shrink-0", t.icon)}>{icon ?? <IconInfo />}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
