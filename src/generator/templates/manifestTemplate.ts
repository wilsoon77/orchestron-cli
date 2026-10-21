import { OrchestronConfig } from '../../types/index.js';
import { getUnifiedRole } from '../../roles/unifiedCatalog.js';

export function renderOrchestronManifest(config: OrchestronConfig): string {
  const stack = config.stack;
  const today = new Date().toISOString().split('T')[0];

  const mcpList =
    stack.detectedMcps && stack.detectedMcps.length > 0
      ? stack.detectedMcps
          .map(
            (m) => `      - name: ${m.name}
        access: ${m.name.includes('figma') ? 'read-only-design-tokens' : m.name.includes('mysql') || m.name.includes('neon') || m.name.includes('postgres') ? 'read-only-during-analysis' : 'enabled'}`
          )
          .join('\n')
      : '      []';

  const skillsList =
    stack.detectedSkills && stack.detectedSkills.length > 0
      ? stack.detectedSkills.map((s) => `      - ${s}`).join('\n')
      : '      []';

  const renderedPolicies: string[] = [];
  const renderedSubagents: string[] = [];

  for (const roleId of config.selectedRoles) {
    const role = getUnifiedRole(roleId);
    if (!role) continue;

    const allowedToolsList = role.toolsAntigravity.length > 0
      ? role.toolsAntigravity.map((t) => `          - ${t}`).join('\n')
      : '          - view_file';

    const forbiddenList = (role.forbiddenActions && role.forbiddenActions.length > 0 ? role.forbiddenActions : ['destructive_shell_commands', 'version_env_files'])
      .map((a) => `          - ${a}`)
      .join('\n');

    renderedPolicies.push(`      - role: ${role.id}
        allowedTools:
${allowedToolsList}
        forbiddenActions:
${forbiddenList}`);

    renderedSubagents.push(`    - id: ${role.id}
      name: "${role.name}"
      promptFile: ".agents/agents/${role.agentFileName || `${role.id}.md`}"
      workspaceMode: "${role.workspaceMode || 'branch'}"${role.canForkParallelTeam ? '\n      canForkParallelTeam: true' : ''}`);
  }

  if (config.rawCustomPolicies && config.rawCustomPolicies.length > 0) {
    for (const rawPol of config.rawCustomPolicies) {
      renderedPolicies.push(rawPol.startsWith('      ') ? rawPol : `      ${rawPol}`);
    }
  }

  if (config.rawCustomSubagents && config.rawCustomSubagents.length > 0) {
    for (const rawSub of config.rawCustomSubagents) {
      renderedSubagents.push(rawSub.startsWith('    ') ? rawSub : `    ${rawSub}`);
    }
  }

  const activePolicies = renderedPolicies.join('\n\n');
  const activeSubagentsYaml = renderedSubagents.join('\n\n');

  return `# ==============================================================================
# ORCHESTRON DECLARATIVE WORKSPACE SPECIFICATION (Inspired by Google AX)
# apiVersion: orchestron.ai/v1alpha1
# ==============================================================================

apiVersion: orchestron.ai/v1alpha1
kind: Workspace
metadata:
  name: ${config.projectName}
  version: "1.0.0"
  createdAt: "${today}"

spec:
  # 1. Stack & Pre-wired Environment
  stack:
    type: ${stack.type}
${stack.frontend ? `    frontend: "${stack.frontend.framework}${stack.frontend.uiLibrary ? ` (${stack.frontend.uiLibrary})` : ''}"\n` : ''}${stack.backend ? `    backend: "${stack.backend.framework} (${stack.backend.language})"\n` : ''}${stack.database ? `    database: "${stack.database.engine}"\n` : ''}    commands:
      build: "${stack.commands.build || 'npm run build'}"
      test: "${stack.commands.test || 'npm test'}"
      lint: "${stack.commands.lint || 'npm run lint'}"

  # 2. Tool Bindings & External MCP Providers
  tools:
    mcpServers:
${mcpList}
    skills:
${skillsList}

  # 3. Security Gateway: Tool Permissions per Role (Google AX Gateway Pattern)
  gateway:
    policies:
${activePolicies || '      []'}

  # 4. Declarative Subagent Swarm Configuration (Teamwork / Parallel Spawns)
  subagents:
${activeSubagentsYaml || '    []'}

  # 5. Quality Gates & Acceptance Criteria
  qualityGates:
    gate1_userApproval: ${config.strictGuardrails.requirePlanApproval ? 'strict' : 'standard'}
    gate2_zeroCompilationErrors: ${config.strictGuardrails.requireCompileGate ? 'strict' : 'standard'}
    gate3_gitAndContextAudit: strict
`;
}
