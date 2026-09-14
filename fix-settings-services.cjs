const fs = require('fs');
const file = 'src/pages/owner/Settings.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/formData\.services\.includes/g, "(formData.services || []).includes");
c = c.replace(/\[\.\.\.formData\.services,/g, "[...(formData.services || []),");
c = c.replace(/formData\.services\.filter/g, "(formData.services || []).filter");
c = c.replace(/formData\.services\.map/g, "(formData.services || []).map");

fs.writeFileSync(file, c);
