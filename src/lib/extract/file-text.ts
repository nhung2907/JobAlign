import "server-only";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export class FileTextError extends Error {}

function kindOf(name: string, type: string): "pdf" | "docx" | "txt" | null {
  const n = name.toLowerCase();
  if (type === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || n.endsWith(".docx")) return "docx";
  if (type.startsWith("text/") || n.endsWith(".txt")) return "txt";
  return null;
}

/** Đọc văn bản từ tệp CV/JD. Chỉ nhận PDF, DOCX, TXT tối đa 10 MB (mục 6 — kiểm tra file trước khi xử lý). */
export async function fileToText(file: File): Promise<string> {
  if (file.size === 0) throw new FileTextError("Tệp rỗng.");
  if (file.size > MAX_FILE_BYTES) throw new FileTextError("Tệp lớn hơn 10 MB.");
  const kind = kindOf(file.name, file.type);
  if (!kind) throw new FileTextError("Chỉ nhận tệp PDF, DOCX hoặc TXT.");
  const buf = new Uint8Array(await file.arrayBuffer());

  let text: string;
  if (kind === "pdf") {
    if (!(buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)) throw new FileTextError("Tệp không phải PDF hợp lệ.");
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const res = await extractText(pdf, { mergePages: true });
    text = Array.isArray(res.text) ? res.text.join("\n") : res.text;
  } else if (kind === "docx") {
    if (!(buf[0] === 0x50 && buf[1] === 0x4b)) throw new FileTextError("Tệp không phải DOCX hợp lệ.");
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    text = res.value;
  } else {
    text = new TextDecoder("utf-8").decode(buf);
  }
  text = text.replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 40) throw new FileTextError("Không đọc được chữ trong tệp — có thể là bản scan ảnh. Hãy nhập tay.");
  return text;
}
