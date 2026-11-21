export const pilotTerms = {
  price: null,
  setup: null,
  users: null,
  files: null,
  support: null,
  export: null,
  exit: null,
} as Record<'price' | 'setup' | 'users' | 'files' | 'support' | 'export' | 'exit', string | null>;

export function estimatePilotScenario(input: {
  monthlyLeads: number;
  quotedRate: number;
  winRate: number;
  margin: number;
  adminHoursWeekly: number;
  extraWinsPercent: number;
  timeSavedPercent: number;
  cost: number | null;
}) {
  const baselineWins = input.monthlyLeads * input.quotedRate / 100 * input.winRate / 100;
  const extraMargin = Math.round(baselineWins * input.extraWinsPercent / 100 * input.margin);
  const hoursSaved = Math.round(input.adminHoursWeekly * 30 / 7 * input.timeSavedPercent / 100);
  const roiPercent = input.cost && input.cost > 0
    ? Math.round((extraMargin - input.cost) / input.cost * 100) : null;
  return { baselineWins, extraMargin, hoursSaved, roiPercent };
}
