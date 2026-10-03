import type { Preferences, Profile } from "./schema";

/**
 * Dữ liệu mẫu theo đúng ví dụ trong wireframe (ứng viên Marketing, 5 JD). Dùng cho nút
 * "Dùng dữ liệu mẫu" và làm dữ liệu kiểm thử. JD mẫu là văn bản thô, đi qua đúng bộ bóc
 * tách như JD người dùng dán vào.
 */
export function sampleProfile(now = new Date()): Profile {
  const at = now.toISOString();
  return {
    basics: { name: "Nguyễn Minh Anh", email: "minhanh.demo@example.com", phone: "0901 234 567" },
    education: [
      { id: "edu_1", degree: "Cử nhân", school: "Đại học Thương mại", major: "Marketing", start: "2021-09", end: "2025-06", gpa: "3.4 / 4.0", source: "cv" },
    ],
    experience: [
      {
        id: "exp_1",
        title: "Thực tập sinh Marketing",
        company: "Công ty ABC",
        start: "2024-06",
        end: "2024-11",
        bullets: [
          "Hỗ trợ theo dõi hiệu quả các chiến dịch marketing của công ty.",
          "Viết content cho fanpage và website (12 bài/tháng), tối ưu SEO on-page cho các bài blog.",
          "Phối hợp với team thiết kế lên ấn phẩm cho 3 sự kiện ra mắt sản phẩm.",
        ],
        onCv: true,
        source: "cv",
      },
      {
        id: "exp_2",
        title: "Cộng tác viên Nội dung",
        company: "Dự án sinh viên",
        start: "2024-01",
        end: "2024-05",
        bullets: ["Lên ý tưởng và viết bài cho fanpage của dự án."],
        onCv: false,
        source: "user",
      },
    ],
    skills: [
      { id: "skl_1", name: "Content Marketing", source: "cv" },
      { id: "skl_2", name: "SEO cơ bản", source: "cv" },
      { id: "skl_3", name: "Google Analytics", source: "cv" },
      { id: "skl_4", name: "Canva", source: "cv" },
      { id: "skl_5", name: "Excel nâng cao", source: "user" },
    ],
    projects: [
      {
        id: "prj_1",
        name: "Chiến dịch truyền thông cho câu lạc bộ",
        year: "2024",
        description: "Lập kế hoạch truyền thông và thiết kế ấn phẩm bằng Canva cho sự kiện tuyển thành viên của CLB, thu hút 150 người đăng ký.",
        source: "cv",
      },
    ],
    certifications: [{ id: "cert_1", name: "IELTS 7.0", kind: "language", score: "7", source: "cv" }],
    achievements: [],
    clarifications: [],
    cv: { fileName: "CV_NguyenMinhAnh.pdf", path: null, parsedAt: at, parser: "manual" },
    updatedAt: at,
  };
}

export function samplePreferences(now = new Date()): Preferences {
  return {
    salary: { desired: 15, minimum: 12, negotiable: true, importance: "must" },
    location: { cities: ["hanoi"], districts: ["Cầu Giấy", "Ba Đình", "Đống Đa"], maxCommute: 30, importance: "important" },
    workMode: { modes: ["hybrid"], importance: "important" },
    growth: { wants: ["training", "promotion"], importance: "nice" },
    dealBreakers: [
      { id: "db_1", kind: "salary_below", value: 12, keyword: null },
      { id: "db_2", kind: "onsite_full", value: null, keyword: null },
    ],
    updatedAt: now.toISOString(),
  };
}

export interface SampleJd {
  title: string;
  company: string;
  daysAgo: number;
  text: string;
}

