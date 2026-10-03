# Mô tả tính năng (URD)

> Nguồn: [Google Sheets — TIN314 | NHÓM 11 | WORKING SPACE](https://docs.google.com/spreadsheets/d/1ne4uBKpkiPS-MaDb8EBowwQ_8799ljyneP2G_EzBp7M/edit?gid=1965851668#gid=1965851668) · sheet `DESCRIPTION`


Ba nhóm tính năng chính của JobAlign, chi tiết tới tầng 3.

- **1. Job Fit Analysis – Phân tích độ phù hợp hai chiều**
  - 1.1. Candidate Profile Builder
  - 1.2. Career Preference Setup
  - 1.3. JD Analyzer
  - 1.4. Role Readiness
  - 1.5. Work Fit
  - 1.6. Two-way Fit Decision
- **2. Gap & CV Improvement – Phân tích khoảng trống và cải thiện CV**
  - 2.1. Requirement–Evidence Mapping
  - 2.2. Clarification Assistant
  - 2.3. Gap Classification
  - 2.4. Gap Prioritization
  - 2.5. CV Improvement
  - 2.6. Action Separation
- **3. Gap-to-Goal Roadmap – Lộ trình tiến tới công việc mục tiêu**
  - 3.1. Target Job Management
  - 3.2. Multi-JD Intelligence
  - 3.3. Skill Priority Engine
  - 3.4. Personalized Roadmap
  - 3.5. Learning Resource Recommendation
  - 3.6. Evidence Builder
  - 3.7. Progress Tracking
  - 3.8. Re-evaluation


## 1. Job Fit Analysis – Phân tích độ phù hợp hai chiều


### 1.1. Candidate Profile Builder

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| CV Parsing | Đọc CV và trích xuất học vấn, kinh nghiệm, kỹ năng, dự án, chứng chỉ, thành tích và các thông tin nghề nghiệp có liên quan. | AI trích xuất CV một lần sang JSON chuẩn; người dùng sửa lại trên form. |
| Profile Structuring | Chuẩn hóa dữ liệu CV thành hồ sơ năng lực có cấu trúc để sử dụng cho tất cả các JD sau này. | Lưu hồ sơ chuẩn hoá trong database; tái sử dụng cho mọi JD. |
| Profile Enrichment | Cho phép người dùng bổ sung những năng lực hoặc kinh nghiệm thực tế chưa được thể hiện đầy đủ trong CV. | Form bổ sung kỹ năng/kinh nghiệm; lưu field có nguồn do người dùng xác nhận. |
| Data Verification | Phân biệt thông tin đã được xác nhận, thông tin do CV cung cấp và thông tin chưa đủ dữ liệu để kết luận. | Gắn trạng thái nguồn và độ tin cậy theo rule; không suy luận khi thiếu dữ liệu. |


### 1.2. Career Preference Setup

> **Nhận xét:** Form thu thập thông tin từ người dùng

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Salary Preference | Người dùng thiết lập mức thu nhập mong muốn hoặc mức tối thiểu có thể chấp nhận. | Form số tiền/khoảng; lưu database và so sánh bằng điều kiện. |
| Location & Commute | Xác định khu vực làm việc mong muốn và thời gian/khoảng cách di chuyển chấp nhận được. | Form địa điểm/bán kính; geocoding hoặc rule theo khu vực khi cần. |
| Work Mode | Xác định preference đối với onsite, hybrid hoặc remote. | Form chọn onsite/hybrid/remote; đối chiếu trực tiếp với JD đã trích xuất. |
| Career Growth Preference | Xác định mức độ ưu tiên đối với đào tạo, thăng tiến và phát triển nghề nghiệp. | Thang lựa chọn ưu tiên phát triển; lưu cấu hình profile. |
| Preference Weighting | Cho phép đánh dấu tiêu chí là Must-have, Important hoặc Nice-to-have thay vì xem tất cả tiêu chí có trọng số ngang nhau. | Gán trọng số Must-have/Important/Nice-to-have bằng rule cố định. |
| Deal-breaker Setting | Xác định những điều kiện mà nếu công việc không đáp ứng thì người dùng không muốn ứng tuyển. | Cờ điều kiện loại trừ; lọc job bằng rule trước khi chấm điểm. |


### 1.3. JD Analyzer

> **Nhận xét:** Tốn token

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Requirement Extraction | Tự động bóc tách yêu cầu về kỹ năng, kinh nghiệm, trình độ, chứng chỉ, ngoại ngữ và các điều kiện khác từ JD. | LLM hoặc parser trích xuất JD một lần thành schema; có màn hình sửa kết quả. |
| Must-have Detection | Xác định yêu cầu bắt buộc hoặc có khả năng đóng vai trò tiêu chí loại. | Kết hợp từ khoá/quy tắc (required, must, mandatory) và xác nhận người dùng. |
| Preferred Requirement Detection | Xác định những tiêu chí mang tính ưu tiên hoặc lợi thế thay vì bắt buộc. | Rule dựa trên từ khoá ưu tiên; lưu nhãn preferred tách biệt. |
| Responsibility Extraction | Phân tích những nhiệm vụ mà ứng viên thực tế sẽ phải thực hiện trong công việc. | LLM trích xuất danh sách nhiệm vụ sang cấu trúc; tái dùng cho đối chiếu. |
| Seniority Detection | Xác định mức độ seniority mà JD kỳ vọng thông qua scope công việc, số năm kinh nghiệm và mức độ trách nhiệm. | Rule từ title, số năm kinh nghiệm và taxonomy cấp bậc; cho phép chỉnh tay. |
| Work Condition Extraction | Trích xuất lương, phúc lợi, địa điểm, work mode, thời gian làm việc và các điều kiện công việc nếu JD có cung cấp. | Parser/LLM trích xuất field có nêu trong JD; dữ liệu thiếu giữ Unknown. |
| Unknown Information Detection | Những thông tin JD không đề cập được đánh dấu là “Unknown”, không để AI tự suy đoán thành thông tin thực tế. | Schema bắt buộc trạng thái Unknown/null; tuyệt đối không tự điền suy đoán. |


### 1.4. Role Readiness

> **Nhận xét:** Tạo từ điển và dùng code bình thường để đổi chiếu so sánh giữa các trường thông tin để đưa ra kết quả

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Requirement Matching | Đối chiếu từng requirement của JD với Candidate Profile. | So khớp field có cấu trúc; exact match trước, semantic matching chỉ cho skill. |
| Skill Fit | Đánh giá mức độ phù hợp về kỹ năng. | Taxonomy skill + alias; tính tỷ lệ skill khớp bằng rule, không dùng LLM chấm điểm. |
| Experience Fit | Đánh giá mức độ liên quan và chiều sâu của kinh nghiệm. | So sánh số năm, ngành, vai trò và tag kinh nghiệm theo rule. |
| Responsibility Fit | Xác định mức độ công việc ứng viên từng thực hiện tương đồng với trách nhiệm của vị trí mới. | Embedding/LLM chỉ map nhiệm vụ sang taxonomy; điểm tương đồng tính theo rule. |
| Qualification Fit | Đối chiếu bằng cấp, chứng chỉ, ngoại ngữ và các yêu cầu định lượng khác. | Đối chiếu bằng cấp/chứng chỉ/ngoại ngữ theo điều kiện định lượng. |
| Blocker Detection | Xác định các tiêu chí bắt buộc chưa đáp ứng và có khả năng trở thành rào cản khi ứng tuyển. | Kiểm tra requirement must-have chưa đạt bằng rule và hiển thị lý do. |
| Readiness Score | Tổng hợp thành mức sẵn sàng ứng tuyển thay vì tuyên bố “xác suất trúng tuyển”. | Công thức có trọng số từ các fit; hiển thị readiness, không dự đoán xác suất đỗ. |
| Confidence Level | Cho biết mức độ chắc chắn của kết quả dựa trên lượng thông tin hiện có. | Tính từ độ đầy đủ dữ liệu, số evidence và mức chắc chắn mapping. |


### 1.5. Work Fit

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Preference Matching | So sánh điều kiện của công việc với kỳ vọng cá nhân đã thiết lập. | So sánh field job với preference đã lưu bằng rule. |
| Deal-breaker Check | Kiểm tra công việc có vi phạm bất kỳ điều kiện bắt buộc nào của người dùng không. | Kiểm tra từng deal-breaker; trả về pass/fail/unknown. |
| Work Fit Score | Tổng hợp mức độ công việc đáp ứng kỳ vọng nghề nghiệp cá nhân. | Tổng hợp preference có trọng số bằng công thức minh bạch. |
| Missing Information Warning | Hiển thị các tiêu chí chưa thể đánh giá do JD không công bố dữ liệu. | Kiểm tra field JD null/Unknown và cảnh báo theo rule. |


### 1.6. Two-way Fit Decision

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Fit Matrix | Kết hợp Role Readiness và Work Fit trên cùng một ma trận hai chiều. | Đặt Role Readiness và Work Fit lên ma trận ngưỡng cố định. |
| Job Classification | Phân loại công việc thành Priority Apply, Stretch Opportunity, Backup/Consider hoặc Low Priority. | Phân loại theo các ngưỡng của ma trận; cho phép cấu hình ngưỡng. |
| Apply Recommendation | Đưa ra khuyến nghị hành động: nên ưu tiên ứng tuyển, có thể thử sức, cân nhắc hoặc chưa nên đầu tư nhiều thời gian. | Map nhãn ma trận sang mẫu khuyến nghị hành động. |
| Decision Explanation | Giải thích cụ thể vì sao hệ thống đưa ra khuyến nghị đó thay vì chỉ đưa một con số. | Ghép các lý do rule-based, skill thiếu và deal-breaker thành lời giải thích mẫu. |


## 2. Gap & CV Improvement – Phân tích khoảng trống và cải thiện CV


### 2.1. Requirement–Evidence Mapping

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Requirement Breakdown | Chuyển từng yêu cầu của JD thành một tiêu chí có thể đánh giá. | Chuẩn hoá requirement JD thành từng tiêu chí trong schema. |
| CV Evidence Retrieval | Tìm các nội dung trong CV có thể chứng minh cho từng yêu cầu. | Retrieval từ CV đã trích xuất bằng keyword/taxonomy; embedding chỉ để tìm evidence gần nghĩa. |
| Evidence Strength | Đánh giá mức độ mạnh/yếu của bằng chứng dựa trên độ cụ thể, mức độ liên quan và kết quả được chứng minh. | Chấm theo rule: có số liệu, mức liên quan, độ cụ thể và nguồn xác nhận. |
| Requirement Coverage | Cho biết requirement đã được chứng minh đầy đủ, một phần hay chưa có bằng chứng. | Map evidence strength sang Full/Partial/None bằng ngưỡng rõ ràng. |


### 2.2. Clarification Assistant

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Missing Evidence Question | Khi CV không có thông tin nhưng chưa thể kết luận ứng viên thiếu năng lực, JobAlign hỏi lại người dùng. | Form câu hỏi theo requirement Unknown; chỉ hỏi khi evidence chưa đủ. |
| Experience Confirmation | Xác nhận người dùng đã từng sử dụng kỹ năng hoặc thực hiện công việc đó chưa. | Câu hỏi yes/no và field xác nhận; lưu câu trả lời vào profile. |
| Evidence Collection | Nếu người dùng có trải nghiệm nhưng chưa ghi vào CV, hệ thống thu thập thêm context để sử dụng trong phần cải thiện. | Form thu thập bối cảnh, kết quả, thời gian; thêm thành evidence có nguồn. |
| Unknown Resolution | Chuyển trạng thái từ Unknown sang Evidence Gap hoặc Capability Gap sau khi có thông tin. | State machine Unknown → Evidence/Capability gap sau câu trả lời. |


### 2.3. Gap Classification

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Evidence Gap | Người dùng có năng lực nhưng CV chưa thể hiện hoặc thể hiện quá yếu. | Rule: có skill/evidence người dùng xác nhận nhưng CV thiếu hoặc yếu. |
| Skill Gap | Người dùng thực sự chưa có kỹ năng JD yêu cầu. | Rule: requirement skill không có trong profile/evidence đã xác nhận. |
| Experience Gap | Người dùng có kỹ năng nhưng thiếu chiều sâu hoặc thời lượng kinh nghiệm cần thiết. | So sánh số năm/mức độ dự án với ngưỡng JD bằng rule. |
| Responsibility Gap | Người dùng chưa từng đảm nhiệm scope hoặc trách nhiệm tương đương. | So taxonomy trách nhiệm đã làm với scope yêu cầu; semantic map chỉ hỗ trợ chuẩn hoá. |
| Qualification Gap | Thiếu chứng chỉ, bằng cấp, ngoại ngữ hoặc qualification bắt buộc. | Đối chiếu chứng chỉ/bằng cấp/ngoại ngữ theo điều kiện bắt buộc. |
| Information Gap | Không đủ dữ liệu để kết luận. | Giữ trạng thái Insufficient data thay vì tự kết luận. |


### 2.4. Gap Prioritization

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Must-have Gap | Những khoảng trống có thể ảnh hưởng trực tiếp đến eligibility được xếp ưu tiên cao nhất. | Ưu tiên tối đa cho gap gắn nhãn must-have/eligibility. |
| High-impact Gap | Những gap xuất hiện ở requirement quan trọng được ưu tiên xử lý. | Điểm tác động = trọng số requirement × mức coverage thiếu. |
| Low-impact Gap | Những tiêu chí mang tính nice-to-have được giảm mức ưu tiên. | Giảm trọng số theo nhãn nice-to-have. |
| Gap Severity | Hiển thị mức Critical / High / Medium / Low để người dùng biết cần xử lý gì trước. | Map điểm ưu tiên sang Critical/High/Medium/Low bằng ngưỡng. |


### 2.5. CV Improvement

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Content Prioritization | Xác định nội dung nào nên được đưa lên trước hoặc nhấn mạnh hơn. | Xếp hạng evidence hiện có theo liên quan và strength để gợi ý thứ tự CV. |
| Evidence Enhancement | Gợi ý bổ sung scope, kết quả, số liệu hoặc context để chứng minh năng lực tốt hơn. | Template gợi ý thêm scope/metric/context dựa trên evidence người dùng cung cấp. |
| Bullet Improvement | Đề xuất cách trình bày bullet CV rõ ràng và định hướng kết quả hơn. | LLM viết lại bullet từ evidence đã xác nhận; bắt buộc người dùng duyệt. |
| JD Relevance Optimization | Ưu tiên các kinh nghiệm và dự án liên quan trực tiếp tới vị trí mục tiêu. | Rule xếp hạng kinh nghiệm/project theo độ liên quan với taxonomy JD. |
| Keyword Alignment | Điều chỉnh terminology khi người dùng thực sự có kỹ năng đó, giúp CV tương thích tốt hơn với cách JD diễn đạt. | Dùng taxonomy alias để gợi ý từ khoá; chỉ cho phép khi profile xác nhận skill. |
| Unsupported Claim Guardrail | Không cho phép hệ thống đề xuất thêm kỹ năng, kinh nghiệm hoặc thành tích mà người dùng chưa thực sự có. | Validation chặn claim không có evidence hoặc chưa được người dùng xác nhận. |


### 2.6. Action Separation

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Fix Now | Những vấn đề người dùng có thể cải thiện ngay trên CV vì năng lực đã tồn tại. | Map Evidence Gap sang checklist chỉnh CV ngay. |
| Build First | Những vấn đề không thể “sửa bằng wording” mà yêu cầu người dùng phát triển năng lực thực tế trước. | Map Skill/Experience/Responsibility Gap sang hành động học/làm trước. |


## 3. Gap-to-Goal Roadmap – Lộ trình tiến tới công việc mục tiêu


### 3.1. Target Job Management

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Save Target Job | Cho phép lưu những vị trí người dùng thực sự quan tâm. | CRUD lưu JD mục tiêu và metadata; không cần AI. |
| Target Job Group | Gom nhiều JD tương tự thành một nhóm mục tiêu, ví dụ Business Analyst Intern. | Nhóm JD bằng role/title taxonomy; cho phép người dùng gộp/chỉnh. |
| Priority Target | Chọn những công việc hoặc career path được ưu tiên nhất. | Cờ ưu tiên trong database và sắp xếp theo cấu hình người dùng. |


### 3.2. Multi-JD Intelligence

> **Nhận xét:** Thực tế thì hơi khó để crawl từ jobsite vì những web như TopCV thì đều chặn bot truy cập

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Cross-JD Requirement Analysis | Tổng hợp yêu cầu từ nhiều JD thay vì phân tích từng job riêng biệt. | MVP nhận JD người dùng dán/upload; tổng hợp structured data, chưa tự crawl jobsite. |
| Skill Frequency | Xác định kỹ năng xuất hiện ở bao nhiêu JD mục tiêu. | Đếm skill taxonomy trên các JD đã lưu; tính tỷ lệ xuất hiện. |
| Must-have Frequency | Xác định kỹ năng thường xuất hiện dưới dạng requirement bắt buộc. | Đếm riêng các skill có nhãn must-have đã trích xuất/xác nhận. |
| Market Pattern | Phát hiện các competency có tính phổ biến trong nhóm công việc mục tiêu. | Clustering/counting theo taxonomy để nhận diện competency phổ biến. |
| Common Gap Identification | Xác định những gap của người dùng đang lặp lại ở nhiều JD khác nhau. | Gộp các gap theo skill/requirement taxonomy và đếm tần suất. |


### 3.3. Skill Priority Engine

| Tầng 3 | Mô tả | Cách thức thực hiện | Nhận xét |
| --- | --- | --- | --- |
| Gap Importance | Đánh giá mức độ quan trọng của từng gap. | Điểm quan trọng lấy từ must-have, tần suất và severity bằng công thức. | — |
| Job Coverage | Đo lường một kỹ năng có thể cải thiện mức phù hợp với bao nhiêu target jobs. | Đếm số target job được cải thiện nếu khắc phục một skill; cần taxonomy/database. | - Phải có database |
| Learning Effort | Ước lượng effort cần thiết để phát triển kỹ năng. | Dùng bảng effort theo skill/level do đội ngũ curate; cho phép người dùng chỉnh. | — |
| Skill ROI | Ưu tiên những kỹ năng tạo tác động lớn đối với nhiều target job so với effort cần đầu tư. | Công thức coverage × importance / effort; giải thích các thành phần điểm. | — |
| Priority Ranking | Xếp thứ tự những năng lực nên phát triển trước. | Sort theo Skill ROI và ràng buộc prerequisite trong database. | — |


### 3.4. Personalized Roadmap

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Current State | Xác định trình độ hiện tại của người dùng. | Xác định từ profile, evidence, self-assessment; AI chỉ hỗ trợ chuẩn hoá mô tả. |
| Target State | Xác định mức năng lực tối thiểu cần đạt cho nhóm công việc mục tiêu. | Tổng hợp requirement phổ biến của nhóm JD thành mức tối thiểu theo rule. |
| Learning Milestones | Chia quá trình phát triển thành các cột mốc thay vì một mục tiêu chung chung. | Template milestone theo skill, level và prerequisite từ database. |
| Action Plan | Xây dựng các bước học, luyện tập và áp dụng thực tế. | Sinh checklist theo template skill; AI optional để cá nhân hoá câu chữ. |
| Estimated Effort | Cung cấp ước lượng thời gian hoặc effort tương đối để hoàn thành. | Hiển thị effort tương đối từ bảng curated, không hứa hẹn thời gian chính xác. |
| Priority Sequence | Xác định nên học/làm cái gì trước và cái gì sau. | Sắp xếp theo ranking và prerequisite bằng thuật toán đơn giản. |


### 3.5. Learning Resource Recommendation

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Course Recommendation | Đề xuất khóa học phù hợp với skill gap và level hiện tại. | Lọc catalog khoá học đã curate theo skill, level, ngôn ngữ và chi phí. |
| Learning Material | Đề xuất tài liệu, video, bài tập hoặc nguồn học phù hợp. | Truy vấn catalog tài liệu/bài tập theo skill và level; có thể bắt đầu bằng dữ liệu thủ công. |
| Resource Filtering | Có thể lọc theo chi phí, thời lượng, ngôn ngữ hoặc trình độ. | Bộ lọc database theo giá, thời lượng, ngôn ngữ, level. |
| Resource-to-Skill Mapping | Giải thích tài nguyên này giúp khắc phục gap nào thay vì đưa ra danh sách khóa học chung chung. | Bảng mapping resource–skill–level để giải thích trực tiếp. |


### 3.6. Evidence Builder

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Portfolio Project | Đề xuất project để áp dụng kỹ năng mới. | Template project theo skill mục tiêu; AI optional để biến thể hoá đề bài. |
| Project Requirement | Xác định project nên thể hiện những competency nào. | Checklist competency/deliverable lấy từ template project trong database. |
| Deliverable Suggestion | Gợi ý sản phẩm đầu ra như dashboard, report, case study, GitHub repository hoặc portfolio. | Template đầu ra theo loại skill/role; người dùng chọn và chỉnh. |
| Evidence Checklist | Cho người dùng biết cần có bằng chứng gì để sau này đưa kỹ năng vào CV một cách hợp lệ. | Checklist evidence (link, số liệu, mô tả vai trò); validation trước khi lưu. |
| CV Integration | Sau khi hoàn thành, đề xuất nơi và cách đưa evidence mới vào CV. | Map evidence mới vào section CV bằng rule; LLM optional để gợi ý câu chữ. |


### 3.7. Progress Tracking

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Roadmap Checklist | Theo dõi từng task hoặc milestone đã hoàn thành. | CRUD task/milestone và trạng thái hoàn thành. |
| Skill Progress | Cập nhật mức độ phát triển của từng competency. | Cập nhật level theo self-assessment, evidence và milestone đã hoàn thành. |
| Evidence Upload | Cho phép bổ sung project, certificate hoặc trải nghiệm mới vào Candidate Profile. | Upload hoặc form link/metadata evidence; lưu gắn với skill/project. |
| Profile Update | Đồng bộ những năng lực mới với hồ sơ cá nhân. | Đồng bộ evidence đã xác nhận vào Candidate Profile theo schema. |


### 3.8. Re-evaluation

| Tầng 3 | Mô tả | Cách thức thực hiện |
| --- | --- | --- |
| Readiness Recalculation | Tính lại Role Readiness sau khi người dùng hoàn thành roadmap. | Chạy lại công thức readiness trên profile/JD structured data hiện có. |
| Gap Reduction | Cho thấy những khoảng trống nào đã được thu hẹp hoặc loại bỏ. | So sánh snapshot gap trước/sau bằng rule và hiển thị thay đổi. |
| Job Opportunity Expansion | Cho thấy việc phát triển năng lực đã làm tăng số lượng target job mà người dùng có thể tiếp cận như thế nào. | Đếm target job vượt ngưỡng readiness trước/sau; không dự đoán cơ hội thực tế. |
| Next Best Action | Sau mỗi milestone, xác định hành động tiếp theo có giá trị nhất. | Rule chọn task có Skill ROI cao nhất và prerequisite đã đạt; template giải thích. |
