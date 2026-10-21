import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { OrchestronConfig, ProjectStack } from '../src/types/index.js';
import {
  renderBackendRule,
  renderFrontendRule,
  renderDatabaseRule,
  renderSecurityRule,
  exportToCursorRule
} from '../src/generator/templates/rulesTemplates.js';
import {
  renderArchitectSubagent,
  renderBackendSubagent,
  renderFrontendSubagent,
  renderUiUxSubagent,
  renderReviewerSubagent,
  renderQaSubagent,
  renderSecuritySubagent,
  renderDevopsSubagent,
  SUBAGENT_PLATFORMS,
  buildFrontmatter
} from '../src/generator/templates/subagentsTemplate.js';
import {
  getCursorRulesDefinitions,
  renderCursorRuleFile,
  stripExistingFrontmatter
} from '../src/generator/templates/cursorRulesTemplate.js';
import {
  migrateLegacySubagents,
  injectSubagentFrontmatter,
  detectExistingRoles
} from '../src/commands/update.js';
import { generateOrchestronFiles } from '../src/generator/engine.js';
import { execSync } from 'child_process';

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

function parseFrontmatterSimple(content: string): { frontmatter: Record<string, string>; body: string } {
  assert(content.startsWith('---'), 'Content does not start with ---');
  const secondIndex = content.indexOf('\n---', 3);
  assert(secondIndex !== -1, 'Closing --- delimiter not found');
  const frontmatterStr = content.slice(3, secondIndex).trim();
  const body = content.slice(secondIndex + 4).trim();

  const data: Record<string, string> = {};
  for (const line of frontmatterStr.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colon = trimmed.indexOf(':');
    if (colon > 0) {
      const key = trimmed.slice(0, colon).trim();
      let val = trimmed.slice(colon + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      data[key] = val;
    }
  }
  return { frontmatter: data, body };
}

function createDummyConfig(overrides: Partial<OrchestronConfig> = {}): OrchestronConfig {
  const baseStack: ProjectStack = {
    type: 'fullstack',
    backend: {
      framework: 'Express',
      language: 'TypeScript',
      directory: 'src/server'
    },
    frontend: {
      framework: 'React',
      language: 'TypeScript',
      uiLibrary: 'Tailwind CSS',
      directory: 'src/client'
    },
    database: {
      engine: 'PostgreSQL',
      orm: 'Prisma'
    },
    commands: {
      build: 'npm run build',
      test: 'npm test',
      dev: 'npm run dev',
      lint: 'npm run lint'
    },
    git: {
      isRepo: true,
      defaultBranch: 'main'
    }
  };

  return {
    projectName: 'test-harness-project',
    stack: baseStack,
    selectedRoles: [
      'lead-architect',
      'backend-dev',
      'frontend-dev',
      'ui-ux-specialist',
      'code-reviewer',
      'qa-tester',
      'git-security',
      'devops-infra'
    ],
    qualityGatesLevel: 'strict',
    strictGuardrails: {
      zeroEmojisInCode: true,
      protectSecrets: true,
      requirePlanApproval: true,
      requireCompileGate: true,
      atomicGitBranches: true
    },
    livingContext: {
      enabled: true,
      fileName: 'CONTEXT.md'
    },
    encapsulation: {
      folder: '.agents',
      generateRootPointer: true,
      generateClaudeMdCompat: true,
      generateCursorRulesCompat: true
    },
    ...overrides
  };
}

console.log('Starting Empirical Adversarial Challenge Harness for Milestone 1...');

// =========================================================================
// Area 1: YAML Frontmatter in Modular Rules (Feature 1)
// =========================================================================
console.log('\n--- Vector 1: Rules YAML Frontmatter & Multi-Stack Adaptability ---');

runTest('R1.1: Backend rule frontmatter parses and contains trigger: glob + globs + description', () => {
  const cfg = createDummyConfig();
  const rule = renderBackendRule(cfg);
  const { frontmatter } = parseFrontmatterSimple(rule);
  assert.strictEqual(frontmatter.trigger, 'glob');
  assert(frontmatter.globs, 'globs must be present');
  assert(frontmatter.description, 'description must be present');
  const parsedGlobs = frontmatter.globs.split(',').map((s) => s.trim());
  assert(Array.isArray(parsedGlobs), 'globs must be an array');
  assert(parsedGlobs.includes('src/server/**'), 'custom directory must be prefixed');
});

runTest('R1.2: Backend rule adapts globs across diverse stacks (Java, Python, Go)', () => {
  const javaCfg = createDummyConfig({
    stack: {
      type: 'backend',
      backend: { framework: 'Spring Boot', language: 'Java' },
      commands: {}
    }
  });
  const javaGlobs = parseFrontmatterSimple(renderBackendRule(javaCfg)).frontmatter.globs.split(',').map((s) => s.trim());
  assert(javaGlobs.includes('**/*.java'), 'Java globs missing **/*.java');
  assert(javaGlobs.includes('**/pom.xml'), 'Java globs missing **/pom.xml');

  const pyCfg = createDummyConfig({
    stack: {
      type: 'backend',
      backend: { framework: 'FastAPI', language: 'Python' },
      commands: {}
    }
  });
  const pyGlobs = parseFrontmatterSimple(renderBackendRule(pyCfg)).frontmatter.globs.split(',').map((s) => s.trim());
  assert(pyGlobs.includes('**/*.py'), 'Python globs missing **/*.py');

  const goCfg = createDummyConfig({
    stack: {
      type: 'backend',
      backend: { framework: 'Gin', language: 'Go' },
      commands: {}
    }
  });
  const goGlobs = parseFrontmatterSimple(renderBackendRule(goCfg)).frontmatter.globs.split(',').map((s) => s.trim());
  assert(goGlobs.includes('**/*.go'), 'Go globs missing **/*.go');
});

runTest('R1.3: Frontend rule adapts globs across diverse frameworks (Angular, Vue, React)', () => {
  const angularCfg = createDummyConfig({
    stack: {
      type: 'frontend',
      frontend: { framework: 'Angular' },
      commands: {}
    }
  });
  const angGlobs = parseFrontmatterSimple(renderFrontendRule(angularCfg)).frontmatter.globs.split(',').map((s) => s.trim());
  assert(angGlobs.includes('**/*.ts') && angGlobs.includes('**/*.html'), 'Angular globs incorrect');

  const vueCfg = createDummyConfig({
    stack: {
      type: 'frontend',
      frontend: { framework: 'Vue.js' },
      commands: {}
    }
  });
  const vueGlobs = parseFrontmatterSimple(renderFrontendRule(vueCfg)).frontmatter.globs.split(',').map((s) => s.trim());
  assert(vueGlobs.includes('**/*.vue'), 'Vue globs missing **/*.vue');
});

runTest('R1.4: Database rule includes Prisma or Dump files when configured', () => {
  const prismaCfg = createDummyConfig({
    stack: {
      type: 'backend',
      database: { engine: 'PostgreSQL', orm: 'Prisma' },
      commands: {}
    }
  });
  const prismaGlobs = parseFrontmatterSimple(renderDatabaseRule(prismaCfg)).frontmatter.globs.split(',').map((s) => s.trim());
  assert(prismaGlobs.includes('**/schema.prisma'), 'Prisma schema missing from database globs');

  const dumpCfg = createDummyConfig({
    stack: {
      type: 'backend',
      database: { engine: 'MySQL', hasDump: true, dumpFile: 'db/schema.sql' },
      commands: {}
    }
  });
  const dumpGlobs = parseFrontmatterSimple(renderDatabaseRule(dumpCfg)).frontmatter.globs.split(',').map((s) => s.trim());
  assert(dumpGlobs.includes('db/schema.sql'), 'Dump file missing from database globs');
});

runTest('R1.5: Security rule enforces trigger: model_decision and targets sensitive files', () => {
  const cfg = createDummyConfig();
  const sec = renderSecurityRule(cfg);
  const { frontmatter } = parseFrontmatterSimple(sec);
  assert.strictEqual(frontmatter.trigger, 'model_decision');
  const secGlobs = frontmatter.globs.split(',').map((s) => s.trim());
  assert(secGlobs.includes('**/.env*'), 'Security globs must protect .env* files');
});

runTest('R1.6: exportToCursorRule converts Antigravity rule to valid Cursor MDC format', () => {
  const cfg = createDummyConfig();
  const backendRule = renderBackendRule(cfg);
  const mdc = exportToCursorRule(backendRule, { alwaysApply: false });
  const { frontmatter, body } = parseFrontmatterSimple(mdc);
  assert(frontmatter.description, 'MDC description must exist');
  assert(frontmatter.globs, 'MDC globs must exist');
  assert.strictEqual(frontmatter.alwaysApply, 'false');
  assert(body.includes('# Directiva de Backend'), 'Body must be preserved without original frontmatter');
  assert(!body.startsWith('---'), 'Body must not contain double frontmatter');
});

// =========================================================================
// Area 2: Subagents Frontmatter for Antigravity (Feature 2)
// =========================================================================
console.log('\n--- Vector 2: Google Antigravity Subagents Frontmatter ---');

const allSubagentRenderers = [
  { id: 'lead-architect', render: renderArchitectSubagent },
  { id: 'backend-dev', render: renderBackendSubagent },
  { id: 'frontend-dev', render: renderFrontendSubagent },
  { id: 'ui-ux-specialist', render: renderUiUxSubagent },
  { id: 'code-reviewer', render: renderReviewerSubagent },
  { id: 'qa-tester', render: renderQaSubagent },
  { id: 'git-security', render: renderSecuritySubagent },
  { id: 'devops-infra', render: renderDevopsSubagent }
];

for (const sub of allSubagentRenderers) {
  runTest(`R2: Subagent [${sub.id}] contains valid Antigravity frontmatter`, () => {
    const cfg = createDummyConfig();
    const content = sub.render(cfg, 'antigravity');
    const { frontmatter, body } = parseFrontmatterSimple(content);
    assert.strictEqual(frontmatter.name, sub.id);
    assert(frontmatter.description && frontmatter.description.length > 5);
    assert.strictEqual(frontmatter.subagent, 'true');
    assert(frontmatter.model, 'Model must be defined for Antigravity');
    assert(frontmatter.commandExecutionPolicy, 'commandExecutionPolicy must be defined');
    assert(content.includes('tools:'), 'Antigravity tools list must be present');
    assert(body.includes('# Subagent Contract:'), 'Markdown body must follow frontmatter');
  });
}

// =========================================================================
// Area 3: Subagents Frontmatter for Claude Code (Feature 3)
// =========================================================================
console.log('\n--- Vector 3: Claude Code Subagents Frontmatter & Mutation Isolation ---');

const mutatingRoles = new Set(['backend-dev', 'frontend-dev', 'ui-ux-specialist', 'devops-infra']);

for (const sub of allSubagentRenderers) {
  runTest(`R3: Subagent [${sub.id}] Claude Code frontmatter, PascalCase tools & isolation`, () => {
    const cfg = createDummyConfig();
    const content = sub.render(cfg, 'claude');
    const { frontmatter } = parseFrontmatterSimple(content);

    assert.strictEqual(frontmatter.name, sub.id);
    assert(frontmatter.tools, 'Claude tools must be defined');
    // Verify PascalCase tools
    const tools = frontmatter.tools.split(',').map((t) => t.trim());
    for (const tool of tools) {
      assert(/^[A-Z][a-zA-Z]+$/.test(tool), `Tool [${tool}] must be PascalCase in Claude Code`);
    }

    if (mutatingRoles.has(sub.id)) {
      assert.strictEqual(
        frontmatter.isolation,
        'worktree',
        `Mutating role [${sub.id}] MUST require isolation: worktree`
      );
    } else {
      assert(
        !frontmatter.isolation || frontmatter.isolation === 'none',
        `Read-only/verification role [${sub.id}] must NOT have isolation: worktree`
      );
    }
  });
}

// =========================================================================
// Area 4: Cursor Rules MDC Export (Feature 4)
// =========================================================================
console.log('\n--- Vector 4: Cursor Rules Export (.cursor/rules/*.mdc) ---');

runTest('R4.1: getCursorRulesDefinitions returns complete rule set with valid properties', () => {
  const cfg = createDummyConfig();
  const rules = getCursorRulesDefinitions(cfg);
  assert(rules.length >= 5, 'Must define at least 5 standard cursor rules');

  const ruleMap = new Map(rules.map((r) => [r.id, r]));
  assert(ruleMap.has('backend'), 'backend rule missing');
  assert(ruleMap.has('frontend'), 'frontend rule missing');
  assert(ruleMap.has('database'), 'database rule missing');
  assert(ruleMap.has('security'), 'security rule missing');
  assert(ruleMap.has('constraints'), 'constraints rule missing');

  // Verify constraints has alwaysApply: true
  const constraintsRule = ruleMap.get('constraints')!;
  assert.strictEqual(constraintsRule.alwaysApply, true, 'constraints.mdc must have alwaysApply: true');
  assert.strictEqual(constraintsRule.fileName, 'constraints.mdc');

  // Verify other rules have alwaysApply: false
  for (const [id, r] of ruleMap) {
    if (id !== 'constraints') {
      assert.strictEqual(r.alwaysApply, false, `Rule [${id}] must have alwaysApply: false`);
    }
  }
});

runTest('R4.2: stripExistingFrontmatter strips frontmatter and avoids nested frontmatter blocks', () => {
  const withFrontmatter = `---
trigger: glob
globs: ["*.ts"]
---

# Title
Some content`;

  const stripped = stripExistingFrontmatter(withFrontmatter);
  assert(!stripped.startsWith('---'), 'Frontmatter was not stripped');
  assert(stripped.startsWith('# Title'), 'Body must be preserved');

  const withoutFrontmatter = '# Just a Title\nSome content';
  assert.strictEqual(stripExistingFrontmatter(withoutFrontmatter), withoutFrontmatter);

  // Render Cursor rule and ensure exactly one frontmatter block
  const rendered = renderCursorRuleFile('Description', '*.ts', false, withFrontmatter);
  const firstDelim = rendered.indexOf('---');
  const secondDelim = rendered.indexOf('---', firstDelim + 3);
  const thirdDelim = rendered.indexOf('---', secondDelim + 3);
  assert.strictEqual(firstDelim, 0, 'Must start with ---');
  assert(secondDelim > 0, 'Must have closing ---');
  assert.strictEqual(thirdDelim, -1, 'Must NOT contain a third --- delimiter (no nested frontmatter)');
});

runTest('R4.3: Cursor rules conditional filtering when stack components are disabled', () => {
  const backendOnlyCfg = createDummyConfig({
    selectedRoles: ['lead-architect', 'backend-dev'],
    stack: {
      type: 'backend',
      backend: { framework: 'Express', language: 'TypeScript' },
      commands: {}
    }
  });
  const rules = getCursorRulesDefinitions(backendOnlyCfg);
  const frontendRule = rules.find((r) => r.id === 'frontend');
  assert(frontendRule, 'frontend rule definition should exist in registry');
  assert.strictEqual(
    frontendRule.shouldGenerate(backendOnlyCfg),
    false,
    'Frontend rule must NOT generate when frontend is absent and role unselected'
  );

  const backendRule = rules.find((r) => r.id === 'backend');
  assert.strictEqual(backendRule?.shouldGenerate(backendOnlyCfg), true);
});

// =========================================================================
// Area 5: Automatic Subagents Migration in update.ts (Feature 5)
// =========================================================================
console.log('\n--- Vector 5: Automatic Subagents Migration & Dry-Run Safety ---');

runTest('R5.1: injectSubagentFrontmatter injects frontmatter only when missing', () => {
  const legacyContent = `# Subagent Contract: Custom Role\nSome instructions.`;
  const migrated = injectSubagentFrontmatter('custom-agent', legacyContent);
  assert(migrated.startsWith('---'), 'Must prepend frontmatter');
  assert(migrated.includes('name: custom-agent'), 'Must use custom role id');

  // Idempotency check: Content already with frontmatter should NOT be modified
  const secondPass = injectSubagentFrontmatter('custom-agent', migrated);
  assert.strictEqual(secondPass, migrated, 'Must not duplicate frontmatter if already present');
});

runTest('R5.2: migrateLegacySubagents performs dryRun simulation without modifying disk', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-migration-dry-'));
  const agentsDir = path.join(tempDir, '.agents');
  const legacySubagentsDir = path.join(agentsDir, 'subagents');
  fs.mkdirSync(legacySubagentsDir, { recursive: true });

  fs.writeFileSync(path.join(legacySubagentsDir, 'architect.agent.md'), '# Architect contract', 'utf8');
  fs.writeFileSync(path.join(legacySubagentsDir, 'backend.agent.md'), '# Backend contract', 'utf8');

  const dryResult = migrateLegacySubagents(agentsDir, true);

  assert.strictEqual(dryResult.migratedFiles.length, 2, 'Dry run must detect 2 files to migrate');
  assert(fs.existsSync(path.join(legacySubagentsDir, 'architect.agent.md')), 'Legacy file must remain in dryRun');
  assert(!fs.existsSync(path.join(agentsDir, 'agents', 'lead-architect.md')), 'New file must NOT be created in dryRun');

  fs.rmSync(tempDir, { recursive: true, force: true });
});

