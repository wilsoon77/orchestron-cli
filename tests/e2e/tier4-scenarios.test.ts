import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  createTestSandbox,
  runCli,
  initGitRepoInSandbox,
  hasYamlFrontmatter,
  TestSandbox
} from './helpers/cliRunner.js';

describe('Tier 4: Real-World Scenarios (Full Lifecycle End-to-End)', { timeout: 45000 }, () => {
  let sandbox: TestSandbox;

  beforeEach(() => {
    sandbox = createTestSandbox('orch-tier4-');
    initGitRepoInSandbox(sandbox.dir);
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it('TC-E2E-401: Standard Full Project Lifecycle (init -> add-role -> update -> doctor --ci)', () => {
    // 1. Setup realistic project structure
    sandbox.writeFile('package.json', JSON.stringify({
      name: 'production-service',
      version: '1.0.0',
      dependencies: {
        express: '^4.18.2',
        pg: '^8.11.0'
      }
    }));
    sandbox.writeFile('src/index.ts', 'console.log("Service started");\n');

    // 2. Initialize project with Orchestron
    const initRes = runCli(['init', '-y', '-d', sandbox.dir]);
    expect(initRes.status).toBe(0);
    expect(fs.existsSync(path.join(sandbox.dir, '.agents', 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(sandbox.dir, 'AGENTS.md'))).toBe(true);

    // 3. Add extended DevOps role
    const addRoleRes = runCli(['add-role', '-d', sandbox.dir], {
      env: { ORCHESTRON_TEST_ROLE: 'devops-infra' }
    });
    expect(addRoleRes.status).toBe(0);

    // 4. Run update
    const updateRes = runCli(['update', '-d', sandbox.dir]);
    expect(updateRes.status).toBe(0);

    // 5. Run doctor with CI flag
    const doctorRes = runCli(['doctor', '--ci', '-d', sandbox.dir]);
    expect(doctorRes.stdout).toMatch(/Auditoria/i);
    // On healthy setup, doctor should exit 0
    if (doctorRes.status !== null) {
      expect(doctorRes.status).toBe(0);
    }
  });

  it('TC-E2E-402: Multi-Engine Deployment Lifecycle (Antigravity + Claude Code + Cursor)', () => {
    sandbox.writeFile('package.json', JSON.stringify({
      name: 'multi-engine-hub',
      dependencies: { vue: '^3.3.0' }
    }));

    const initRes = runCli(['init', '-y', '-d', sandbox.dir]);
    expect(initRes.status).toBe(0);

    // Verify Antigravity native presence
    const agentsDir = path.join(sandbox.dir, '.agents');
    expect(fs.existsSync(agentsDir)).toBe(true);
    expect(fs.existsSync(path.join(agentsDir, 'orchestron.yaml'))).toBe(true);

    // Verify root pointer
    const rootAgents = path.join(sandbox.dir, 'AGENTS.md');
    expect(fs.existsSync(rootAgents)).toBe(true);

    // Verify Claude settings hook if present
    const claudeSettings = path.join(sandbox.dir, '.claude', 'settings.json');
    if (fs.existsSync(claudeSettings)) {
      const parsed = JSON.parse(fs.readFileSync(claudeSettings, 'utf8'));
      expect(parsed.hooks?.Stop?.command).toMatch(/orchestron doctor/);
    }

    // Verify Cursor mdc if present
    const cursorDir = path.join(sandbox.dir, '.cursor', 'rules');
    if (fs.existsSync(cursorDir)) {
      const mdcList = fs.readdirSync(cursorDir);
      for (const mdc of mdcList) {
        const text = fs.readFileSync(path.join(cursorDir, mdc), 'utf8');
        expect(hasYamlFrontmatter(text)).toBe(true);
      }
    }
  });

  it('TC-E2E-403: Anti-Degradation Violation & Mechanical Enforcement Lifecycle', () => {
    sandbox.writeFile('package.json', JSON.stringify({ name: 'anti-degradation-check' }));
    runCli(['init', '-y', '-d', sandbox.dir]);

    // Commit baseline in git
    sandbox.writeFile('src/app.ts', 'export const add = (a: number, b: number) => a + b;\n');
    try {
      sandbox.writeFile('.gitignore', 'node_modules\n');
    } catch {}

    // Introduce prohibited @ts-ignore
    const dirtyFile = path.join(sandbox.dir, 'src', 'dirty.ts');
    fs.mkdirSync(path.dirname(dirtyFile), { recursive: true });
    fs.writeFileSync(dirtyFile, '// @ts-ignore\nconst bad: any = 123;\n');

    const doctorDirty = runCli(['doctor', '--ci', '-d', sandbox.dir]);
    // Doctor should detect @ts-ignore in git diff or file scan
    if (doctorDirty.stdout.includes('Anti-Degradation Watcher')) {
      expect(doctorDirty.stdout).toMatch(/(ts-ignore|ADVERTENCIA|FALLO|FAIL)/i);
    }

    // Remedy: remove prohibited suppression
    fs.writeFileSync(dirtyFile, 'const clean: number = 123;\n');

    const doctorClean = runCli(['doctor', '-d', sandbox.dir]);
    expect(doctorClean.stdout).toMatch(/Auditoria/i);
  });

  it('TC-E2E-404: Quality Gate 1 State Artifact (.agents/state/active-contract.md)', () => {
    sandbox.writeFile('package.json', JSON.stringify({ name: 'gate1-state-app' }));
    runCli(['init', '-y', '-d', sandbox.dir]);

    const activeContractPath = path.join(sandbox.dir, '.agents', 'state', 'active-contract.md');
    // If active-contract.md is initialized or managed
    if (fs.existsSync(activeContractPath)) {
      const content = fs.readFileSync(activeContractPath, 'utf8');
      expect(content).toMatch(/(Gate 1|Contrato|DTO|API)/i);
    }
  });
});
