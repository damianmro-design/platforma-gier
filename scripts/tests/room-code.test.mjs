import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRoomCode, isSupportedRoomCode, cleanRoomCode } from "../../lib/room-code.mjs";

test("legacy 4-character invitation still works", () => {
  assert.equal(cleanRoomCode(" ab12 "), "AB12");
  assert.equal(isSupportedRoomCode("AB12"), true);
});

test("new 6-character code and human separators work", () => {
  assert.equal(cleanRoomCode(" ab-12-cd "), "AB12CD");
  assert.equal(isSupportedRoomCode("AB12CD"), true);
});

test("overlong input is rejected, never clipped to a different room", () => {
  assert.equal(cleanRoomCode("AB12CD7"), "");
  assert.equal(cleanRoomCode("AB12XXEXTRA"), "");
});

test("unsupported lengths and symbols are rejected", () => {
  for (const value of ["", "A", "ABC", "ABCDE", "AB12_CD", "AB12\u0000CD"]) {
    assert.equal(cleanRoomCode(value), "", value);
  }
});

test("numeric-only invitations are accepted for compatibility", () => {
  assert.equal(cleanRoomCode("2345"), "2345");
  assert.equal(cleanRoomCode("234567"), "234567");
});
