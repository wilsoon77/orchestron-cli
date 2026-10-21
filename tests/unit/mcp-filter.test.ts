import { describe, it, expect } from 'vitest';
import {
  categorizeMcpServer,
  getCategoryRules,
  partitionTools,
  filterMcpServersForProject,
  renderMcpServerContract
} from '../../src/detector/mcp.js';
import { DetectedMcp, ProjectStack } from '../../src/types/index.js';

describe('Unit: Selective Semantic MCP Filtering', () => {
  describe('categorizeMcpServer', () => {
    it('should categorize database servers correctly', () => {
      expect(categorizeMcpServer('mysql-local')).toBe('database');
      expect(categorizeMcpServer('mcp-server-neon')).toBe('database');
      expect(categorizeMcpServer('supabase')).toBe('database');
      expect(categorizeMcpServer('postgres-pool')).toBe('database');
      expect(categorizeMcpServer('sqlite-memory')).toBe('database');
    });

    it('should categorize frontend design servers correctly', () => {
      expect(categorizeMcpServer('figma-developer-mcp')).toBe('frontend_design');
      expect(categorizeMcpServer('StitchMCP')).toBe('frontend_design');
      expect(categorizeMcpServer('sketch-export')).toBe('frontend_design');
      expect(categorizeMcpServer('penpot-bridge')).toBe('frontend_design');
    });

    it('should categorize browser automation servers correctly', () => {
      expect(categorizeMcpServer('chrome_devtools')).toBe('browser');
      expect(categorizeMcpServer('playwright-mcp')).toBe('browser');
      expect(categorizeMcpServer('puppeteer-runner')).toBe('browser');
    });

    it('should categorize project management servers correctly', () => {
      expect(categorizeMcpServer('ClickUp')).toBe('project_management');
      expect(categorizeMcpServer('notion-mcp-server')).toBe('project_management');
      expect(categorizeMcpServer('jira-mcp')).toBe('project_management');
      expect(categorizeMcpServer('linear-sync')).toBe('project_management');
    });

    it('should categorize documentation servers correctly', () => {
      expect(categorizeMcpServer('context7')).toBe('documentation');
      expect(categorizeMcpServer('devdocs')).toBe('documentation');
    });

    it('should fallback to generic for unrecognized servers', () => {
      expect(categorizeMcpServer('custom-internal-tool')).toBe('generic');
    });
  });

  describe('partitionTools', () => {
    it('should return all tools as eager if 6 or fewer', () => {
      const tools = ['query', 'schema'];
      const res = partitionTools(tools, 'database');
      expect(res.eagerTools).toEqual(tools);
      expect(res.lazyTools).toEqual([]);
    });

    it('should partition based on primary category tools when count > 6', () => {
      const tools = [
        'run_sql',
        'run_sql_transaction',
        'describe_table_schema',
        'admin_create_user',
        'admin_drop_db',
        'admin_grant',
        'admin_revoke'
      ];
      const res = partitionTools(tools, 'database');
      expect(res.eagerTools).toContain('run_sql');
      expect(res.eagerTools).toContain('run_sql_transaction');
      expect(res.eagerTools).toContain('describe_table_schema');
      expect(res.lazyTools).toContain('admin_create_user');
      expect(res.lazyTools).toContain('admin_drop_db');
    });

    it('should handle empty or undefined tools defensively', () => {
      const res = partitionTools([], 'database');
      expect(res.eagerTools).toEqual([]);
      expect(res.lazyTools).toEqual([]);
    });
  });

  describe('filterMcpServersForProject', () => {
    const mockServers: DetectedMcp[] = [
      { name: 'mysql-local', tools: ['mysql_query'], description: 'Local MySQL' },
      { name: 'mcp-server-neon', tools: ['run_sql', 'create_branch'], description: 'Neon Postgres' },
      { name: 'figma-developer-mcp', tools: ['get_figma_data'], description: 'Figma mockups' },
      { name: 'chrome_devtools', tools: ['take_screenshot'], description: 'Chrome DevTools' },
      { name: 'ClickUp', tools: ['get_task'], description: 'ClickUp Tasks' },
      { name: 'context7', tools: ['query-docs'], description: 'Documentation' }
    ];

    it('should filter correctly for backend-only projects with database', () => {
      const stack: ProjectStack = {
        name: 'backend-api',
        isGreenfield: false,
        type: 'backend',
        backend: { framework: 'Express.js', language: 'TypeScript' },
        database: { engine: 'PostgreSQL' },
        commands: {},
        git: { isRepo: true, defaultBranch: 'main', hasRemotes: false },
        detectedMcps: [],
        detectedSkills: []
      };

      const filtered = filterMcpServersForProject(mockServers, stack);
      const names = filtered.map((f) => f.name);

      expect(names).toContain('mysql-local');
      expect(names).toContain('mcp-server-neon');
      expect(names).toContain('context7');
      expect(names).not.toContain('figma-developer-mcp');
      expect(names).not.toContain('chrome_devtools');
    });

    it('should filter correctly for frontend-only projects', () => {
      const stack: ProjectStack = {
        name: 'frontend-app',
        isGreenfield: false,
        type: 'frontend',
        frontend: { framework: 'React' },
        commands: {},
        git: { isRepo: true, defaultBranch: 'main', hasRemotes: false },
        detectedMcps: [],
        detectedSkills: []
      };

      const filtered = filterMcpServersForProject(mockServers, stack);
      const names = filtered.map((f) => f.name);

      expect(names).toContain('figma-developer-mcp');
      expect(names).toContain('chrome_devtools');
      expect(names).toContain('context7');
      expect(names).not.toContain('mysql-local');
      expect(names).not.toContain('mcp-server-neon');
    });

    it('should exclude database and UI tools for CLI tools', () => {
      const stack: ProjectStack = {
        name: 'cli-tool',
        isGreenfield: false,
        type: 'generic',
        backend: { framework: 'Node.js CLI Tool', language: 'TypeScript' },
        commands: {},
        git: { isRepo: true, defaultBranch: 'main', hasRemotes: false },
        detectedMcps: [],
        detectedSkills: []
      };

      const filtered = filterMcpServersForProject(mockServers, stack);
      const names = filtered.map((f) => f.name);

      expect(names).toContain('context7');
      expect(names).not.toContain('mysql-local');
      expect(names).not.toContain('mcp-server-neon');
      expect(names).not.toContain('figma-developer-mcp');
      expect(names).not.toContain('chrome_devtools');
      expect(names).not.toContain('ClickUp');
    });

    it('should handle empty or undefined server lists safely', () => {
      const stack: ProjectStack = {
        name: 'test',
        isGreenfield: true,
        type: 'generic',
        commands: {},
        git: { isRepo: false, defaultBranch: 'main', hasRemotes: false },
        detectedMcps: [],
        detectedSkills: []
      };

      expect(filterMcpServersForProject([], stack)).toEqual([]);
      expect(filterMcpServersForProject(undefined as unknown as DetectedMcp[], stack)).toEqual([]);
    });
  });

  describe('renderMcpServerContract', () => {
    it('should render tailored access rules for design server', () => {
      const contract = renderMcpServerContract({
        name: 'figma-developer-mcp',
        category: 'frontend_design',
        description: 'Design mockups',
        eagerTools: ['get_figma_data'],
        lazyTools: [],
        rules: getCategoryRules('frontend_design')
      });

      expect(contract).toContain('### Servidor MCP: `figma-developer-mcp`');
      expect(contract).toContain('tokens de diseno');
      expect(contract).not.toContain('SELECT');
    });

    it('should render tailored access rules for database server', () => {
      const contract = renderMcpServerContract({
        name: 'mcp-server-neon',
        category: 'database',
        description: 'Neon Postgres',
        eagerTools: ['run_sql'],
        lazyTools: ['create_branch'],
        rules: getCategoryRules('database')
      });

      expect(contract).toContain('### Servidor MCP: `mcp-server-neon`');
      expect(contract).toContain('SELECT');
      expect(contract).toContain('scripts de migracion');
    });
  });
});
