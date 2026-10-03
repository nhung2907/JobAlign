# JOBALIGN - Web Định Vị Năng Lực & Khớp Đãi Ngộ 2 chiều

> Nguồn: [Google Sheets — TIN314 | NHÓM 11 | WORKING SPACE](https://docs.google.com/spreadsheets/d/1ne4uBKpkiPS-MaDb8EBowwQ_8799ljyneP2G_EzBp7M/edit?gid=633320493#gid=633320493) · sheet `BRIEF`


## USP

JobAlign không chỉ chấm mức độ khớp giữa CV và JD mà còn đánh giá hai chiều: ứng viên có phù hợp với công việc và công việc có phù hợp với kỳ vọng của ứng viên hay không. Hệ thống phân biệt rõ “năng lực đã có nhưng chưa thể hiện tốt trên CV” với “năng lực thực sự còn thiếu”, từ đó đưa ra đề xuất cải thiện chính xác hơn thay vì chỉ tối ưu từ khóa. Điểm khác biệt cốt lõi của JobAlign là chuyển kết quả phân tích thành lộ trình hành động cụ thể, giúp người dùng biết nên ứng tuyển công việc nào, cần cải thiện gì và cần làm gì tiếp theo để tiến gần hơn tới vị trí mục tiêu.


## Problem Statement Canvas


### Bối cảnh

Người tìm việc, đặc biệt là sinh viên, người mới đi làm và người muốn chuyển hướng nghề nghiệp, thường phải lựa chọn giữa nhiều vị trí tuyển dụng có yêu cầu khác nhau về kỹ năng, kinh nghiệm, trình độ và điều kiện làm việc.

JD thường chứa nhiều tiêu chí nhưng người ứng tuyển khó xác định đâu là yêu cầu bắt buộc, đâu là yêu cầu ưu tiên và mức độ hồ sơ hiện tại của mình thực sự phù hợp đến đâu. Đồng thời, việc lựa chọn công việc không chỉ phụ thuộc vào khả năng đáp ứng JD mà còn phụ thuộc vào mức độ công việc phù hợp với kỳ vọng cá nhân như mức lương, địa điểm, hình thức làm việc và cơ hội phát triển.


### Vấn đề

Người tìm việc thiếu một phương pháp có hệ thống để đánh giá liệu một công việc có thực sự đáng ứng tuyển hay không. Họ khó xác định:  
(1) mình đã đáp ứng những yêu cầu nào  
(2) năng lực nào đã có nhưng chưa được thể hiện tốt trên CV  
(3) năng lực nào thực sự còn thiếu  
(4) khoảng trống nào quan trọng nhất cần ưu tiên cải thiện  
(5) công việc có phù hợp với kỳ vọng nghề nghiệp của bản thân hay không.

-->Vì vậy, quyết định ứng tuyển thường dựa nhiều vào cảm tính hoặc một vài yếu tố riêng lẻ thay vì đánh giá tổng thể.


### Khách hàng

- Nhóm chính: sinh viên năm cuối, sinh viên mới tốt nghiệp và người đi làm khoảng 0–3 năm kinh nghiệm đang tìm kiếm các vị trí white-collar. Đây là nhóm có tương đối ít kinh nghiệm tuyển dụng, thường chưa hiểu rõ cách đọc JD và khó đánh giá mức độ cạnh tranh của hồ sơ.

- Nhóm thứ cấp: người muốn chuyển ngành/chuyển nghề, những người cần xác định kỹ năng có thể chuyển đổi và khoảng trống cần bổ sung trước khi ứng tuyển vào lĩnh vực mới.


### Ảnh hưởng cảm xúc

- Người dùng có thể cảm thấy không chắc chắn liệu mình có đủ khả năng ứng tuyển
- Lo lắng khi thấy JD có nhiều yêu cầu
- Mất tự tin sau nhiều lần ứng tuyển nhưng không nhận được phản hồi
- FOMO khi gặp một công việc hấp dẫn nhưng không biết mình đã đủ khả năng hay chưa; quá tải trước quá nhiều kỹ năng, khóa học và lời khuyên khác nhau; hoặc ngược lại ảo tưởng về mức độ phù hợp và tiếp tục ứng tuyển những vị trí chưa phù hợp.


### Phương án thay thế & điểm yếu

- Tự đánh giá: phụ thuộc nhiều vào hiểu biết và kinh nghiệm cá nhân, dễ đánh giá quá cao hoặc quá thấp khả năng của bản thân.

- Mentor/HR: chất lượng tư vấn tốt nhưng khó tiếp cận thường xuyên, tốn thời gian và khó mở rộng. AI chatbot: có thể phân tích nhưng kết quả thường rời rạc giữa các lần sử dụng, thiếu hồ sơ năng lực và mục tiêu nghề nghiệp xuyên suốt.

- CV scanner: thường tập trung vào keyword/ATS optimization hơn là phân biệt khoảng trống năng lực thực tế với khoảng trống thể hiện trên CV.

- Nền tảng khóa học: đề xuất nội dung học nhưng không xác định rõ kỹ năng nào mang lại giá trị lớn nhất đối với các công việc mục tiêu.

- Apply hàng loạt: tốn thời gian, khó học được nguyên nhân bị loại và có thể khiến người dùng tiếp tục lặp lại cùng một vấn đề trên CV.
