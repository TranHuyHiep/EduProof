"use client";

/**
 * The verification seal.
 *
 * A certificate carries a stamp where a signature would go, and that is the
 * object this page is standing in for. It replaces a green tick — which said
 * "form submitted" — with something that says "attested".
 *
 * The proof id runs around the ring the way a notary's registration number
 * does, so the mark is specific to this document rather than decorative.
 */
export function Seal({
  proofId, valid, size = 132,
}: { proofId: string; valid: boolean; size?: number }) {
  const stroke = valid ? "var(--color-seal-500)" : "var(--color-ink-faint)";
  const ring = `verification · ${proofId} · `.toUpperCase();

  return (
    <svg
      viewBox="0 0 200 200"
      style={{ width: size, height: size }}
      className="seal-press"
      role="img"
      aria-label={valid ? `Verified, proof ${proofId}` : `Not verified, proof ${proofId}`}
    >
      <defs>
        <path id="seal-ring" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
      </defs>

      {/* Two concentric rules, as struck by a press. */}
      <circle cx="100" cy="100" r="88" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.5" />
      <circle cx="100" cy="100" r="60" fill="none" stroke={stroke} strokeWidth="1" opacity="0.35" />

      {/* Registration number around the ring. */}
      <text fill={stroke} fontSize="9.5" letterSpacing="2.4" opacity="0.75">
        <textPath href="#seal-ring" startOffset="0">{ring.repeat(2)}</textPath>
      </text>

      {valid ? (
        <>
          <path
            d="M78 100 l14 14 l30 -32"
            fill="none"
            stroke={stroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="100" y="140" textAnchor="middle"
            fill={stroke} fontSize="11" letterSpacing="3.4"
            fontFamily="var(--font-sans)"
          >
            VERIFIED
          </text>
        </>
      ) : (
        <>
          <path
            d="M84 84 l32 32 M116 84 l-32 32"
            fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round"
          />
          <text
            x="100" y="140" textAnchor="middle"
            fill={stroke} fontSize="11" letterSpacing="3.4"
            fontFamily="var(--font-sans)"
          >
            UNVERIFIED
          </text>
        </>
      )}
    </svg>
  );
}
