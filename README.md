# JobAlign — web app

Web định vị năng lực & khớp đãi ngộ hai chiều, dựng theo tài liệu trong [`docs`](docs):
URD ([05-urd.md](docs/05-urd.md)), wireframe ([06-wireframe](docs/06-wireframe)),
lựa chọn công nghệ ([07](docs/07-lua-chon-cong-nghe.md), [08](docs/08-lua-chon-cong-nghe-he-thong.md)).

Stack đúng theo sheet `Lựa chọn công nghệ (hệ thống)`: Next.js + TypeScript (Route Handlers), Supabase
(Auth, PostgreSQL, Storage, gọi bằng Supabase client), Gemini, Zod, `impit` + JSON-LD cho nhập JD từ URL, deploy Vercel.

## Chạy thử

```bash
npm install
npm run dev          # http://localhost:3000
```

Không cần cấu hình gì: thiếu Supabase thì app chạy **chế độ demo** (dữ liệu lưu trên trình duyệt), thiếu
Gemini thì dùng **bộ đọc quy tắc** để bóc tách CV/JD. Để xem nhanh:

- Trang chủ → **Xem với dữ liệu mẫu**: nạp hồ sơ ứng viên Marketing và 5 JD giống hệt ví dụ trong wireframe
  (1 Kim Cương, 2 Thách Thức, 1 An toàn, 1 Chưa ưu tiên).
- Hoặc đi luồng thật: **Tải CV** bằng tệp mẫu [`public/samples/cv-mau.pdf`](public/samples/cv-mau.pdf) → sửa hồ sơ →
  khai kỳ vọng → dán một JD.
- Menu tài khoản (góc phải) → **Hiện mã yêu cầu URD** để thấy mã `UR-x.y.z` trên từng khối, tiện đối chiếu với URD.

## Cấu hình

Sao chép `.env.example` thành `.env.local`.

| Biến                                                                  | Dùng cho                                       | Thiếu thì                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------- |
| `GEMINI_API_KEY`, `GEMINI_MODEL`                                   | Đọc CV/JD, viết lại bullet (chỉ ở server) | Bộ đọc quy tắc + mẫu viết lại có sẵn |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Đăng nhập, lưu hồ sơ/JD, lưu tệp CV     | Chế độ demo, không cần đăng nhập      |
| `NEXT_PUBLIC_READINESS_THRESHOLD`, `NEXT_PUBLIC_WORKFIT_THRESHOLD` | Ngưỡng ma trận (URD R1), mặc định 70 / 65 | Dùng mặc định                             |

**Supabase:** tạo project, chạy [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) trong SQL Editor
(tạo bảng `profiles`, `preferences`, `jobs` có RLS theo `auth.uid()` và bucket riêng tư `cvs`). Trong
Authentication → URL Configuration, thêm `https://<domain>/auth/callback` vào Redirect URLs.

**Vercel:** import repo (Next.js nằm ở thư mục gốc), thêm các biến môi trường ở trên.

## Đã làm

| Màn (wireframe)                             | Đường dẫn            | URD                                          |
| -------------------------------------------- | ------------------------ | -------------------------------------------- |
| 1 · Tải CV                                 | `/cv`                  | UR-1.1.1                                     |
| 2 · Hồ sơ năng lực                      | `/profile`             | UR-1.1.2 → 1.1.4                            |
| 3 · Kỳ vọng nghề nghiệp                 | `/preferences`         | UR-1.2                                       |
| 4 · Nhập JD (dán / tệp / link)           | `/jobs/new`            | UR-1.3 + nhập từ URL (07, trường hợp 1) |
| 5 · Bóc tách JD, sửa được             | `/jobs/[id]/breakdown` | UR-1.3.1 → 1.3.7                            |
| 6 · Kết quả hai chiều                    | `/jobs/[id]`           | UR-1.4 · 1.5 · 1.6                         |
| 7 · Khoảng trống + đối chiếu dòng CV  | `/jobs/[id]/gaps`      | UR-2.1 · 2.3 · 2.4                         |
| 8 · Hỏi lại để làm rõ                 | `/jobs/[id]/clarify`   | UR-2.2                                       |
| 9 · Việc cần làm (Fix Now / Build First) | `/jobs/[id]/actions`   | UR-2.5 · 2.6                                |
| 10 · Danh sách JD (hub)                    | `/jobs`                | UR-1.6.2, UR-3.1.1 (lưu JD)                 |

Tức là toàn bộ **lát cắt 1** và **lát cắt 2** của URD mục 8, có giao diện mobile (NFR-7). Lát cắt 3 (lộ trình, tài
nguyên học, theo dõi tiến độ) chỉ có ô "Giai đoạn sau" như wireframe. Kho JD tự động + gợi ý JD
(07, trường hợp 2: Crawlee, GitHub Actions, pgvector) **chưa làm**.

