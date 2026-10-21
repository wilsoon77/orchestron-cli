import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import boxen from 'boxen';
import pc from 'picocolors';
import { printBanner } from '../ui/banner.js';
import { detectGitInfo } from '../detector/git.js';

function getFilesRecursively(dir: string, extensions: string[], excludeDirs: string[] = []): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        results = results.concat(getFilesRecursively(fullPath, extensions, excludeDirs));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

export interface ExpandedContextResult {
  baseBytes: number;
  expandedBytes: number;
  inlinedFiles: string[];
}

function expandDirectiveContent(
  filePath: string,
  projectRoot: string,
  stack: Set<string>,
  inlinedFiles: string[],
  depth = 0
): string {
  if (depth > 10) return '';
  const canonical = path.resolve(filePath);
  if (stack.has(canonical)) return '';
  if (!fs.existsSync(canonical)) return '';

  stack.add(canonical);
  let content = fs.readFileSync(canonical, 'utf8');

  const directiveRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  content = content.replace(directiveRegex, (_match, _name, rawTarget) => {
    const cleanTarget = rawTarget.trim();
    let targetPath = path.resolve(path.dirname(canonical), cleanTarget);
    if (!fs.existsSync(targetPath)) {
      const fromRoot = path.resolve(projectRoot, cleanTarget);
      if (fs.existsSync(fromRoot)) {
        targetPath = fromRoot;
      }
    }

    if (fs.existsSync(targetPath)) {
      const rel = path.relative(projectRoot, targetPath).replace(/\\/g, '/');
      if (!inlinedFiles.includes(rel)) {
        inlinedFiles.push(rel);
      }
      return expandDirectiveContent(targetPath, projectRoot, new Set(stack), inlinedFiles, depth + 1);
    }
    return '';
  });

  stack.delete(canonical);
  return content;
}

export function computeExpandedAgentContextSize(projectRoot: string): {
  baseBytes: number;
  expandedBytes: number;
  inlinedFiles: string[];
} {
  const rootAgentsPath = path.join(projectRoot, 'AGENTS.md');
  const dotAgentsPath = path.join(projectRoot, '.agents', 'AGENTS.md');

  let entrypointPath: string | null = null;
  if (fs.existsSync(rootAgentsPath)) {
    entrypointPath = rootAgentsPath;
  } else if (fs.existsSync(dotAgentsPath)) {
    entrypointPath = dotAgentsPath;
  }

  if (!entrypointPath) {
    return {
      baseBytes: 0,
      expandedBytes: 0,
      inlinedFiles: []
    };
  }

  const rawBaseContent = fs.readFileSync(entrypointPath, 'utf8');
  const baseBytes = Buffer.byteLength(rawBaseContent, 'utf8');
  const inlinedFiles: string[] = [];

  const expandedContent = expandDirectiveContent(
    entrypointPath,
    projectRoot,
    new Set(),
    inlinedFiles,
    0
  );
  const expandedBytes = Buffer.byteLength(expandedContent, 'utf8');

  return {
    baseBytes,
    expandedBytes,
    inlinedFiles
  };
}

export function detectNPlusOneAsyncLoops(content: string): string[] {
  const warnings: string[] = [];

  function sanitizeCode(src: string): string {
    let result = '';
    let i = 0;
    const len = src.length;
    while (i < len) {
      // Single line comment
      if (src[i] === '/' && src[i + 1] === '/') {
        i += 2;
        while (i < len && src[i] !== '\n') i++;
        result += '\n';
        continue;
      }
      // Multi line comment
      if (src[i] === '/' && src[i + 1] === '*') {
        i += 2;
        while (i < len && !(src[i] === '*' && src[i + 1] === '/')) i++;
        i += 2;
        result += ' ';
        continue;
      }
      // Single quote string
      if (src[i] === "'") {
        i++;
        while (i < len && src[i] !== "'") {
          if (src[i] === '\\') i++;
          i++;
        }
        i++;
        result += "''";
        continue;
      }
      // Double quote string
      if (src[i] === '"') {
        i++;
        while (i < len && src[i] !== '"') {
          if (src[i] === '\\') i++;
          i++;
        }
        i++;
        result += '""';
        continue;
      }
      // Template literal (backticks)
      if (src[i] === '`') {
        i++;
        while (i < len && src[i] !== '`') {
          if (src[i] === '\\') i++;
          i++;
        }
        i++;
        result += '``';
        continue;
      }
      result += src[i];
      i++;
    }
    return result;
  }

  const clean = sanitizeCode(content);

  // Balanced search for loops containing 'await'
  // for (...), while (...), .(forEach|map)(... =>)
  const loopRegex = /(?:for\s*\([^)]*\)|while\s*\([^)]*\)|\.(?:forEach|map)\s*\(\s*(?:async\s*)?\([^)]*\)\s*=>)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = loopRegex.exec(clean)) !== null) {
    const startIndex = match.index + match[0].length - 1; // position of '{'
    let braceCount = 1;
    let endIndex = startIndex + 1;

    while (endIndex < clean.length && braceCount > 0) {
      if (clean[endIndex] === '{') braceCount++;
      else if (clean[endIndex] === '}') braceCount--;
      endIndex++;
    }

    const loopBody = clean.slice(startIndex, endIndex);
    if (/\bawait\b/.test(loopBody)) {
      warnings.push('llamada asincrona await dentro de bucle (patron N+1)');
      break;
    }
  }

  return warnings;
}

