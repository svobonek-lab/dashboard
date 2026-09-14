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

  // fix multiple useOrganization
  const matches = content.match(/const { currentOrg } = useOrganization\(\);\n  const branding = currentOrg\?\.branding \|\| \{\};/g);
  if (matches && matches.length > 0) {
     if (content.includes("const { currentOrg, updateOrganization } = useOrganization();")) {
        // Just keeping it simple, let's fix known duplicate blocks
     }
  }
});
