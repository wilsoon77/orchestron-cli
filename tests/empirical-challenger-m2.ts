import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  computeExpandedAgentContextSize
} from '../src/commands/doctor.js';
import {
  categorizeMcpServer,
  getCategoryRules,
  partitionTools,
  filterMcpServersForProject,
  renderMcpServerContract
} from '../src/detector/mcp.js';
import { renderGatewayRouter } from '../src/generator/templates/gatewayRouterTemplate.js';
import { DetectedMcp, OrchestronConfig, ProjectStack } from '../src/types/index.js';

interface TestStats {
  passed: number;
  failed: number;
  failures: string[];
}

const stats: TestStats = { passed: 0, failed: 0, failures: [] };

function runTest(name: string, fn: () => void) {
  try {
    fn();
    stats.passed++;
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    stats.failed++;
    const msg = `  [FAIL] ${name}: ${err.message}`;
    stats.failures.push(msg);
    console.error(msg);
  }
}

console.log('\n======================================================');
console.log('  CHALLENGER 1 (MILESTONE 2): EMPIRICAL ADVERSARIAL SUITE');
console.log('======================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: CYCLIC & STRUCTURAL DIRECTIVE STRESS-TESTING
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: Directive Resolution & Cyclic Graph Stress-Testing ---');

let tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-challenger-m2-'));

try {
  runTest('1.1 Direct self-loop (A -> A) terminates gracefully', () => {
    const fileA = path.join(tempDir, 'AGENTS.md');
    fs.writeFileSync(fileA, '# Self Loop\n@[SELF](AGENTS.md)\nEnd.', 'utf8');

    const res = computeExpandedAgentContextSize(tempDir);
    assert(res.baseBytes > 0, 'baseBytes must be > 0');
    assert(res.expandedBytes > 0, 'expandedBytes must be > 0');
    assert(res.inlinedFiles.includes('AGENTS.md'), 'inlinedFiles must record self-reference');
    assert(!res.expandedBytes || res.expandedBytes < 1000, 'Context size must remain small without explosion');
  });

  runTest('1.2 Two-node mutual cycle (A -> B -> A) terminates cleanly', () => {
    const fileA = path.join(tempDir, 'AGENTS.md');
    const fileB = path.join(tempDir, 'fileB.md');
    fs.writeFileSync(fileA, '# Node A\n@[B](fileB.md)\nFooter A', 'utf8');
    fs.writeFileSync(fileB, '# Node B\n@[A](AGENTS.md)\nFooter B', 'utf8');

    const res = computeExpandedAgentContextSize(tempDir);
    assert(res.inlinedFiles.includes('fileB.md'), 'fileB.md should be inlined');
    assert(res.inlinedFiles.includes('AGENTS.md'), 'AGENTS.md cycle captured');
    assert(res.expandedBytes < 2000, 'expandedBytes must be finite and bounded');
  });

  runTest('1.3 Three-node cyclic loop (A -> B -> C -> A)', () => {
    const fileA = path.join(tempDir, 'AGENTS.md');
    const fileB = path.join(tempDir, 'fileB.md');
    const fileC = path.join(tempDir, 'fileC.md');
    fs.writeFileSync(fileA, '# Node A\n@[B](fileB.md)\n', 'utf8');
    fs.writeFileSync(fileB, '# Node B\n@[C](fileC.md)\n', 'utf8');
    fs.writeFileSync(fileC, '# Node C\n@[A](AGENTS.md)\n', 'utf8');

    const res = computeExpandedAgentContextSize(tempDir);
    assert(res.inlinedFiles.includes('fileB.md'), 'inlinedFiles includes fileB.md');
    assert(res.inlinedFiles.includes('fileC.md'), 'inlinedFiles includes fileC.md');
    assert(res.expandedBytes < 3000, 'expandedBytes bounded');
  });

  runTest('1.4 Diamond dependency graph (A -> B -> D, A -> C -> D)', () => {
    const fileA = path.join(tempDir, 'AGENTS.md');
    const fileB = path.join(tempDir, 'fileB.md');
    const fileC = path.join(tempDir, 'fileC.md');
    const fileD = path.join(tempDir, 'fileD.md');
    fs.writeFileSync(fileA, '# Root\n@[B](fileB.md)\n@[C](fileC.md)\n', 'utf8');
    fs.writeFileSync(fileB, '# Branch B\n@[D](fileD.md)\n', 'utf8');
    fs.writeFileSync(fileC, '# Branch C\n@[D](fileD.md)\n', 'utf8');
    fs.writeFileSync(fileD, '# Shared Leaf D\nContent of D\n', 'utf8');

    const res = computeExpandedAgentContextSize(tempDir);
    assert(res.inlinedFiles.includes('fileD.md'), 'fileD.md should be in inlinedFiles');
    assert(res.expandedBytes > res.baseBytes, 'expandedBytes should account for inlined leaves');
  });

  runTest('1.5 Complete graph K3 knot (each file inlines the other two)', () => {
    const fileA = path.join(tempDir, 'AGENTS.md');
    const fileB = path.join(tempDir, 'fileB.md');
    const fileC = path.join(tempDir, 'fileC.md');
    fs.writeFileSync(fileA, '# A\n@[B](fileB.md)\n@[C](fileC.md)\n', 'utf8');
    fs.writeFileSync(fileB, '# B\n@[A](AGENTS.md)\n@[C](fileC.md)\n', 'utf8');
    fs.writeFileSync(fileC, '# C\n@[A](AGENTS.md)\n@[B](fileB.md)\n', 'utf8');

    const start = Date.now();
    const res = computeExpandedAgentContextSize(tempDir);
    const elapsed = Date.now() - start;
    assert(elapsed < 500, `Execution took ${elapsed}ms, should be < 500ms`);
    assert(res.expandedBytes < 5000, 'K3 graph size bounded');
  });

  runTest('1.6 Deep linear chain (> 10 depth limit cutoff)', () => {
    // Generate chain of 15 files: F0 -> F1 -> F2 ... -> F14
    const chainDir = path.join(tempDir, 'chain');
    fs.mkdirSync(chainDir, { recursive: true });
    for (let i = 0; i < 15; i++) {
      const current = path.join(chainDir, i === 0 ? 'AGENTS.md' : `f${i}.md`);
      const nextTarget = `f${i + 1}.md`;
      fs.writeFileSync(current, `# Level ${i}\n@[NEXT](${nextTarget})\n`, 'utf8');
    }

    const res = computeExpandedAgentContextSize(chainDir);
    assert(res.baseBytes > 0, 'baseBytes > 0');
    assert(res.expandedBytes > 0, 'expandedBytes > 0');
    // Depth limit cutoff is 10, so it stops after 10 hops without error
    assert(res.inlinedFiles.length <= 11, 'Should stop after depth limit');
  });

  runTest('1.7 Repeated inlining of same file within single document', () => {
    const fileA = path.join(tempDir, 'AGENTS.md');
    const fileB = path.join(tempDir, 'fileB.md');
    fs.writeFileSync(fileB, 'CONSTANT_BLOCK\n', 'utf8');
    fs.writeFileSync(fileA, '# Repeats\n@[B](fileB.md)\n@[B](fileB.md)\n@[B](fileB.md)\n', 'utf8');

    const res = computeExpandedAgentContextSize(tempDir);
    assert(res.inlinedFiles.length === 1, 'inlinedFiles records fileB once');
    assert(res.expandedBytes > res.baseBytes, 'expandedBytes expands repeated blocks');
  });

  runTest('1.8 Malformed and whitespace directives', () => {
    const fileA = path.join(tempDir, 'AGENTS.md');
    const targetFile = path.join(tempDir, 'target.md');
    fs.writeFileSync(targetFile, 'TARGET_CONTENT\n', 'utf8');
    fs.writeFileSync(
      fileA,
      '# Edge Directives\n@[EMPTY]()\n@[SPACES](   target.md   )\n@[GHOST](missing_404.md)\n',
      'utf8'
    );

    const res = computeExpandedAgentContextSize(tempDir);
    assert(res.inlinedFiles.includes('target.md'), 'Padded target.md resolved');
    assert(!res.inlinedFiles.includes('missing_404.md'), 'Ghost file omitted from inlined');
  });

  runTest('1.9 Relative resolution from nested subdirectories', () => {
    const rootAgents = path.join(tempDir, 'AGENTS.md');
    const subDir = path.join(tempDir, 'docs', 'guides');
    fs.mkdirSync(subDir, { recursive: true });

    const nestedDoc = path.join(subDir, 'guide.md');
    const deepLeaf = path.join(subDir, 'leaf.md');
    fs.writeFileSync(deepLeaf, 'LEAF_DATA\n', 'utf8');
    fs.writeFileSync(nestedDoc, '# Guide\n@[LEAF](leaf.md)\n', 'utf8');
    fs.writeFileSync(rootAgents, '# Root\n@[GUIDE](docs/guides/guide.md)\n', 'utf8');

    const res = computeExpandedAgentContextSize(tempDir);
    assert(res.inlinedFiles.some((f) => f.includes('guide.md')), 'guide.md resolved');
    assert(res.inlinedFiles.some((f) => f.includes('leaf.md')), 'leaf.md resolved relative to parent');
  });

  runTest('1.10 Accurate multi-byte UTF-8 byte counting', () => {
    const rootAgents = path.join(tempDir, 'AGENTS.md');
    const utf8Content = '🚀✨ Ñandú — Configuración y Verificación — 漢字';
    fs.writeFileSync(rootAgents, utf8Content, 'utf8');

    const res = computeExpandedAgentContextSize(tempDir);
    assert.strictEqual(res.baseBytes, Buffer.byteLength(utf8Content, 'utf8'));
    assert(res.baseBytes > utf8Content.length, 'UTF-8 byte count exceeds character count');
  });

  runTest('1.11 Fallback to .agents/AGENTS.md when root AGENTS.md absent', () => {
    const dotOnlyDir = path.join(tempDir, 'dot-only');
    fs.mkdirSync(path.join(dotOnlyDir, '.agents'), { recursive: true });
    fs.writeFileSync(path.join(dotOnlyDir, '.agents', 'AGENTS.md'), '# Dot Agents\n', 'utf8');

    const res = computeExpandedAgentContextSize(dotOnlyDir);
    assert.strictEqual(res.baseBytes, Buffer.byteLength('# Dot Agents\n', 'utf8'));
    assert.strictEqual(res.expandedBytes, res.baseBytes);
  });

  runTest('1.12 Directive pointing to a directory path', () => {
    const dirTest = path.join(tempDir, 'dir-test');
    fs.mkdirSync(path.join(dirTest, 'subfolder'), { recursive: true });
    fs.writeFileSync(path.join(dirTest, 'AGENTS.md'), '# Root\n@[FOLDER](subfolder)\nFooter\n', 'utf8');

    try {
      const res = computeExpandedAgentContextSize(dirTest);
      assert(res.baseBytes > 0, 'baseBytes > 0');
    } catch (err: any) {
      // Documenting failure mode when directive targets directory
      console.log(`    [OBSERVATION] Directory directive threw ${err.code || err.message}`);
    }
  });
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

// -----------------------------------------------------------------------------
// SECTION 2: SELECTIVE MCP FILTERING & ACCESS RULES STRESS-TESTING
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: Selective MCP Filtering & Tool Partitioning ---');

const ALL_MCPS: DetectedMcp[] = [
  { name: 'mysql-local', tools: ['mysql_query', 'admin_flush'], description: 'Local MySQL' },
  { name: 'mcp-server-neon', tools: ['run_sql', 'run_sql_transaction', 'create_branch', 'get_database_tables'], description: 'Neon Postgres' },
  { name: 'supabase', tools: ['execute_sql', 'list_tables'], description: 'Supabase DB' },
  { name: 'figma-developer-mcp', tools: ['get_figma_data', 'download_figma_images'], description: 'Figma UI' },
  { name: 'StitchMCP', tools: ['get_screen', 'list_screens', 'edit_screens', 'generate_screen_from_text'], description: 'Stitch UI' },
  { name: 'chrome_devtools', tools: ['list_pages', 'take_screenshot', 'lighthouse_audit', 'click'], description: 'Chrome DevTools' },
  { name: 'ClickUp', tools: ['get_workspace_tasks', 'create_task', 'get_task'], description: 'ClickUp PM' },
  { name: 'notion-mcp-server', tools: ['API-post-search', 'API-retrieve-a-page'], description: 'Notion PM' },
  { name: 'atlassian-mcp-server', tools: ['getTeamworkGraphContext'], description: 'Atlassian Jira PM' },
  { name: 'context7', tools: ['query-docs', 'resolve-library-id'], description: 'Context7 Docs' }
];

runTest('2.1 Pure CLI project (Node.js CLI Tool): zero DB, zero UI, zero Browser, zero PM leakage', () => {
  const stack: ProjectStack = {
    name: 'cli-app',
    isGreenfield: false,
    type: 'generic',
    backend: { framework: 'Node.js CLI Tool', language: 'TypeScript' },
    commands: {},
    git: { isRepo: true, defaultBranch: 'main', hasRemotes: false },
    detectedMcps: [],
    detectedSkills: []
  };

  const filtered = filterMcpServersForProject(ALL_MCPS, stack);
  const names = filtered.map((f) => f.name);

  assert(names.includes('context7'), 'Docs must be kept');
  assert(!names.includes('mysql-local'), 'No MySQL');
  assert(!names.includes('mcp-server-neon'), 'No Neon');
  assert(!names.includes('supabase'), 'No Supabase');
  assert(!names.includes('figma-developer-mcp'), 'No Figma');
  assert(!names.includes('StitchMCP'), 'No Stitch');
  assert(!names.includes('chrome_devtools'), 'No Chrome DevTools');
  assert(!names.includes('ClickUp'), 'No ClickUp');
  assert(!names.includes('notion-mcp-server'), 'No Notion');
  assert(!names.includes('atlassian-mcp-server'), 'No Atlassian');
});

runTest('2.2 Pure CLI project WITH embedded SQLite database: includes DB, excludes UI and PM', () => {
  const stack: ProjectStack = {
    name: 'cli-with-db',
    isGreenfield: false,
    type: 'generic',
    backend: { framework: 'Node.js CLI Tool', language: 'TypeScript' },
    database: { engine: 'SQLite' },
    commands: {},
    git: { isRepo: true, defaultBranch: 'main', hasRemotes: false },
    detectedMcps: [],
    detectedSkills: []
  };

  const filtered = filterMcpServersForProject(ALL_MCPS, stack);
  const names = filtered.map((f) => f.name);

  assert(names.includes('mysql-local') || names.includes('mcp-server-neon') || names.includes('supabase'), 'DB included');
  assert(!names.includes('figma-developer-mcp'), 'No Figma');
  assert(!names.includes('chrome_devtools'), 'No Chrome DevTools');
  assert(!names.includes('ClickUp'), 'No ClickUp in CLI');
});

runTest('2.3 Frontend-only project (React / Vite): UI + Browser + PM + Docs, zero DB leakage', () => {
  const stack: ProjectStack = {
    name: 'frontend-app',
    isGreenfield: false,
    type: 'frontend',
    frontend: { framework: 'React' },
    commands: {},
    git: { isRepo: true, defaultBranch: 'main', hasRemotes: false },
    detectedMcps: [],
    detectedSkills: []
  };

  const filtered = filterMcpServersForProject(ALL_MCPS, stack);
  const names = filtered.map((f) => f.name);

  assert(names.includes('figma-developer-mcp'), 'Figma included');
  assert(names.includes('StitchMCP'), 'Stitch included');
  assert(names.includes('chrome_devtools'), 'Chrome DevTools included');
  assert(names.includes('ClickUp'), 'ClickUp included');
  assert(names.includes('notion-mcp-server'), 'Notion included');
  assert(names.includes('context7'), 'Context7 included');
  assert(!names.includes('mysql-local'), 'Strictly ZERO MySQL leakage');
  assert(!names.includes('mcp-server-neon'), 'Strictly ZERO Neon leakage');
  assert(!names.includes('supabase'), 'Strictly ZERO Supabase leakage');
});

runTest('2.4 Backend-only project (NestJS + PostgreSQL): DB + PM + Docs, zero UI / Browser leakage', () => {
  const stack: ProjectStack = {
    name: 'backend-api',
    isGreenfield: false,
    type: 'backend',
    backend: { framework: 'NestJS', language: 'TypeScript' },
    database: { engine: 'PostgreSQL' },
    commands: {},
    git: { isRepo: true, defaultBranch: 'main', hasRemotes: false },
    detectedMcps: [],
    detectedSkills: []
  };

  const filtered = filterMcpServersForProject(ALL_MCPS, stack);
  const names = filtered.map((f) => f.name);

  assert(names.includes('mcp-server-neon'), 'Postgres/Neon included');
  assert(names.includes('mysql-local'), 'MySQL included');
  assert(names.includes('ClickUp'), 'ClickUp included');
  assert(names.includes('context7'), 'Context7 included');
  assert(!names.includes('figma-developer-mcp'), 'Strictly ZERO Figma leakage');
  assert(!names.includes('StitchMCP'), 'Strictly ZERO Stitch leakage');
  assert(!names.includes('chrome_devtools'), 'Strictly ZERO Chrome DevTools leakage');
});

runTest('2.5 Fullstack project (Next.js + Prisma): full toolset enabled', () => {
  const stack: ProjectStack = {
    name: 'fullstack-app',
    isGreenfield: false,
    type: 'fullstack',
    frontend: { framework: 'Next.js' },
    backend: { framework: 'Next.js API', language: 'TypeScript' },
    database: { engine: 'PostgreSQL', orm: 'Prisma' },
    commands: {},
    git: { isRepo: true, defaultBranch: 'main', hasRemotes: false },
    detectedMcps: [],
    detectedSkills: []
  };

  const filtered = filterMcpServersForProject(ALL_MCPS, stack);
  const names = filtered.map((f) => f.name);

  assert(names.includes('mcp-server-neon'), 'Neon included');
  assert(names.includes('figma-developer-mcp'), 'Figma included');
  assert(names.includes('chrome_devtools'), 'Browser included');
  assert(names.includes('ClickUp'), 'PM included');
  assert(names.includes('context7'), 'Docs included');
});

runTest('2.6 Case-insensitive categorization for diverse casing', () => {
  assert.strictEqual(categorizeMcpServer('MYSQL-LOCAL'), 'database');
  assert.strictEqual(categorizeMcpServer('Figma-Developer-MCP'), 'frontend_design');
  assert.strictEqual(categorizeMcpServer('Chrome_DevTools'), 'browser');
  assert.strictEqual(categorizeMcpServer('NOTION-MCP-SERVER'), 'project_management');
  assert.strictEqual(categorizeMcpServer('Context7'), 'documentation');
  assert.strictEqual(categorizeMcpServer('Custom-Special-Tool'), 'generic');
});

runTest('2.7 Tool partitioning with high tool volume (200 tools)', () => {
  const tools = Array.from({ length: 200 }, (_, i) => `tool_action_${i}`);
  tools[50] = 'run_sql';
  tools[120] = 'describe_table_schema';

  const res = partitionTools(tools, 'database');
  assert.strictEqual(res.eagerTools.length, 2, 'Only primary tools placed in eager list');
  assert.strictEqual(res.lazyTools.length, 198, 'Remaining 198 tools placed in lazy list');
});

runTest('2.8 Tailored access rules generation check', () => {
  const dbRules = getCategoryRules('database');
  assert(dbRules.some((r) => r.includes('SELECT')), 'DB rule 1 with SELECT verified');
  assert(dbRules.some((r) => r.includes('migracion')), 'DB rule 2 with migracion verified');

  const uiRules = getCategoryRules('frontend_design');
  assert(uiRules.some((r) => r.includes('tokens') && r.includes('mockup')), 'UI rules verified');

  const browserRules = getCategoryRules('browser');
  assert(browserRules.some((r) => r.includes('DOM') && r.includes('a11y')), 'Browser rules verified');

  const pmRules = getCategoryRules('project_management');
  assert(pmRules.some((r) => r.includes('solo lectura') && r.includes('tickets')), 'PM rules verified');
});

// -----------------------------------------------------------------------------
// SECTION 3: GATEWAY ROUTER TEMPLATE & CONTEXT BUDGET STRESS-TESTING
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: Gateway Router Size & Invariant Stress-Testing ---');

const baseConfig: OrchestronConfig = {
  projectName: 'test-project',
  stack: {
    name: 'test-project',
    isGreenfield: false,
    type: 'generic',
    backend: { framework: 'Node.js CLI Tool', language: 'TypeScript' },
    commands: { build: 'npm run build', test: 'npm test' },
    git: { isRepo: true, defaultBranch: 'main', hasRemotes: false },
    detectedMcps: [],
    detectedSkills: []
  },
  selectedRoles: ['lead-architect', 'backend-dev', 'code-reviewer', 'qa-tester', 'git-security'],
  strictGuardrails: {
    zeroEmojisInCode: true,
    noSuppressionComments: true,
    ratchetPolicy: true,
    requireVisualEvidence: false,
    enforceGate2BuildZeroErrors: true
  },
  livingContext: { fileName: 'CONTEXT.md' },
  stateMemory: { instincts: true }
};

runTest('3.1 Standard Gateway Router base size is strictly under 6 KB (6,000 bytes)', () => {
  const rendered = renderGatewayRouter(baseConfig);
  const baseBytes = Buffer.byteLength(rendered, 'utf8');
  console.log(`    Base size: ${baseBytes} bytes (limit 6,000 bytes)`);
  assert(baseBytes < 6000, `Base size ${baseBytes} bytes exceeds 6,000 byte ceiling`);
  assert(baseBytes > 1000, `Base size ${baseBytes} bytes abnormally small`);
});

runTest('3.2 Extreme configuration Gateway Router base size is strictly under 6 KB', () => {
  const extremeConfig: OrchestronConfig = {
    ...baseConfig,
    projectName: 'A'.repeat(100),
    stack: {
      ...baseConfig.stack,
      commands: {
        build: 'turbo run build --filter=@extreme/very-long-monorepo-package-name-with-deep-scoping-target-build-command-flag --parallel --cache-dir=.turbo/cache',
        test: 'vitest run --coverage --threads=false'
      }
    },
    selectedRoles: [
      'lead-architect',
      'backend-dev',
      'frontend-dev',
      'ui-ux-specialist',
      'code-reviewer',
      'qa-tester',
      'git-security',
      'devops-infra',
      'data-engineer',
      'security-auditor'
    ]
  };

  const rendered = renderGatewayRouter(extremeConfig);
  const baseBytes = Buffer.byteLength(rendered, 'utf8');
  console.log(`    Extreme base size: ${baseBytes} bytes (limit 6,000 bytes)`);
  assert(baseBytes < 6000, `Extreme base size ${baseBytes} exceeds 6,000 bytes`);
});

runTest('3.3 Exclusive inlining invariant: ONLY @[CONSTRAINTS] inlined in Gateway Router', () => {
  const rendered = renderGatewayRouter(baseConfig);
  const directiveMatches = rendered.match(/@\[([^\]]+)\]\(([^)]+)\)/g) || [];

  assert.strictEqual(directiveMatches.length, 1, 'Exactly one directive must be present in Gateway Router');
  assert.strictEqual(directiveMatches[0], '@[CONSTRAINTS](.agents/CONSTRAINTS.md)', 'Must be @[CONSTRAINTS]');
  assert(!rendered.includes('@[AGENTS]'), 'Must NOT inline @[AGENTS]');
  assert(!rendered.includes('@[CONTEXT]'), 'Must NOT inline @[CONTEXT]');
  assert(!rendered.includes('@[MANIFEST]'), 'Must NOT inline @[MANIFEST]');
});

