import tsParser from '@typescript-eslint/parser';
import boundaries from 'eslint-plugin-boundaries';

const layers = [
  { type: 'app', pattern: 'src/app/**' },
  { type: 'pages', pattern: 'src/pages/*/**', capture: ['slice'] },
  { type: 'widgets', pattern: 'src/widgets/*/**', capture: ['slice'] },
  { type: 'features', pattern: 'src/features/*/**', capture: ['slice'] },
  { type: 'entities', pattern: 'src/entities/*/**', capture: ['slice'] },
  { type: 'shared', pattern: 'src/shared/**' },
];

const publicApi = { file: { categories: 'public' } };
const sameSlice = (type) => ({
  element: {
    type,
    captured: { slice: '{{ from.element.captured.slice }}' },
  },
});
const rules = [
  ...['pages', 'widgets', 'features', 'entities'].map((type) => ({
    from: { element: { type } },
      allow: [{ to: sameSlice(type) }],
  })),
  {
    from: { element: { type: 'app' } },
    allow: [{ to: { element: { type: 'app' } } }],
  },
  {
    from: { element: { type: 'shared' } },
    allow: [{ to: { element: { type: 'shared' } } }],
  },
];

const allowedLayers = {
  app: ['pages', 'widgets', 'features', 'entities'],
  pages: ['widgets', 'features', 'entities'],
  widgets: ['features', 'entities'],
  features: ['entities'],
  entities: [],
  shared: [],
};

for (const [from, targets] of Object.entries(allowedLayers)) {
  for (const to of targets) {
    rules.push({
      from: { element: { type: from } },
      allow: [{ to: { element: { type: to }, ...publicApi } }],
    });
  }
  if (from !== 'shared') {
    rules.push({
      from: { element: { type: from } },
      allow: [{ to: { element: { type: 'shared' } } }],
    });
  }
}

for (const type of ['pages', 'widgets', 'features', 'entities']) {
  rules.push({
    from: { element: { type } },
    allow: [{ to: { element: { type }, ...publicApi } }],
  });
}

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
      'boundaries/root-path': process.cwd(),
      'boundaries/include': ['src/**/*.{ts,tsx}'],
      'boundaries/elements': layers,
      'boundaries/files': [{ pattern: 'src/**/index.ts', category: 'public' }],
      'boundaries/flag-as-external': {
        unresolvableAlias: false,
      },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkUnknownLocals: true,
          checkInternals: true,
          policies: rules.map(({ from, allow }) => ({ from, allow })),
        },
      ],
    },
  },
];
