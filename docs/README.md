# TIN314 | NHÓM 11 — WORKING SPACE

Tài liệu Markdown của Google Sheets working space. `MASTERPLAN` và lựa chọn công nghệ hệ thống được đối chiếu ngày 2026-09-23.

**Nguồn:** [TIN314 | NHÓM 11 | WORKING SPACE](https://docs.google.com/spreadsheets/d/1ne4uBKpkiPS-MaDb8EBowwQ_8799ljyneP2G_EzBp7M/edit)

## Sản phẩm

| File | Đầu việc | Nội dung |
| --- | --- | --- |
| [05-urd.md](docs/05-urd.md) | `MASTERPLAN` STT 4 — Mô tả tính năng (URD) | Tài liệu yêu cầu người dùng: 3 nhóm / 20 module / 95 yêu cầu, kèm tiêu chí chấp nhận, độ ưu tiên MoSCoW và phạm vi triển khai đề xuất |
| [07-lua-chon-cong-nghe.md](docs/07-lua-chon-cong-nghe.md) | `MASTERPLAN` STT 8 — Lựa chọn công nghệ | Công nghệ lấy JD từ jobsite cho 2 trường hợp — nhập JD từ URL, kho JD tự động quét + gợi ý JD theo CV — kèm kết quả kiểm thử thực tế ngày 13/09 và đề xuất cập nhật URD |
| [08-lua-chon-cong-nghe-he-thong.md](docs/08-lua-chon-cong-nghe-he-thong.md) | `MASTERPLAN` STT 8 — Lựa chọn công nghệ | Tiêu chí, stack nền, ánh xạ chức năng sang công nghệ, kiến trúc AI, fallback, bảo mật và stack cuối |

Cùng nội dung đã được đưa lên sheet **`Mô tả tính năng (URD)`** trong file Google Sheets của nhóm ([mở sheet](https://docs.google.com/spreadsheets/d/1ne4uBKpkiPS-MaDb8EBowwQ_8799ljyneP2G_EzBp7M/edit?gid=1501026022#gid=1501026022)). Khi sửa URD, cập nhật cả [file Markdown](docs/05-urd.md) và sheet.

`07-lua-chon-cong-nghe.md` cũng đã được đưa lên sheet **`Lựa chọn công nghệ (crawl JD)`** ([mở sheet](https://docs.google.com/spreadsheets/d/1ne4uBKpkiPS-MaDb8EBowwQ_8799ljyneP2G_EzBp7M/edit?gid=78272310#gid=78272310)). Khi sửa, cập nhật cả [file Markdown](docs/07-lua-chon-cong-nghe.md) và sheet.

`08-lua-chon-cong-nghe-he-thong.md` được chuyển từ sheet **`Lựa chọn công nghệ (hệ thống)`** ([mở sheet](https://docs.google.com/spreadsheets/d/1ne4uBKpkiPS-MaDb8EBowwQ_8799ljyneP2G_EzBp7M/edit?gid=1896361971#gid=1896361971)).

## Bản xuất từ sheet

| File | Sheet gốc | Nội dung |
| --- | --- | --- |
| [01-masterplan.md](docs/01-masterplan.md) | `MASTERPLAN` | Kế hoạch theo giai đoạn: đầu việc, PIC, deadline, trạng thái |
| [02-brief.md](docs/02-brief.md) | `BRIEF` | USP và Problem Statement Canvas của JobAlign |
| [03-mo-ta-tinh-nang.md](docs/03-mo-ta-tinh-nang.md) | `DESCRIPTION` | Mô tả tính năng (URD) — 3 nhóm tính năng chính, chi tiết tới tầng 3 |
| [04-chon-de-tai.md](docs/04-chon-de-tai.md) | `[DONE] CHỌN ĐỀ TÀI` | Các đề tài đã đề xuất và lý do chọn |

## Dự án

**JobAlign** — Web định vị năng lực & khớp đãi ngộ hai chiều.

- Repo: <https://github.com/kng1226/JobAlign>
- Stack theo sheet lựa chọn công nghệ hệ thống: Next.js + TypeScript, Supabase (PostgreSQL, Auth, Storage),
  Supabase client, Gemini, Zod, Crawlee, pgvector, GitHub Actions và Vercel.

## Web app

Mã nguồn nằm ở [`web/`](web) — xem [web/README.md](web/README.md) để chạy thử, cấu hình Supabase/Gemini và deploy Vercel.
Đã làm đủ 10 màn trong wireframe (lát cắt 1 + 2 của URD) kèm giao diện mobile; lát cắt 3 và kho JD tự động
(Crawlee, pgvector) chưa làm.

```bash
cd web && npm install && npm run dev
```

## Ghi chú khi chuyển đổi

- Ô gộp (merged cell) trong sheet được trải ra cho từng dòng/cột tương ứng.
- Xuống dòng trong một ô bảng được giữ bằng `<br>`.
- Cột `Đánh giá khả năng thực hiện`, `Ghi chú` và `TLTK` của sheet `DESCRIPTION`
  không có dữ liệu (riêng `TLTK` chỉ chứa chữ "Link" không kèm đường dẫn) nên
  được lược bỏ khỏi bảng.
- Các dòng trống ở cuối mỗi sheet được bỏ qua.
- Mã yêu cầu `UR-x.y.z` trong [05-urd.md](docs/05-urd.md) bám đúng đánh số tầng 1/2/3 của
  sheet `DESCRIPTION`, đối chiếu ngược được sang [03-mo-ta-tinh-nang.md](docs/03-mo-ta-tinh-nang.md).
