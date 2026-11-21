export const pilotTerms = {
  price: '1 990 Kč celkem za 30 dní. Cena zahrnuje případnou DPH. Použitý režim uvedeme v nabídce před objednáním.',
  setup: 'Osobní zřízení jedné firmy a úvodní zaškolení jsou v ceně.',
  users: 'Až 5 uživatelů včetně majitele firmy.',
  files: '0 příloh. Nahrávání souborů není součástí pilotu.',
  support: 'E-mailem v pracovní dny. Cílová doba první odpovědi je do konce následujícího pracovního dne.',
  export: 'Majitel si před koncem pilotu stáhne poptávky a seznam týmu jako CSV.',
  exit: 'Přístup končí po 30 dnech. Pilot se automaticky neprodlužuje a další období se účtuje jen po nové dohodě.',
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
