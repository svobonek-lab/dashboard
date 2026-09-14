const fs = require('fs');

const file1 = 'features/CommunicationCenterPage.tsx';
let c1 = fs.readFileSync(file1, 'utf8');

c1 = c1.replace(/branding\.name/g, "(branding?.name || 'Firma')");
fs.writeFileSync(file1, c1);

const file2 = 'features/EmbedWidgetPage.tsx';
let c2 = fs.readFileSync(file2, 'utf8');

c2 = c2.replace(/branding\.name/g, "(branding?.name || 'Firma')");
fs.writeFileSync(file2, c2);

