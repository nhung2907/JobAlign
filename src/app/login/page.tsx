"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/app-shell";
import { Button, Notice, Segmented, Spinner } from "@/components/ui";
import { browserSupabase } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/jobs";
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? "Liên kết xác nhận không hợp lệ hoặc đã hết hạn." : null);
  const [info, setInfo] = useState<string | null>(null);

  if (!supabaseConfigured) {
    return (
      <Notice>
        Ứng dụng đang chạy ở chế độ demo (chưa cấu hình Supabase), nên không cần đăng nhập. Dữ liệu lưu trên trình duyệt này.{" "}
        <Link href="/cv" className="link">
          Bắt đầu
        </Link>
      </Notice>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = browserSupabase()!;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Tải lại toàn trang để WorkspaceProvider nạp dữ liệu của tài khoản vừa đăng nhập.
        window.location.href = target;
      } else {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/cv` },
        });
        if (error) throw error;
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        if (data.session) window.location.href = "/cv";
        else setInfo("Đã gửi email xác nhận. Mở email và bấm vào liên kết để hoàn tất đăng ký.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(/invalid login/i.test(msg) ? "Email hoặc mật khẩu không đúng." : msg || "Không đăng nhập được.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Segmented<"signin" | "signup">
        size="md"
        value={mode}
        onChange={setMode}
        ariaLabel="Chọn đăng nhập hoặc đăng ký"
        options={[
          { value: "signin", label: "Đăng nhập" },
          { value: "signup", label: "Tạo tài khoản" },
        ]}
      />
      <label>
        <span className="label">Email</span>
        <input className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        <span className="label">Mật khẩu {mode === "signup" && "— tối thiểu 6 ký tự"}</span>
        <input
          className="field"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="text-sm text-danger-strong">{error}</p>}
      {info && <p className="text-sm text-ink-2">{info}</p>}
      <Button type="submit" variant="primary" size="lg" disabled={busy}>
        {busy && <Spinner />} {mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
      </Button>
      <p className="text-xs leading-relaxed text-ink-4">CV chứa dữ liệu cá nhân. Chỉ chủ tài khoản xem được, và xoá được bất cứ lúc nào.</p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-canvas">
        <div className="flex h-[60px] items-center px-4 md:px-7">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="text-xl font-bold tracking-[-0.03em] text-accent">JobAlign</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-12 md:py-20">
        <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-semibold">Vào JobAlign</h1>
          <p className="mt-1 mb-5 text-sm text-ink-3">Định vị năng lực & khớp đãi ngộ hai chiều</p>
          <Suspense fallback={<Spinner />}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
