// Every entry must be verified and approved before publishing.
// Pricing figures must only be added here once they have been approved.
export const PROOF_POINTS = [
  "Callbox was founded in 2004.",
  "Callbox helped a B2B logistics provider close a $6 million deal from a targeted 12-month appointment-setting campaign.",
  "A logistics firm generated 200+ qualified leads through a Callbox-managed pipeline growth program.",
];

export function proofPointsBlock() {
  if (!PROOF_POINTS.length) {
    return "CALLBOX PROOF POINTS: none provided. Do not cite any Callbox statistics.";
  }
  return "CALLBOX PROOF POINTS (the only Callbox facts you may cite):\n" + PROOF_POINTS.map((p) => "- " + p).join("\n");
}
