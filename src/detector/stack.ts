import fs from 'fs';
import path from 'path';
import { ProjectStack } from '../types/index.js';
import { detectGitInfo } from './git.js';
import { detectAntigravityEnvironment } from './mcp.js';

export function scanProjectDirectory(cwd: string = process.cwd()): ProjectStack {
  if (!fs.existsSync(cwd)) {
    fs.mkdirSync(cwd, { recursive: true });
  }

  const stack: ProjectStack = {
    name: path.basename(cwd),
    isGreenfield: false,
    type: 'generic',
    commands: {},
    git: detectGitInfo(cwd),
    detectedMcps: [],
    detectedSkills: []
  };

  // Inspect environment (Antigravity MCPs & Skills)
  const env = detectAntigravityEnvironment();
  stack.detectedMcps = env.mcps;
  stack.detectedSkills = env.skills;

  // Check subdirectories for Monorepos / Hybrid architectures (like Frontend + Backend in subfolders)
  const entries = fs.readdirSync(cwd, { withFileTypes: true });
  const subdirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

  // Look for SQL Dumps
  const sqlDump = entries.find((e) => e.isFile() && e.name.endsWith('.sql'));
  if (sqlDump) {
    stack.database = {
      engine: 'SQL (Dump detectado)',
      hasDump: true,
      dumpFile: sqlDump.name
    };
  }

  // Scan root for stack markers
  const rootPackageJsonPath = path.join(cwd, 'package.json');
  const rootPomXmlPath = path.join(cwd, 'pom.xml');
  const rootGradlePath = path.join(cwd, 'build.gradle');
  const rootPyprojectPath = path.join(cwd, 'pyproject.toml');
  const rootRequirementsPath = path.join(cwd, 'requirements.txt');
  const rootGoModPath = path.join(cwd, 'go.mod');

  const hasRootStackFiles =
    fs.existsSync(rootPackageJsonPath) ||
    fs.existsSync(rootPomXmlPath) ||
    fs.existsSync(rootGradlePath) ||
    fs.existsSync(rootPyprojectPath) ||
    fs.existsSync(rootRequirementsPath) ||
    fs.existsSync(rootGoModPath);

  if (fs.existsSync(rootPackageJsonPath)) {
    analyzeNodePackage(rootPackageJsonPath, stack);
  }

  if (fs.existsSync(rootPomXmlPath)) {
    analyzeMavenProject(rootPomXmlPath, stack);
  }

  if (fs.existsSync(rootPyprojectPath) || fs.existsSync(rootRequirementsPath)) {
    analyzePythonProject(cwd, stack);
  }

  // Inspect subfolders for Frontend + Backend split
  let hasSubdirStackFiles = false;
  for (const dir of subdirs) {
    const subPkg = path.join(cwd, dir.name, 'package.json');
    const subPom = path.join(cwd, dir.name, 'pom.xml');
    const subGradle = path.join(cwd, dir.name, 'build.gradle');

    if (fs.existsSync(subPkg)) {
      hasSubdirStackFiles = true;
      analyzeSubNodeProject(subPkg, dir.name, stack);
    }
    if (fs.existsSync(subPom) || fs.existsSync(subGradle)) {
      hasSubdirStackFiles = true;
      analyzeSubJavaProject(cwd, dir.name, stack);
    }
  }

  // Determine if it is a truly empty / greenfield directory
  stack.isGreenfield = !hasRootStackFiles && !hasSubdirStackFiles;

  // Determine overall architecture type
  if (stack.frontend && stack.backend) {
    stack.type = 'monorepo';
  } else if (stack.frontend) {
    stack.type = 'frontend';
  } else if (stack.backend) {
    stack.type = stack.type === 'generic' ? 'generic' : 'backend';
  }

  return stack;
}

