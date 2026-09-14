const fs = require('fs');

const file1 = 'src/layouts/OwnerLayout.tsx';
let c1 = fs.readFileSync(file1, 'utf8');
c1 = c1.replace(/const \{ branding, updateBranding, palette, brandStyles \} = useBranding\(\);/g, "const { currentOrg, updateBrandingAdmin } = useOrganization();\n  const branding = currentOrg?.branding || {};");
c1 = c1.replace(/import \{ useBranding \} from '..\/hooks\/useBranding';\n/g, "");
// also fix updateBranding usages to updateBrandingAdmin
c1 = c1.replace(/updateBranding\(/g, "updateBrandingAdmin(currentOrg?.id || '', ");
fs.writeFileSync(file1, c1);

const file2 = 'src/pages/owner/Settings.tsx';
let c2 = fs.readFileSync(file2, 'utf8');
c2 = c2.replace(/const \{ branding, updateBranding, resetToDefault \} = useBranding\(\);/g, "const { currentOrg, updateBrandingAdmin } = useOrganization();\n  const branding = currentOrg?.branding || {};");
c2 = c2.replace(/import \{ useBranding \} from '..\/..\/hooks\/useBranding';\n/g, "");
c2 = c2.replace(/updateBranding\(\{/g, "updateBrandingAdmin(currentOrg?.id || '', { branding: { ...branding, ");
c2 = c2.replace(/resetToDefault\(\)/g, "updateBrandingAdmin(currentOrg?.id || '', { branding: {} })");
// Let's see if there are other syntax errors introduced.
fs.writeFileSync(file2, c2);

