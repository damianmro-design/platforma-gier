"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";
import { gameMediaUrl, ZAGRAJ_GAME_MEDIA_BUCKET, ZAGRAJ_GAME_MEDIA_MAX_BYTES, type GameMediaItem } from "@/lib/zagraj-media";

type Props = {
  slug: string;
  selectedPath: string;
  onSelect: (path: string) => void;
  disabled?: boolean;
  title?: string;
};

export default function GameMediaPicker({
  slug, selectedPath, onSelect, disabled = false, title = "Grafika",
}: Props) {
  const [items, setItems] = useState<GameMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [alt, setAlt] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const { data: { session } } = await createPartyPlayAuthClient().auth.getSession();
    if (!session?.access_token) throw new Error("Zaloguj się na konto administratora.");
    const response = await fetch(`/api/admin/media?slug=${encodeURIComponent(slug)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal, cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Nie można pobrać grafik.");
    if (!Array.isArray(data)) throw new Error("Błąd biblioteki.");
    return data as GameMediaItem[];
  }, [slug]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    load(controller.signal).then((result) => {
      if (!controller.signal.aborted) setItems(result);
    }).catch((cause: Error) => {
      if (!controller.signal.aborted) setError(cause.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [load]);

  async function upload(file: File | undefined) {
    if (!file || disabled || uploading) return;
    setError(""); setNotice("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Obsługiwane formaty: JPG, PNG i WebP."); return;
    }
    if (!file.size || file.size > ZAGRAJ_GAME_MEDIA_MAX_BYTES) {
      setError("Grafika może mieć maksymalnie 5 MB."); return;
    }
    if (alt.trim().length > 160) {
      setError("Opis grafiki może mieć maksymalnie 160 znaków."); return;
    }
    setUploading(true);
    try {
      // Validate that this is decodable image data, not merely a renamed file.
      const image = await createImageBitmap(file);
      const dimensionsOk = image.width > 0 && image.height > 0 &&
        image.width <= 6000 && image.height <= 6000;
      image.close();
      if (!dimensionsOk) throw new Error("Nieprawidłowy rozmiar grafiki (maks. 6000 px na bok).");
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${slug}/${crypto.randomUUID()}.${extension}`;
      const auth = createPartyPlayAuthClient();
      const { error: uploadError } = await auth.storage.from(ZAGRAJ_GAME_MEDIA_BUCKET).upload(path, file, {
        contentType: file.type, upsert: false, cacheControl: "3600",
      });
      if (uploadError) throw new Error(uploadError.message);
      const { data: { session } } = await auth.auth.getSession();
      if (!session?.access_token) throw new Error("Sesja wygasła. Zaloguj się ponownie.");
      const response = await fetch("/api/admin/media", {
        method: "POST", cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path, altText: alt.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Nie można zapisać grafiki w bibliotece.");
      const fresh = await load();
      setItems(fresh);
      onSelect(path);
      setAlt("");
      if (fileInput.current) fileInput.current.value = "";
      setNotice("Grafika została dodana i wybrana. Zapisz szkic, aby zachować wybór.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nie udało się przesłać grafiki.");
    } finally { setUploading(false); }
  }

  const selectedUrl = gameMediaUrl(selectedPath);
  return <div className="space-y-4">
    <div>
      <h3 className="text-sm font-black">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-zinc-400">Wybierz przesłaną grafikę albo dodaj nową. Pliki są przypisane do aktualnej gry.</p>
    </div>
    {selectedUrl && <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.045] p-3">
      <img src={selectedUrl} alt="Wybrana grafika" className="h-24 w-36 rounded-lg object-cover"/>
      <div className="flex-1 text-xs text-emerald-200">Wybrana grafika</div>
      <button type="button" disabled={disabled} onClick={() => onSelect("")} className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200 disabled:opacity-40">
        Przywróć motyw domyślny
      </button>
    </div>}
    {error && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-xs text-red-200">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-xs text-emerald-200">{notice}</p>}
    {loading ? <p className="text-xs text-zinc-500">Wczytuję bibliotekę…</p> :
      <div className="grid max-h-72 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const url = gameMediaUrl(item.path);
          if (!url) return null;
          return <button key={item.path} type="button" disabled={disabled || uploading}
            onClick={() => onSelect(item.path)}
            className={`overflow-hidden rounded-xl border text-left transition disabled:opacity-50 ${selectedPath === item.path
              ? "border-emerald-300 bg-emerald-400/10" : "border-white/15 bg-black/20 hover:border-violet-300/70"}`}>
            <img src={url} alt={item.altText || "Grafika gry"} loading="lazy" className="aspect-video w-full object-cover"/>
            <span className="block truncate p-2 text-[11px] text-zinc-300">{item.altText || "Bez opisu"}</span>
          </button>;
        })}
        {!items.length && !error && <p className="col-span-full py-4 text-xs text-zinc-500">Nie przesłano jeszcze grafik dla tej gry.</p>}
      </div>}
    <div className="rounded-xl border border-dashed border-white/20 p-4">
      <p className="text-xs font-bold">Dodaj nowy plik</p>
      <input value={alt} disabled={disabled || uploading} maxLength={160}
        onChange={(event) => setAlt(event.target.value)}
        placeholder="Krótki opis grafiki (alt)"
        className="mt-3 w-full rounded-xl border border-white/15 bg-[#090d1d] px-3 py-2 text-xs outline-none focus:border-violet-400"/>
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp"
        disabled={disabled || uploading} onChange={(event) => void upload(event.target.files?.[0])}
        className="mt-3 block w-full text-xs text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-500 file:px-3 file:py-2 file:font-bold file:text-white"/>
      <p className="mt-2 text-[11px] text-zinc-500">JPG, PNG lub WebP, do 5 MB. Każdy plik ma niezmienną nazwę, co umożliwia przywracanie starszych wersji.</p>
    </div>
  </div>;
}
