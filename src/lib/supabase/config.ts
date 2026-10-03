/** Supabase là tuỳ chọn: thiếu biến môi trường thì app chạy chế độ demo, dữ liệu lưu trên trình duyệt. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const supabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;
export const CV_BUCKET = "cvs";
