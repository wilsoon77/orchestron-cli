import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { computeExpandedAgentContextSize } from '../../src/commands/doctor.js';

describe('Unit: Doctor Expanded Agent Context Size', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-doctor-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return 0 bytes when neither root AGENTS.md nor .agents/AGENTS.md exists', () => {
    const res = computeExpandedAgentContextSize(tempDir);
    expect(res.baseBytes).toBe(0);
    expect(res.expandedBytes).toBe(0);
    expect(res.inlinedFiles).toEqual([]);
  });

  it('should measure base bytes correctly without inlining directives', () => {
    const agentsPath = path.join(tempDir, 'AGENTS.md');
    const content = '# Hello World\nNo directives here.';
    fs.writeFileSync(agentsPath, content, 'utf8');

    const res = computeExpandedAgentContextSize(tempDir);
    expect(res.baseBytes).toBe(Buffer.byteLength(content, 'utf8'));
    expect(res.expandedBytes).toBe(res.baseBytes);
    expect(res.inlinedFiles).toEqual([]);
  });

  it('should expand @[DIRECTIVE](path) and accumulate inlinedFiles', () => {
    const rootPath = path.join(tempDir, 'AGENTS.md');
    const dotAgents = path.join(tempDir, '.agents');
    fs.mkdirSync(dotAgents, { recursive: true });

    const constraintsPath = path.join(dotAgents, 'CONSTRAINTS.md');
    fs.writeFileSync(constraintsPath, '# CONSTRAINTS CONTENT\nZero degradation.\n', 'utf8');

    const rootContent = '# ROOT AGENTS\n@[CONSTRAINTS](.agents/CONSTRAINTS.md)\nFooter notes.';
    fs.writeFileSync(rootPath, rootContent, 'utf8');

    const res = computeExpandedAgentContextSize(tempDir);
    expect(res.inlinedFiles).toContain('.agents/CONSTRAINTS.md');
    expect(res.expandedBytes).toBeGreaterThan(res.baseBytes);
    expect(res.expandedBytes).toBe(Buffer.byteLength('# ROOT AGENTS\n# CONSTRAINTS CONTENT\nZero degradation.\n\nFooter notes.', 'utf8'));
  });

  it('should prevent infinite loops on circular inlining', () => {
    const fileA = path.join(tempDir, 'AGENTS.md');
    const fileB = path.join(tempDir, 'fileB.md');

    // Circular: fileA inlines fileB, fileB inlines fileA
    fs.writeFileSync(fileA, '# File A\n@[B](fileB.md)', 'utf8');
    fs.writeFileSync(fileB, '# File B\n@[A](AGENTS.md)', 'utf8');

    // Should complete cleanly without hanging or stack overflow
    const res = computeExpandedAgentContextSize(tempDir);
    expect(res.baseBytes).toBeGreaterThan(0);
    expect(res.expandedBytes).toBeGreaterThan(0);
  });

  it('should handle non-existent directive targets gracefully without throwing', () => {
    const rootPath = path.join(tempDir, 'AGENTS.md');
    fs.writeFileSync(rootPath, '# Header\n@[GHOST](non_existent_file.md)\nFooter', 'utf8');

    const res = computeExpandedAgentContextSize(tempDir);
    expect(res.baseBytes).toBe(Buffer.byteLength('# Header\n@[GHOST](non_existent_file.md)\nFooter', 'utf8'));
    expect(res.expandedBytes).toBe(Buffer.byteLength('# Header\n\nFooter', 'utf8'));
    expect(res.inlinedFiles).toEqual([]);
  });

  it('should count multi-byte UTF-8 characters accurately using byte length', () => {
    const rootPath = path.join(tempDir, 'AGENTS.md');
    const unicodeText = '# Título: Configuración y Validación 🚀';
    fs.writeFileSync(rootPath, unicodeText, 'utf8');

    const res = computeExpandedAgentContextSize(tempDir);
    expect(res.baseBytes).toBe(Buffer.byteLength(unicodeText, 'utf8'));
    expect(res.baseBytes).toBeGreaterThan(unicodeText.length); // UTF-8 byte count exceeds char count
  });
});
