export function formatMatchScore(score: number): string {
  return `%${Math.round(score * 100)}`;
}
