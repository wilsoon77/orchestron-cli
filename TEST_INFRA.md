# TEST_INFRA.MD — ORCHESTRON CLI 2.0 TEST INFRASTRUCTURE SPECIFICATION

> **Authoritative Testing Framework & Quality Verification Methodology**  
> **Target System:** Orchestron CLI 2.0 (`cli-orquestador-agent`)  
> **Engine Compatibility:** Google Antigravity, Claude Code, Cursor IDE  
> **Runner:** Vitest v5.x with Native TypeScript Execution  

---

## 1. Executive Summary & Quality Strategy

Orchestron CLI 2.0 is an autonomous orchestrator that governs multi-agent teams, living context, and quality gates for AI-assisted software development. The testing infrastructure defined in this document establishes a multi-tiered opaque-box test strategy designed to guarantee:

1. **Multi-Engine Compliance (R1):** Zero silent discard in Google Antigravity (strictly formatted YAML frontmatter in `.agents/rules/*.md` and `.agents/agents/*.md`), native Claude Code subagent emission (`.claude/agents/*.md` with PascalCase tools and worktree isolation), and modern Cursor rules (`.cursor/rules/*.mdc`).
2. **Context Budget Enforcement (R2):** Strict < 24 KB expanded context limit on `AGENTS.md` and ultra-lightweight Gateway Router (< 6 KB raw), eliminating monolithic MCP dumps via technology-aware semantic filtering.
3. **Unified Roles & Persistence (R3):** Consolidated single typed source of truth (`UnifiedRoleDefinition`), atomic multi-target `add-role` execution, non-destructive `update` configuration preservation, and deterministic `--dry-run` simulation.
4. **Deterministic Enforcement & Ergonomics (R4 & R5):** Mechanical pre-commit and Claude Code `Stop` hooks, physical Gate 1 contract artifact (`.agents/state/active-contract.md`), exit code 1 on doctor failures (`--ci`), and balanced block AST parsing for N+1 async loop detection.

---

## 2. Test Architecture & Runner Configuration

### 2.1. Framework Selection: Vitest v5.x
- **Native ESM & TypeScript:** Zero transpilation overhead; executes TypeScript source directly via Vite/esbuild.
- **Fast Execution:** Parallel test worker threads with sub-second execution cycles.
- **Deterministic Sandboxing:** Built-in isolation per file and test suite.

### 2.2. Isolated Fixture Sandbox Pattern
All E2E tests operate within disposable, isolated temporary directory fixtures to eliminate shared state pollution and ensure complete reproducibility:
```typescript
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestron-e2e-'));
// Execute test actions within tempDir
// Cleanup tempDir recursively in afterEach / finally
```

### 2.3. Blackbox CLI Runner Harness
Tests invoke the CLI binary via `child_process.spawnSync` / `execSync` invoking `npx tsx src/index.ts` or compiled `dist/index.js`, capturing:
- `exitCode`: Process exit status code (`0` for success, `1` for doctor failures/errors).
- `stdout`: Standard output stream for assertions on user reporting and boxen banners.
- `stderr`: Standard error stream for error diagnostics.
- `fs`: Emitted file structure, frontmatter schemas, file sizes, and byte counts.

---

## 3. Test Methodology: Category-Partition & Boundary Value Analysis (BVA)

### 3.1. Category-Partition Mapping

| Parameter / Environment | Equivalence Partition | Boundary / Edge Cases | Expected Behavior |
| :--- | :--- | :--- | :--- |
| **Project Directory** | `Valid Git Repo`, `Non-Git Directory`, `Empty Directory`, `Corrupted Directory` | 0 files; deeply nested paths; non-existent path | Init/update executes or exits with descriptive error; no unhandled crashes. |
| **Tech Stack** | `Node/TS Backend`, `React Frontend`, `Fullstack`, `Generic/Empty Stack` | Project with no identifiable stack | Generic rules generated; MCP filtering includes only relevant tools. |
| **Context Budget** | `< 24,000 bytes expanded`, `> 24,000 bytes expanded` | Exactly 24,000 bytes (boundary) | Doctor reports `[PASS]` if <= 24,000; reports `[FAIL]` if > 24,000 bytes. |
| **Gateway Router Size** | `< 6,000 bytes raw`, `> 6,000 bytes raw` | Exactly 6,000 bytes (boundary) | AGENTS.md raw size must stay under 6 KB limit. |
| **Role Identifier** | `Valid Catalog Role`, `Custom Role with Alphabetic Name`, `Custom Role with Special Characters` | Special chars (`&`, `/`, `!`, spaces); string length > 80 chars | Sanitized to canonical kebab-case ID (e.g. `devops-sre-cloud`). |
| **CLI Flags** | `--yes`, `--dir`, `--dry-run`, `--ci`, `--json` | Combinations: `--dry-run` with update; `--ci` with doctor | `--dry-run` performs 0 disk writes; `--ci` returns exitCode 1 on check failures. |

