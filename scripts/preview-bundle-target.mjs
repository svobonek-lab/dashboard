// The legacy pilot-write gate embeds the production URL only as a comparison
// operand. Remove that one known operand before checking for live client targets.
export function hasUnexpectedProductionTarget(bundle, productionRef) {
  const productionUrl = `https://${productionRef}.supabase.co`;
  const pilotWriteCondition = /VITE_PILOT_WRITES\s*===\s*([`'"])true\1\s*&&\s*[A-Za-z_$][\w$]*\.VITE_SUPABASE_URL\s*===\s*([`'"])(https:\/\/[a-z0-9]{20}\.supabase\.co)\2/g;
  const withoutKnownOperand = bundle.replace(pilotWriteCondition, (condition, _firstQuote, _secondQuote, url) =>
    url === productionUrl ? condition.replace(url, '') : condition);
  return withoutKnownOperand.includes(productionUrl);
}
