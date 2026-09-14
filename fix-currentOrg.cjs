const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// replace the destructured currentOrg,
content = content.replace("    currentOrg, \n", "");

fs.writeFileSync('src/App.tsx', content);
