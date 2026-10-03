# JobAlign — Lựa chọn công nghệ hệ thống

> Nguồn: [Google Sheets — TIN314 | NHÓM 11 | WORKING SPACE](https://docs.google.com/spreadsheets/d/1ne4uBKpkiPS-MaDb8EBowwQ_8799ljyneP2G_EzBp7M/edit?gid=1896361971#gid=1896361971) · sheet `Lựa chọn công nghệ (hệ thống)`

## 1. TIÊU CHÍ LỰA CHỌN CÔNG NGHỆ

| Tiêu chí | Ý nghĩa đối với JobAlign |
| --- | --- |
| Phù hợp chức năng | Đáp ứng trực tiếp các chức năng trong URD: hồ sơ, JD, matching 2 chiều, gap và recommendation. |
| Tích hợp | Ưu tiên công nghệ kết nối được với stack hiện có, hạn chế tạo thêm nhiều tầng backend/dịch vụ trung gian. |
| Khả năng triển khai | Có thể chạy ổn định trong môi trường của nhóm, phù hợp với Vercel và GitHub. |
| Chi phí | Ưu tiên công cụ có free tier hoặc chi phí thấp ở quy mô prototype/course project. |
| Tính nhất quán & giải thích | Các kết quả chấm điểm cần tái lập được; AI tập trung ở các bước cần hiểu ngôn ngữ tự nhiên. |
| Khả năng mở rộng | Có thể mở rộng số lượng JD/người dùng mà không phải thay toàn bộ kiến trúc. |

## 2. STACK CÔNG NGHỆ NỀN

| Layer | Công nghệ | Quyết định | Vai trò |
| --- | --- | --- | --- |
| Frontend | Next.js + TypeScript | Chọn | Xây dựng giao diện web và server routes trong cùng repository. |
| Backend/API | Next.js Route Handlers | Chọn | Xử lý API và logic nghiệp vụ cho prototype mà không cần backend riêng. |
| Database + Auth | Supabase PostgreSQL + Supabase Auth | Chọn | Lưu profile, preference, JD, kết quả phân tích và quản lý tài khoản. |
| File storage | Supabase Storage | Chọn | Lưu CV người dùng và kiểm soát quyền truy cập theo tài khoản. |
| AI | Gemini | Chọn | Phân tích CV/JD, chuẩn hóa thông tin và hỗ trợ nội dung cần hiểu ngôn ngữ tự nhiên. |
| Embedding + Vector | gemini-embedding-2 + pgvector | Chọn | Tìm JD tương đồng với profile/mục tiêu phục vụ recommendation. |
| Validation | Zod | Chọn | Kiểm tra dữ liệu có cấu trúc trước khi lưu hoặc chuyển bước. |
| Deployment | Vercel | Chọn | Triển khai Next.js web app và API routes. |

## 3. CHỨC NĂNG → CÔNG NGHỆ

| Chức năng JobAlign | Công nghệ chính | Vai trò |
| --- | --- | --- |
| Đăng ký / đăng nhập | Supabase Auth | Xác thực người dùng và gắn dữ liệu với đúng tài khoản. |
| Upload & lưu CV | Next.js + Supabase Storage | Nhận file CV và lưu theo tài khoản. |
| Xây dựng hồ sơ năng lực | Gemini + TypeScript + Supabase | Gemini trích xuất; TypeScript kiểm tra cấu trúc; Supabase lưu hồ sơ đã xác nhận. |
| Kỳ vọng nghề nghiệp | Next.js + Supabase | Form nhập liệu; không cần AI vì người dùng chủ động khai báo. |
| Lấy JD | Crawlee / URL Import + JSON-LD / Parser | Thu thập và chuẩn hóa dữ liệu JD từ nguồn được hỗ trợ. |
| Phân tích JD | Gemini + Zod | Trích xuất must-have, preferred, seniority, responsibility và work conditions theo schema. |
| Role Readiness | TypeScript Rule Engine | Đối chiếu yêu cầu JD với profile và tính mức sẵn sàng tái lập được. |
| Work Fit | TypeScript Rule Engine | So sánh JD với salary/location/work-mode/deal-breaker. |
| Fit Matrix & Recommendation | TypeScript Rule Engine | Kết hợp hai chiều để phân loại JD và tạo khuyến nghị có giải thích. |
| Gap Analysis | TypeScript + Gemini | Logic xác định gap; Gemini hỗ trợ diễn giải/gợi ý nội dung. |
| JD Recommendation | gemini-embedding-2 + pgvector | Tìm các JD tương đồng về nội dung/kỹ năng với profile. |
| Theo dõi tiến độ | Supabase PostgreSQL + Next.js | Lưu mục tiêu, tiến độ và cập nhật profile. |

## 4. KIẾN TRÚC XỬ LÝ AI

| Bước | Công nghệ | Đầu vào | Đầu ra | Nguyên tắc |
| --- | --- | --- | --- | --- |
| Extract | Gemini | CV/JD dạng text | Thông tin có cấu trúc | AI dùng để hiểu ngôn ngữ tự nhiên. |
| Validate | Zod + TypeScript | Kết quả AI | Dữ liệu đúng schema | Thiếu dữ liệu giữ Unknown; không tự suy đoán. |
| Store | Supabase | Dữ liệu đã xác nhận | Profile/JD record | Một JD đã phân tích được tái sử dụng, không gọi LLM lại khi mở lại. |
| Match | Rule Engine | Profile + JD + Preference | Readiness/Work Fit | Không dùng LLM để quyết định điểm số. |
| Retrieve | Embedding + pgvector | Profile embedding + JD embeddings | Danh sách JD tương đồng | Dùng cho recommendation, không thay thế matching logic. |
| Explain | Rule Engine + Gemini khi cần | Kết quả + evidence | Lý do + next action | Mỗi kết luận phải dẫn tới hành động tiếp theo. |

## 5. FALLBACK

| Tình huống | Xử lý chính | Fallback |
| --- | --- | --- |
| Website không truy cập được | Ghi nhận lỗi crawl | Cho phép người dùng nhập URL hoặc dán nội dung JD. |
| Không có JSON-LD | Dùng parser phù hợp với nguồn | Nếu không trích xuất được thì yêu cầu JD thủ công. |
| JD thiếu salary/location/field | Lưu Unknown | Không tự điền; hiển thị cảnh báo. |
| Gemini trả kết quả sai schema | Validate bằng Zod | Retry hoặc đánh dấu extraction error. |
| CV thiếu evidence | Giữ Information Gap | Clarification Assistant hỏi lại khi cần. |
| JD đã phân tích | Đọc kết quả từ database | Không gọi lại LLM khi mở lại cùng JD. |

## 6. BẢO MẬT & DỮ LIỆU

| Hạng mục | Thiết kế |
| --- | --- |
| Authentication | Supabase Auth; dữ liệu nghiệp vụ gắn với user/account. |
| Authorization | Người dùng chỉ truy cập profile, CV và dữ liệu cá nhân thuộc tài khoản của mình. |
| API key | Gemini API key chỉ dùng server-side, không đưa vào frontend. |
| Input validation | Kiểm tra URL, file và payload trước khi xử lý. |
| URL import | Chỉ HTTPS và domain/nguồn được hỗ trợ; chặn redirect ra ngoài phạm vi cho phép. |
| Dữ liệu CV | Chỉ lưu dữ liệu cần cho chức năng; hạn chế thông tin liên hệ không cần thiết. |
| JD nguồn | Ưu tiên lưu dữ liệu đã chuẩn hóa và metadata, giữ liên kết về nguồn gốc. |

## 7. CÁC QUYẾT ĐỊNH CÔNG NGHỆ

| Câu hỏi | Lựa chọn cuối | Lý do |
| --- | --- | --- |
| LLM có tính điểm không? | Không | Điểm matching cần tái lập và giải thích; LLM chỉ xử lý extraction/diễn giải. |
| Database riêng hay Supabase? | Supabase | Đã có PostgreSQL, Auth và Storage, giảm số dịch vụ phải tích hợp. |
| ORM hay Supabase client? | Supabase client | Prototype cần triển khai nhanh; không cần thêm tầng ORM. |
| Crawler hay chỉ nhập JD? | Crawler là luồng chính; nhập thủ công là fallback | Phù hợp yêu cầu thu thập JD nhưng vẫn có phương án khi nguồn không truy cập được. |
| Vector search có thay matching 2 chiều không? | Không | Vector search dùng cho retrieval; quyết định cuối dựa trên Role Readiness + Work Fit. |
| Lưu HTML gốc? | Không | Giảm dung lượng và tránh biến database thành bản sao của website nguồn. |

## 8. KIẾN TRÚC TỔNG THỂ

JOBSITES → CRAWLER / URL IMPORT → JD EXTRACTION (JSON-LD / PARSER) → GEMINI → VALIDATION (ZOD) → SUPABASE → EMBEDDING + PGVECTOR → RECOMMENDATION → ROLE READINESS + WORK FIT → FIT MATRIX → GAP / ROADMAP / ACTION

## 9. FINAL TECHNOLOGY STACK

| Layer | Final choice |
| --- | --- |
| Web application | Next.js + TypeScript |
| API / backend logic | Next.js Route Handlers |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| File storage | Supabase Storage |
| JD crawling | Crawlee |
| JD extraction | JSON-LD + site-specific parser |
| AI extraction / interpretation | Gemini |
| Structured validation | Zod |
| Embedding | gemini-embedding-2 |
| Vector search | pgvector |
| Scoring / decision | TypeScript Rule Engine |
| Crawler scheduler | GitHub Actions |
| Deployment | Vercel |
