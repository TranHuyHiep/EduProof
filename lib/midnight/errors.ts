// Turns a raw transaction-submission error into words a student can act on.
//
// docs/22-lessons.md §6 — the Substrate custom error codes this project has
// actually hit. Any other error is shown verbatim rather than guessed at.

export function publishErrorMessage(err: unknown): string {
  const raw = (err instanceof Error ? err.message : String(err)).trim();
  const code = /Custom error:?\s*(\d+)/i.exec(raw)?.[1];
  switch (code) {
    case "170":
      return "Your wallet is still syncing. Try again in a few minutes.";
    case "173":
      return "Not enough DUST to cover the fee.";
    case "174":
      return "Something went wrong building the transaction — this has been logged.";
    default:
      // A wallet extension can reject with an empty Error, or with a plain
      // object that stringifies to "[object Object]". Rendering either leaves
      // the student looking at a blank or meaningless alert, which reads as
      // the button having silently done nothing — the exact failure mode this
      // whole path was rewritten to eliminate.
      return raw && raw !== "[object Object]"
        ? raw
        : "The wallet rejected the request without saying why.";
  }
}
