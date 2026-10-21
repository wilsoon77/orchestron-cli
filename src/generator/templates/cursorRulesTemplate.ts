import { OrchestronConfig, ProjectStack } from '../../types/index.js';
import { renderConstraintsMd } from './constraintsTemplate.js';
import {
  renderBackendRule,
  renderFrontendRule,
  renderDatabaseRule,
  renderSecurityRule
} from './rulesTemplates.js';

export interface CursorRuleDefinition {
  id: string;
  fileName: string;
  description: string;
  globs: string;
  alwaysApply: boolean;
  shouldGenerate: (config: OrchestronConfig) => boolean;
  renderContent: (config: OrchestronConfig) => string;
}

function resolveBackendGlobs(stack: ProjectStack): string {
  const lang = stack.backend?.language?.toLowerCase() || '';
  if (lang.includes('java')) return '**/*.java, **/pom.xml, **/build.gradle';
  if (lang.includes('python')) return '**/*.py, **/requirements.txt';
  if (lang.includes('go')) return '**/*.go, **/go.mod';
  const dir = stack.backend?.directory ? `${stack.backend.directory}/**` : 'src/**';
  return `${dir}/*.ts, ${dir}/*.js, **/controllers/**, **/services/**, **/routes/**`;
}

function resolveFrontendGlobs(stack: ProjectStack): string {
  const dir = stack.frontend?.directory ? `${stack.frontend.directory}/**` : 'src/**';
  return `${dir}/*.tsx, ${dir}/*.jsx, ${dir}/*.vue, ${dir}/*.css, ${dir}/*.scss, components/**, pages/**, app/**`;
}

export function stripExistingFrontmatter(content: string): string {
  const trimmed = content.trimStart();
  if (trimmed.startsWith('---')) {
    const endIdx = trimmed.indexOf('\n---', 3);
    if (endIdx !== -1) {
      return trimmed.slice(endIdx + 4).trimStart();
    }
  }
  return content;
}

export function renderCursorRuleFile(
  description: string,
  globs: string,
  alwaysApply: boolean,
  bodyContent: string
): string {
  const cleanBody = stripExistingFrontmatter(bodyContent);
  return `---
description: "${description.replace(/"/g, '\\"')}"
globs: "${globs}"
alwaysApply: ${alwaysApply}
---

${cleanBody}
`;
}

export function getCursorRulesDefinitions(config: OrchestronConfig): CursorRuleDefinition[] {
  return [
    {
      id: 'backend',
      fileName: 'backend.mdc',
      description: `Reglas de arquitectura Backend para ${config.stack.backend?.framework || 'Backend'} (${config.stack.backend?.language || 'Node.js'}). Separacion Controller-Service-Repository y contratos DTO.`,
      globs: resolveBackendGlobs(config.stack),
      alwaysApply: false,
      shouldGenerate: (c) => Boolean(c.stack.backend) || c.selectedRoles.includes('backend-dev'),
      renderContent: (c) => renderBackendRule(c)
    },
    {
      id: 'frontend',
      fileName: 'frontend.mdc',
      description: `Reglas de arquitectura Frontend para ${config.stack.frontend?.framework || 'Frontend'}. Componentes desacoplados, estados asincronos y responsividad.`,
      globs: resolveFrontendGlobs(config.stack),
      alwaysApply: false,
      shouldGenerate: (c) => Boolean(c.stack.frontend) && c.selectedRoles.includes('frontend-dev'),
      renderContent: (c) => renderFrontendRule(c)
    },
    {
      id: 'database',
      fileName: 'database.mdc',
      description: `Directiva de Base de Datos para ${config.stack.database?.engine || 'SQL'}. Integridad referencial, scripts de migracion versionados y solo SELECT en analisis.`,
      globs: '**/*.sql, **/migrations/**, **/prisma/**, **/schema/**, **/entities/**, **/models/**',
      alwaysApply: false,
      shouldGenerate: () => true,
      renderContent: (c) => renderDatabaseRule(c)
    },
    {
      id: 'security',
      fileName: 'security.mdc',
      description: 'Directiva de seguridad: prohibido commitear archivos .env o credenciales, tecnicas skip-worktree y sanitizacion de tokens.',
      globs: '**/*, **/.env*, **/config/**',
      alwaysApply: false,
      shouldGenerate: () => true,
      renderContent: (c) => renderSecurityRule(c)
    },
    {
      id: 'constraints',
      fileName: 'constraints.mdc',
      description: 'Contrato de calidad mecanica innegociable de Orchestron: cero emojis, cero supresiones de tipado (@ts-ignore) y proteccion de pruebas unitarias.',
      globs: '*',
      alwaysApply: true,
      shouldGenerate: () => true,
      renderContent: (c) => renderConstraintsMd(c)
    }
  ];
}
