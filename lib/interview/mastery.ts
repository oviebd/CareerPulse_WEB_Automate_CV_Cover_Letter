/** Update mastery score with exponential moving average. */

export function updateMasteryScore(
  current: number | null,
  newScore: number,
  evidenceCount: number
): { masteryScore: number; trend: 'up' | 'down' | 'stable'; confidence: number } {
  const normalized = Math.max(0, Math.min(100, Math.round(newScore * 10)));
  const prev = current ?? normalized;
  const alpha = evidenceCount <= 1 ? 0.5 : 0.3;
  const masteryScore = Math.round(prev * (1 - alpha) + normalized * alpha);
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (masteryScore > prev + 2) trend = 'up';
  else if (masteryScore < prev - 2) trend = 'down';
  const confidence = Math.min(100, 30 + evidenceCount * 10);
  return { masteryScore, trend, confidence };
}