---

## 4. Test Suite Hierarchy (Tiers 1 to 4)

### Tier 1: Feature Coverage (Core Requirements)
*Scope: Exhaustive verification of all 20 features across Requirements R1–R5 (minimum 5 test cases per feature area).*

#### Area 1: Multi-Engine YAML Frontmatter & Routes (R1)
- `TC-E2E-101`: Rule files in `.agents/rules/*.md` contain valid YAML frontmatter with `trigger: glob | model_decision` and appropriate `globs` or `description`.
- `TC-E2E-102`: Subagents in `.agents/agents/<id>.md` contain native Google Antigravity YAML frontmatter (`name`, `description`, `tools`, `model`, `commandExecutionPolicy`).
- `TC-E2E-103`: Claude Code subagents in `.claude/agents/<id>.md` are generated with PascalCase tools (`Read`, `Grep`, `Glob`, `Bash`, `Edit`, `Write`) and `isolation: worktree`.
- `TC-E2E-104`: Cursor rules in `.cursor/rules/<id>.mdc` are emitted with `description`, `globs`, and `alwaysApply: false`.
- `TC-E2E-105`: Trigger validation enforces `trigger: glob` for code-bound rules (`backend.md`, `frontend.md`, `database.md`) and `trigger: model_decision` for progressive disclosure (`security.md`).

#### Area 2: Gateway Router & Context Budget (R2)
- `TC-E2E-106`: Root `AGENTS.md` is generated as a lightweight Gateway Router strictly under 6,000 bytes raw.
- `TC-E2E-107`: Root `AGENTS.md` inlines exclusively `@[CONSTRAINTS](.agents/CONSTRAINTS.md)`, replacing cascading inlines with markdown hyperlinks.
- `TC-E2E-108`: Total expanded context size of root `AGENTS.md` remains strictly under 24,000 bytes.
- `TC-E2E-109`: `orchestron doctor` computes expanded context size by resolving `@[...]` references and reports `[PASS]`.
- `TC-E2E-110`: `orchestron doctor` reports `[FAIL]` when simulated expanded context exceeds 24,000 bytes.

#### Area 3: Unified Roles & Atomic `add-role` (R3)
- `TC-E2E-111`: `orchestron add-role` atomically creates the modular rule in `.agents/rules/<id>.md` with YAML frontmatter.
- `TC-E2E-112`: `orchestron add-role` atomically creates the native subagent prompt in `.agents/agents/<id>.md`.
- `TC-E2E-113`: `orchestron add-role` synchronizes the gateway policy in `.agents/orchestron.yaml`.
- `TC-E2E-114`: `orchestron add-role` appends the role registration entry in `.agents/CONTEXT.md`.
- `TC-E2E-115`: `orchestron team --role <id>` validates and displays the newly incorporated role structure.

#### Area 4: Quality Hooks, Doctor Enforcement & Ergonomics (R4 & R5)
- `TC-E2E-116`: Initialization generates `.claude/settings.json` with a deterministic `Stop` hook invoking `orchestron doctor --ci`.
- `TC-E2E-117`: `orchestron hooks --install` generates an executable Git `.git/hooks/pre-commit` script.
- `TC-E2E-118`: `orchestron doctor --ci` exits with process status code `0` when all quality checks pass.
- `TC-E2E-119`: `orchestron doctor --ci` exits with process status code `1` when any quality check fails.
- `TC-E2E-120`: Balanced block AST parser correctly detects asynchronous queries inside loops while ignoring braces inside strings and comments.

