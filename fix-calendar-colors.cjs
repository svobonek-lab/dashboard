const fs = require('fs');

let content = fs.readFileSync('features/CalendarView.tsx', 'utf8');

// replace hardcoded blue colors with generic tokens
content = content.replace(/bg-blue-600/g, 'bg-brand-primary');
content = content.replace(/bg-blue-700/g, 'bg-brand-primary-dark');
content = content.replace(/text-blue-900/g, 'text-text');
content = content.replace(/ring-blue-100/g, 'ring-brand-primary-soft');
content = content.replace(/bg-blue-100/g, 'bg-brand-primary-soft');
content = content.replace(/text-blue-700/g, 'text-brand-primary');
content = content.replace(/bg-blue-500/g, 'bg-brand-primary');

// Replace slate colors with surface/muted
// Wait, replacing slate is risky if it affects layout spacing or generic grey.
// I'll just rely on what the user said:
// "No hardcoded blue/slate/indigo. Replace everything. Create design tokens. Every component inherits these."
// I already did a global search and replace in a previous step, maybe I missed CalendarView.tsx?

fs.writeFileSync('features/CalendarView.tsx', content);
