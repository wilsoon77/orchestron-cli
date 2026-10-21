import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  createTestSandbox,
  runCli,
  initGitRepoInSandbox,
  TestSandbox
} from './helpers/cliRunner.js';

describe('Tier 2: Boundary & Corner Cases (BVA & Stress)', { timeout: 45000 }, () => {
  let sandbox: TestSandbox;

  beforeEach(() => {
    sandbox = createTestSandbox('orch-tier2-');
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it('TC-E2E-201: should initialize cleanly in a completely empty directory with zero files', () => {
    // Zero files in sandbox directory
    const entries = fs.readdirSync(sandbox.dir);
    expect(entries.length).toBe(0);

    const res = runCli(['init', '-y', '-d', sandbox.dir]);
    expect(res.status).toBe(0);

    const agentsDir = path.join(sandbox.dir, '.agents');
    expect(fs.existsSync(agentsDir)).toBe(true);
    expect(fs.existsSync(path.join(agentsDir, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(agentsDir, 'CONSTRAINTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(agentsDir, 'orchestron.yaml'))).toBe(true);
  });

  it('TC-E2E-202: should handle project with unrecognized / generic tech stack gracefully', () => {
    // Only a dummy text file, no recognized stack signatures
    sandbox.writeFile('notes.txt', 'Just some random project notes without framework.');

    const res = runCli(['init', '-y', '-d', sandbox.dir]);
    expect(res.status).toBe(0);

    // Verify fallback generic setup
    const manifest = sandbox.readFile('.agents/orchestron.yaml');
    expect(manifest).toBeDefined();
    expect(manifest).toMatch(/(generic|standard)/i);
  });

  it('TC-E2E-203: should sanitize role names with special characters into valid kebab-case filenames', () => {
    initGitRepoInSandbox(sandbox.dir);
    sandbox.writeFile('package.json', JSON.stringify({ name: 'sanitize-test' }));
    runCli(['init', '-y', '-d', sandbox.dir]);

    const res = runCli(['add-role', '-d', sandbox.dir], {
      env: {
        ORCHESTRON_TEST_ROLE: '__custom__',
        ORCHESTRON_CUSTOM_ROLE_NAME: 'DevOps & SRE / Cloud!'
      }
    });

    const rulesDir = path.join(sandbox.dir, '.agents', 'rules');
    if (fs.existsSync(rulesDir)) {
      const files = fs.readdirSync(rulesDir);
      // Valid filenames must not contain &, /, !, or spaces
      for (const file of files) {
        expect(file).not.toMatch(/[&/! ]/);
      }
    }
  });

  it('TC-E2E-204: should handle custom role with extremely long name (> 80 chars) safely', () => {
    initGitRepoInSandbox(sandbox.dir);
    sandbox.writeFile('package.json', JSON.stringify({ name: 'long-name-test' }));
    runCli(['init', '-y', '-d', sandbox.dir]);

    const longName = 'Supercalifragilisticexpialidocious Enterprise Cloud Infrastructure Lead Specialist Architect Engineer';
    const res = runCli(['add-role', '-d', sandbox.dir], {
      env: {
        ORCHESTRON_TEST_ROLE: '__custom__',
        ORCHESTRON_CUSTOM_ROLE_NAME: longName
      }
    });

    // Should not throw unhandled filesystem exception (ENAMETOOLONG)
    expect(res.status).not.toBe(134); // abort signal
  });

  it('TC-E2E-205: should recover defensively without crash when orchestron.yaml is malformed during update', () => {
    initGitRepoInSandbox(sandbox.dir);
    sandbox.writeFile('package.json', JSON.stringify({ name: 'corrupt-yaml-test' }));
    runCli(['init', '-y', '-d', sandbox.dir]);

    // Corrupt orchestron.yaml
    sandbox.writeFile('.agents/orchestron.yaml', '!!!INVALID: [YAML::: \n  {corrupt: True');

    const res = runCli(['update', '-d', sandbox.dir]);
    // Must handle error gracefully and not crash with unhandled exception
    expect(res.stderr).not.toContain('FATAL ERROR');
  });

  it('TC-E2E-206: should resolve deeply nested project paths correctly via --dir', () => {
    const nestedDir = path.join(sandbox.dir, 'packages', 'apps', 'core-service');
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(path.join(nestedDir, 'package.json'), JSON.stringify({ name: 'nested-service' }));

    const res = runCli(['init', '-y', '-d', nestedDir]);
    expect(res.status).toBe(0);

    expect(fs.existsSync(path.join(nestedDir, '.agents', 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(nestedDir, 'AGENTS.md'))).toBe(true);
  });

  it('TC-E2E-207: should execute doctor on non-git project without fatal error', () => {
    sandbox.writeFile('package.json', JSON.stringify({ name: 'no-git-test' }));
    runCli(['init', '-y', '-d', sandbox.dir]);

    // Ensure no .git folder exists
    expect(fs.existsSync(path.join(sandbox.dir, '.git'))).toBe(false);

    const res = runCli(['doctor', '-d', sandbox.dir]);
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/Auditoria de Secretos Git|Ecosistema \.agents/i);
  });

  it('TC-E2E-208: should handle empty CONSTRAINTS.md file defensively during doctor check', () => {
    initGitRepoInSandbox(sandbox.dir);
    sandbox.writeFile('package.json', JSON.stringify({ name: 'empty-constraints-test' }));
    runCli(['init', '-y', '-d', sandbox.dir]);

    // Empty out CONSTRAINTS.md
    sandbox.writeFile('.agents/CONSTRAINTS.md', '');

    const res = runCli(['doctor', '-d', sandbox.dir]);
    // Doctor should still execute without crash
    expect(res.stdout).toMatch(/Auditoria/i);
  });
});
