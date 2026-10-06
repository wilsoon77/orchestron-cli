export interface ProjectStack {
  name: string;
  isGreenfield: boolean;
  type: 'fullstack' | 'frontend' | 'backend' | 'monorepo' | 'library' | 'generic';
  frontend?: {
    framework: string;
    version?: string;
    uiLibrary?: string;
    stateManagement?: string;
    directory?: string;
  };
  backend?: {
    framework: string;
    language: string;
    version?: string;
    directory?: string;
  };
  database?: {
    engine: string;
    orm?: string;
    hasDump?: boolean;
    dumpFile?: string;
  };
  commands: {
    install?: string;
    build?: string;
    test?: string;
    lint?: string;
    format?: string;
    dev?: string;
  };
  git: {
    isRepo: boolean;
    defaultBranch: string;
    hasRemotes: boolean;
  };
  detectedMcps: DetectedMcp[];
  detectedSkills: string[];
}

export interface DetectedMcp {
  name: string;
  tools: string[];
  description: string;
}

export interface RoleConfig {
  id: string;
  name: string;
  title: string;
  icon: string;
  goal: string;
  responsibilities: string[];
  rules: string[];
}

export interface OrchestronConfig {
  projectName: string;
  stack: ProjectStack;
  selectedRoles: string[];
  qualityGatesLevel: 'strict' | 'standard' | 'autonomous';
  strictGuardrails: {
    zeroEmojisInCode: boolean;
    protectSecrets: boolean;
    requirePlanApproval: boolean;
    requireCompileGate: boolean;
    atomicGitBranches: boolean;
  };
  encapsulation: {
    folder: string; // usually '.agents'
    generateRootPointer: boolean;
    generateClaudeMdCompat: boolean;
    generateCursorRulesCompat: boolean;
  };
  livingContext: {
    enabled: boolean;
    fileName: string; // 'CONTEXT.md'
    autoUpdateOnFinish: boolean;
  };
}

// Declarative Manifest Specifications (Inspired by Google AX)
export interface ManifestGatewayPolicy {
  role: string;
  allowedTools: string[];
  forbiddenActions?: string[];
}

export interface ManifestSubagent {
  id: string;
  name: string;
  promptFile: string;
  workspaceMode: 'inherit' | 'branch' | 'share';
  allowedRolesToInvoke?: string[];
}

export interface OrchestronManifest {
  apiVersion: string;
  kind: 'Workspace' | 'Teamwork';
  metadata: {
    name: string;
    version: string;
    createdAt: string;
  };
  spec: {
    stack: {
      type: string;
      frontend?: string;
      backend?: string;
      database?: string;
      build?: string;
      test?: string;
    };
    tools: {
      mcpServers: {
        name: string;
        access: string;
      }[];
      skills: string[];
    };
    gateway: {
      policies: ManifestGatewayPolicy[];
    };
    subagents: ManifestSubagent[];
    qualityGates: {
      gate1_userApproval: string;
      gate2_zeroCompilationErrors: string;
      gate3_gitAndContextAudit: string;
    };
  };
}

export interface InstinctEntry {
  type: 'error_pattern' | 'project_convention' | 'workaround';
  title: string;
  triggerOrProblem: string;
  resolutionOrRule: string;
  recordedAt: string;
}

export interface UpdateOptions {
  dir?: string;
  dryRun?: boolean;
}

export interface LearnOptions {
  dir?: string;
  type?: string;
  pattern?: string;
  rule?: string;
}