runTest('R5.3: migrateLegacySubagents executes complete migration, canonical rename, and cleanup', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-migration-real-'));
  const agentsDir = path.join(tempDir, '.agents');
  const legacySubagentsDir = path.join(agentsDir, 'subagents');
  fs.mkdirSync(legacySubagentsDir, { recursive: true });

  const legacyFiles: [string, string][] = [
    ['architect.agent.md', 'lead-architect.md'],
    ['backend.agent.md', 'backend-dev.md'],
    ['frontend.agent.md', 'frontend-dev.md'],
    ['ui-ux.agent.md', 'ui-ux-specialist.md'],
    ['reviewer.agent.md', 'code-reviewer.md'],
    ['qa.agent.md', 'qa-tester.md'],
    ['security.agent.md', 'git-security.md'],
    ['devops.agent.md', 'devops-infra.md'],
    ['custom.agent.md', 'custom.md']
  ];

  for (const [legacyName] of legacyFiles) {
    fs.writeFileSync(path.join(legacySubagentsDir, legacyName), `# Contract for ${legacyName}`, 'utf8');
  }

  const result = migrateLegacySubagents(agentsDir, false);

  assert.strictEqual(result.migratedFiles.length, legacyFiles.length);

  const nativeAgentsDir = path.join(agentsDir, 'agents');
  assert(fs.existsSync(nativeAgentsDir), '.agents/agents/ must exist after migration');

  for (const [, targetName] of legacyFiles) {
    const targetPath = path.join(nativeAgentsDir, targetName);
    assert(fs.existsSync(targetPath), `Migrated file [${targetName}] must exist in .agents/agents/`);
    const content = fs.readFileSync(targetPath, 'utf8');
    assert(content.startsWith('---'), `Migrated file [${targetName}] must have frontmatter`);
  }

  // Verify legacy folder was deleted
  assert(!fs.existsSync(legacySubagentsDir), 'Legacy .agents/subagents/ folder must be purged');

  // Verify idempotency: running again on clean state
  const secondResult = migrateLegacySubagents(agentsDir, false);
  assert.strictEqual(secondResult.migratedFiles.length, 0);

  fs.rmSync(tempDir, { recursive: true, force: true });
});

