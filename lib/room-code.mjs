// Keep existing 4-character room invitations valid during the 6-character rollout.
// Reject overlong input rather than silently truncating it to another room.
export function normalizeRoomCode(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[\s-]/g, "");
}

export function isSupportedRoomCode(value) {
  return /^(?:[A-Z0-9]{4}|[A-Z0-9]{6})$/.test(value);
}

export function cleanRoomCode(value) {
  const code = normalizeRoomCode(value);
  return isSupportedRoomCode(code) ? code : "";
}
