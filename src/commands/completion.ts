import fs from 'fs';
import path from 'path';
import os from 'os';
import * as p from '@clack/prompts';
import boxen from 'boxen';
import pc from 'picocolors';
import { printBanner } from '../ui/banner.js';

export function getPowerShellCompletionScript(): string {
  return `
# Orchestron CLI Tab-Completion for PowerShell
Register-ArgumentCompleter -Native -CommandName orchestron -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)
    $commands = @(
        'init',
        'update',
        'learn',
        'team',
        'status',
        'doctor',
        'add-role',
        'sync',
        'completion',
        'menu',
        '--help',
        '--version',
        '--yes',
        '--dir',
        '--role',
        '--pattern',
        '--rule',
        '--type',
        '--json'
    )
    $commands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
        [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
    }
}
`;
}

export function getBashCompletionScript(): string {
  return `
# Orchestron CLI Tab-Completion for Bash
_orchestron_completions() {
    local cur="\${COMP_WORDS[COMP_CWORD]}"
    local commands="init update learn team status doctor add-role sync completion menu --help --version"
    COMPREPLY=( $(compgen -W "\${commands}" -- \${cur}) )
}
complete -F _orchestron_completions orchestron
`;
}

export async function completionCommand(options: { install?: boolean }): Promise<void> {
  printBanner();

  p.intro(pc.bgCyan(pc.black(' CONFIGURACION DE AUTOCOMPLETADO CON TAB ')));

  const isWindows = process.platform === 'win32';
  const script = isWindows ? getPowerShellCompletionScript() : getBashCompletionScript();

  if (options.install) {
    await installCompletion(isWindows, script);
    return;
  }

  const shouldInstall = await p.confirm({
    message: isWindows
      ? '¿Deseas instalar el autocompletado con TAB automaticamente en tu perfil de PowerShell?'
      : '¿Deseas instalar el autocompletado con TAB en tu terminal?',
    initialValue: true
  });

  if (p.isCancel(shouldInstall)) {
    p.cancel('Operacion cancelada');
    return;
  }

  if (shouldInstall) {
    await installCompletion(isWindows, script);
  } else {
    console.log(
      boxen(
        `${pc.bold('Para activar el autocompletado manualmente, anade esto a tu perfil:')}\n\n${pc.cyan(
          script.trim()
        )}`,
        {
          padding: 1,
          borderColor: 'cyan',
          borderStyle: 'round'
        }
      )
    );
    p.outro(pc.dim('Copia y pega el bloque en tu configuracion de shell.'));
  }
}

async function installCompletion(isWindows: boolean, script: string): Promise<void> {
  if (isWindows) {
    // PowerShell profile locations (PowerShell 7 and Windows PowerShell 5.1)
    const home = os.homedir();
    const docPath = path.join(home, 'Documents');
    const psCoreProfile = path.join(docPath, 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
    const winPsProfile = path.join(docPath, 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1');

    const targetProfiles = [psCoreProfile, winPsProfile];
    let installedAny = false;

    for (const profilePath of targetProfiles) {
      try {
        fs.mkdirSync(path.dirname(profilePath), { recursive: true });
        let currentContent = '';
        if (fs.existsSync(profilePath)) {
          currentContent = fs.readFileSync(profilePath, 'utf8');
        }

        if (!currentContent.includes('Register-ArgumentCompleter -Native -CommandName orchestron')) {
          fs.appendFileSync(profilePath, '\n' + script.trim() + '\n', 'utf8');
          installedAny = true;
        } else {
          installedAny = true;
        }
      } catch {
        // Ignore file access issues for inactive profiles
      }
    }

    if (installedAny) {
      console.log(
        boxen(
          `${pc.bold(pc.green('AUTOCOMPLETADO INSTALADO EN POWERSHELL'))}\n\n` +
            `${pc.white('Ahora puedes escribir')} ${pc.cyan('orchestron ')} ${pc.white('y presionar')} ${pc.yellow(
              '[TAB]'
            )} ${pc.white('para autocompletar:')}\n` +
            `  ${pc.cyan('•')} orchestron in${pc.yellow('[TAB]')}   -> orchestron init\n` +
            `  ${pc.cyan('•')} orchestron st${pc.yellow('[TAB]')}   -> orchestron status\n` +
            `  ${pc.cyan('•')} orchestron do${pc.yellow('[TAB]')}   -> orchestron doctor\n` +
            `  ${pc.cyan('•')} orchestron ad${pc.yellow('[TAB]')}   -> orchestron add-role\n` +
            `  ${pc.cyan('•')} orchestron sy${pc.yellow('[TAB]')}   -> orchestron sync\n\n` +
            `${pc.dim('Nota: Reinicia tu terminal o ejecuta ". $PROFILE" para cargar los cambios.')}`,
          {
            padding: 1,
            borderColor: 'green',
            borderStyle: 'round'
          }
        )
      );
      p.outro(pc.bold(pc.cyan('Autocompletado con TAB listo en PowerShell.')));
    } else {
      p.cancel('No se pudo escribir en el perfil de PowerShell automaticamente.');
    }
  } else {
    // Linux / macOS
    const bashRc = path.join(os.homedir(), '.bashrc');
    const zshRc = path.join(os.homedir(), '.zshrc');
    const targetFile = fs.existsSync(zshRc) ? zshRc : bashRc;

    try {
      fs.appendFileSync(targetFile, '\n' + script.trim() + '\n', 'utf8');
      p.outro(pc.bold(pc.cyan(`Autocompletado instalado en ${targetFile}. Reinicia tu terminal.`)));
    } catch (e) {
      p.cancel('No se pudo actualizar el archivo de configuracion.');
    }
  }
}
