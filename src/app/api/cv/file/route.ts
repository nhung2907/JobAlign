import { getCaller, jsonError } from "@/lib/server/guard";
import { CV_BUCKET } from "@/lib/supabase/config";

/** NFR-3 — Xoá toàn bộ tệp CV của tài khoản trong Storage. */
export async function DELETE(req: Request) {
  const caller = await getCaller(req);
  if (caller instanceof Response) return caller;
  if (!caller.supabase || !caller.user) return Response.json({ removed: 0 });
  const { data, error } = await caller.supabase.storage.from(CV_BUCKET).list(caller.user.id, { limit: 1000 });
  if (error) return jsonError("Không liệt kê được tệp CV.", 500);
  const paths = (data ?? []).map((f) => `${caller.user!.id}/${f.name}`);
  if (paths.length) {
    const { error: rmError } = await caller.supabase.storage.from(CV_BUCKET).remove(paths);
    if (rmError) return jsonError("Không xoá được tệp CV.", 500);
  }
  return Response.json({ removed: paths.length });
}
