import fs from 'fs';
import os from 'os';
import path from 'path';
import { DetectedMcp } from '../types/index.js';

export function detectAntigravityEnvironment(): { mcps: DetectedMcp[]; skills: string[] } {
  const mcps: DetectedMcp[] = [];
  const skills: string[] = [];

  const homeDir = os.homedir();
  const mcpDir = path.join(homeDir, '.gemini', 'antigravity', 'mcp');
  const userSkillsDir = path.join(homeDir, '.gemini', 'config', 'skills');
  const builtinSkillsDir = path.join(homeDir, '.gemini', 'antigravity', 'builtin', 'skills');

  // Detect MCP Servers
  if (fs.existsSync(mcpDir)) {
    try {
      const entries = fs.readdirSync(mcpDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const serverName = entry.name;
          const serverPath = path.join(mcpDir, serverName);
          const toolFiles = fs
            .readdirSync(serverPath)
            .filter((f) => f.endsWith('.json') && f !== 'package.json')
            .map((f) => path.basename(f, '.json'));

          let description = 'External integration server';
          if (serverName.includes('mysql')) {
            description = 'Local MySQL database inspector and query execution';
          } else if (serverName.includes('neon') || serverName.includes('postgres')) {
            description = 'PostgreSQL / Neon cloud database management';
          } else if (serverName.includes('supabase')) {
            description = 'Supabase backend & database tools';
          } else if (serverName.includes('clickup') || serverName.includes('jira') || serverName.includes('notion')) {
            description = 'Task management & documentation sync';
          } else if (serverName.includes('figma')) {
            description = 'Figma design tokens and UI mockups extractor';
          }

          mcps.push({
            name: serverName,
            tools: toolFiles,
            description
          });
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Detect Skills
  const checkSkillsDir = (dir: string) => {
    if (fs.existsSync(dir)) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !skills.includes(entry.name)) {
            skills.push(entry.name);
          }
        }
      } catch {}
    }
  };

  checkSkillsDir(userSkillsDir);
  checkSkillsDir(builtinSkillsDir);

  return { mcps, skills };
}
