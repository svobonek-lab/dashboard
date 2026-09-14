const fs = require('fs');

let content = fs.readFileSync('components/LoginPage.tsx', 'utf8');

content = content.replace("  const { currentOrg } = useOrganization();\n  const branding = currentOrg?.branding || {};\n  const { isConfigured, login, signUp, error: contextError, organizations, switchOrganization } = useOrganization();", "  const { currentOrg, isConfigured, login, signUp, error: contextError, organizations, switchOrganization } = useOrganization();\n  const branding = currentOrg?.branding || {};");

fs.writeFileSync('components/LoginPage.tsx', content);
