// Every entry must be verified and approved before publishing.
// Pricing figures must only be added here once they have been approved.
// industry is the only scope a proof point may be described as covering.
export const PROOF_POINTS = [
  { text: "Callbox was founded in 2004.", industry: "company" },
  { text: "Callbox helped a B2B logistics provider close a $6 million deal from a targeted 12-month appointment-setting campaign.", industry: "B2B logistics" },
  { text: "A logistics firm generated 200+ qualified leads through a Callbox-managed pipeline growth program.", industry: "logistics" },
];

export function proofPointsBlock() {
  if (!PROOF_POINTS.length) {
    return "CALLBOX PROOF POINTS: none provided. Do not cite any Callbox statistics.";
  }
  return (
    "CALLBOX PROOF POINTS (the only Callbox facts you may cite):\n" +
    PROOF_POINTS.map((p) => "- " + p.text + " [industry: " + p.industry + "]").join("\n") +
    "\nDescribe each only as the industry shown."
  );
}
