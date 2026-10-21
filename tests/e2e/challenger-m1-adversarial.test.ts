import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { OrchestronConfig, ProjectStack } from '../../src/types/index.js';
import {
  renderBackendRule,
  renderFrontendRule,
  renderDatabaseRule,
  renderSecurityRule,
  exportToCursorRule
} from '../../src/generator/templates/rulesTemplates.js';
import {
  renderArchitectSubagent,
  renderBackendSubagent,
  renderFrontendSubagent,
  renderUiUxSubagent,
  renderReviewerSubagent,
  renderQaSubagent,
  renderSecuritySubagent,
  renderDevopsSubagent
} from '../../src/generator/templates/subagentsTemplate.js';
import {
  getCursorRulesDefinitions,
  renderCursorRuleFile,
  stripExistingFrontmatter
} from '../../src/generator/templates/cursorRulesTemplate.js';
import {
  migrateLegacySubagents,
  injectSubagentFrontmatter,
  detectExistingRoles
} from '../../src/commands/update.js';
import { generateOrchestronFiles } from '../../src/generator/engine.js';

function parseFrontmatterSimple(content: string): { frontmatter: Record<string, string>; body: string } {
  expect(content.startsWith('---')).toBe(true);
  const secondIndex = content.indexOf('\n---', 3);
  expect(secondIndex).toBeGreaterThan(-1);
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

describe('Challenger M1 Adversarial Suite (Empirical Verification)', () => {
  describe('Vector 1: Rules YAML Frontmatter & Multi-Stack Adaptability', () => {
    it('TC-ADV-101: Backend rule frontmatter parses and contains trigger: glob + globs + description', () => {
      const cfg = createDummyConfig();
      const rule = renderBackendRule(cfg);
      const { frontmatter } = parseFrontmatterSimple(rule);
      expect(frontmatter.trigger).toBe('glob');
      expect(frontmatter.globs).toBeDefined();
      expect(frontmatter.description).toBeDefined();
      const parsedGlobs = JSON.parse(frontmatter.globs);
      expect(Array.isArray(parsedGlobs)).toBe(true);
      expect(parsedGlobs).toContain('src/server/**');
    });

    it('TC-ADV-102: Backend rule adapts globs across diverse stacks (Java, Python, Go)', () => {
      const javaCfg = createDummyConfig({
        stack: {
          type: 'backend',
          backend: { framework: 'Spring Boot', language: 'Java' },
          commands: {},
          git: { isRepo: true, defaultBranch: 'main' }
        }
      });
      const javaGlobs = JSON.parse(parseFrontmatterSimple(renderBackendRule(javaCfg)).frontmatter.globs);
      expect(javaGlobs).toContain('**/*.java');
      expect(javaGlobs).toContain('**/pom.xml');

      const pyCfg = createDummyConfig({
        stack: {
          type: 'backend',
          backend: { framework: 'FastAPI', language: 'Python' },
          commands: {},
          git: { isRepo: true, defaultBranch: 'main' }
        }
      });
      const pyGlobs = JSON.parse(parseFrontmatterSimple(renderBackendRule(pyCfg)).frontmatter.globs);
      expect(pyGlobs).toContain('**/*.py');

      const goCfg = createDummyConfig({
        stack: {
          type: 'backend',
          backend: { framework: 'Gin', language: 'Go' },
          commands: {},
          git: { isRepo: true, defaultBranch: 'main' }
        }
      });
      const goGlobs = JSON.parse(parseFrontmatterSimple(renderBackendRule(goCfg)).frontmatter.globs);
      expect(goGlobs).toContain('**/*.go');
    });

    it('TC-ADV-103: Frontend rule adapts globs across diverse frameworks (Angular, Vue, React)', () => {
      const angularCfg = createDummyConfig({
        stack: {
          type: 'frontend',
          frontend: { framework: 'Angular' },
          commands: {},
          git: { isRepo: true, defaultBranch: 'main' }
        }
      });
      const angGlobs = JSON.parse(parseFrontmatterSimple(renderFrontendRule(angularCfg)).frontmatter.globs);
      expect(angGlobs).toContain('**/*.ts');
      expect(angGlobs).toContain('**/*.html');

      const vueCfg = createDummyConfig({
        stack: {
          type: 'frontend',
          frontend: { framework: 'Vue.js' },
          commands: {},
          git: { isRepo: true, defaultBranch: 'main' }
        }
      });
      const vueGlobs = JSON.parse(parseFrontmatterSimple(renderFrontendRule(vueCfg)).frontmatter.globs);
      expect(vueGlobs).toContain('**/*.vue');
    });

    it('TC-ADV-104: Database rule includes Prisma or Dump files when configured', () => {
      const prismaCfg = createDummyConfig({
        stack: {
          type: 'backend',
          database: { engine: 'PostgreSQL', orm: 'Prisma' },
          commands: {},
          git: { isRepo: true, defaultBranch: 'main' }
        }
      });
      const prismaGlobs = JSON.parse(parseFrontmatterSimple(renderDatabaseRule(prismaCfg)).frontmatter.globs);
      expect(prismaGlobs).toContain('**/schema.prisma');

      const dumpCfg = createDummyConfig({
        stack: {
          type: 'backend',
          database: { engine: 'MySQL', hasDump: true, dumpFile: 'db/schema.sql' },
          commands: {},
          git: { isRepo: true, defaultBranch: 'main' }
        }
      });
      const dumpGlobs = JSON.parse(parseFrontmatterSimple(renderDatabaseRule(dumpCfg)).frontmatter.globs);
      expect(dumpGlobs).toContain('db/schema.sql');
    });

    it('TC-ADV-105: Security rule enforces trigger: model_decision and targets sensitive files', () => {
      const cfg = createDummyConfig();
      const sec = renderSecurityRule(cfg);
      const { frontmatter } = parseFrontmatterSimple(sec);
      expect(frontmatter.trigger).toBe('model_decision');
      const secGlobs = JSON.parse(frontmatter.globs);
      expect(secGlobs).toContain('**/.env*');
    });

    it('TC-ADV-106: exportToCursorRule converts Antigravity rule to valid Cursor MDC format', () => {
      const cfg = createDummyConfig();
      const backendRule = renderBackendRule(cfg);
      const mdc = exportToCursorRule(backendRule, { alwaysApply: false });
      const { frontmatter, body } = parseFrontmatterSimple(mdc);
      expect(frontmatter.description).toBeDefined();
      expect(frontmatter.globs).toBeDefined();
      expect(frontmatter.alwaysApply).toBe('false');
      expect(body).toContain('# Directiva de Backend');
      expect(body.startsWith('---')).toBe(false);
    });
  });

  describe('Vector 2: Google Antigravity Subagents Frontmatter', () => {
    const allSubagents = [
      { id: 'lead-architect', render: renderArchitectSubagent },
      { id: 'backend-dev', render: renderBackendSubagent },
      { id: 'frontend-dev', render: renderFrontendSubagent },
      { id: 'ui-ux-specialist', render: renderUiUxSubagent },
      { id: 'code-reviewer', render: renderReviewerSubagent },
      { id: 'qa-tester', render: renderQaSubagent },
      { id: 'git-security', render: renderSecuritySubagent },
      { id: 'devops-infra', render: renderDevopsSubagent }
    ];

    for (const sub of allSubagents) {
      it(`TC-ADV-107: Subagent [${sub.id}] contains valid Antigravity frontmatter`, () => {
        const cfg = createDummyConfig();
        const content = sub.render(cfg, 'antigravity');
        const { frontmatter, body } = parseFrontmatterSimple(content);
        expect(frontmatter.name).toBe(sub.id);
        expect(frontmatter.description.length).toBeGreaterThan(5);
        expect(frontmatter.subagent).toBe('true');
        expect(frontmatter.model).toBeDefined();
        expect(frontmatter.commandExecutionPolicy).toBeDefined();
        expect(content).toContain('tools:');
        expect(body).toContain('# Subagent Contract:');
      });
    }
  });

  describe('Vector 3: Claude Code Subagents Frontmatter & Mutation Isolation', () => {
    const mutatingRoles = new Set(['backend-dev', 'frontend-dev', 'ui-ux-specialist', 'devops-infra']);
    const allSubagents = [
      { id: 'lead-architect', render: renderArchitectSubagent },
      { id: 'backend-dev', render: renderBackendSubagent },
      { id: 'frontend-dev', render: renderFrontendSubagent },
      { id: 'ui-ux-specialist', render: renderUiUxSubagent },
      { id: 'code-reviewer', render: renderReviewerSubagent },
      { id: 'qa-tester', render: renderQaSubagent },
      { id: 'git-security', render: renderSecuritySubagent },
      { id: 'devops-infra', render: renderDevopsSubagent }
    ];

    for (const sub of allSubagents) {
      it(`TC-ADV-108: Subagent [${sub.id}] Claude Code frontmatter, PascalCase tools & isolation`, () => {
        const cfg = createDummyConfig();
        const content = sub.render(cfg, 'claude');
        const { frontmatter } = parseFrontmatterSimple(content);

        expect(frontmatter.name).toBe(sub.id);
        expect(frontmatter.tools).toBeDefined();
        const tools = frontmatter.tools.split(',').map((t) => t.trim());
        for (const tool of tools) {
          expect(/^[A-Z][a-zA-Z]+$/.test(tool)).toBe(true);
        }

        if (mutatingRoles.has(sub.id)) {
          expect(frontmatter.isolation).toBe('worktree');
        } else {
          expect(frontmatter.isolation === undefined || frontmatter.isolation === 'none').toBe(true);
        }
      });
    }
  });

  describe('Vector 4: Cursor Rules Export (.cursor/rules/*.mdc)', () => {
    it('TC-ADV-109: getCursorRulesDefinitions returns complete rule set with valid properties', () => {
      const cfg = createDummyConfig();
      const rules = getCursorRulesDefinitions(cfg);
      expect(rules.length).toBeGreaterThanOrEqual(5);

      const ruleMap = new Map(rules.map((r) => [r.id, r]));
      expect(ruleMap.get('constraints')?.alwaysApply).toBe(true);
      expect(ruleMap.get('constraints')?.fileName).toBe('constraints.mdc');

      for (const [id, r] of ruleMap) {
        if (id !== 'constraints') {
          expect(r.alwaysApply).toBe(false);
        }
      }
    });

    it('TC-ADV-110: stripExistingFrontmatter strips frontmatter and avoids nested frontmatter blocks', () => {
      const withFrontmatter = `---
trigger: glob
globs: ["*.ts"]
---

# Title
Some content`;

      const stripped = stripExistingFrontmatter(withFrontmatter);
      expect(stripped.startsWith('---')).toBe(false);
      expect(stripped.startsWith('# Title')).toBe(true);

      const rendered = renderCursorRuleFile('Description', '*.ts', false, withFrontmatter);
      const firstDelim = rendered.indexOf('---');
      const secondDelim = rendered.indexOf('---', firstDelim + 3);
      const thirdDelim = rendered.indexOf('---', secondDelim + 3);
      expect(firstDelim).toBe(0);
      expect(secondDelim).toBeGreaterThan(0);
      expect(thirdDelim).toBe(-1);
    });
  });

  describe('Vector 5: Automatic Subagents Migration & Dry-Run Safety', () => {
    it('TC-ADV-111: injectSubagentFrontmatter injects frontmatter only when missing', () => {
      const legacyContent = `# Subagent Contract: Custom Role\nSome instructions.`;
      const migrated = injectSubagentFrontmatter('custom-agent', legacyContent);
      expect(migrated.startsWith('---')).toBe(true);
      expect(migrated).toContain('name: custom-agent');

      const secondPass = injectSubagentFrontmatter('custom-agent', migrated);
      expect(secondPass).toBe(migrated);
    });

    it('TC-ADV-112: migrateLegacySubagents executes complete migration, canonical rename, and cleanup', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-vitest-migration-'));
      const agentsDir = path.join(tempDir, '.agents');
      const legacySubagentsDir = path.join(agentsDir, 'subagents');
      fs.mkdirSync(legacySubagentsDir, { recursive: true });

      fs.writeFileSync(path.join(legacySubagentsDir, 'architect.agent.md'), '# Architect', 'utf8');
      fs.writeFileSync(path.join(legacySubagentsDir, 'backend.agent.md'), '# Backend', 'utf8');

      // Test dry-run first
      const dryResult = migrateLegacySubagents(agentsDir, true);
      expect(dryResult.migratedFiles.length).toBe(2);
      expect(fs.existsSync(path.join(legacySubagentsDir, 'architect.agent.md'))).toBe(true);

      // Test real migration
      const result = migrateLegacySubagents(agentsDir, false);
      expect(result.migratedFiles.length).toBe(2);

      const nativeAgentsDir = path.join(agentsDir, 'agents');
      expect(fs.existsSync(path.join(nativeAgentsDir, 'lead-architect.md'))).toBe(true);
      expect(fs.existsSync(path.join(nativeAgentsDir, 'backend-dev.md'))).toBe(true);
      expect(fs.existsSync(legacySubagentsDir)).toBe(false);

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe('Vector 6: E2E Full Generation & CLI Consistency', () => {
    it('TC-ADV-113: generateOrchestronFiles emits all platform assets consistently', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-vitest-engine-'));
      const cfg = createDummyConfig();

      generateOrchestronFiles(tempDir, cfg);

      expect(fs.existsSync(path.join(tempDir, '.agents', 'agents', 'lead-architect.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.claude', 'agents', 'lead-architect.md'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.cursor', 'rules', 'constraints.mdc'))).toBe(true);

      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('TC-ADV-114: CLI team --json outputs valid schema with .md files', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-vitest-cli-'));
      const cfg = createDummyConfig();
      generateOrchestronFiles(tempDir, cfg);

      const cliPath = path.resolve('dist/index.js');
      const output = execSync(`node "${cliPath}" team --json -d "${tempDir}"`, { encoding: 'utf8' });
      const team = JSON.parse(output);

      expect(Array.isArray(team)).toBe(true);
      expect(team.length).toBeGreaterThanOrEqual(8);
      for (const member of team) {
        expect(member.id).toBeDefined();
        expect(member.name).toBeDefined();
        expect(member.file).toBeDefined();
        expect(member.file.endsWith('.md')).toBe(true);
      }

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });
});
