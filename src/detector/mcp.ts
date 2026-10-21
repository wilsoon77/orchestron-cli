import fs from 'fs';
import os from 'os';
import path from 'path';
import { DetectedMcp, ProjectStack } from '../types/index.js';

export type McpCategory =
  | 'database'
  | 'frontend_design'
  | 'browser'
  | 'project_management'
  | 'documentation'
  | 'generic';

export interface FilteredMcpServer {
  name: string;
  category: McpCategory;
  description: string;
  eagerTools: string[];
  lazyTools: string[];
  rules: string[];
}

export type McpServerMeta = DetectedMcp;
export type TechStack = ProjectStack;

export function categorizeMcpServer(name: string): McpCategory {
  const lower = name.toLowerCase();
  if (
    lower.includes('mysql') ||
    lower.includes('neon') ||
    lower.includes('postgres') ||
    lower.includes('supabase') ||
    lower.includes('sqlite') ||
    lower.includes('mariadb') ||
    lower.includes('cockroach')
  ) {
    return 'database';
  }
  if (
    lower.includes('figma') ||
    lower.includes('stitch') ||
    lower.includes('sketch') ||
    lower.includes('penpot') ||
    lower.includes('zeplin')
  ) {
    return 'frontend_design';
  }
  if (
    lower.includes('chrome') ||
    lower.includes('devtools') ||
    lower.includes('playwright') ||
    lower.includes('puppeteer') ||
    lower.includes('browser')
  ) {
    return 'browser';
  }
  if (
    lower.includes('clickup') ||
    lower.includes('notion') ||
    lower.includes('atlassian') ||
    lower.includes('jira') ||
    lower.includes('linear') ||
    lower.includes('trello') ||
    lower.includes('asana')
  ) {
    return 'project_management';
  }
  if (
    lower.includes('context7') ||
    lower.includes('docs') ||
    lower.includes('devdocs') ||
    lower.includes('mdn') ||
    lower.includes('dash')
  ) {
    return 'documentation';
  }
  return 'generic';
}

export function getCategoryRules(category: McpCategory): string[] {
  switch (category) {
    case 'database':
      return [
        'Durante la fase de **Analisis y Planificacion**, unicamente ejecutar operaciones de lectura/inspeccion (ej. `SELECT` o consultas GET).',
        'Modificaciones estructurales o cambios de esquema deben disenarse primero como scripts de migracion versionables.'
      ];
    case 'frontend_design':
      return [
        'Utilizar unicamente para extraccion de tokens de diseno, componentes visuales, espaciados y especificaciones de mockups.',
        'Prohibido alterar o mutar archivos de diseno remotos de produccion sin autorizacion previa del usuario.'
      ];
    case 'browser':
      return [
        'Inspeccion de arbol DOM, auditorias de accesibilidad (a11y) y medicion de Core Web Vitals en Fases 3.5 y 4.',
        'Prohibido ejecutar acciones destructivas, envio de formularios reales o interacciones no autorizadas en produccion.'
      ];
    case 'project_management':
      return [
        'Durante Fases 1 y 2, acceso de solo lectura para consultar historias de usuario, criterios de aceptacion y tickets.',
        'Actualizaciones de estado en tareas o comentarios unicamente permitidas en Gate 3 (Cierre y Entrega).'
      ];
    case 'documentation':
      return [
        'Consultas tecnicas de solo lectura sobre documentacion oficial de bibliotecas y frameworks.'
      ];
    case 'generic':
    default:
      return [
        'Operaciones de lectura preferentes durante analisis; operaciones de mutacion sujetas a revision previa.'
      ];
  }
}

