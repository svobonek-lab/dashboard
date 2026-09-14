const fs = require('fs');

let content = fs.readFileSync('features/LeadsKanban.tsx', 'utf8');

// The kanban definition
content = content.replace(
  "    { status: 'New', label: 'Nová poptávka', color: 'border-blue-200 bg-blue-50 text-blue-700', badgeColor: 'bg-blue-100 text-blue-700 border-blue-200' },",
  "    { status: 'New', label: 'Nová poptávka', color: 'border-border bg-surface-secondary text-brand-primary', badgeColor: 'bg-brand-primary-soft text-brand-primary border-brand-primary-soft' },"
);
content = content.replace(
  "    { status: 'In Progress', label: 'Realizace', color: 'border-purple-200 bg-purple-50 text-purple-700', badgeColor: 'bg-purple-100 text-purple-700 border-purple-200' },",
  "    { status: 'In Progress', label: 'Realizace', color: 'border-purple-200 bg-purple-50 text-purple-700', badgeColor: 'bg-purple-100 text-purple-700 border-purple-200' },"
);
// wait, for semantic states (like progress/success), maybe keep them? But let's use tokens where possible or keep semantic colors for Kanban (since kanban columns inherently have different semantic colors: new, contact, quote, progress, completed, lost).

// wait, the prompt says: "Never define colors inside pages."
// But it also says: "No hardcoded blue/slate/indigo. Replace everything."

fs.writeFileSync('features/LeadsKanban.tsx', content);