runTest('R5.4: detectExistingRoles accurately extracts roles from both legacy and native dirs', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-detect-roles-'));
  const agentsDir = path.join(tempDir, '.agents');
  const nativeDir = path.join(agentsDir, 'agents');
  fs.mkdirSync(nativeDir, { recursive: true });

  fs.writeFileSync(path.join(nativeDir, 'lead-architect.md'), 'test', 'utf8');
  fs.writeFileSync(path.join(nativeDir, 'devops-infra.md'), 'test', 'utf8');

  const detected = detectExistingRoles(agentsDir);
  assert(detected.includes('lead-architect'));
  assert(detected.includes('devops-infra'));

  fs.rmSync(tempDir, { recursive: true, force: true });
});

// =========================================================================
// Area 6: Full Engine File Generation (Feature 1-5 Integration)
// =========================================================================
console.log('\n--- Vector 6: Full Engine Emission & Routing Consistency ---');

runTest('R6.1: generateOrchestronFiles emits to standard routes for Antigravity, Claude, and Cursor', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-engine-e2e-'));
  const cfg = createDummyConfig();

  const result = generateOrchestronFiles(tempDir, cfg);

  // 1. Antigravity subagents
  for (const role of cfg.selectedRoles) {
    const agentPath = path.join(tempDir, '.agents', 'agents', `${role}.md`);
    assert(fs.existsSync(agentPath), `Antigravity agent [${role}.md] must be generated`);
    const content = fs.readFileSync(agentPath, 'utf8');
    assert(content.startsWith('---') && content.includes('subagent: true'));
  }

  // 2. Claude Code subagents
  for (const role of cfg.selectedRoles) {
    const claudePath = path.join(tempDir, '.claude', 'agents', `${role}.md`);
    assert(fs.existsSync(claudePath), `Claude agent [${role}.md] must be generated`);
    const content = fs.readFileSync(claudePath, 'utf8');
    assert(content.startsWith('---') && content.includes('tools:'));
  }

  // 3. Cursor rules
  const cursorDir = path.join(tempDir, '.cursor', 'rules');
  assert(fs.existsSync(cursorDir), '.cursor/rules/ must exist');
  const cursorFiles = fs.readdirSync(cursorDir);
  assert(cursorFiles.includes('backend.mdc'));
  assert(cursorFiles.includes('frontend.mdc'));
  assert(cursorFiles.includes('constraints.mdc'));

  // 4. CLAUDE.md links
  const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
  assert(fs.existsSync(claudeMdPath));
  const claudeMdContent = fs.readFileSync(claudeMdPath, 'utf8');
  assert(claudeMdContent.includes('.agents/agents/'), 'CLAUDE.md must reference .agents/agents/');
  assert(claudeMdContent.includes('.claude/agents/'), 'CLAUDE.md must reference .claude/agents/');
  assert(!claudeMdContent.includes('.agents/subagents/'), 'CLAUDE.md must NOT reference .agents/subagents/');

  // 5. Unselected role cleanup
  const prunedCfg = createDummyConfig({
    selectedRoles: ['lead-architect', 'backend-dev']
  });
  generateOrchestronFiles(tempDir, prunedCfg);
  const unselectedAgent = path.join(tempDir, '.agents', 'agents', 'frontend-dev.md');
  assert(!fs.existsSync(unselectedAgent), 'Unselected role file must be pruned');

  fs.rmSync(tempDir, { recursive: true, force: true });
});

