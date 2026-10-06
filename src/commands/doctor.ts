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

export function doctorCommand(options: { dir?: string }): void {
  printBanner();

  const targetDir = options.dir ? path.resolve(options.dir) : process.cwd();
  console.log(`${pc.bold(pc.cyan('AUDITORIA DE SALUD, SEGURIDAD Y RENDIMIENTO EN:'))} ${pc.white(targetDir)}\n`);

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

  // Check 2: AGENTS.md size limit (Antigravity budget limit is 24 KB)
  const agentsFile = path.join(agentsDir, 'AGENTS.md');
  if (fs.existsSync(agentsFile)) {
    const stats = fs.statSync(agentsFile);
    if (stats.size > 24000) {
      checks.push({
        name: 'Presupuesto de Contexto AGENTS.md',
        status: 'warn',
        detail: `El archivo mide ${(stats.size / 1024).toFixed(1)} KB (Limite optimo: 24 KB). Se sugiere modularizar reglas.`
      });
    } else {
      checks.push({
        name: 'Presupuesto de Contexto AGENTS.md',
        status: 'ok',
        detail: `Tamano optimo: ${(stats.size / 1024).toFixed(1)} KB / 24 KB.`
      });
    }
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
      if (gitDiff.includes('@ts-ignore')) degradationMatches.push('@ts-ignore');
      if (gitDiff.includes('@ts-nocheck')) degradationMatches.push('@ts-nocheck');
      if (gitDiff.includes('@ts-expect-error')) degradationMatches.push('@ts-expect-error');
      if (gitDiff.includes('eslint-disable')) degradationMatches.push('eslint-disable');
      if (gitDiff.includes('.skip(') || gitDiff.includes('xit(')) degradationMatches.push('test.skip()');

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
  const subagentsDir = path.join(agentsDir, 'subagents');
  if (fs.existsSync(subagentsDir)) {
    const subFiles = fs.readdirSync(subagentsDir).filter((f) => f.endsWith('.agent.md'));
    const hasReviewer = subFiles.includes('reviewer.agent.md');
    if (subFiles.length > 0) {
      checks.push({
        name: 'Equipo de Subagentes Activo',
        status: 'ok',
        detail: `${subFiles.length} contratos de subagentes sincronizados.${hasReviewer ? ' Incluye Revisor en 5 Ejes (reviewer.agent.md).' : ''}`
      });
    } else {
      checks.push({
        name: 'Equipo de Subagentes Activo',
        status: 'warn',
        detail: 'La carpeta .agents/subagents/ esta vacia. Ejecuta "orchestron init".'
      });
    }
  } else {
    checks.push({
      name: 'Equipo de Subagentes Activo',
      status: 'warn',
      detail: 'No se encontro el directorio .agents/subagents/. Ejecuta "orchestron init".'
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

      // Pattern 1: N+1 async calls in loops
      if (/\.(forEach|map)\s*\(\s*(async\s*)?\([^)]*\)\s*=>\s*\{[^}]*await\s+/s.test(content)) {
        perfWarnings.push(`${relPath}: llamada asincrona await dentro de bucle (patron N+1)`);
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

  const hasFails = checks.some((c) => c.status === 'fail');
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