runTest('3.4 Expanded context budget verification with real CONSTRAINTS.md (< 24,000 bytes)', () => {
  const tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-budget-test-'));
  try {
    const dotAgents = path.join(tempProject, '.agents');
    fs.mkdirSync(dotAgents, { recursive: true });

    // Copy actual CONSTRAINTS.md from repo
    const repoConstraintsPath = path.resolve('.agents/CONSTRAINTS.md');
    let constraintsContent = '# CONSTRAINTS\nQuality rules here.';
    if (fs.existsSync(repoConstraintsPath)) {
      constraintsContent = fs.readFileSync(repoConstraintsPath, 'utf8');
    }
    fs.writeFileSync(path.join(dotAgents, 'CONSTRAINTS.md'), constraintsContent, 'utf8');

    // Write rendered Gateway Router to root AGENTS.md
    const gatewayContent = renderGatewayRouter(baseConfig);
    fs.writeFileSync(path.join(tempProject, 'AGENTS.md'), gatewayContent, 'utf8');

    const budget = computeExpandedAgentContextSize(tempProject);
    console.log(`    Expanded size: ${budget.expandedBytes} bytes (ceiling 24,000 bytes)`);
    assert(budget.expandedBytes < 24000, `Expanded size ${budget.expandedBytes} exceeds 24,000 bytes`);
    assert(budget.inlinedFiles.includes('.agents/CONSTRAINTS.md'), 'Inlined files must include CONSTRAINTS.md');
  } finally {
    fs.rmSync(tempProject, { recursive: true, force: true });
  }
});