const PRIMARY_TOOLS_BY_CATEGORY: Record<McpCategory, string[]> = {
  database: [
    'run_sql',
    'run_sql_transaction',
    'describe_table_schema',
    'get_database_tables',
    'mysql_query',
    'execute_sql',
    'explain_sql_statement'
  ],
  frontend_design: [
    'get_figma_data',
    'download_figma_images',
    'get_screen',
    'list_screens',
    'list_design_systems',
    'generate_screen_from_text'
  ],
  browser: [
    'list_pages',
    'navigate_page',
    'take_screenshot',
    'lighthouse_audit',
    'list_console_messages',
    'click',
    'fill'
  ],
  project_management: [
    'get_workspace_tasks',
    'get_task',
    'get_workspace_hierarchy',
    'API-retrieve-a-page',
    'API-post-search',
    'create_task'
  ],
  documentation: ['query-docs', 'resolve-library-id'],
  generic: []
};

export function partitionTools(
  tools: string[],
  category: McpCategory
): { eagerTools: string[]; lazyTools: string[] } {
  if (!tools || tools.length <= 6) {
    return { eagerTools: tools || [], lazyTools: [] };
  }
  const primarySet = new Set(PRIMARY_TOOLS_BY_CATEGORY[category] || []);
  const eagerTools = tools.filter((t) => primarySet.has(t));
  const lazyTools = tools.filter((t) => !primarySet.has(t));

  if (eagerTools.length === 0) {
    return {
      eagerTools: tools.slice(0, 5),
      lazyTools: tools.slice(5)
    };
  }

  return { eagerTools, lazyTools };
}

export function filterMcpServersForProject(
  servers: DetectedMcp[] = [],
  stack: ProjectStack
): FilteredMcpServer[] {
  if (!servers || !Array.isArray(servers) || servers.length === 0) {
    return [];
  }

  const isCli =
    stack.backend?.framework === 'Node.js CLI Tool' ||
    stack.type === 'generic' ||
    stack.type === 'library';
  const hasDb =
    Boolean(stack.database) ||
    (Boolean(stack.backend) && !isCli) ||
    stack.type === 'backend' ||
    stack.type === 'fullstack' ||
    stack.type === 'monorepo';
  const hasFrontend =
    Boolean(stack.frontend) ||
    stack.type === 'frontend' ||
    stack.type === 'fullstack' ||
    stack.type === 'monorepo';

  const result: FilteredMcpServer[] = [];

  for (const s of servers) {
    const category = categorizeMcpServer(s.name);
    let include = false;

    switch (category) {
      case 'database':
        include = hasDb;
        break;
      case 'frontend_design':
        include = hasFrontend;
        break;
      case 'browser':
        include = hasFrontend;
        break;
      case 'project_management':
        include = !isCli && (hasFrontend || hasDb);
        break;
      case 'documentation':
        include = true;
        break;
      case 'generic':
      default:
        include = true;
        break;
    }

    if (include) {
      const { eagerTools, lazyTools } = partitionTools(s.tools || [], category);
      result.push({
        name: s.name,
        category,
        description: s.description || 'External integration server',
        eagerTools,
        lazyTools,
        rules: getCategoryRules(category)
      });
    }
  }

  return result;
}

export function renderMcpServerContract(mcp: FilteredMcpServer): string {
  const toolsFormatted =
    mcp.eagerTools.length > 0
      ? mcp.eagerTools.map((t) => `\`${t}\``).join(', ') +
        (mcp.lazyTools.length > 0 ? ` *(+ ${mcp.lazyTools.length} herramientas bajo demanda)*` : '')
      : 'Acceso habilitado';

  const rulesFormatted = mcp.rules
    .map((r, i) => `  ${i + 1}. ${r}`)
    .join('\n');

  return `### Servidor MCP: \`${mcp.name}\`
- **Descripcion:** ${mcp.description}
- **Herramientas disponibles:** ${toolsFormatted}
- **Reglas de Acceso:**
${rulesFormatted}
`;
}

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
          } else if (
            serverName.includes('clickup') ||
            serverName.includes('jira') ||
            serverName.includes('notion')
          ) {
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
