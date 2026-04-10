# CS Quill 🦔

**Autonomous AI Coding Agent CLI — 56 Open-Source Engines, Multi-Key Fallback, Zero Cloud Lock-in**

```
    /\_/\
   ( o.o )  CS Quill
    > ^ <   Code Quality Guardian
  /||||||\\
```

> *A hedgehog's quills protect it from threats. CS Quill's 56 engines protect your code from bugs, vulnerabilities, and tech debt.*

[![CI](https://github.com/gilheumpark-bit/cs-quill-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/gilheumpark-bit/cs-quill-cli/actions)
[![Tests](https://img.shields.io/badge/tests-611%20passed-brightgreen)](https://github.com/gilheumpark-bit/cs-quill-cli)
[![Coverage](https://img.shields.io/badge/coverage-55%25%20stmts-yellow)](https://github.com/gilheumpark-bit/cs-quill-cli)
[![License](https://img.shields.io/badge/license-Dual%20(CC--BY--NC%20%2B%20Commercial)-blue)](./LICENSE)

---

## What is CS Quill?

CS Quill is a **local-first, AI-powered code quality CLI** that integrates 56 open-source analysis engines into a single command-line tool. It generates, verifies, and heals code autonomously — with or without an internet connection.

### Key Features

- **56 Engines** — AST parsers, linters, security scanners, performance profilers, test runners
- **8-Team Verification Pipeline** — Every code change passes through 8 specialized analysis teams with AST + deep-verify
- **SEAL Contract Generation** — AI generates code in parallel using structured contracts, not chat
- **Multi-Key Auto-Fallback** — Cascading key rotation across providers (Google → Anthropic → OpenAI → Groq)
- **Offline-First** — 10 self-healing rules work without any AI API
- **WebSocket Daemon** — Real-time connection to VS Code and web apps (throughput configurable via `cs stress`)
- **4 Languages** — Korean, English, Japanese, Chinese command aliases (35+ aliases)
- **SBOM Generation** — CycloneDX 1.5 / SPDX 2.3 compliance reporting
- **HMAC Receipt Chain** — Tamper-proof SHA-256 audit trail for every verification

### Battle-Tested

```
611/611 automated tests PASSED (16 suites, 0 skip, 0 fail)
  ~55% statement coverage (Jest; see npm test output)

46 manual E2E tests PASSED
7 AI integration tests PASSED (Gemini 2.5 Flash)
4 multi-key fallback tests PASSED
Daemon smoke test: 10 sequential requests, 0 failures
Load/stress testing: configurable via `cs stress --url`
Sandbox escape: 9/10 blocked (process, require, eval, Function)
npm audit: 0 vulnerabilities

Last verified: 2026-04-07
```

---

## Quick Start

```bash
# Install CLI
npm install -g cs-quill-cli

# Initialize project
cs init

# Generate code from natural language
cs generate "REST API with JWT auth and Zod validation"

# Verify entire project (8-team pipeline)
cs verify ./src

# Start background daemon for VS Code integration
cs daemon --port 8443

# Environment diagnostics
cs doctor
```

### 📥 VS Code Extension

<a href="https://github.com/gilheumpark-bit/eh-universe-vscode/releases/latest/download/eh-universe-vscode-1.0.0.vsix">
  <img src="https://img.shields.io/badge/Download-VS%20Code%20Extension-007ACC?style=for-the-badge&logo=visual-studio-code&logoColor=white" alt="Download VSIX" />
</a>

Real-time diagnostics, one-click fixes, and health score — all inside VS Code. [Details →](https://github.com/gilheumpark-bit/eh-universe-vscode)

---

## 3-Tier Architecture

```
┌─────────────────────────────────────────────────┐
│                                                  │
│  eh-universe-web  ←── REST ──→  CS Quill Daemon  │
│                                 ↕ WebSocket      │
│  VS Code Extension ←── WS ──→  CS Quill Daemon   │
│                                                  │
└─────────────────────────────────────────────────┘
```

| Component | Repository | Purpose |
|-----------|-----------|---------|
| **CLI + Daemon** | [cs-quill-cli](https://github.com/gilheumpark-bit/cs-quill-cli) | 56-engine analysis + WebSocket server |
| **VS Code** | [eh-universe-vscode](https://github.com/gilheumpark-bit/eh-universe-vscode) | Diagnostics + quick-fix + sidebar |
| **Web App** | [eh-universe-web](https://github.com/gilheumpark-bit/eh-universe-web) | Next.js app with Code Studio |

### Project Stats

| Layer | Files | Lines |
|-------|-------|-------|
| Commands | 28 | 4,800+ |
| Core | 28 | 7,500+ |
| Adapters | 18 | 4,500+ |
| AI Orchestration | 4 | 850+ |
| Daemon | 1 | 681 |
| Tests | 6 | 2,200+ |
| **Total** | **~85** | **~20,500** |

---

## Multi-Key Auto-Fallback

CS Quill automatically rotates through all configured API keys when one fails:

```
Key 1 (Google) → 400 Error → Key 2 (Google) → 400 Error → Key 3 (Google) → Success ✅
                                                            🔄 "폴백 성공: 3번째 키"
```

```bash
# Add multiple keys
cs config set-key google    # Key 1
cs config set-key google    # Key 2 (different key)
cs config set-key anthropic # Key 3 (different provider)
cs config set-key groq      # Key 4 (free fallback)
```

All keys are tried in order. If all fail, a detailed error report shows which key failed and why.

Supports **8 AI providers**: Anthropic (Claude), OpenAI (GPT), Google (Gemini), Groq (Llama), Mistral, Ollama, LM Studio, DeepSeek

---

## 56 Integrated Engines

### AST & Parsing (6)
typescript, ts-morph, acorn, estraverse, esquery, @babel/parser

### Lint & Quality (6)
eslint, @typescript-eslint, biome, prettier, jscpd, madge

### Security (6)
njsscan, lockfile-lint, socket, retire.js, npm audit, snyk

### Performance (5)
autocannon, clinic.js, 0x, tinybench, c8

### Testing (3)
vitest, fast-check, stryker

### TUI & CLI (10)
ink, commander, chalk, ora, boxen, cli-table3, figures, inquirer, update-notifier, conf

### License & IP (3)
license-checker, spdx-license-list, detective

### Formal Verification (1)
z3-solver

### Data & Language (3)
better-sqlite3, envinfo, tree-sitter

### Extended (13)
axe-core, depcheck, knip, dependency-cruiser, publint, are-the-types-wrong, oxlint, size-limit, lighthouse, codemod, ripgrep, node-fzf, jsdom

---

## Commands (28)

### Core
| Command | Alias | Description |
|---------|-------|-------------|
| `cs init` | | Project initialization & onboarding |
| `cs generate <prompt>` | `cs g` | SEAL contract parallel code generation |
| `cs verify [path]` | `cs v` | 8-team parallel verification ($0, ~3s) |
| `cs audit` | `cs a` | 16-area project health audit |
| `cs apply [file]` | | Apply generated code to source |
| `cs undo` | | Revert last modification |

### Performance
| Command | Alias | Description |
|---------|-------|-------------|
| `cs stress [path]` | `cs s` | Load testing (static + autocannon `--url`) |
| `cs bench [path]` | `cs b` | Function benchmarking (tinybench runtime) |
| `cs playground` | `cs p` | Full 56-engine benchmark dashboard |

### Security & Compliance
| Command | Description |
|---------|-------------|
| `cs ip-scan [path]` | IP/patent/license scanning |
| `cs compliance` | Pre-deployment compliance check |
| `cs compliance --sbom cyclonedx` | Generate CycloneDX 1.5 SBOM |
| `cs compliance --sbom spdx` | Generate SPDX 2.3 SBOM |

### AI & Learning
| Command | Description |
|---------|-------------|
| `cs vibe <prompt>` | Natural language mode (zero technical knowledge) |
| `cs explain [path]` | Code explanation with AST analysis fallback |
| `cs learn` | Educational mode (dynamic team-specific tips) |
| `cs suggest` | Project improvement recommendations |

### Productivity
| Command | Description |
|---------|-------------|
| `cs sprint <tasks>` | Sequential auto-generation from task list |
| `cs bookmark <action>` | Prompt favorites (list/add/remove/run) |
| `cs preset <action>` | Framework presets (React 19, Next 16, Tailwind 4, TS 5) |
| `cs search <query>` | Code/file/symbol search (ripgrep + fuzzy) |

### Infrastructure
| Command | Description |
|---------|-------------|
| `cs daemon` | Background WebSocket + HTTP daemon server |
| `cs serve [port]` | HTTP-only API server (8 endpoints) |
| `cs config <action>` | Configuration & API key management |
| `cs doctor` | Environment diagnostics (Node/npm/git/AI keys) |
| `cs completion [shell]` | Shell completion scripts (bash/zsh/fish) |
| `cs report` | Daily/weekly report from verification receipts |
| `cs session [action]` | Session management with 30-day auto-expiry |
| `cs debug <file>` | Node.js inspector debugging (`--inspect <expr>`) |
| `cs fun [action]` | Easter eggs (poem/quiz/art/fortune/challenge) |

### Multi-Language Aliases (35+)

```bash
# Korean
cs 생성 "REST API 만들어줘"
cs 검증 ./src
cs 감사

# Japanese
cs 生成 "REST APIを作って"
cs 検証

# Chinese
cs 验证
cs 审计

# Short
cs g "make a todo API"
cs v ./src
cs a
```

---

## Verification Pipeline

```
Team 1: Regex        → Surface patterns (console.log, eval, TODO)
Team 2: AST          → TypeScript + ts-morph + acorn structural analysis
Team 3: Hollow       → Empty function / stub detection (AST-based)
Team 4: Dead Code    → Unreachable code after return
Team 5: Design       → Prettier format + design token compliance
Team 6: Cognitive    → Nesting depth, line length, ternary chains
Team 7: Bug Pattern  → Deep-verify 6 checks (P0~P2 severity)
Team 8: Security     → npm audit + pattern scanning
```

Each verification produces an **HMAC-SHA256 receipt** chained to the previous receipt for tamper-proof audit trail.

---

## Daemon Protocol

### WebSocket (ws://127.0.0.1:8443)

```json
→ { "type": "analyze_file", "id": "req-1", "payload": { "filePath": "app.ts", "content": "..." } }
← { "type": "analysis_result", "id": "req-1", "payload": { "findings": [...], "score": 85, "duration": 230 } }
```

| Message | Direction | Purpose |
|---------|-----------|---------|
| `ping` / `pong` | Bidirectional | Keep-alive |
| `identify` / `identified` | C→S / S→C | Session registration |
| `analyze_file` / `analysis_result` | C→S / S→C | Single file analysis |
| `analyze_batch` / `batch_result` | C→S / S→C | Multi-file with progress streaming |
| `get_fix` / `fix_result` | C→S / S→C | AI-powered code fix |
| `explain_code` / `explain_result` | C→S / S→C | Code explanation |
| `subscribe_file` / `file_changed` | C→S / S→C | File watch & auto-analysis |
| `get_config` / `config` | C→S / S→C | Configuration query |
| `get_status` / `status` | C→S / S→C | Server health |

### HTTP Fallback

```bash
curl http://localhost:8443/health
curl -X POST http://localhost:8443/analyze -d '{"filePath":"app.ts","content":"..."}'
curl http://localhost:8443/status
```

---

## Offline Mode

CS Quill works without any AI API connection:

**10 Auto-Heal Rules:**
1. Optional chaining injection (`obj.method()` → `obj?.method()`)
2. Recursion depth guard (`if (_depth > 100) return`)
3. Console.log cleanup
4. Empty catch logging (`catch() {}` → `catch(e) { console.error(e) }`)
5. `any` → `unknown` type replacement
6. `Promise.all` catch injection
7. `parseInt` radix addition
8. `=== NaN` → `Number.isNaN()` replacement
9. `forEach(async)` detection
10. Unused import removal

**Offline Arena:** Evidence-based automatic approve/reject using pipeline scores (no AI agents needed)

---

## CI/CD

```yaml
# .github/workflows/ci.yml
# Runs on: ubuntu-latest + windows-latest
# Node versions: 18, 20, 22
# Steps: install → build → test (611 tests) → smoke test
```

```bash
npm run build          # TypeScript → dist/
npm test               # 611 tests, 0 fail
npm run test:coverage  # Coverage report
npm run test:ci        # CI mode (--ci --coverage --forceExit)
```

---

## Mascot

```
    /\_/\
   ( o.o )  CS Quill 🦔
    > ^ <
  /||||||\\

Score ≥ 95:  ( ^.^ ) ★ PERFECT!
Score ≥ 70:  ( o.o )   Working...
Score < 70:  ( ;.; )   Needs help
```

**CS Quill** — A hedgehog whose quills are 8 verification teams. Each quill catches a different type of bug. The more quills stand up, the safer your code.

---

## License

Dual License:
- **Non-commercial**: CC-BY-NC-4.0 (free for personal, education, open-source)
- **Commercial**: Contact for enterprise licensing terms

---

*Built with 🦔 by the EH Universe team*
