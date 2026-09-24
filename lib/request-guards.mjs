// Shared bounded JSON reader for small, public room mutation endpoints.
// This does not replace distributed rate limiting or Supabase RPC protection.
const OVERSIZE = { ok: false, status: 413, error: "Żądanie jest za duże." };

export async function readJsonObjectLimited(request, maxBytes = 16 * 1024) {
  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return OVERSIZE;
  if (!request.body) return { ok: true, body: {} };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let raw = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        return OVERSIZE;
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } catch {
    return { ok: true, body: {} };
  } finally {
    reader.releaseLock();
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      ok: true,
      body: parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {},
    };
  } catch {
    // Preserve existing route behaviour for malformed JSON: unknown action.
    return { ok: true, body: {} };
  }
}
