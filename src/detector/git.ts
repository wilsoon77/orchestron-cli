import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface GitInfo {
  isRepo: boolean;
  defaultBranch: string;
  hasRemotes: boolean;
}

export function detectGitInfo(cwd: string): GitInfo {
  const gitDir = path.join(cwd, '.git');
  if (!fs.existsSync(gitDir)) {
    return {
      isRepo: false,
      defaultBranch: 'main',
      hasRemotes: false
    };
  }

  let defaultBranch = 'main';
  let hasRemotes = false;

  try {
    const branchOutput = execSync('git branch --show-current', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    if (branchOutput) defaultBranch = branchOutput;
  } catch {
    defaultBranch = 'main';
  }

  try {
    const remotesOutput = execSync('git remote', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    hasRemotes = remotesOutput.length > 0;
  } catch {
    hasRemotes = false;
  }

  return {
    isRepo: true,
    defaultBranch,
    hasRemotes
  };
}
