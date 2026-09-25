import { PARTYPLAY_AUTH_URL } from "@/lib/partyplay-auth";

export const ZAGRAJ_GAME_MEDIA_BUCKET = "zagraj-game-media";
export const ZAGRAJ_GAME_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const ZAGRAJ_GAME_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const SAFE_PATH = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:png|jpg|jpeg|webp)$/;

export function gameMediaUrl(path: string | null | undefined): string | null {
  if (!path || !SAFE_PATH.test(path)) return null;
  return `${PARTYPLAY_AUTH_URL}/storage/v1/object/public/${ZAGRAJ_GAME_MEDIA_BUCKET}/${path}`;
}

export type GameMediaItem = {
  path: string;
  slug: string;
  altText: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
};
