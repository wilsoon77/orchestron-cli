import readline from 'readline';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { printBanner } from '../ui/banner.js';
import { initCommand } from './init.js';
import { statusCommand } from './status.js';
import { doctorCommand } from './doctor.js';
import { addRoleCommand } from './addRole.js';
import { syncCommand } from './sync.js';
import { completionCommand } from './completion.js';
import { teamCommand } from './team.js';
import { updateCommand } from './update.js';
import { learnCommand } from './learn.js';
import { positionalSelect } from '../ui/positionalSelector.js';

export interface CommandItem {
  id: string;
  slash: string;
  key: string;
  name: string;
  description: string;
  action: () => Promise<void> | void;
}

export async function interactivePaletteCommand(): Promise<void> {
  printBanner();

  const commands: CommandItem[] = [
    {
      id: 'init',
      slash: '/init',
      key: 'i',
      name: 'Inicializar Ecosistema',
      description: 'Configurar roles, gates y contexto en .agents/ (existente o desde cero)',
      action: async () => await initCommand({})
    },
    {
      id: 'update',
      slash: '/update',
      key: 'u',
      name: 'Actualizar Ecosistema',
      description: 'Anadir CONSTRAINTS, instintos y revisor 5 ejes sin perder CONTEXT.md',
      action: async () => await updateCommand({})
    },
    {
      id: 'learn',
      slash: '/learn',
      key: 'l',
      name: 'Aprender Patron / Instinto',
      description: 'Registrar solucion de bug o workaround en .agents/state/instincts.md',
      action: async () => await learnCommand({})
    },
    {
      id: 'team',
      slash: '/team',
      key: 'w',
      name: 'Equipo de Subagentes',
      description: 'Inspeccionar formacion de subagentes, roles paralelos y UI/UX specialist',
      action: async () => await teamCommand({})
    },
    {
      id: 'status',
      slash: '/status',
      key: 's',
      name: 'Dashboard de Estado',
      description: 'Inspeccionar estado de reglas y ultima sincronizacion de memoria',
      action: () => statusCommand({})
    },
    {
      id: 'doctor',
      slash: '/doctor',
      key: 'd',
      name: 'Auditor de Salud y Seguridad',
      description: 'Verificar presupuesto, secretos, comandos de riesgo y anti-degradacion',
      action: () => doctorCommand({})
    },
    {
      id: 'add-role',
      slash: '/add-role',
      key: 'a',
      name: 'Agregar Nuevo Rol',
      description: 'Sumar roles (DevOps, Mobile, Custom) al equipo',
      action: async () => await addRoleCommand({})
    },
    {
      id: 'sync',
      slash: '/sync',
      key: 'c',
      name: 'Registrar en Contexto',
      description: 'Registrar un nuevo hito o endpoint en .agents/CONTEXT.md',
      action: async () => await syncCommand({})
    },
    {
      id: 'completion',
      slash: '/completion',
      key: 't',
      name: 'Autocompletado con TAB',
      description: 'Instalar autocompletado nativo con TAB en tu terminal PowerShell/Bash',
      action: async () => await completionCommand({})
    },
    {
      id: 'exit',
      slash: '/exit',
      key: 'q',
      name: 'Salir',
      description: 'Cerrar la consola de Orchestron',
      action: () => {
        p.outro(pc.dim('Hasta pronto.'));
        process.exit(0);
      }
    }
  ];

  p.intro(
    pc.bgCyan(
      pc.black(' CONSOLA INTERACTIVA — Presiona [Enter] o usa comandos con diagonal (/) ')
    )
  );

  const options = commands.map((cmd) => ({
    value: cmd.id,
    label: `${cmd.slash.padEnd(12)} ${cmd.name}`,
    badge: `Atajo: ${cmd.key}`,
    hint: cmd.description,
    details: [
      `Comando: ${cmd.slash}`,
      `Atajo rapido de teclado: [${cmd.key}]`,
      `Finalidad: ${cmd.description}`
    ]
  }));

  const selectedId = await positionalSelect({
    title: 'PALETA DE COMANDOS ORCHESTRON',
    message: '¿Que accion deseas ejecutar?',
    options,
    initialValue: 'init'
  });

  if (p.isCancel(selectedId)) {
    p.outro(pc.dim('Sesion finalizada.'));
    return;
  }

  const chosen = commands.find((c) => c.id === selectedId);
  if (chosen) {
    await chosen.action();
  }
}
