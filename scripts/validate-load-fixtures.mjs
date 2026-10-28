export function validateLoadFixtures(owners, employees, claimsFor) {
  if (owners.some(({ role }) => role !== 'owner')) {
    throw new Error('Owner fixtures must declare owner role.');
  }
  if (employees.some(({ role }) => role !== 'employee')) {
    throw new Error('Employee fixtures must declare employee role.');
  }
  const fixtures = [...owners, ...employees];
  const companyIds = fixtures.map(({ companyId }) => companyId);
  if (new Set(companyIds).size !== companyIds.length) {
    throw new Error('Load fixtures must use distinct company IDs.');
  }
  const userIds = fixtures.map(({ userId }) => userId);
  if (userIds.some((userId) => !userId) || new Set(userIds).size !== userIds.length) {
    throw new Error('Load fixtures must use distinct Auth user IDs.');
  }
  const accessTokens = fixtures.map(({ accessToken }) => accessToken);
  if (new Set(accessTokens).size !== accessTokens.length) {
    throw new Error('Load fixtures must use distinct access tokens.');
  }
  for (const fixture of fixtures) {
    let claims;
    try { claims = claimsFor(fixture.accessToken); } catch { throw new Error('A load fixture token could not be decoded.'); }
    if (claims?.sub !== fixture.userId || claims?.app_metadata?.tenant_id !== fixture.companyId) {
      throw new Error('A load token does not match its fixture user or tenant.');
    }
  }
}
