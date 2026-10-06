import * as p from '@clack/prompts';
import pc from 'picocolors';
import { ProjectStack, OrchestronConfig } from '../types/index.js';
import { DEFAULT_ROLES } from '../roles/catalog.js';
import { positionalMultiSelect, positionalSelect } from '../ui/positionalSelector.js';

export async function runInteractiveWizard(
  detectedStack: ProjectStack,
  options: { yes?: boolean } = {}
): Promise<OrchestronConfig | null> {
  const isGreenfield = detectedStack.isGreenfield;

  // If --yes flag is given, generate default config immediately
  if (options.yes) {
    return {
      projectName: detectedStack.name,
      stack: detectedStack,
      selectedRoles: DEFAULT_ROLES.map((r) => r.id),
      qualityGatesLevel: 'strict',
      strictGuardrails: {
        zeroEmojisInCode: true,
        protectSecrets: true,
        requirePlanApproval: true,
        requireCompileGate: true,
        atomicGitBranches: true
      },
      encapsulation: {
        folder: '.agents',
        generateRootPointer: true,
        generateClaudeMdCompat: true,
        generateCursorRulesCompat: true
      },
      livingContext: {
        enabled: true,
        fileName: 'CONTEXT.md',
        autoUpdateOnFinish: true
      }
    };
  }

  p.intro(pc.bgCyan(pc.black(' CONFIGURACION DE EQUIPO DE AGENTES & QUALITY GATES ')));

  // Display Detected Stack
  const summaryLines: string[] = [
    `${pc.bold('Proyecto:')} ${detectedStack.name} (${detectedStack.type})`,
    detectedStack.frontend
      ? `${pc.bold('Frontend:')} ${detectedStack.frontend.framework} ${detectedStack.frontend.version || ''}`
      : `${pc.bold('Frontend:')} ${pc.dim(isGreenfield ? 'Por definir' : 'No aplica')}`,
    detectedStack.backend
      ? `${pc.bold('Backend/App:')} ${detectedStack.backend.framework} (${detectedStack.backend.language})`
      : `${pc.bold('Backend/App:')} ${pc.dim(isGreenfield ? 'Por definir' : 'No aplica')}`,
    detectedStack.database
      ? `${pc.bold('Base de Datos:')} ${detectedStack.database.engine}`
      : `${pc.bold('Base de Datos:')} ${pc.dim(isGreenfield ? 'Por definir' : 'No detectada')}`,
    detectedStack.commands.build
      ? `${pc.bold('Comando Build:')} ${detectedStack.commands.build}`
      : '',
    detectedStack.detectedMcps.length > 0
      ? `${pc.bold('MCPs Antigravity:')} ${detectedStack.detectedMcps.map((m) => m.name).join(', ')}`
      : `${pc.bold('MCPs:')} ${pc.dim('Ninguno detectado')}`
  ].filter(Boolean);

  p.note(summaryLines.join('\n'), isGreenfield ? 'Proyecto Nuevo / Sin Stack Previo' : 'Stack y Entorno Auto-Detectado');

  // Step 1: Project Name
  const projectName = await p.text({
    message: isGreenfield
      ? 'Nombre del proyecto / ecosistema:'
      : `Confirmar nombre del proyecto (Enter para "${detectedStack.name}"):`,
    placeholder: detectedStack.name,
    defaultValue: detectedStack.name
  });

  if (p.isCancel(projectName)) {
    p.cancel('Operacion cancelada');
    return null;
  }

  // Greenfield Wizard: Ask questions to define stack if not detected
  if (isGreenfield) {
    const archChoice = await positionalSelect({
      title: 'ARQUITECTURA DEL PROYECTO',
      message: 'No se detecto arquitectura previa. ¿Que tipo de proyecto vas a construir?',
      options: [
        { value: 'fullstack', label: 'Fullstack (Frontend + Backend API)', hint: 'SPA Web + Endpoints API y Servicios' },
        { value: 'frontend', label: 'Frontend SPA / Web App', hint: 'Solo aplicacion web cliente' },
        { value: 'backend', label: 'Backend API / Microservicio', hint: 'Solo servicios, controladores y base de datos' },
        { value: 'generic', label: 'Herramienta CLI / Libreria / Scripting', hint: 'Herramienta de consola o libreria' }
      ],
      initialValue: 'fullstack'
    });

    if (p.isCancel(archChoice)) {
      p.cancel('Operacion cancelada');
      return null;
    }

    detectedStack.type = archChoice as any;

    // Ask Frontend if applicable
    if (archChoice === 'fullstack' || archChoice === 'frontend') {
      const feChoice = await positionalSelect({
        title: 'FRAMEWORK FRONTEND',
        message: '¿Que framework de Frontend utilizaras?',
        options: [
          { value: 'Next.js', label: 'Next.js (React / SSR)', hint: 'App Router / Pages' },
          { value: 'React', label: 'React + Vite', hint: 'SPA reactivo moderno' },
          { value: 'Angular', label: 'Angular 18+ (Standalone Components)', hint: 'TypeScript empresarial' },
          { value: 'Vue.js', label: 'Vue 3 + Vite', hint: 'Composition API' },
          { value: 'Astro', label: 'Astro', hint: 'Contenido optimizado e islas' },
          { value: 'Otro', label: 'Otro / Vanilla TypeScript', hint: 'Sin framework pesado' }
        ],
        initialValue: 'Next.js'
      });

      if (p.isCancel(feChoice)) {
        p.cancel('Operacion cancelada');
        return null;
      }

      const uiChoice = await positionalSelect({
        title: 'SISTEMA DE ESTILOS Y COMPONENTES',
        message: '¿Que libreria o sistema de estilos utilizaras en Frontend?',
        options: [
          { value: 'Tailwind CSS', label: 'Tailwind CSS', hint: 'Utilidades atomicas responsivas' },
          { value: 'Shadcn/ui', label: 'Shadcn/ui + Tailwind CSS', hint: 'Componentes accesibles y personalizables' },
          { value: 'Material UI', label: 'Material UI (MUI)', hint: 'Design System de Google' },
          { value: 'CSS Modules', label: 'CSS / SASS Modules', hint: 'Estilos aislados por componente' },
          { value: 'Ninguna', label: 'CSS Estandar', hint: 'Hojas de estilo nativas' }
        ],
        initialValue: 'Tailwind CSS'
      });

      if (p.isCancel(uiChoice)) {
        p.cancel('Operacion cancelada');
        return null;
      }

      detectedStack.frontend = {
        framework: feChoice as string,
        uiLibrary: uiChoice === 'Ninguna' ? undefined : (uiChoice as string)
      };

      if (!detectedStack.commands.build) {
        detectedStack.commands.build = feChoice === 'Angular' ? 'ng build' : 'npm run build';
      }
      if (!detectedStack.commands.test) {
        detectedStack.commands.test = feChoice === 'Angular' ? 'ng test' : 'npm test';
      }
    }

    // Ask Backend if applicable
    if (archChoice === 'fullstack' || archChoice === 'backend') {
      const beChoice = await positionalSelect({
        title: 'TECNOLOGIA DE SERVIDOR',
        message: '¿Que tecnologia / lenguaje utilizaras en el Backend?',
        options: [
          { value: 'NestJS', label: 'NestJS (Node.js / TypeScript)', hint: 'Arquitectura modular inyectable' },
          { value: 'Spring Boot', label: 'Spring Boot (Java 21 / Maven)', hint: 'Enterprise Java robusto' },
          { value: 'Express', label: 'Express.js (TypeScript)', hint: 'Servidor minimalista y rapido' },
          { value: 'FastAPI', label: 'FastAPI (Python 3)', hint: 'APIs asincronas con validacion Pydantic' },
          { value: 'Django', label: 'Django (Python 3)', hint: 'Baterias incluidas con ORM' },
          { value: 'Go', label: 'Go (Golang)', hint: 'Microservicios de alto rendimiento' }
        ],
        initialValue: 'NestJS'
      });

      if (p.isCancel(beChoice)) {
        p.cancel('Operacion cancelada');
        return null;
      }

      let lang = 'TypeScript';
      let buildCmd = 'npm run build';
      let testCmd = 'npm test';

      if (beChoice === 'Spring Boot') {
        lang = 'Java 21';
        buildCmd = 'mvn clean compile -DskipTests';
        testCmd = 'mvn test-compile';
      } else if (beChoice === 'FastAPI' || beChoice === 'Django') {
        lang = 'Python 3';
        buildCmd = 'python -m compileall .';
        testCmd = 'pytest';
      } else if (beChoice === 'Go') {
        lang = 'Go';
        buildCmd = 'go build ./...';
        testCmd = 'go test ./...';
      }

      detectedStack.backend = {
        framework: beChoice as string,
        language: lang
      };

      detectedStack.commands.build = buildCmd;
      detectedStack.commands.test = testCmd;
    }

    // Ask Database
    const dbChoice = await positionalSelect({
      title: 'MOTOR DE BASE DE DATOS',
      message: '¿Que motor de Base de Datos utilizara el proyecto?',
      options: [
        { value: 'PostgreSQL', label: 'PostgreSQL', hint: 'Base relacional estandar y extensible' },
        { value: 'MySQL', label: 'MySQL', hint: 'Base relacional clasica' },
        { value: 'Supabase', label: 'Supabase (PostgreSQL Cloud)', hint: 'BaaS con Auth y Realtime' },
        { value: 'Neon', label: 'Neon Serverless Postgres', hint: 'Branching instantaneo de base de datos' },
        { value: 'MongoDB', label: 'MongoDB', hint: 'Documentos JSON / NoSQL' },
        { value: 'SQLite', label: 'SQLite (Local)', hint: 'Archivo local sin servidor' },
        { value: 'Ninguna', label: 'Ninguna / Sin Base de Datos', hint: 'Stateless / Sin persistencia relacional' }
      ],
      initialValue: 'PostgreSQL'
    });

    if (p.isCancel(dbChoice)) {
      p.cancel('Operacion cancelada');
      return null;
    }

    if (dbChoice !== 'Ninguna') {
      detectedStack.database = {
        engine: dbChoice as string
      };
    }
  }

  // Step 2: Select Sub-Agent Roles with crystal-clear navigation and live inspector
  const selectedRoles = await positionalMultiSelect({
    title: 'EQUIPO DE ROLES Y SUBAGENTES',
    message: 'Selecciona los roles de subagentes que formaran el equipo:',
    options: DEFAULT_ROLES.map((role) => ({
      value: role.id,
      label: `${role.icon.padEnd(12)} ${role.name}`,
      hint: role.goal,
      details: [
        `Titulo: ${role.title}`,
        `Meta: ${role.goal}`,
        `Responsabilidad Clave: ${role.responsibilities[0]}`,
        `Regla Inviolable: ${role.rules[0]}`
      ]
    })),
    initialValues: DEFAULT_ROLES.map((r) => r.id),
    required: true
  });

  if (p.isCancel(selectedRoles)) {
    p.cancel('Operacion cancelada');
    return null;
  }

  // Step 3: Quality Gates Rigor
  const qualityGatesLevel = await positionalSelect({
    title: 'PUERTAS DE CALIDAD (QUALITY GATES)',
    message: 'Nivel de rigor para las Puertas de Calidad (Quality Gates):',
    options: [
      {
        value: 'strict',
        label: '[Riguroso] (Recomendado)',
        hint: 'Exige aprobacion de plan (Gate 1), 0 errores de compilacion (Gate 2) y auditoria Git (Gate 3)',
        details: [
          'Gate 1: Bloquea codificacion hasta aprobacion explicita del plan y contratos DTO.',
          'Gate 2: Bloquea avance si npm run build o los tests fallan.',
          'Gate 3: Audita git status, secretos e higiene de ramas antes de cerrar.'
        ]
      },
      {
        value: 'standard',
        label: '[Estandar]',
        hint: 'Verifica compilacion y tests automaticamente; confirmacion solo en cambios riesgosos',
        details: [
          'Compila y corre linters automaticamente en segundo plano.',
          'Pide confirmacion unicamente en migraciones de base de datos o cambios de alto riesgo.'
        ]
      },
      {
        value: 'autonomous',
        label: '[Autonomo]',
        hint: 'Permite avanzar sin confirmacion en cada paso de planificacion',
        details: [
          'Operacion continua para tareas desatendidas o scripts automatizados.',
          'Recomendado unicamente en entornos de prototipado rapido o CI.'
        ]
      }
    ],
    initialValue: 'strict'
  });

  if (p.isCancel(qualityGatesLevel)) {
    p.cancel('Operacion cancelada');
    return null;
  }

  // Step 4: Strict Guardrails
  const zeroEmojis = await p.confirm({
    message: 'Regla estricta de CERO emojis en codigo fuente, comentarios y commits:',
    initialValue: true
  });

  if (p.isCancel(zeroEmojis)) {
    p.cancel('Operacion cancelada');
    return null;
  }

  // Step 5: Living Context
  const enableLivingContext = await p.confirm({
    message: 'Habilitar protocolo de Living Context (actualizacion automatica de CONTEXT.md):',
    initialValue: true
  });

  if (p.isCancel(enableLivingContext)) {
    p.cancel('Operacion cancelada');
    return null;
  }

  // Step 6: Root Pointer compatibility
  const rootPointer = await p.confirm({
    message: 'Generar puntero liviano AGENTS.md en la raiz para compatibilidad universal:',
    initialValue: true
  });

  if (p.isCancel(rootPointer)) {
    p.cancel('Operacion cancelada');
    return null;
  }

  return {
    projectName: projectName as string,
    stack: detectedStack,
    selectedRoles: selectedRoles as string[],
    qualityGatesLevel: qualityGatesLevel as 'strict' | 'standard' | 'autonomous',
    strictGuardrails: {
      zeroEmojisInCode: zeroEmojis as boolean,
      protectSecrets: true,
      requirePlanApproval: qualityGatesLevel === 'strict',
      requireCompileGate: true,
      atomicGitBranches: true
    },
    encapsulation: {
      folder: '.agents',
      generateRootPointer: rootPointer as boolean,
      generateClaudeMdCompat: true,
      generateCursorRulesCompat: true
    },
    livingContext: {
      enabled: enableLivingContext as boolean,
      fileName: 'CONTEXT.md',
      autoUpdateOnFinish: true
    }
  };
}
