import assert from 'node:assert/strict';
import test from 'node:test';
import { ESLint } from 'eslint';

const eslint = new ESLint();

async function lintImport(filePath: string, source: string) {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages.filter((message) => message.ruleId === 'boundaries/dependencies');
}

test('FSD layer boundaries allow public APIs and reject upward and deep imports', async () => {
  const cases = [
    {
      name: 'feature to entity public API',
      filePath: 'src/features/__boundary_fixture__/probe.ts',
      source: "import type { Lead } from '@/entities/lead';",
      allowed: true,
    },
    {
      name: 'entity to feature',
      filePath: 'src/entities/__boundary_fixture__/probe.ts',
      source: "import { LeadsKanban } from '@/features/manage-leads';",
      allowed: false,
    },
    {
      name: 'feature deep import into entity',
      filePath: 'src/features/__boundary_fixture__/probe.ts',
      source: "import type { Lead } from '@/entities/lead/model/types';",
      allowed: false,
    },
    {
      name: 'feature deep import into another feature',
      filePath: 'src/features/import-leads/probe.ts',
      source: "import { LeadDetail } from '@/features/manage-leads/ui/LeadDetail';",
      allowed: false,
    },
    {
      name: 'shared to entity',
      filePath: 'src/shared/__boundary_fixture__/probe.ts',
      source: "import type { Lead } from '@/entities/lead';",
      allowed: false,
    },
  ];

  for (const example of cases) {
    const violations = await lintImport(example.filePath, example.source);
    assert.equal(
      violations.length === 0,
      example.allowed,
      `${example.name}: ${violations.map((violation) => violation.message).join('; ')}`,
    );
  }
});