// =========================================================================
// Area 7: Adversarial Edge Cases & Boundary Conditions
// =========================================================================
console.log('\n--- Vector 7: Adversarial Edge Cases & Boundary Conditions ---');

runTest('R7.1: exportToCursorRule handles empty strings, text with horizontal rules (---) without corruption', () => {
  const emptyOutput = exportToCursorRule('', { alwaysApply: false });
  assert(emptyOutput.startsWith('---'));
  assert(emptyOutput.includes('alwaysApply: false'));

  // Content with markdown horizontal rules (---) inside body
  const markdownWithHr = `---
trigger: glob
globs: ["*.ts"]
description: "Rule with HR"
---

# Title
First section
---
Second section`;

  const mdc = exportToCursorRule(markdownWithHr, { alwaysApply: false });
  const firstDelim = mdc.indexOf('---');
  const secondDelim = mdc.indexOf('---', firstDelim + 3);
  const thirdDelim = mdc.indexOf('---', secondDelim + 3);

  // The third delimiter should be the horizontal rule in the body
  assert.strictEqual(firstDelim, 0);
  assert(secondDelim > 0);
  assert(thirdDelim > secondDelim, 'HR in body must be preserved');
  assert(mdc.includes('First section\n---\nSecond section') || mdc.includes('First section\r\n---\r\nSecond section'));
});

