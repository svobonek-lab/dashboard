const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('.git')) {
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) { 
        results = results.concat(walk(file));
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('.');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // fix Glow
  if (content.includes("'var(--brand-primary)'Glow")) {
    content = content.replace(/'var\(--brand-primary\)'Glow/g, "'0 4px 14px 0 rgba(0,0,0,0.1)'");
    changed = true;
  }
  
  // fix duplicated useOrganization in App.tsx
  if (file.includes('App.tsx') && content.includes('const { currentOrg } = useOrganization();\n  const branding = currentOrg?.branding || {};\n  // updateBranding needs manual fix')) {
     content = content.replace('const { currentOrg } = useOrganization();\n  const branding = currentOrg?.branding || {};\n  // updateBranding needs manual fix', '');
     // But wait, branding is still used in App.tsx, we need it.
     content = content.replace('const { \n    isConfigured', 'const { currentOrg, updateBrandingAdmin, isConfigured');
     content = content.replace('generateRealisticLeads(branding)', 'generateRealisticLeads(currentOrg?.branding || {})');
     content = content.replace('branding?.name', 'currentOrg?.name');
     content = content.replace('branding?.logoUrl', 'currentOrg?.branding?.logoUrl');
     content = content.replace(/branding/g, '(currentOrg?.branding || {})');
     changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
