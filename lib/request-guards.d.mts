export type LimitedJsonResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: 413; error: string };

export function readJsonObjectLimited(
  request: Request,
  maxBytes?: number,
): Promise<LimitedJsonResult>;
