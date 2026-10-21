# TEST_READY.MD — E2E TEST SUITE READINESS REPORT

> **Status:** READY FOR VERIFICATION & CI  
> **Target:** Orchestron CLI 2.0 (`cli-orquestador-agent`)  
> **Author:** Test Writer (`teamwork_preview_test_writer_e2e_1`)  
> **Framework:** Vitest v5.0.1 (ESM / TypeScript)  

---

## 1. Test Runner Command

To execute the entire end-to-end test suite:
```bash
npx vitest run tests/e2e
```

To run individual tiers:
```bash
# Tier 1: Feature Coverage (Core Requirements R1-R5)
npx vitest run tests/e2e/tier1-features.test.ts

# Tier 2: Boundary & Corner Cases (BVA & Stress)
npx vitest run tests/e2e/tier2-boundary.test.ts

# Tier 3: Cross-Feature Combinations & Integration
npx vitest run tests/e2e/tier3-combinations.test.ts

# Tier 4: Real-World Scenarios (Full Lifecycle End-to-End)
npx vitest run tests/e2e/tier4-scenarios.test.ts
```

---

## 2. Test Suite Hierarchy & Inventory

| Tier | Test Suite File | Focus Area | Test Count | Current Pass | Pending Milestones |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Tier 1** | `tests/e2e/tier1-features.test.ts` | Multi-Engine Frontmatter, Gateway Router Size, Unified Roles, Quality Hooks | 20 | 12 | 8 (M1, M2, M3, M4) |
| **Tier 2** | `tests/e2e/tier2-boundary.test.ts` | Empty directories, unknown stacks, long names, special characters, corrupt YAML | 8 | 8 | 0 (100% PASS) |
| **Tier 3** | `tests/e2e/tier3-combinations.test.ts` | Role addition + doctor, update dry-run, selective MCP, legacy migration, config preservation | 5 | 3 | 2 (M2, M3) |
| **Tier 4** | `tests/e2e/tier4-scenarios.test.ts` | Full project lifecycle, multi-engine journey, anti-degradation trap & mechanical remedy | 4 | 3 | 1 (M4) |
| **Sanity** | `tests/e2e/smoke.test.ts` | Vitest runner sanity smoke test | 1 | 1 | 0 (100% PASS) |
| **TOTAL** | — | **Comprehensive E2E Coverage** | **38** | **27** | **11** |

---

## 3. Feature Traceability Matrix (PROJECT.md Features #1 to #21)

| Feature # | Feature Name | Milestone | Test Cases |
| :--- | :--- | :---: | :--- |
| **1** | YAML frontmatter in rules | M1 | `TC-E2E-101`, `TC-E2E-105` |
| **2** | Native Antigravity subagents in `.agents/agents/` | M1 | `TC-E2E-102` |
| **3** | Native Claude Code subagents in `.claude/agents/` | M1 | `TC-E2E-103`, `TC-E2E-402` |
| **4** | Export to Cursor rules `.cursor/rules/*.mdc` | M1 | `TC-E2E-104`, `TC-E2E-402` |
| **5** | Automatic migration `.agents/subagents/` -> `.agents/agents/` | M1 | `TC-E2E-304` |
| **6** | Gateway Router root `AGENTS.md` < 6 KB raw | M2 | `TC-E2E-106`, `TC-E2E-107` |
| **7** | Total expanded context budget < 24 KB | M2 | `TC-E2E-108` |
| **8** | Selective semantic MCP filtering in `mcp.ts` | M2 | `TC-E2E-303` |
| **9** | Expanded context size measurement in `doctor` | M2 | `TC-E2E-109`, `TC-E2E-110` |
| **10** | UnifiedRoleDefinition single source of truth | M3 | `TC-E2E-115` |
| **11** | Atomic multi-target synchronization in `add-role` | M3 | `TC-E2E-111`, `TC-E2E-112`, `TC-E2E-113`, `TC-E2E-114`, `TC-E2E-301` |
| **12** | Preference & custom role preservation in `update` | M3 | `TC-E2E-305` |
| **13** | Flag `--dry-run` in `orchestron update` | M3 | `TC-E2E-302` |
| **14** | Claude Code Stop Hook in `.claude/settings.json` | M4 | `TC-E2E-116` |
| **15** | Git pre-commit hook installer (`orchestron hooks --install`) | M4 | `TC-E2E-117` |
| **16** | Gate 1 Physical Artifact (`.agents/state/active-contract.md`) | M4 | `TC-E2E-404` |
| **17** | Balanced block counting AST parsing for N+1 async loops | M4 | `TC-E2E-120` |
| **18** | Doctor exit code = 1 and flag `--ci` in CLI | M4 | `TC-E2E-118`, `TC-E2E-119`, `TC-E2E-401`, `TC-E2E-403` |
| **19** | TUI shortcuts and live filtering in `menu` | M4 | `TC-E2E-203`, `TC-E2E-204` |
| **20** | Vitest setup with unit & E2E suites | M4 | `smoke.test.ts`, `tier1-4` test infrastructure |
| **21** | 100% E2E Verification & Adversarial Hardening | M5 | Complete suite execution (`38/38` green gate) |

---

## 4. Implementation Gaps Escalated to Milestone Sub-Orchestrators

The 11 pending test failures reflect features defined in `PROJECT.md` that await completion of Milestones M1–M4. These test assertions are authoritative and ready to turn green automatically as each milestone implements its deliverables:

1. **Milestone 1 (Multi-Engine Compatibility & Routes):**
   - Missing YAML frontmatter block `---` with `trigger` in `.agents/rules/*.md` (`TC-E2E-101`).
   - Subagents currently emitted in legacy `.agents/subagents/` instead of official `.agents/agents/` (`TC-E2E-102`).
2. **Milestone 2 (Context Budget & Selective MCP):**
   - Root `AGENTS.md` currently inlines `@[AGENTS]`, `@[CONTEXT]`, `@[MANIFEST]`, causing cascading blowup (`TC-E2E-107`).
   - MCP scanner dumps unneeded SQL/Figma tools indiscriminately without tech stack filtering (`TC-E2E-303`).
3. **Milestone 3 (Unified Roles & Persistence):**
   - `orchestron add-role` currently does not emit native subagents in `.agents/agents/`, frontmatter rules, or update `orchestron.yaml` gateway policies and `CONTEXT.md` (`TC-E2E-111`, `TC-E2E-112`, `TC-E2E-113`, `TC-E2E-114`).
   - `orchestron update` does not expose or implement `--dry-run` flag (`TC-E2E-302`).
4. **Milestone 4 (Deterministic Hooks & Doctor CI):**
   - `orchestron doctor` does not register the `--ci` option in Commander or exit with status code 1 on failed audits (`TC-E2E-118`, `TC-E2E-401`).
