// src/components/FindingCard.tsx
"use client";

import type { Finding } from "@/rules";

// Unused legacy component kept as a no-op to avoid import conflicts.
// UI uses the inline card in FindingsList.
type Props = { finding: Finding };

export default function FindingCard({ finding }: Props) {
  return <div className="hidden" data-finding-id={finding.id} />;
}
