// Turning whatever a wallet threw into something a student can act on.
//
// This exists because of a specific failure: clicking "Generate & publish on
// chain" appeared to do nothing at all. Part of that was a catch block that
// discarded the message, and part was that a message can be empty or
// meaningless in the first place — a wallet extension is free to reject with
// something that is not an Error. Either way the student sees a blank alert
// and concludes the button is broken, so every path here has to end in a
// sentence.
import { describe, expect, it } from "vitest";
import { publishErrorMessage } from "@/lib/midnight/errors";

describe("known chain error codes become advice", () => {
  it("reads 170 as a wallet that has not finished syncing", () => {
    expect(publishErrorMessage(new Error("1010: Invalid Transaction: Custom error: 170"))).toBe(
      "Your wallet is still syncing. Try again in a few minutes.",
    );
  });

  it("reads 173 as missing DUST", () => {
    expect(publishErrorMessage(new Error("Custom error: 173"))).toBe(
      "Not enough DUST to cover the fee.",
    );
  });

  it("finds the code even when it is buried in a wrapped message", () => {
    // lace-provider wraps wallet failures to name the step, so the code
    // arrives nested rather than at the start.
    const wrapped = new Error(
      "The wallet would not balance the transaction: 1010: Invalid Transaction: Custom error: 173",
    );
    expect(publishErrorMessage(wrapped)).toBe("Not enough DUST to cover the fee.");
  });
});

describe("anything else still reaches the student as words", () => {
  it("passes an ordinary message through untouched", () => {
    expect(publishErrorMessage(new Error("User rejected the request"))).toBe(
      "User rejected the request",
    );
  });

  it("does not render an empty alert for an Error with no message", () => {
    expect(publishErrorMessage(new Error(""))).toBe(
      "The wallet rejected the request without saying why.",
    );
  });

  it("does not render [object Object] for a non-Error rejection", () => {
    // What an extension rejecting with a bare object produces.
    expect(publishErrorMessage({ code: -3 })).toBe(
      "The wallet rejected the request without saying why.",
    );
  });

  it("keeps a rejection that is a plain string", () => {
    expect(publishErrorMessage("Wallet is locked")).toBe("Wallet is locked");
  });
});
