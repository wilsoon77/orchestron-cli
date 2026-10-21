import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync, execSync } from 'child_process';

const PROJECT_ROOT = process.cwd();
const CLI_DIST = path.resolve(PROJECT_ROOT, 'dist/index.js');
const CLI_SRC = path.resolve(PROJECT_ROOT, 'src/index.ts');

export interface CliExecutionResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

export interface TestSandbox {
  dir: string;
  cleanup: () => void;
  readFile: (relPath: string) => string;
  fileExists: (relPath: string) => boolean;
  writeFile: (relPath: string, content: string) => void;
  mkdir: (relPath: string) => void;
}

/**
 * Creates an isolated sandboxed directory in the OS temp directory.
 */
export function createTestSandbox(prefix = 'orchestron-e2e-'): TestSandbox {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));

  return {
    dir,
    cleanup: () => {
      try {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        }
      } catch {
        // Silently tolerate Windows file locking on temp dirs during rapid cleanup
      }
    },
    readFile: (relPath: string) => {
      const target = path.join(dir, relPath);
      return fs.readFileSync(target, 'utf8');
    },
    fileExists: (relPath: string) => {
      const target = path.join(dir, relPath);
      return fs.existsSync(target);
    },
    writeFile: (relPath: string, content: string) => {
      const target = path.join(dir, relPath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, 'utf8');
    },
    mkdir: (relPath: string) => {
      const target = path.join(dir, relPath);
      fs.mkdirSync(target, { recursive: true });
    }
  };
}

/**
 * Executes the Orchestron CLI using tsx inside a given working directory.
 */
export function runCli(
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number; input?: string } = {}
): CliExecutionResult {
  const cwd = options.cwd || PROJECT_ROOT;
  const entry = fs.existsSync(CLI_DIST) ? CLI_DIST : CLI_SRC;
  const isTs = entry.endsWith('.ts');
  const executable = isTs ? (process.platform === 'win32' ? 'npx.cmd' : 'npx') : process.execPath;
  const fullArgs = isTs ? ['tsx', entry, ...args] : [entry, ...args];

  const result = spawnSync(executable, fullArgs, {
    cwd,
    encoding: 'utf8',
    input: options.input !== undefined ? options.input : '\n', // Prevent hanging on interactive prompts
    env: { ...process.env, ...(options.env || {}) },
    timeout: options.timeout || 20000,
    shell: false
  });

  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error
  };
}

/**
 * Initializes a minimal git repository in the sandbox to satisfy git-dependent checks.
 */
export function initGitRepoInSandbox(dir: string): void {
  try {
    execSync('git init', { cwd: dir, stdio: 'ignore' });
    execSync('git config user.email "test@orchestron.test"', { cwd: dir, stdio: 'ignore' });
    execSync('git config user.name "Orchestron Tester"', { cwd: dir, stdio: 'ignore' });
  } catch {
    // If git is unavailable in environment, tests handle gracefully
  }
}

/**
 * Checks if a string begins with valid YAML frontmatter delimiter (---).
 */
export function hasYamlFrontmatter(content: string): boolean {
  if (!content.startsWith('---')) return false;
  const secondIndex = content.indexOf('---', 3);
  return secondIndex !== -1;
}

/**
 * Extracts and parses key-value pairs from YAML frontmatter without external dependencies.
 */
export function parseYamlFrontmatter(content: string): Record<string, string> {
  const data: Record<string, string> = {};
  if (!content.startsWith('---')) return data;

  const closingIndex = content.indexOf('---', 3);
  if (closingIndex === -1) return data;

  const yamlBlock = content.slice(3, closingIndex).trim();
  const lines = yamlBlock.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.slice(0, colonIndex).trim();
      let value = trimmed.slice(colonIndex + 1).trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  }

  return data;
}

/**
 * Calculates expanded size of a markdown file resolving @[label](relPath) directives.
 */
export function computeExpandedFileSize(filePath: string, baseDir: string, visited: Set<string> = new Set()): number {
  if (!fs.existsSync(filePath)) return 0;
  const canonicalPath = path.resolve(filePath);
  if (visited.has(canonicalPath)) return 0;
  visited.add(canonicalPath);

  let content = fs.readFileSync(filePath, 'utf8');
  const directiveRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;

  content = content.replace(directiveRegex, (_, __, targetRelPath) => {
    const targetAbsPath = path.resolve(baseDir, targetRelPath);
    if (fs.existsSync(targetAbsPath) && !visited.has(targetAbsPath)) {
      return fs.readFileSync(targetAbsPath, 'utf8');
    }
    return '';
  });

  return Buffer.byteLength(content, 'utf8');
}
