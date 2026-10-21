import fs from 'fs';
import path from 'path';
import pc from 'picocolors';
import boxen from 'boxen';
import { printBanner } from '../ui/banner.js';

export interface HooksOptions {
  install?: boolean;
  uninstall?: boolean;
  dir?: string;
}

export function hooksCommand(options: HooksOptions = {}): void {
  printBanner();

  const targetDir = options.dir ? path.resolve(options.dir) : process.cwd();
  const gitDir = path.join(targetDir, '.git');
  const hooksDir = path.join(gitDir, 'hooks');
  const preCommitHookPath = path.join(hooksDir, 'pre-commit');

  if (options.install) {
    if (!fs.existsSync(gitDir)) {
      console.log(`${pc.red('[FAIL]')} ${pc.bold('No se encontro el repositorio Git (.git/).')} Inicializa con 'git init' primero.`);
      process.exitCode = 1;
      return;
    }

    fs.mkdirSync(hooksDir, { recursive: true });

    const hookContent = `#!/bin/sh
# Orchestron Git Pre-Commit Hook (Deterministic Quality & Anti-Degradation Guard)
npx orchestron doctor --ci
`;

    fs.writeFileSync(preCommitHookPath, hookContent, 'utf8');
    try {
      fs.chmodSync(preCommitHookPath, 0o755);
    } catch {
      // Ignore chmod failures on Windows
    }

    console.log(
      boxen(
        `${pc.bold(pc.green('HOOK PRE-COMMIT INSTALADO EXITOSAMENTE'))}\n\n` +
        `${pc.bold('Ubicacion:')}          ${pc.white(path.relative(targetDir, preCommitHookPath))}\n` +
        `${pc.bold('Comando Ejecutado:')}  ${pc.cyan('orchestron doctor --ci')}\n\n` +
        `${pc.dim('Cada git commit validara automaticamente secretos, presupuesto de contexto y anti-degradacion.')}`,
        {
          padding: 1,
          margin: 1,
          borderColor: 'green',
          borderStyle: 'round'
        }
      )
    );
    process.exitCode = 0;
    return;
  }

  if (options.uninstall) {
    if (fs.existsSync(preCommitHookPath)) {
      fs.unlinkSync(preCommitHookPath);
      console.log(`${pc.green('[OK]')} Hook pre-commit desinstalado exitosamente.`);
    } else {
      console.log(`${pc.yellow('[INFO]')} No habia ningun hook pre-commit instalado.`);
    }
    process.exitCode = 0;
    return;
  }

  console.log(`${pc.cyan('Uso:')} orchestron hooks --install [-d <dir>]`);
  process.exitCode = 0;
}
