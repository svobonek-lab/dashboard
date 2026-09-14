const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/function AppContent\(\) \{/, "function AppContent() {\n  const { currentOrg } = useOrganization();\n  const branding = currentOrg?.branding || {};");

fs.writeFileSync('src/App.tsx', content);
