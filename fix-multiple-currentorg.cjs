const fs = require('fs');

const filesToFix = ['src/App.tsx', 'components/LoginPage.tsx', 'components/Sidebar.tsx'];

filesToFix.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace all instances of `const { currentOrg } = useOrganization();` with nothing, except the first one we will inject
  // But wait, it's safer to just replace all `const { currentOrg } = useOrganization();` and `const branding = ...`
  // Actually, wait, `useOrganization` is destructured differently in some files.
  
  if (file === 'src/App.tsx') {
    content = content.replace(/const \{ currentOrg \} = useOrganization\(\);\n  const branding = currentOrg\?\.branding \|\| \{\};/g, "");
    content = content.replace(/const \{ currentOrg, updateBrandingAdmin, isConfigured,/g, "const { updateBrandingAdmin, isConfigured,");
    content = content.replace("function AppContent() {", "function AppContent() {\n  const { currentOrg } = useOrganization();\n  const branding = currentOrg?.branding || {};");
  }

  if (file === 'components/LoginPage.tsx') {
    content = content.replace(/const \{ currentOrg \} = useOrganization\(\);\n  const branding = currentOrg\?\.branding \|\| \{\};/g, "");
    content = content.replace("export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {", "export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {\n  const { currentOrg } = useOrganization();\n  const branding = currentOrg?.branding || {};");
  }

  if (file === 'components/Sidebar.tsx') {
    content = content.replace(/const \{ currentOrg \} = useOrganization\(\);\n  const branding = currentOrg\?\.branding \|\| \{\};/g, "");
    content = content.replace("export const Sidebar = () => {", "export const Sidebar = () => {\n  const { currentOrg } = useOrganization();\n  const branding = currentOrg?.branding || {};");
  }

  fs.writeFileSync(file, content);
});
