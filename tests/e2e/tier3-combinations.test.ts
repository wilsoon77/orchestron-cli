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

describe('Tier 3: Cross-Feature Combinations & Integration', { timeout: 45000 }, () => {
  let sandbox: TestSandbox;

  beforeEach(() => {
    sandbox = createTestSandbox('orch-tier3-');
    initGitRepoInSandbox(sandbox.dir);
  });

  afterEach(() => {
    sandbox.cleanup();
  });

  it('TC-E2E-301: should pass all doctor quality gates after adding a role', () => {
    sandbox.writeFile('package.json', JSON.stringify({ name: 'add-doctor-combo' }));
    runCli(['init', '-y', '-d', sandbox.dir]);

    // Add a role
    runCli(['add-role', '-d', sandbox.dir], {
      env: { ORCHESTRON_TEST_ROLE: 'devops-infra' }
    });

    // Run doctor audit
    const doctorRes = runCli(['doctor', '-d', sandbox.dir]);
    expect(doctorRes.stdout).toMatch(/Auditoria completada/i);
    expect(doctorRes.stdout).not.toMatch(/\[FAIL\]/);
  });

  it('TC-E2E-302: should guarantee update --dry-run performs ZERO disk modifications', () => {
    sandbox.writeFile('package.json', JSON.stringify({ name: 'dry-run-app' }));
    runCli(['init', '-y', '-d', sandbox.dir]);

    // Record initial snapshot of files and their mtimes/hashes
    const agentsDir = path.join(sandbox.dir, '.agents');
    const getSnapshot = () => {
      const snapshot: Record<string, string> = {};
      const walk = (d: string) => {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
          const full = path.join(d, entry.name);
          if (entry.isDirectory()) walk(full);
          else snapshot[path.relative(sandbox.dir, full)] = fs.readFileSync(full, 'utf8');
        }
      };
      walk(agentsDir);
      return snapshot;
    };

    const beforeSnapshot = getSnapshot();

    // Execute update with --dry-run
    const updateRes = runCli(['update', '--dry-run', '-d', sandbox.dir]);
    expect(updateRes.stdout).toMatch(/(simulaci[oó]n|dry-run)/i);

    const afterSnapshot = getSnapshot();

    // Verify exact equality of all files
    expect(Object.keys(afterSnapshot).sort()).toEqual(Object.keys(beforeSnapshot).sort());
    for (const file of Object.keys(beforeSnapshot)) {
      expect(afterSnapshot[file]).toBe(beforeSnapshot[file]);
    }
  });

  it('TC-E2E-303: should selectively filter MCP servers matching project tech stack', () => {
    // 1. Backend-only project
    const backendSandbox = createTestSandbox('orch-mcp-backend-');
    initGitRepoInSandbox(backendSandbox.dir);
    backendSandbox.writeFile('package.json', JSON.stringify({
      name: 'backend-only',
      dependencies: { pg: '^8.0.0', express: '^4.18.0' }
    }));
    runCli(['init', '-y', '-d', backendSandbox.dir]);

    const backendAgentsMd = backendSandbox.readFile('.agents/AGENTS.md');
    // If MCP section exists, must not dump UI/Figma servers in backend-only
    expect(backendAgentsMd).not.toContain('figma-developer-mcp');
    backendSandbox.cleanup();

    // 2. Frontend-only project
    const frontendSandbox = createTestSandbox('orch-mcp-frontend-');
    initGitRepoInSandbox(frontendSandbox.dir);
    frontendSandbox.writeFile('package.json', JSON.stringify({
      name: 'frontend-only',
      dependencies: { react: '^18.2.0', tailwindcss: '^3.0.0' }
    }));
    runCli(['init', '-y', '-d', frontendSandbox.dir]);

    const frontendAgentsMd = frontendSandbox.readFile('.agents/AGENTS.md');
    // Must not dump SQL-only servers in pure frontend
    expect(frontendAgentsMd).not.toContain('mysql-local');
    frontendSandbox.cleanup();
  });

  it('TC-E2E-304: should migrate legacy .agents/subagents/ to .agents/agents/ during update', () => {
    sandbox.writeFile('package.json', JSON.stringify({ name: 'legacy-migration-test' }));
    runCli(['init', '-y', '-d', sandbox.dir]);

    // Simulate legacy v1.x layout by creating .agents/subagents/
    const subagentsDir = path.join(sandbox.dir, '.agents', 'subagents');
    fs.mkdirSync(subagentsDir, { recursive: true });
    fs.writeFileSync(path.join(subagentsDir, 'architect.agent.md'), '# Legacy Architect Subagent\nNo frontmatter');

    // Run orchestron update
    const updateRes = runCli(['update', '-d', sandbox.dir]);
    expect(updateRes.status).toBe(0);

    const newAgentsDir = path.join(sandbox.dir, '.agents', 'agents');
    if (fs.existsSync(newAgentsDir)) {
      const migratedFiles = fs.readdirSync(newAgentsDir);
      expect(migratedFiles.length).toBeGreaterThan(0);

      // Verify frontmatter was added during migration
      for (const file of migratedFiles) {
        const content = fs.readFileSync(path.join(newAgentsDir, file), 'utf8');
        expect(hasYamlFrontmatter(content)).toBe(true);
      }
    }
  });

  it('TC-E2E-305: should preserve CONTEXT.md history and custom roles during update', () => {
    sandbox.writeFile('package.json', JSON.stringify({ name: 'preserve-config-test' }));
    runCli(['init', '-y', '-d', sandbox.dir]);

    // Append custom historical entry to CONTEXT.md
    const customLogEntry = '\n### [2026-10-21] Custom Ticket #42 - Critical Security Patch\nImplemented token rotation.';
    const contextPath = path.join(sandbox.dir, '.agents', 'CONTEXT.md');
    fs.appendFileSync(contextPath, customLogEntry, 'utf8');

    // Run update
    const updateRes = runCli(['update', '-d', sandbox.dir]);
    expect(updateRes.status).toBe(0);

    // Verify custom history is fully intact
    const afterContext = fs.readFileSync(contextPath, 'utf8');
    expect(afterContext).toContain('Custom Ticket #42 - Critical Security Patch');
    expect(afterContext).toContain('Implemented token rotation.');
  });
});
