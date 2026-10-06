import { OrchestronConfig } from '../../types/index.js';

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

  const gatewayPoliciesMap: Record<string, string> = {
    'lead-architect': `      - role: lead-architect
        allowedTools:
          - read_file
          - view_file
          - search_web
          - read_url_content
          - "mysql_query:SELECT"
        forbiddenActions:
          - modify_source_code_before_gate1
          - destructive_shell_commands`,

    'backend-dev': `      - role: backend-dev
        allowedTools:
          - read_file
          - view_file
          - write_to_file
          - replace_file_content
          - run_command:local_dev
        forbiddenActions:
          - modify_frontend_views_directly
          - commit_secrets`,

    'frontend-dev': `      - role: frontend-dev
        allowedTools:
          - read_file
          - view_file
          - write_to_file
          - replace_file_content
          - run_command:local_dev
        forbiddenActions:
          - modify_backend_endpoints_directly
          - bypass_responsive_checks`,

    'ui-ux-specialist': `      - role: ui-ux-specialist
        allowedTools:
          - read_file
          - view_file
          - write_to_file
          - replace_file_content
          - figma_data
          - generative_ui
        forbiddenActions:
          - modify_database_or_backend_logic
          - introduce_inconsistent_palette_colors`,

    'code-reviewer': `      - role: code-reviewer
        allowedTools:
          - read_file
          - view_file
          - "run_command:git diff"
          - "run_command:git status"
        forbiddenActions:
          - modify_source_code
          - approve_suppressed_errors`,

    'qa-tester': `      - role: qa-tester
        allowedTools:
          - run_command:build
          - run_command:test
          - run_command:lint
          - read_file
          - view_file
        forbiddenActions:
          - modify_business_logic_to_force_test_pass`,

    'git-security': `      - role: git-security
        allowedTools:
          - run_command:git
          - read_file
          - view_file
        forbiddenActions:
          - git_push_force
          - version_env_files`
  };

  const subagentsDefMap: Record<string, string> = {
    'lead-architect': `    - id: lead-architect
      name: "Lead Architect"
      promptFile: ".agents/subagents/architect.agent.md"
      workspaceMode: "inherit"
      canForkParallelTeam: true`,

    'backend-dev': `    - id: backend-dev
      name: "Backend Specialist"
      promptFile: ".agents/subagents/backend.agent.md"
      workspaceMode: "branch"`,

    'frontend-dev': `    - id: frontend-dev
      name: "Frontend Specialist"
      promptFile: ".agents/subagents/frontend.agent.md"
      workspaceMode: "branch"`,

    'ui-ux-specialist': `    - id: ui-ux-specialist
      name: "UI/UX & Responsive Specialist"
      promptFile: ".agents/subagents/ui-ux.agent.md"
      workspaceMode: "share"`,

    'code-reviewer': `    - id: code-reviewer
      name: "Code Reviewer & Quality Auditor"
      promptFile: ".agents/subagents/reviewer.agent.md"
      workspaceMode: "inherit"`,

    'qa-tester': `    - id: qa-tester
      name: "QA & Verification Specialist"
      promptFile: ".agents/subagents/qa.agent.md"
      workspaceMode: "inherit"`,

    'git-security': `    - id: git-security
      name: "Git & Security Auditor"
      promptFile: ".agents/subagents/security.agent.md"
      workspaceMode: "inherit"`
  };

  const activePolicies = config.selectedRoles
    .filter((roleId) => gatewayPoliciesMap[roleId])
    .map((roleId) => gatewayPoliciesMap[roleId])
    .join('\n\n');

  const activeSubagentsYaml = config.selectedRoles
    .filter((roleId) => subagentsDefMap[roleId])
    .map((roleId) => subagentsDefMap[roleId])
    .join('\n\n');

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
