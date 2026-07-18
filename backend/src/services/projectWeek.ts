const PROJECT_START = '2026-05-25';

export function getProjectWeek(startDate = PROJECT_START): number {
  const start = new Date(`${startDate}T00:00:00`);
  const now = new Date();
  const days = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, Math.floor(days / 7) + 1);
}

export function getDefaultWeek(): number {
  const fromEnv = process.env.EVIDENCE_WEEK;
  if (fromEnv && !Number.isNaN(Number(fromEnv))) return Number(fromEnv);
  return getProjectWeek();
}
