# Architecture

This document describes the internal architecture of CS Quill.

---

## Data Flow

```
  Source File
      |
      v
+---------------------+
| Pre-filter (Regex)  |  Fast line-by-line chunking, surface pattern match
+---------------------+
      |  candidates
      v
+---------------------+
| AST Layer           |  ts-morph + acorn parse, structural analysis
+---------------------+
      |  findings
      v
+---------------------+
| TypeChecker Layer   |  TypeScript compiler API, type-aware validation
+---------------------+
      |  typed findings
      v
+---------------------+
| esquery Layer       |  CSS-like AST selectors for complex pattern match
+---------------------+
      |  raw results
      v
+---------------------+
| False-Positive      |  5-stage filter: context -> scope -> usage ->
| Filter (5-stage)    |  pattern -> confidence. Boost signals for P0/P1.
+---------------------+
      |  verified findings
      v
+---------------------+
| AI Judge            |  Team-lead judge per team + cross-judge arbiter
+---------------------+
      |  final verdict
      v
  HMAC Receipt Chain --> SQLite Storage
```

## 4-Layer Verification Engine

1. **Pre-filter** -- Regex-based line scanning. Splits files into chunks for parallel processing. Catches surface patterns (console.log, eval, TODO) before expensive parsing.
2. **AST** -- Full parse via ts-morph (TypeScript) and acorn (JavaScript). Detects structural issues: empty functions, dead code, nesting depth, cognitive complexity.
3. **TypeChecker** -- Leverages the TypeScript compiler API for type-aware checks. Catches `any` leaks, unsafe casts, missing null guards.
4. **esquery** -- CSS-like selectors over the AST. Enables declarative pattern definitions for the 224-rule catalog.

## 8-Team Pipeline

Each verification run dispatches findings through 8 specialized teams:

| Team | Focus | Method |
|------|-------|--------|
| 1. Regex | Surface patterns | Line-by-line regex |
| 2. AST | Structural analysis | ts-morph + acorn |
| 3. Hollow | Empty stubs | AST body-length check |
| 4. Dead Code | Unreachable code | Control-flow analysis |
| 5. Design | Formatting | Prettier + token compliance |
| 6. Cognitive | Complexity | Nesting, line length, ternary chains |
| 7. Bug Pattern | Deep verify | 6 checks at P0-P2 severity |
| 8. Security | Vulnerabilities | npm audit + pattern scanning |

## 436-Rule Dual Catalog

- **224 Rule Detectors** -- Negative patterns across 16 categories that flag violations.
- **212 Good Patterns** -- Positive examples that the AI judge and offline arena use as reference for approve/reject decisions.

## Pre-filter Chunking

Large files are split into chunks before AST parsing. The pre-filter assigns each chunk a relevance score. Only chunks exceeding the threshold enter the AST layer, reducing parse time on large codebases.

## AI Orchestration

- **SEAL Contracts** -- Structured generation prompts replacing free-form chat. Each contract specifies inputs, constraints, and expected outputs.
- **Multi-Key Fallback** -- Keys are tried in order across 8 providers. On failure, the next key is attempted with exponential backoff.
- **Team-Lead + Cross-Judge** -- Each verification team has a dedicated AI judge. A cross-judge resolves conflicts when teams disagree.

## Daemon Protocol

The WebSocket daemon (port 8443) maintains persistent connections with VS Code and web clients. It supports 9 message types (ping, identify, analyze_file, analyze_batch, get_fix, explain_code, subscribe_file, get_config, get_status) with JSON-RPC-style request/response pairing. An HTTP fallback serves `/health`, `/analyze`, and `/status` endpoints.

## IDENTITY_SEAL System

Every module contains an `IDENTITY_SEAL` block declaring its name, purpose, version, and author. The seal is validated at load time. Tampering with the seal prevents the module from executing, providing a basic integrity check across the codebase.

---

*Built with care by the EH Universe team.*