---

### Tier 2: Boundary & Corner Cases (BVA & Stress)
*Scope: Resiliency against anomalous inputs, edge conditions, and missing prerequisites.*

- `TC-E2E-201`: Empty directory initialization (`orchestron init -y`) succeeds cleanly on a directory with zero existing files.
- `TC-E2E-202`: Project with completely unrecognized/generic tech stack generates robust default configuration without crashing.
- `TC-E2E-203`: Custom role name containing special characters (`DevOps & SRE / Cloud!`) is sanitized into valid canonical kebab-case ID (`devops-sre-cloud`).
- `TC-E2E-204`: Custom role name with excessive length (> 80 characters) is handled cleanly without filesystem or path overflow errors.
- `TC-E2E-205`: Corrupted or malformed `.agents/orchestron.yaml` is recovered defensively during `orchestron update` without crashing.
- `TC-E2E-206`: Deeply nested target directory (`--dir ./nested/sub/project`) is resolved and populated accurately.
- `TC-E2E-207`: Non-git repository directory is handled safely by git detector and doctor without raising fatal errors.

---

### Tier 3: Cross-Feature Combinations & Pairwise Integration
*Scope: Interoperability across features, state transitions, and non-destructive operations.*

- `TC-E2E-301`: `add-role` followed by `orchestron doctor` verifies that newly generated role artifacts pass all doctor quality gates.
- `TC-E2E-302`: `orchestron update --dry-run` simulates update operations and guarantees that exactly 0 bytes are modified on disk.
- `TC-E2E-303`: Semantic MCP filtering: Backend-only project receives database MCPs and omits Figma/UI MCPs; Frontend-only project receives UI MCPs and omits SQL MCPs.
- `TC-E2E-304`: Automatic legacy migration: Existing legacy files in `.agents/subagents/` are detected and migrated to `.agents/agents/` during `orchestron update`.
- `TC-E2E-305`: Update preserves existing `CONTEXT.md` change log history and custom roles defined in `orchestron.yaml`.

---

### Tier 4: Real-World Scenarios (End-to-End Application Journeys)
*Scope: Multi-step developer workflows replicating real production usage.*

- `TC-E2E-401`: **Standard Full Project Lifecycle:**
  `init -y` -> verify directory structure -> `add-role` -> `update` -> `doctor --ci` completes with exit code 0.
- `TC-E2E-402`: **Multi-Engine Project Journey:**
  Init with Antigravity, Claude Code, and Cursor options enabled -> verify `.agents/`, `.claude/`, `.cursor/` emitted -> add custom role -> verify all engines updated -> run `doctor --ci`.
- `TC-E2E-403`: **Anti-Degradation Trap & Remedy:**
  Initialize project -> introduce prohibited `@ts-ignore` in source file -> verify `doctor --ci` detects violation and exits with code 1 -> remove suppression -> verify `doctor --ci` passes with exit code 0.

---

## 5. Test Execution Commands & Matrix

### Running the Entire E2E Test Suite
```bash
npx vitest run tests/e2e
```

### Running Individual Test Suites by Tier
```bash
# Tier 1: Feature Coverage (Core Requirements R1-R5)
npx vitest run tests/e2e/tier1-features.test.ts

# Tier 2: Boundary & Corner Cases (BVA)
npx vitest run tests/e2e/tier2-boundary.test.ts

# Tier 3: Cross-Feature Combinations & Integration
npx vitest run tests/e2e/tier3-combinations.test.ts

# Tier 4: Real-World End-to-End Scenarios
npx vitest run tests/e2e/tier4-scenarios.test.ts
```

---

## 6. Authoritative Expected Output Derivation

All expected values and assertion criteria are derived strictly from:
1. `ORIGINAL_REQUEST.md`: Formal specification of Orchestron CLI 2.0 evolution.
2. `PROJECT.md`: Architectural blueprints, feature inventory (#1-#21), and interface contracts.
3. `survey_specs.md`: Detailed YAML schemas, canonical triggers, and multi-engine paths.
4. `CONSTRAINTS.md`: Inviolable quality bar, anti-degradation floor, and context limits (< 24 KB).