runTest('R7.2: stripExistingFrontmatter handles CRLF (Windows) and malformed frontmatters', () => {
  const crlfContent = "---\r\ntrigger: glob\r\n---\r\n# CRLF Content";
  const strippedCrlf = stripExistingFrontmatter(crlfContent);
  assert.strictEqual(strippedCrlf, '# CRLF Content');

  // Single delimiter with no closing
  const unclosed = "---\ntrigger: glob\n# No closing";
  assert.strictEqual(stripExistingFrontmatter(unclosed), unclosed);
});

runTest('R7.3: migrateLegacySubagents skips subdirectories and safely processes files', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-adversarial-migration-'));
  const agentsDir = path.join(tempDir, '.agents');
  const legacyDir = path.join(agentsDir, 'subagents');
  fs.mkdirSync(legacyDir, { recursive: true });

  // Add a subdirectory
  const nestedSubDir = path.join(legacyDir, 'nested-subfolder');
  fs.mkdirSync(nestedSubDir);
  fs.writeFileSync(path.join(legacyDir, 'architect.agent.md'), '# Architect', 'utf8');

  const result = migrateLegacySubagents(agentsDir, false);

  assert.strictEqual(result.migratedFiles.length, 1, 'Only files should be migrated, not directories');
  assert(fs.existsSync(path.join(agentsDir, 'agents', 'lead-architect.md')));
  // Legacy dir is not deleted because it still contains nested-subfolder
  assert(fs.existsSync(legacyDir), 'Legacy dir containing non-migrated items must not be deleted');

  fs.rmSync(tempDir, { recursive: true, force: true });
});

