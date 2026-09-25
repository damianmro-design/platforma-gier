// A notification only. Published content still comes exclusively from the public CMS RPC.
export const CATALOG_PUBLICATION_EVENT = "zagraj:catalog:published";
export const CATALOG_PUBLICATION_STORAGE_KEY = "zagraj:catalog:published-at";

export type CatalogRefreshReason = "focus" | "visibility" | "history" | "published";

// After a successful server-verified publish, notify another open zaGRAj tab.
// localStorage is not a content cache and failure to write it never blocks publication.
export function announceCatalogPublication() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CATALOG_PUBLICATION_STORAGE_KEY, String(Date.now()));
  } catch {
    // Storage may be unavailable (private browsing or browser policy).
  }
  window.dispatchEvent(new Event(CATALOG_PUBLICATION_EVENT));
}

export function subscribeToCatalogRefresh(onRefresh: (reason: CatalogRefreshReason) => void) {
  const onFocus = () => onRefresh("focus");
  const onVisibility = () => {
    if (document.visibilityState === "visible") onRefresh("visibility");
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) onRefresh("history");
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === CATALOG_PUBLICATION_STORAGE_KEY) onRefresh("published");
  };
  const onPublished = () => onRefresh("published");

  window.addEventListener("focus", onFocus);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("storage", onStorage);
  window.addEventListener(CATALOG_PUBLICATION_EVENT, onPublished);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CATALOG_PUBLICATION_EVENT, onPublished);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