function analyzeNodePackage(pkgPath: string, stack: ProjectStack): void {
  try {
    const content = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = { ...content.dependencies, ...content.devDependencies };
    const projectDir = path.dirname(pkgPath);

    // If package.json has a name, prefer it
    if (content.name) {
      stack.name = content.name;
    }

    const isTs = !!(deps['typescript'] || fs.existsSync(path.join(projectDir, 'tsconfig.json')));
    const lang = isTs ? 'TypeScript' : 'JavaScript';

    // Detect Frontend Frameworks
    if (deps['@angular/core']) {
      stack.frontend = {
        framework: 'Angular',
        version: deps['@angular/core'],
        uiLibrary: deps['tailwindcss'] ? 'Tailwind CSS' : deps['@angular/material'] ? 'Angular Material' : undefined
      };
      stack.commands.build = 'ng build';
      stack.commands.test = 'ng test --no-watch';
    } else if (deps['next']) {
      stack.frontend = {
        framework: 'Next.js',
        version: deps['next'],
        uiLibrary: deps['tailwindcss'] ? 'Tailwind CSS' : undefined
      };
      stack.commands.build = 'npm run build';
      stack.commands.dev = 'npm run dev';
    } else if (deps['react']) {
      stack.frontend = {
        framework: 'React',
        version: deps['react'],
        uiLibrary: deps['tailwindcss'] ? 'Tailwind CSS' : deps['@mui/material'] ? 'Material UI' : undefined
      };
      stack.commands.build = deps['vite'] ? 'vite build' : 'npm run build';
      stack.commands.test = deps['vitest'] ? 'vitest run' : deps['jest'] ? 'jest' : undefined;
    } else if (deps['vue']) {
      stack.frontend = {
        framework: 'Vue.js',
        version: deps['vue'],
        uiLibrary: deps['tailwindcss'] ? 'Tailwind CSS' : undefined
      };
      stack.commands.build = 'npm run build';
    }

    // Detect Backend / Application in Node
    if (deps['@nestjs/core']) {
      stack.backend = {
        framework: 'NestJS',
        language: 'TypeScript',
        version: deps['@nestjs/core']
      };
      stack.commands.build = 'npm run build';
      stack.commands.test = 'npm test';
    } else if (deps['fastify']) {
      stack.backend = { framework: 'Fastify', language: lang };
    } else if (deps['hono']) {
      stack.backend = { framework: 'Hono', language: lang };
    } else if (deps['express'] && !stack.frontend) {
      stack.backend = { framework: 'Express', language: lang };
    } else if (content.bin || deps['commander'] || deps['@clack/prompts'] || deps['yargs']) {
      // CLI Tool / Executable
      stack.backend = {
        framework: 'Node.js CLI Tool',
        language: lang
      };
      stack.type = 'generic';
    } else if (!stack.frontend) {
      // Generic Node.js / TypeScript Application or Library
      stack.backend = {
        framework: 'Node.js Application / Library',
        language: lang
      };
      stack.type = 'library';
    }

    // Detect ORM / DB
    if (deps['@prisma/client'] || deps['prisma']) {
      stack.database = { engine: 'Prisma ORM', orm: 'Prisma' };
    } else if (deps['typeorm']) {
      stack.database = { engine: 'TypeORM', orm: 'TypeORM' };
    } else if (deps['mongoose']) {
      stack.database = { engine: 'MongoDB', orm: 'Mongoose' };
    } else if (deps['mysql2']) {
      stack.database = { engine: 'MySQL', orm: 'mysql2' };
    } else if (deps['pg']) {
      stack.database = { engine: 'PostgreSQL', orm: 'pg' };
    }

    // Capture standard scripts from package.json
    if (content.scripts) {
      if (content.scripts.build && !stack.commands.build) stack.commands.build = 'npm run build';
      if (content.scripts.test && !stack.commands.test) stack.commands.test = 'npm test';
      if (content.scripts.lint && !stack.commands.lint) stack.commands.lint = 'npm run lint';
      if (content.scripts.dev && !stack.commands.dev) stack.commands.dev = 'npm run dev';
    }
  } catch {
    // Ignore JSON parse errors
  }
}

function analyzeSubNodeProject(pkgPath: string, folderName: string, stack: ProjectStack): void {
  try {
    const content = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const deps = { ...content.dependencies, ...content.devDependencies };

    if (deps['@angular/core'] || deps['react'] || deps['vue'] || deps['next']) {
      const framework = deps['@angular/core']
        ? 'Angular'
        : deps['next']
        ? 'Next.js'
        : deps['react']
        ? 'React'
        : 'Vue.js';

      stack.frontend = {
        framework,
        directory: folderName,
        uiLibrary: deps['tailwindcss'] ? 'Tailwind CSS' : undefined
      };

      if (!stack.commands.build) {
        stack.commands.build = `cd ${folderName} && npm run build`;
      }
    }
  } catch {}
}

function analyzeMavenProject(pomPath: string, stack: ProjectStack): void {
  try {
    const content = fs.readFileSync(pomPath, 'utf8');
    const isSpringBoot = content.includes('spring-boot');
    const javaVersionMatch = content.match(/<java\.version>(.*?)<\/java\.version>/);
    const javaVer = javaVersionMatch ? javaVersionMatch[1] : '21';

    stack.backend = {
      framework: isSpringBoot ? 'Spring Boot' : 'Java Maven Project',
      language: `Java ${javaVer}`,
      version: isSpringBoot ? '3.x' : undefined
    };

    if (content.includes('mysql-connector') || content.includes('mysql')) {
      stack.database = { engine: 'MySQL', orm: 'Spring Data JPA / Hibernate' };
    } else if (content.includes('postgresql')) {
      stack.database = { engine: 'PostgreSQL', orm: 'Spring Data JPA / Hibernate' };
    }

    stack.commands.build = 'mvn clean compile -DskipTests';
    stack.commands.test = 'mvn test-compile';
  } catch {}
}

function analyzeSubJavaProject(cwd: string, folderName: string, stack: ProjectStack): void {
  const pomPath = path.join(cwd, folderName, 'pom.xml');
  if (fs.existsSync(pomPath)) {
    try {
      const content = fs.readFileSync(pomPath, 'utf8');
      const isSpringBoot = content.includes('spring-boot');
      stack.backend = {
        framework: isSpringBoot ? 'Spring Boot' : 'Java Maven',
        language: 'Java',
        directory: folderName
      };

      if (content.includes('mysql')) {
        stack.database = { engine: 'MySQL', orm: 'Spring Data JPA / Hibernate' };
      }
    } catch {}
  }
}

function analyzePythonProject(cwd: string, stack: ProjectStack): void {
  const reqPath = path.join(cwd, 'requirements.txt');
  const pyprojPath = path.join(cwd, 'pyproject.toml');

  let text = '';
  if (fs.existsSync(reqPath)) text += fs.readFileSync(reqPath, 'utf8');
  if (fs.existsSync(pyprojPath)) text += fs.readFileSync(pyprojPath, 'utf8');

  let framework = 'Python';
  if (text.includes('fastapi')) framework = 'FastAPI';
  else if (text.includes('django')) framework = 'Django';
  else if (text.includes('flask')) framework = 'Flask';

  stack.backend = {
    framework,
    language: 'Python 3'
  };

  stack.commands.test = 'pytest';
}