runTest('R7.4: E2E CLI team --json verification with compiled binary', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-team-cli-'));
  const cfg = createDummyConfig();
  generateOrchestronFiles(tempDir, cfg);

  // Run compiled cli team --json
  const cliPath = path.resolve('dist/index.js');
  const output = execSync(`node "${cliPath}" team --json -d "${tempDir}"`, { encoding: 'utf8' });
  const team = JSON.parse(output);

  assert(Array.isArray(team), 'team output must be JSON array');
  assert(team.length >= 8, 'must report all configured subagents');

  for (const member of team) {
    assert(member.id, 'member id must exist');
    assert(member.name, 'member name must exist');
    assert(member.file, 'member file must exist');
    assert(
      member.file.endsWith('.md'),
      `file [${member.file}] must end with .md`
    );
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
});

console.log('\n======================================================');
console.log(`Empirical Test Suite Execution Summary:`);
console.log(`Passed: ${stats.passed}`);
console.log(`Failed: ${stats.failed}`);
console.log('======================================================\n');

if (stats.failed > 0) {
  console.error(`Total Failures (${stats.failed}):`);
  for (const f of stats.failures) console.error(f);
  process.exit(1);
} else {
  console.log('All empirical challenge tests PASSED with 100% success rate.');
  process.exit(0);
}