## Giao diện

Lấy cảm hứng từ LinkedIn nhưng không dùng thương hiệu của LinkedIn: nền xám ấm, thẻ trắng bo góc, màu nhấn xanh dương,
nút dạng viên thuốc, bộ lọc chọn chuyển xanh lá; đầu trang có ô tìm JD và điều hướng icon + nhãn; hồ sơ năng lực có ảnh
bìa + avatar; mỗi JD có thẻ đầu trang với logo chữ cái và các tab (kết quả, bóc tách, khoảng trống, làm rõ, việc cần làm).
Màu sắc và thành phần dùng chung nằm ở [`src/app/globals.css`](src/app/globals.css) và [`src/components/ui.tsx`](src/components/ui.tsx).

## Cách chấm điểm

Điểm do bộ quy tắc trong [`src/lib/engine`](src/lib/engine) tính, **không dùng LLM** (URD G4, NFR-5). Mỗi kết quả có nút
**Xem cách tính** hiện đủ thành phần (NFR-4). Tóm tắt:

- **Mức sẵn sàng**: mỗi yêu cầu JD được đối chiếu với hồ sơ → Đạt (1) / Một phần (0,5) / Chưa đạt (0) / Chưa rõ.
  Trọng số: bắt buộc × 3, ưu tiên × 1, kỹ năng mềm luôn × 1. **Chưa rõ không vào mẫu số** (không trừ điểm oan) mà
  làm giảm độ tin cậy. Yêu cầu bắt buộc chưa đạt hoặc chưa có bằng chứng là *blocker*: còn blocker thì không
  xếp "sẵn sàng cao" dù điểm vượt ngưỡng.
- **Độ mạnh bằng chứng**: mạnh = có trong mô tả công việc/dự án kèm số liệu; vừa = có bối cảnh; yếu = chỉ có tên
  trong mục Kỹ năng; tự khai = chưa có trên CV. Yếu và tự khai → Evidence Gap (sửa được ngay).
- **Mức đáp ứng kỳ vọng**: lương / địa điểm / hình thức / cơ hội phát triển, trọng số theo Must × 3, Important × 2,
  Nice × 1. JD không nêu → Unknown, không tính là đạt. Vi phạm deal-breaker → không xếp "đáp ứng cao".
- Tham số nằm ở một chỗ: [`src/lib/engine/config.ts`](src/lib/engine/config.ts).

Từ điển kỹ năng (URD R2) ở [`src/lib/taxonomy.ts`](src/lib/taxonomy.ts), bắt đầu từ ~80 kỹ năng cho marketing,
dữ liệu/BA, phần mềm, thiết kế, văn phòng và kỹ năng mềm, kèm alias tiếng Việt/Anh.

## Thư mục

```
src/app/                 các màn hình + API (Route Handlers)
  api/cv/parse           đọc CV (PDF/DOCX) → hồ sơ có cấu trúc, lưu tệp vào Supabase Storage
  api/jd/analyze         bóc tách JD dán tay / tệp — cache theo hash, mỗi JD gọi LLM một lần (NFR-2)
  api/jd/import          nhập JD từ link: whitelist, chỉ HTTPS, kiểm tra từng redirect, timeout 15 giây
  api/cv/rewrite         gợi ý viết lại bullet (Gemini hoặc mẫu có sẵn)
src/lib/engine/          bộ chấm: readiness, work fit, ma trận, khoảng trống, việc cần làm, guardrail
src/lib/extract/         Gemini + bộ đọc quy tắc cho CV/JD, JSON-LD, tải trang
src/lib/store/           lưu dữ liệu: Supabase hoặc trình duyệt (chế độ demo)
supabase/migrations/     schema + RLS
```

## Kiểm thử

```bash
npm test          # 36 test: bộ chấm, bóc tách JD/CV (gồm CV PDF mẫu), JSON-LD, guardrail, schema Gemini
npm run lint
npm run build
```

## Giới hạn đã biết

- **Chưa chạy với Supabase và Gemini thật** (chưa có project/key). Code đã typecheck và build; luồng demo và bộ
  đọc quy tắc đã được chạy thử đầu-cuối trên trình duyệt. Cần thử lại khi nhóm có project Supabase và API key.
- Nhập JD từ link chưa thử từ IP của Vercel (rủi ro T1-1 trong tài liệu 07). Trang chặn thì app mời dán nội dung JD.
- Thời gian đi lại chưa tính bằng bản đồ: quận người dùng chọn được dùng thay.
- Bộ đọc quy tắc hợp với CV/JD có tiêu đề mục rõ ràng; CV lạ định dạng cần sửa tay ở màn Hồ sơ (URD R4).