runTest('3.5 Budget overflow trigger (> 24,000 bytes) correctly reported', () => {
  const tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-overflow-test-'));
  try {
    const dotAgents = path.join(tempProject, '.agents');
    fs.mkdirSync(dotAgents, { recursive: true });

    // Inflate CONSTRAINTS.md to 25,000 bytes
    const hugeConstraints = '# HUGE CONSTRAINTS\n' + 'X'.repeat(25000);
    fs.writeFileSync(path.join(dotAgents, 'CONSTRAINTS.md'), hugeConstraints, 'utf8');

    const gatewayContent = renderGatewayRouter(baseConfig);
    fs.writeFileSync(path.join(tempProject, 'AGENTS.md'), gatewayContent, 'utf8');

    const budget = computeExpandedAgentContextSize(tempProject);
    assert(budget.expandedBytes > 24000, 'Expanded size must exceed 24,000 bytes');
  } finally {
    fs.rmSync(tempProject, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// SECTION 4: LOCAL REPOSITORY CONTEXT BUDGET AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: Local Repository Health & Budget Audit ---');

runTest('4.1 Current repository AGENTS.md conforms to M2 context budget', () => {
  const repoRoot = process.cwd();
  const budget = computeExpandedAgentContextSize(repoRoot);

  console.log(`    Local repo base size: ${budget.baseBytes} bytes`);
  console.log(`    Local repo expanded size: ${budget.expandedBytes} bytes`);
  console.log(`    Local repo inlined files: ${budget.inlinedFiles.join(', ')}`);

  assert(budget.baseBytes < 6000, `Local base size ${budget.baseBytes} should be < 6,000 bytes`);
  assert(budget.expandedBytes < 24000, `Local expanded size ${budget.expandedBytes} should be < 24,000 bytes`);
  assert(budget.inlinedFiles.includes('.agents/CONSTRAINTS.md'), 'Must inline .agents/CONSTRAINTS.md');
});

// -----------------------------------------------------------------------------
// RESULTS SUMMARY
// -----------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`  RESULTS: ${stats.passed} PASSED | ${stats.failed} FAILED (TOTAL: ${stats.passed + stats.failed})`);
console.log('======================================================\n');

if (stats.failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