export const SAMPLE_JDS: SampleJd[] = [
  {
    title: "Marketing Executive",
    company: "Công ty D",
    daysAgo: 0,
    text: `Marketing Executive
Công ty D

Mô tả công việc:
- Lên kế hoạch và triển khai chiến dịch truyền thông hàng tháng
- Theo dõi và báo cáo hiệu quả chiến dịch theo tuần
- Phối hợp với đội thiết kế và đội bán hàng
- Quản lý ngân sách quảng cáo được giao

Yêu cầu ứng viên:
- Tốt nghiệp đại học chuyên ngành Marketing / Truyền thông / Kinh tế
- Tối thiểu 1 năm kinh nghiệm ở vị trí tương đương
- Thành thạo Google Analytics và công cụ đo lường hiệu quả chiến dịch
- Có kinh nghiệm chạy A/B testing cho nội dung hoặc quảng cáo

Ưu tiên:
- Biết dùng công cụ thiết kế cơ bản (Canva, Figma)
- Tiếng Anh đọc hiểu tài liệu chuyên ngành
- Từng làm trong ngành bán lẻ hoặc thương mại điện tử

Thông tin chung:
- Mức lương: 13 - 16 triệu/tháng
- Địa điểm làm việc: Tầng 5, 123 Trần Duy Hưng, Cầu Giấy, Hà Nội
- Hình thức: Hybrid — 2 ngày onsite/tuần
- Thời gian làm việc: 8h30 - 17h30, Thứ 2 - Thứ 6`,
  },
  {
    title: "Content Specialist",
    company: "Công ty B",
    daysAgo: 4,
    text: `Content Specialist
Công ty B

Mô tả công việc:
- Sản xuất nội dung cho website, blog và fanpage của công ty
- Tối ưu SEO cho bài viết trên website
- Phối hợp với team design lên ấn phẩm truyền thông

Yêu cầu:
- Tốt nghiệp Cao đẳng / Đại học chuyên ngành Marketing, Báo chí, Truyền thông
- Có kinh nghiệm viết content cho fanpage hoặc website
- Hiểu biết về SEO on-page
- Biết sử dụng Canva là một lợi thế

Quyền lợi:
- Được đào tạo nội bộ về content và SEO
- Lộ trình thăng tiến rõ ràng, review lương 2 lần/năm
- Thưởng lễ Tết, du lịch hằng năm

Mức lương: 14 - 18 triệu
Địa điểm: Ba Đình, Hà Nội
Hình thức làm việc: Hybrid, 3 ngày lên văn phòng`,
  },
  {
    title: "Brand Assistant",
    company: "Công ty E",
    daysAgo: 6,
    text: `Brand Assistant
Công ty E

Nhiệm vụ:
- Hỗ trợ Brand Manager triển khai kế hoạch thương hiệu
- Thu thập và tổng hợp dữ liệu thị trường, đối thủ
- Hỗ trợ tổ chức sự kiện ra mắt sản phẩm

Yêu cầu:
- Tối thiểu 6 tháng kinh nghiệm marketing
- Có kinh nghiệm nghiên cứu thị trường
- Thành thạo Excel
- Có kinh nghiệm tổ chức sự kiện là điểm cộng

Quyền lợi:
- Được đào tạo bài bản theo quy trình của tập đoàn
- Bảo hiểm đầy đủ theo luật lao động

Lương: 12 - 15 triệu/tháng
Địa điểm: Đống Đa, Hà Nội
Hybrid (3 ngày tại văn phòng)`,
  },
  {
    title: "Digital Marketing Intern",
    company: "Công ty A",
    daysAgo: 8,
    text: `Digital Marketing Intern
Công ty A

Công việc:
- Hỗ trợ viết content cho fanpage
- Theo dõi số liệu quảng cáo hằng ngày

Yêu cầu:
- Tốt nghiệp Cao đẳng/Đại học chuyên ngành Marketing hoặc liên quan
- Biết sử dụng Canva
- Hiểu biết cơ bản về SEO, Content Marketing

Quyền lợi:
- Có mentor hướng dẫn trực tiếp
- Cơ hội trở thành nhân viên chính thức

Trợ cấp: 5 - 7 triệu/tháng
Địa điểm: Cầu Giấy, Hà Nội
Hình thức: Hybrid, 3 ngày lên văn phòng`,
  },
  {
    title: "Growth Executive",
    company: "Công ty C",
    daysAgo: 9,
    text: `Growth Executive
Công ty C

Mô tả công việc:
- Xây dựng và tối ưu phễu tăng trưởng người dùng
- Phân tích dữ liệu hành vi người dùng để đề xuất thử nghiệm

Yêu cầu:
- Tối thiểu 2 năm kinh nghiệm growth hoặc performance marketing
- Thành thạo SQL và Google Ads
- Có kinh nghiệm quản lý ngân sách quảng cáo
- Có kinh nghiệm chạy A/B testing cho quảng cáo
- Biết Python là một lợi thế

Mức lương: 18 - 25 triệu
Địa điểm: Tây Hồ, Hà Nội
Làm việc tại văn phòng, Thứ 2 - Thứ 6, 8h00 - 17h00`,
  },
];
