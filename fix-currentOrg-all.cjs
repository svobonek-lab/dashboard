const fs = require('fs');

['components/LoginPage.tsx', 'components/Sidebar.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(", currentOrg, ", ", ");
  content = content.replace("currentOrg, ", "");
  fs.writeFileSync(file, content);
});
