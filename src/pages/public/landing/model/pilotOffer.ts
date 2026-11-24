export const pilotTerms = {
  price: 'Prvních 30 dní zdarma. Poté 1 990 Kč měsíčně bez DPH.',
  setup: 'Zřízení bez poplatku.',
  users: 'Až 5 uživatelů včetně majitele firmy.',
  files: 'Přílohy nejsou součástí nabídky.',
  support: 'E-mailem v pracovní dny. Cílová doba první odpovědi je do konce následujícího pracovního dne.',
  export: 'Majitel si může stáhnout poptávky a seznam týmu jako CSV.',
  exit: 'Měsíční předplatné lze ukončit. Přesné datum ukončení a účtování potvrdíme před aktivací.',
};

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
