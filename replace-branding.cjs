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
  if (file.includes('useBranding.ts') || file.includes('replace-branding.js')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace import
  if (content.includes("import { useBranding } from '@/hooks/useBranding'")) {
    content = content.replace(/import \{ useBranding \} from '@\/hooks\/useBranding';?\n?/, '');
    changed = true;
  }
  if (content.includes("import { useBranding } from '../hooks/useBranding'")) {
    content = content.replace(/import \{ useBranding \} from '\.\.\/hooks\/useBranding';?\n?/, '');
    changed = true;
  }

  // Use OrganizationContext if needed
  if (changed && !content.includes("useOrganization")) {
    // Add import { useOrganization } from '@/context/OrganizationContext';
    if (content.includes("import React")) {
      content = content.replace("import React", "import { useOrganization } from '@/context/OrganizationContext';\nimport React");
    } else {
      content = "import { useOrganization } from '@/context/OrganizationContext';\n" + content;
    }
  }

  // Replace hook call
  if (content.includes("const { branding } = useBranding();")) {
    content = content.replace("const { branding } = useBranding();", "const { currentOrg } = useOrganization();\n  const branding = currentOrg?.branding || {};");
  }
  if (content.includes("const { branding, updateBranding } = useBranding();")) {
    content = content.replace("const { branding, updateBranding } = useBranding();", "const { currentOrg } = useOrganization();\n  const branding = currentOrg?.branding || {};\n  // updateBranding needs manual fix");
  }
  if (content.includes("const { branding, palette, brandStyles } = useBranding();")) {
    content = content.replace("const { branding, palette, brandStyles } = useBranding();", "const { currentOrg } = useOrganization();\n  const branding = currentOrg?.branding || {};");
  }
  if (content.includes("const { palette } = useBranding();")) {
    content = content.replace("const { palette } = useBranding();", "");
  }
  if (content.includes("const { palette, branding } = useBranding();")) {
    content = content.replace("const { palette, branding } = useBranding();", "const { currentOrg } = useOrganization();\n  const branding = currentOrg?.branding || {};");
  }
  if (content.includes("const { branding, palette } = useBranding();")) {
    content = content.replace("const { branding, palette } = useBranding();", "const { currentOrg } = useOrganization();\n  const branding = currentOrg?.branding || {};");
  }

  // Replace palette access with CSS vars
  content = content.replace(/palette\.primaryLight/g, "'var(--brand-primary-soft)'");
  content = content.replace(/palette\.primarySubtle/g, "'var(--brand-primary-soft)'");
  content = content.replace(/palette\.primaryBorder/g, "'var(--border)'");
  content = content.replace(/palette\.primary/g, "'var(--brand-primary)'");
  content = content.replace(/palette\.secondaryLight/g, "'var(--surface-tertiary)'");
  content = content.replace(/palette\.secondary/g, "'var(--muted)'");
  content = content.replace(/palette\.textOnPrimary/g, "'#ffffff'");
  content = content.replace(/palette\.primaryGlow/g, "'0 4px 14px 0 rgba(0,0,0,0.1)'");

  // Replace brandStyles access with generic classes or remove
  content = content.replace(/\{...brandStyles\.primaryButton\}/g, "className=\"bg-brand-primary text-white shadow-app hover:opacity-90 transition-opacity rounded-app px-4 py-2 font-bold\"");
  content = content.replace(/\{...brandStyles\.secondaryButton\}/g, "className=\"bg-brand-primary-soft text-brand-primary hover:opacity-90 transition-opacity rounded-app px-4 py-2 font-bold\"");

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
