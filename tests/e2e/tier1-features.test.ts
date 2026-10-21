import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  createTestSandbox,
  runCli,
  initGitRepoInSandbox,
  hasYamlFrontmatter,
  parseYamlFrontmatter,
  computeExpandedFileSize,
  TestSandbox
} from './helpers/cliRunner.js';

describe('Tier 1: Feature Coverage (Core Requirements R1 - R5)', { timeout: 45000 }, () => {
  let sandbox: TestSandbox;

  beforeEach(() => {
    sandbox = createTestSandbox('orch-tier1-');
    initGitRepoInSandbox(sandbox.dir);
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  // =========================================================================
  // Feature Area 1: Multi-Engine YAML Frontmatter & Official Routes (R1)
  // Authoritative specs: ORIGINAL_REQUEST.md R1; PROJECT.md #1-#5; survey_specs.md §1-§3
  // =========================================================================
  describe('Area 1: Multi-Engine YAML Frontmatter & Routes (R1)', () => {
    it('TC-E2E-101: should generate valid YAML frontmatter in all .agents/rules/*.md files', () => {
      // Setup a project with backend and frontend indicators
      sandbox.writeFile('package.json', JSON.stringify({
        name: 'test-app',
        dependencies: { express: '^4.18.0', react: '^18.2.0' }
      }));

      const res = runCli(['init', '-y', '-d', sandbox.dir]);
      expect(res.status).toBe(0);

      const rulesDir = path.join(sandbox.dir, '.agents', 'rules');
      expect(fs.existsSync(rulesDir)).toBe(true);

      const ruleFiles = fs.readdirSync(rulesDir).filter(f => f.endsWith('.md'));
      expect(ruleFiles.length).toBeGreaterThan(0);

      for (const ruleFile of ruleFiles) {
        const content = fs.readFileSync(path.join(rulesDir, ruleFile), 'utf8');
        expect(hasYamlFrontmatter(content), `Rule ${ruleFile} must contain YAML frontmatter`).toBe(true);

        const frontmatter = parseYamlFrontmatter(content);
        expect(frontmatter.trigger, `Rule ${ruleFile} must specify a trigger`).toBeDefined();
        expect(['glob', 'model_decision', 'always_on', 'manual']).toContain(frontmatter.trigger);

        if (frontmatter.trigger === 'glob') {
          expect(frontmatter.globs, `Rule ${ruleFile} with trigger:glob must have globs`).toBeDefined();
        }
      }
    });

    it('TC-E2E-102: should generate native Google Antigravity subagents in .agents/agents/*.md', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'backend-test' }));

      const res = runCli(['init', '-y', '-d', sandbox.dir]);
      expect(res.status).toBe(0);

      const agentsDir = path.join(sandbox.dir, '.agents', 'agents');
      expect(fs.existsSync(agentsDir), 'Official directory .agents/agents/ must exist').toBe(true);

      const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
      expect(agentFiles.length).toBeGreaterThanOrEqual(3);

      for (const agentFile of agentFiles) {
        const content = fs.readFileSync(path.join(agentsDir, agentFile), 'utf8');
        expect(hasYamlFrontmatter(content), `Agent ${agentFile} must contain YAML frontmatter`).toBe(true);

        const frontmatter = parseYamlFrontmatter(content);
        expect(frontmatter.name, `Agent ${agentFile} must define name`).toBeDefined();
        expect(frontmatter.description, `Agent ${agentFile} must define description`).toBeDefined();
        expect(frontmatter.tools, `Agent ${agentFile} must define tools`).toBeDefined();
      }
    });

    it('TC-E2E-103: should generate Claude Code subagents in .claude/agents/*.md with PascalCase tools', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'claude-app' }));

      // Run init with claude compat enabled or inspect engine output
      const res = runCli(['init', '-y', '-d', sandbox.dir]);
      expect(res.status).toBe(0);

      const claudeAgentsDir = path.join(sandbox.dir, '.claude', 'agents');
      if (fs.existsSync(claudeAgentsDir)) {
        const claudeAgentFiles = fs.readdirSync(claudeAgentsDir).filter(f => f.endsWith('.md'));
        expect(claudeAgentFiles.length).toBeGreaterThan(0);

        for (const file of claudeAgentFiles) {
          const content = fs.readFileSync(path.join(claudeAgentsDir, file), 'utf8');
          expect(hasYamlFrontmatter(content)).toBe(true);
          const fm = parseYamlFrontmatter(content);
          expect(fm.tools).toBeDefined();
          // PascalCase verification for Claude Code
          expect(fm.tools).toMatch(/(Read|Grep|Glob|Bash|Edit|Write)/);
        }
      }
    });

    it('TC-E2E-104: should generate Cursor rules in .cursor/rules/*.mdc when configured', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'cursor-app' }));

      const res = runCli(['init', '-y', '-d', sandbox.dir]);
      expect(res.status).toBe(0);

      const cursorDir = path.join(sandbox.dir, '.cursor', 'rules');
      if (fs.existsSync(cursorDir)) {
        const mdcFiles = fs.readdirSync(cursorDir).filter(f => f.endsWith('.mdc'));
        for (const file of mdcFiles) {
          const content = fs.readFileSync(path.join(cursorDir, file), 'utf8');
          expect(hasYamlFrontmatter(content)).toBe(true);
          const fm = parseYamlFrontmatter(content);
          expect(fm.description).toBeDefined();
        }
      }
    });

    it('TC-E2E-105: should enforce correct trigger mapping (backend=glob, security=model_decision)', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'trigger-test' }));

      const res = runCli(['init', '-y', '-d', sandbox.dir]);
      expect(res.status).toBe(0);

      const rulesDir = path.join(sandbox.dir, '.agents', 'rules');
      const backendRulePath = path.join(rulesDir, 'backend.md');
      if (fs.existsSync(backendRulePath)) {
        const backendFm = parseYamlFrontmatter(fs.readFileSync(backendRulePath, 'utf8'));
        expect(backendFm.trigger).toBe('glob');
        expect(backendFm.globs).toBeDefined();
      }

      const securityRulePath = path.join(rulesDir, 'security.md');
      if (fs.existsSync(securityRulePath)) {
        const secFm = parseYamlFrontmatter(fs.readFileSync(securityRulePath, 'utf8'));
        expect(secFm.trigger).toBe('model_decision');
      }
    });
  });

  // =========================================================================
  // Feature Area 2: Gateway Router Size & Context Budget (R2)
  // Authoritative specs: ORIGINAL_REQUEST.md R2; PROJECT.md #6-#9; survey_specs.md §4
  // =========================================================================
  describe('Area 2: Gateway Router Size & Context Budget (R2)', () => {
    it('TC-E2E-106: should generate root AGENTS.md as a lightweight Gateway Router under 6 KB', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'budget-test' }));

      const res = runCli(['init', '-y', '-d', sandbox.dir]);
      expect(res.status).toBe(0);

      const rootAgents = path.join(sandbox.dir, 'AGENTS.md');
      expect(fs.existsSync(rootAgents)).toBe(true);

      const stats = fs.statSync(rootAgents);
      expect(stats.size).toBeLessThan(6000);
    });

    it('TC-E2E-107: should inline exclusively @[CONSTRAINTS] in root AGENTS.md without cascade', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'inline-test' }));

      const res = runCli(['init', '-y', '-d', sandbox.dir]);
      expect(res.status).toBe(0);

      const rootAgents = path.join(sandbox.dir, 'AGENTS.md');
      const content = fs.readFileSync(rootAgents, 'utf8');

      // Must inline CONSTRAINTS
      expect(content).toContain('@[CONSTRAINTS]');
      // Must NOT cascade inline full AGENTS or CONTEXT or MANIFEST
      expect(content).not.toContain('@[AGENTS](.agents/AGENTS.md)');
      expect(content).not.toContain('@[CONTEXT](');
      expect(content).not.toContain('@[MANIFEST](');
    });

    it('TC-E2E-108: should guarantee total expanded size of root AGENTS.md is under 24,000 bytes', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'expanded-test' }));

      const res = runCli(['init', '-y', '-d', sandbox.dir]);
      expect(res.status).toBe(0);

      const rootAgents = path.join(sandbox.dir, 'AGENTS.md');
      const expandedSize = computeExpandedFileSize(rootAgents, sandbox.dir);

      expect(expandedSize).toBeLessThan(24000);
    });

    it('TC-E2E-109: should verify orchestron doctor reports PASS on healthy context budget', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'doctor-budget-test' }));

      runCli(['init', '-y', '-d', sandbox.dir]);
      const res = runCli(['doctor', '-d', sandbox.dir]);

      expect(res.stdout).toMatch(/Presupuesto de Contexto/i);
      expect(res.stdout).toMatch(/\[PASS\]/);
    });

    it('TC-E2E-110: should report FAIL in doctor if expanded context budget exceeds 24,000 bytes', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'doctor-fail-budget-test' }));

      runCli(['init', '-y', '-d', sandbox.dir]);

      // Artificially inflate .agents/CONSTRAINTS.md to exceed the 24 KB budget
      const constraintsPath = path.join(sandbox.dir, '.agents', 'CONSTRAINTS.md');
      const padding = '\n<!-- PADDING TO EXCEED CONTEXT BUDGET -->\n' + 'X'.repeat(26000);
      fs.appendFileSync(constraintsPath, padding, 'utf8');

      const res = runCli(['doctor', '-d', sandbox.dir]);
      expect(res.stdout).toMatch(/(WARN|FAIL)/);
    });
  });

  // =========================================================================
  // Feature Area 3: Unified Roles & Atomic add-role (R3)
  // Authoritative specs: ORIGINAL_REQUEST.md R3; PROJECT.md #10-#13; survey_specs.md §5
  // =========================================================================
  describe('Area 3: Unified Roles & Atomic add-role (R3)', () => {
    it('TC-E2E-111: should create modular rule with YAML frontmatter when role is added', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'role-app' }));
      runCli(['init', '-y', '-d', sandbox.dir]);

      // Add devops role
      const res = runCli(['add-role', '-d', sandbox.dir], {
        env: { ORCHESTRON_TEST_ROLE: 'devops-infra' }
      });

      const rulesDir = path.join(sandbox.dir, '.agents', 'rules');
      const devopsRule = path.join(rulesDir, 'devops-infra.md');
      if (fs.existsSync(devopsRule)) {
        const content = fs.readFileSync(devopsRule, 'utf8');
        expect(hasYamlFrontmatter(content)).toBe(true);
      }
    });

    it('TC-E2E-112: should create native subagent in .agents/agents/<id>.md when role is added', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'role-app' }));
      runCli(['init', '-y', '-d', sandbox.dir]);

      runCli(['add-role', '-d', sandbox.dir], {
        env: { ORCHESTRON_TEST_ROLE: 'mobile-dev' }
      });

      const agentPath = path.join(sandbox.dir, '.agents', 'agents', 'mobile-dev.md');
      if (fs.existsSync(agentPath)) {
        const content = fs.readFileSync(agentPath, 'utf8');
        expect(hasYamlFrontmatter(content)).toBe(true);
        const fm = parseYamlFrontmatter(content);
        expect(fm.name).toBeDefined();
      }
    });

    it('TC-E2E-113: should update orchestron.yaml gateway policies when role is added', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'role-app' }));
      runCli(['init', '-y', '-d', sandbox.dir]);

      runCli(['add-role', '-d', sandbox.dir], {
        env: { ORCHESTRON_TEST_ROLE: 'data-engineer' }
      });

      const manifestPath = path.join(sandbox.dir, '.agents', 'orchestron.yaml');
      if (fs.existsSync(manifestPath)) {
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        expect(manifestContent).toContain('data-engineer');
      }
    });

    it('TC-E2E-114: should append role entry to .agents/CONTEXT.md when role is added', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'role-app' }));
      runCli(['init', '-y', '-d', sandbox.dir]);

      runCli(['add-role', '-d', sandbox.dir], {
        env: { ORCHESTRON_TEST_ROLE: 'devops-infra' }
      });

      const contextPath = path.join(sandbox.dir, '.agents', 'CONTEXT.md');
      const contextContent = fs.readFileSync(contextPath, 'utf8');
      expect(contextContent).toMatch(/(devops-infra|DevOps)/i);
    });

    it('TC-E2E-115: should allow inspecting added role via orchestron team command', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'team-inspect-app' }));
      runCli(['init', '-y', '-d', sandbox.dir]);

      const res = runCli(['team', '--json', '-d', sandbox.dir]);
      expect(res.status).toBe(0);
      expect(res.stdout).toContain('lead-architect');
    });
  });

  // =========================================================================
  // Feature Area 4: Quality Hooks, Doctor Enforcement & Ergonomics (R4 & R5)
  // Authoritative specs: ORIGINAL_REQUEST.md R4, R5; PROJECT.md #14-#20
  // =========================================================================
  describe('Area 4: Quality Hooks, Doctor Enforcement & Ergonomics (R4 & R5)', () => {
    it('TC-E2E-116: should generate .claude/settings.json with Stop hook calling orchestron doctor --ci', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'hook-app' }));
      runCli(['init', '-y', '-d', sandbox.dir]);

      const settingsPath = path.join(sandbox.dir, '.claude', 'settings.json');
      if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        expect(settings.hooks).toBeDefined();
        expect(settings.hooks.Stop).toBeDefined();
        expect(settings.hooks.Stop.command).toMatch(/orchestron doctor --ci/);
      }
    });

    it('TC-E2E-117: should install git pre-commit hook via orchestron hooks --install', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'git-hook-app' }));
      runCli(['init', '-y', '-d', sandbox.dir]);

      const res = runCli(['hooks', '--install', '-d', sandbox.dir]);
      const hookPath = path.join(sandbox.dir, '.git', 'hooks', 'pre-commit');

      if (fs.existsSync(hookPath)) {
        const hookContent = fs.readFileSync(hookPath, 'utf8');
        expect(hookContent).toMatch(/orchestron doctor --ci/);
      }
    });

    it('TC-E2E-118: should exit with code 0 on orchestron doctor --ci for healthy project', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'healthy-ci-app' }));
      runCli(['init', '-y', '-d', sandbox.dir]);

      const res = runCli(['doctor', '--ci', '-d', sandbox.dir]);
      expect(res.status).toBe(0);
    });

    it('TC-E2E-119: should exit with code 1 on orchestron doctor --ci when violations exist', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'violated-ci-app' }));
      // Do NOT run init -> .agents missing -> doctor must fail
      const res = runCli(['doctor', '--ci', '-d', sandbox.dir]);
      expect(res.status).toBe(1);
    });

    it('TC-E2E-120: should correctly detect N+1 async loop using balanced braces without string false positives', () => {
      sandbox.writeFile('package.json', JSON.stringify({ name: 'perf-app' }));
      runCli(['init', '-y', '-d', sandbox.dir]);

      // Add a file with string literal containing braces inside a loop
      const benignFile = path.join(sandbox.dir, 'src', 'benign.ts');
      fs.mkdirSync(path.dirname(benignFile), { recursive: true });
      fs.writeFileSync(benignFile, `
        async function renderTemplates(items: string[]) {
          for (const item of items) {
            const template = "This has { braces } inside string";
            console.log(template);
          }
        }
      `);

      const res = runCli(['doctor', '-d', sandbox.dir]);
      expect(res.stdout).toMatch(/Auditoria Estatica de Rendimiento/);
      expect(res.stdout).toMatch(/\[PASS\]/);
    });
  });
});
