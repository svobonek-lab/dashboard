const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/const \{ currentOrg, updateBrandingAdmin, isConfigured, \n    user, \n    dbUser,\n   isLoading: isAuthLoading, \n    currentOrg, \n    fetchLeads, \n    fetchEmployees, \n    saveLead, \n    updateLeadStatus \n  \} = useOrganization\(\);/g, `const { isConfigured, user, dbUser, isLoading: isAuthLoading, currentOrg, fetchLeads, fetchEmployees, saveLead, updateLeadStatus } = useOrganization();
const branding = currentOrg?.branding || {};`);

content = content.replace(/\(currentOrg\?\.branding \|\| \{\}\)=\{\(currentOrg\?\.branding \|\| \{\}\)\}/g, "branding={branding}");
content = content.replace(/\(currentOrg\?\.branding \|\| \{\}\)/g, "branding");
content = content.replace(/currentOrg\?\.currentOrg\?\.branding/g, "currentOrg?.branding");
content = content.replace(/generateRealisticLeads\(currentOrg\?\.branding \|\| \{\}\)/g, "generateRealisticLeads(branding)");

fs.writeFileSync('src/App.tsx', content);
