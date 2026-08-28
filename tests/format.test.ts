// Display formatting.
//
// Small, but this is where V6 lived: a raw ISO timestamp rendered straight
// into the verify page. These functions are the reason that cannot recur.

import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  isExpired,
  shortenMiddle,
} from "@/lib/format";

describe("formatDate", () => {
  it("writes the month out in full", () => {
    // "30 June 2027", never "30/06/2027" — 06/07 reads differently either side
    // of the Atlantic, and never the raw ISO string that V6 was about.
    expect(formatDate("2027-06-30T00:00:00.000Z")).toBe("30 June 2027");
  });

  it("returns the input unchanged when it is not a date", () => {
    // Rendering "Invalid Date" to a verifier would look like a broken proof.
    expect(formatDate("not a date")).toBe("not a date");
  });
});

describe("formatDateTime", () => {
  it("appends a 24-hour clock to the date", () => {
    expect(formatDateTime("2027-06-30T14:05:00.000Z")).toMatch(/^30 June 2027, \d{2}:\d{2}$/);
  });

  it("passes an unparseable value through", () => {
    expect(formatDateTime("nope")).toBe("nope");
  });
});

describe("formatRelative", () => {
  const now = Date.parse("2026-08-29T12:00:00.000Z");

  it("collapses anything under a minute", () => {
    expect(formatRelative("2026-08-29T11:59:30.000Z", now)).toBe("just now");
  });

  it.each([
    ["2026-08-29T11:30:00.000Z", /30 minutes ago/],
    ["2026-08-29T09:00:00.000Z", /3 hours ago/],
    ["2026-08-27T12:00:00.000Z", /2 days ago/],
  ])("describes %s in the past", (iso, expected) => {
    expect(formatRelative(iso, now)).toMatch(expected);
  });

  it("handles the future too", () => {
    expect(formatRelative("2026-08-31T12:00:00.000Z", now)).toMatch(/in 2 days/);
  });

  it("falls back to an absolute date beyond a year", () => {
    // "in 14 months" is harder to read than the date itself.
    expect(formatRelative("2028-01-01T00:00:00.000Z", now)).toBe("1 January 2028");
  });

  it("passes an unparseable value through", () => {
    expect(formatRelative("nope", now)).toBe("nope");
  });
});

describe("isExpired", () => {
  const now = Date.parse("2026-08-29T12:00:00.000Z");

  it("is true strictly in the past", () => {
    expect(isExpired("2026-08-29T11:59:59.000Z", now)).toBe(true);
  });

  it("is false in the future", () => {
    expect(isExpired("2027-06-30T00:00:00.000Z", now)).toBe(false);
  });

  it("treats an unparseable value as not expired", () => {
    // Better to show a proof than to mark a valid one dead on a parse slip.
    expect(isExpired("nope", now)).toBe(false);
  });
});

describe("shortenMiddle", () => {
  it("elides the middle of a long wallet address", () => {
    expect(shortenMiddle("addr_demo117b668c35168d82d48598234386ccc02", 16, 6))
      .toBe("addr_demo117b668…6ccc02");
  });

  it("leaves a short value alone", () => {
    expect(shortenMiddle("addr_short", 16, 6)).toBe("addr_short");
  });

  it("keeps both ends readable, since that is how an address is checked", () => {
    const shortened = shortenMiddle("pf_0123456789abcdef", 6, 4);
    expect(shortened.startsWith("pf_012")).toBe(true);
    expect(shortened.endsWith("cdef")).toBe(true);
  });
});
