// Turning whatever a verifier pasted into a proof reference.
//
// People paste a whole URL as often as they paste an id, and they paste it
// with stray whitespace. Rejecting either would be pedantry.

const REFERENCE = /pf_[0-9a-f]{6,}/i;

export interface LookupResult {
  proofId: string | null;
  error: string | null;
}

export function parseProofReference(input: string): LookupResult {
  const trimmed = input.trim();
  if (!trimmed) return { proofId: null, error: "Paste a proof link or reference." };

  const match = trimmed.match(REFERENCE);
  if (match) return { proofId: match[0].toLowerCase(), error: null };

  const looksLikeUrl = /^https?:\/\//i.test(trimmed);
  return {
    proofId: null,
    error: looksLikeUrl
      ? "That link does not contain a proof reference."
      : "A reference looks like pf_ followed by hexadecimal characters.",
  };
}