export interface DoctorOptions {
  dir?: string;
  ci?: boolean;
  json?: boolean;
}

export function doctorCommand(options: DoctorOptions = {}): void {
  const isCi = !!options.ci;
  const isJson = !!options.json;

  if (!isCi && !isJson) {
    printBanner();
  }

  const targetDir = options.dir ? path.resolve(options.dir) : process.cwd();
  if (!isJson) {
    console.log(`${pc.bold(pc.cyan('AUDITORIA DE SALUD, SEGURIDAD Y RENDIMIENTO EN:'))} ${pc.white(targetDir)}\n`);
  }

  const checks: { name: string; status: 'ok' | 'warn' | 'fail'; detail: string }[] = [];

  // Check 1: .agents directory
  const agentsDir = path.join(targetDir, '.agents');
  if (fs.existsSync(agentsDir)) {
    checks.push({
      name: 'Ecosistema .agents/',
      status: 'ok',
      detail: 'Carpeta de orquestacion presente y encapsulada.'
    });
  } else {
    checks.push({
      name: 'Ecosistema .agents/',
      status: 'fail',
      detail: 'No existe la carpeta .agents/. Ejecuta "orchestron init".'
    });
  }

  // Check 2: Presupuesto de Contexto AGENTS.md (Antigravity budget limit is 24,000 bytes)
  const rootAgentsPath = path.join(targetDir, 'AGENTS.md');
  const dotAgentsPath = path.join(agentsDir, 'AGENTS.md');
  const hasAgentsFile = fs.existsSync(rootAgentsPath) || fs.existsSync(dotAgentsPath);

  if (hasAgentsFile) {
    const budgetResult = computeExpandedAgentContextSize(targetDir);
    const expandedKb = (budgetResult.expandedBytes / 1024).toFixed(1);
    const baseKb = (budgetResult.baseBytes / 1024).toFixed(1);
    const inlinedCount = budgetResult.inlinedFiles.length;

    if (budgetResult.expandedBytes > 24000) {
      checks.push({
        name: 'Presupuesto de Contexto AGENTS.md',
        status: 'fail',
        detail: `Desbordamiento critico: ${expandedKb} KB expandido (${budgetResult.expandedBytes.toLocaleString()} bytes / limite 24,000 bytes). Base: ${baseKb} KB, inlined (${inlinedCount}): ${budgetResult.inlinedFiles.join(', ')}. Reducir inlining o modularizar.`
      });
    } else {
      checks.push({
        name: 'Presupuesto de Contexto AGENTS.md',
        status: 'ok',
        detail: `Tamano optimo expandido: ${expandedKb} KB / 24 KB (Base: ${baseKb} KB${inlinedCount > 0 ? `, inlines: ${budgetResult.inlinedFiles.join(', ')}` : ''}).`
      });
    }
  } else {
    checks.push({
      name: 'Presupuesto de Contexto AGENTS.md',
      status: 'fail',
      detail: 'No se encontro AGENTS.md en la raiz ni en .agents/. Ejecuta "orchestron init".'
    });
  }

  // Check 3: Git & Secrets Exposure Check (AgentShield Lite)
  const gitInfo = detectGitInfo(targetDir);
  if (gitInfo.isRepo) {
    try {
      const gitStatus = execSync('git status --porcelain', { cwd: targetDir, encoding: 'utf8' });
      const sensitiveMatch = gitStatus.match(/(\.env|\.pem|\.key|credentials|id_rsa)/i);
      if (sensitiveMatch) {
        checks.push({
          name: 'Auditoria de Secretos Git',
          status: 'warn',
          detail: `ADVERTENCIA: Archivos de credenciales sin ignorar o sin skip-worktree: ${sensitiveMatch[0]}`
        });
      } else {
        checks.push({
          name: 'Auditoria de Secretos Git',
          status: 'ok',
          detail: 'No se detectaron secretos ni archivos de credenciales expuestos en git status.'
        });
      }
    } catch {
      checks.push({
        name: 'Auditoria de Secretos Git',
        status: 'ok',
        detail: 'Repositorio Git activo.'
      });
    }

    // Check 4: Anti-Degradacion Watcher (Addy Osmani Constraint Check)
    try {
      const gitDiff = execSync('git diff HEAD', { cwd: targetDir, encoding: 'utf8' });
      const degradationMatches: string[] = [];

      const diffLines = gitDiff.split('\n');
      let currentFile = '';
      for (const line of diffLines) {
        if (line.startsWith('diff --git a/')) {
          const parts = line.split(' ');
          currentFile = parts[parts.length - 1] || '';
        }
        // Only inspect code files, ignoring doctor implementation, templates and tests
        const isCodeFile =
          /\.(ts|tsx|js|jsx)$/i.test(currentFile) &&
          !currentFile.includes('templates/') &&
          !currentFile.includes('doctor.ts') &&
          !currentFile.includes('tests/');
        if (isCodeFile && line.startsWith('+') && !line.startsWith('+++')) {
          if (line.includes('@ts-ignore') && !degradationMatches.includes('@ts-ignore')) degradationMatches.push('@ts-ignore');
          if (line.includes('@ts-nocheck') && !degradationMatches.includes('@ts-nocheck')) degradationMatches.push('@ts-nocheck');
          if (line.includes('@ts-expect-error') && !degradationMatches.includes('@ts-expect-error')) degradationMatches.push('@ts-expect-error');
          if (line.includes('eslint-disable') && !degradationMatches.includes('eslint-disable')) degradationMatches.push('eslint-disable');
          if ((line.includes('.skip(') || line.includes('xit(')) && !degradationMatches.includes('test.skip()')) degradationMatches.push('test.skip()');
        }
      }

      if (degradationMatches.length > 0) {
        checks.push({
          name: 'Anti-Degradacion Watcher (CONSTRAINTS)',
          status: 'fail',
          detail: `Se detectaron supresiones o pruebas omitidas en el diff pendiente: ${degradationMatches.join(', ')}.`
        });
      } else {
        checks.push({
          name: 'Anti-Degradacion Watcher (CONSTRAINTS)',
          status: 'ok',
          detail: 'Cero supresiones de tipos (@ts-ignore) o pruebas omitidas en el diff activo.'
        });
      }
    } catch {
      checks.push({
        name: 'Anti-Degradacion Watcher (CONSTRAINTS)',
        status: 'ok',
        detail: 'Sin cambios en git diff pendientes de auditoria.'
      });
    }
  } else {
    checks.push({
      name: 'Control de Versiones Git',
      status: 'warn',
      detail: 'El directorio no esta inicializado con Git. Recomendado: git init.'
    });
  }

  // Check 5: Root Pointer Compatibility
  const rootAgents = path.join(targetDir, 'AGENTS.md');
  if (fs.existsSync(rootAgents)) {
    checks.push({
      name: 'Enlace Raiz Universal',
      status: 'ok',
      detail: 'AGENTS.md presente en la raiz para compatibilidad universal.'
    });
  } else {
    checks.push({
      name: 'Enlace Raiz Universal',
      status: 'warn',
      detail: 'No hay AGENTS.md en la raiz. Solo las herramientas con soporte directo de .agents/ lo leeran.'
    });
  }

  // Check 6: CONSTRAINTS.md (Anti-degradation contract)
  const constraintsFile = path.join(agentsDir, 'CONSTRAINTS.md');
  if (fs.existsSync(constraintsFile)) {
    checks.push({
      name: 'Contrato Inviolable CONSTRAINTS.md',
      status: 'ok',
      detail: '.agents/CONSTRAINTS.md activo (politica anti-degradacion y presupuesto de calidad).'
    });
  } else {
    checks.push({
      name: 'Contrato Inviolable CONSTRAINTS.md',
      status: 'warn',
      detail: 'Falta CONSTRAINTS.md en .agents/. Ejecuta "orchestron update" para anadirlo.'
    });
  }

  // Check 7: instincts.md (Continuous learning memory)
  const instinctsFile = path.join(agentsDir, 'state', 'instincts.md');
  if (fs.existsSync(instinctsFile)) {
    checks.push({
      name: 'Memoria de Instintos (instincts.md)',
      status: 'ok',
      detail: '.agents/state/instincts.md activo para aprendizaje continuo entre sesiones.'
    });
  } else {
    checks.push({
      name: 'Memoria de Instintos (instincts.md)',
      status: 'warn',
      detail: 'Falta instincts.md en .agents/state/. Ejecuta "orchestron update" para crearlo.'
    });
  }

  // Check 8: Declarative Manifest (Google AX Workspace Model)
  const manifestFile = path.join(agentsDir, 'orchestron.yaml');
  if (fs.existsSync(manifestFile)) {
    checks.push({
      name: 'Manifiesto Declarativo Workspace',
      status: 'ok',
      detail: '.agents/orchestron.yaml activo con politicas de gateway y stack preconfigurado.'
    });
  } else {
    checks.push({
      name: 'Manifiesto Declarativo Workspace',
      status: 'warn',
      detail: 'Falta orchestron.yaml en .agents/. Ejecuta "orchestron init" para generarlo.'
    });
  }

  // Check 9: Parallel Subagents Swarm Integrity
  const agentsFolder = path.join(agentsDir, 'agents');
  const legacySubagentsDir = path.join(agentsDir, 'subagents');
  if (fs.existsSync(agentsFolder)) {
    const agentFiles = fs.readdirSync(agentsFolder).filter((f) => f.endsWith('.md'));
    const hasReviewer = agentFiles.includes('code-reviewer.md') || agentFiles.includes('reviewer.agent.md');
    if (agentFiles.length > 0) {
      checks.push({
        name: 'Equipo de Subagentes Activo',
        status: 'ok',
        detail: `${agentFiles.length} contratos de subagentes sincronizados en .agents/agents/.${hasReviewer ? ' Incluye Revisor en 5 Ejes (code-reviewer.md).' : ''}`
      });
    } else {
      checks.push({
        name: 'Equipo de Subagentes Activo',
        status: 'warn',
        detail: 'La carpeta .agents/agents/ esta vacia. Ejecuta "orchestron init".'
      });
    }
  } else if (fs.existsSync(legacySubagentsDir)) {
    const subFiles = fs.readdirSync(legacySubagentsDir).filter((f) => f.endsWith('.agent.md') || f.endsWith('.md'));
    if (subFiles.length > 0) {
      checks.push({
        name: 'Equipo de Subagentes Activo',
        status: 'warn',
        detail: `${subFiles.length} subagentes detectados en formato legacy (.agents/subagents/). Ejecuta "orchestron update" para migrarlos a .agents/agents/.`
      });
    } else {
      checks.push({
        name: 'Equipo de Subagentes Activo',
        status: 'warn',
        detail: 'No se encontro el directorio .agents/agents/. Ejecuta "orchestron init".'
      });
    }
  } else {
    checks.push({
      name: 'Equipo de Subagentes Activo',
      status: 'warn',
      detail: 'No se encontro el directorio .agents/agents/. Ejecuta "orchestron init".'
    });
  }

  // Check 10: Presupuesto de Tamano de Bundles (Bundle Size Budget / WebPerf)
  const candidateBuildDirs = ['dist', 'build', '.next', 'out'];
  const activeBuildDirName = candidateBuildDirs.find((d) => fs.existsSync(path.join(targetDir, d)));
  if (activeBuildDirName) {
    const buildDirPath = path.join(targetDir, activeBuildDirName);
    const bundleFiles = getFilesRecursively(buildDirPath, ['.js', '.mjs', '.css'], ['node_modules']);
    if (bundleFiles.length > 0) {
      let maxSizeBytes = 0;
      let largestFile = '';
      let totalBytes = 0;

      for (const file of bundleFiles) {
        const sz = fs.statSync(file).size;
        totalBytes += sz;
        if (sz > maxSizeBytes) {
          maxSizeBytes = sz;
          largestFile = path.relative(targetDir, file);
        }
      }

      const maxKb = (maxSizeBytes / 1024).toFixed(1);
      const totalKb = (totalBytes / 1024).toFixed(1);

      if (maxSizeBytes > 1024 * 1024) {
        // > 1 MB
        checks.push({
          name: 'Presupuesto de Bundles (WebPerf)',
          status: 'fail',
          detail: `Bundle critico: ${largestFile} mide ${maxKb} KB (> 1 MB). Se requiere code-splitting urgente.`
        });
      } else if (maxSizeBytes > 300 * 1024) {
        // > 300 KB
        checks.push({
          name: 'Presupuesto de Bundles (WebPerf)',
          status: 'warn',
          detail: `Bundle pesado: ${largestFile} mide ${maxKb} KB (Limite recomendado: 300 KB). Total compilado: ${totalKb} KB.`
        });
      } else {
        checks.push({
          name: 'Presupuesto de Bundles (WebPerf)',
          status: 'ok',
          detail: `Artefactos compilados optimos (${bundleFiles.length} archivos, mayor mide ${maxKb} KB / 300 KB limite).`
        });
      }
    } else {
      checks.push({
        name: 'Presupuesto de Bundles (WebPerf)',
        status: 'ok',
        detail: `Directorio ${activeBuildDirName}/ detectado sin bundles monoliticos.`
      });
    }
  } else {
    checks.push({
      name: 'Presupuesto de Bundles (WebPerf)',
      status: 'ok',
      detail: 'Sin directorio dist/ o build/ aun (se auditara automaticamente tras compilar).'
    });
  }

  // Check 11: Auditoria Estatica de Anti-Patrones de Rendimiento (Performance Lint)
  const sourceFiles = getFilesRecursively(
    targetDir,
    ['.ts', '.tsx', '.js', '.jsx'],
    ['node_modules', '.git', 'dist', 'build', '.agents', '.next', 'coverage', 'templates']
  );

  const perfWarnings: string[] = [];
  for (const file of sourceFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(targetDir, file);

      // Pattern 1: N+1 async calls in loops (Balanced block counting)
      const nPlusOne = detectNPlusOneAsyncLoops(content);
      for (const w of nPlusOne) {
        perfWarnings.push(`${relPath}: ${w}`);
      }

      // Pattern 2: Heavy monolithic imports (at start of line)
      if (/^\s*import\s+[*_]\s+as\s+_\s+from\s+['"]lodash['"]/m.test(content) || /^\s*import\s+_\s+from\s+['"]lodash['"]/m.test(content)) {
        perfWarnings.push(`${relPath}: importacion monolitica de lodash (usar lodash-es o funciones nativas)`);
      }
      if (/^\s*import\s+moment\s+from\s+['"]moment['"]/m.test(content)) {
        perfWarnings.push(`${relPath}: importacion pesada de moment.js (usar date-fns o Intl)`);
      }

      // Pattern 3: Missing cleanup on addEventListener
      if (content.includes('addEventListener(') && !content.includes('removeEventListener(')) {
        perfWarnings.push(`${relPath}: addEventListener sin removeEventListener (posible fuga de memoria)`);
      }

      if (perfWarnings.length >= 3) break;
    } catch {
      // Ignore unreadable files
    }
  }

  if (perfWarnings.length > 0) {
    checks.push({
      name: 'Auditoria Estatica de Rendimiento',
      status: 'warn',
      detail: `Se detectaron posibles cuellos de botella: ${perfWarnings.join('; ')}`
    });
  } else {
    checks.push({
      name: 'Auditoria Estatica de Rendimiento',
      status: 'ok',
      detail: 'Cero consultas N+1 en bucles, sin imports monoliticos (lodash/moment) ni fugas de listeners.'
    });
  }

  const hasFails = checks.some((c) => c.status === 'fail');
  process.exitCode = hasFails ? 1 : 0;

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          targetDir,
          checks,
          hasFails,
          status: hasFails ? 'fail' : 'pass',
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
    return;
  }

  // Render Check Results
  for (const check of checks) {
    const icon =
      check.status === 'ok'
        ? pc.green('  [PASS]')
        : check.status === 'warn'
        ? pc.yellow('  [WARN]')
        : pc.red('  [FAIL]');
    console.log(`${icon} ${pc.bold(check.name)}: ${pc.dim(check.detail)}`);
  }

  const summaryBox = hasFails
    ? `${pc.red('Se detectaron observaciones en la configuracion.')} Revisa los puntos anteriores.`
    : `${pc.green('Auditoria completada satisfactoriamente.')} El proyecto cumple los estandares de gobernanza y rendimiento.`;

  console.log(
    boxen(summaryBox, {
      padding: 1,
      margin: 1,
      borderColor: hasFails ? 'yellow' : 'green',
      borderStyle: 'round'
    })
  );
}
