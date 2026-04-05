# CS Quill 🦔

**Autonomous AI Coding Agent CLI — 56 Open-Source Engines, Zero Cloud Lock-in**

```
    /\_/\
   ( o.o )  CS Quill
    > ^ <   Code Quality Guardian
  /||||||\\
```

> *The quills of a hedgehog protect it from threats. CS Quill's 56 engines protect your code from bugs, vulnerabilities, and tech debt.*

---

## What is CS Quill?

CS Quill is a **local-first, AI-powered code quality CLI** that integrates 56 open-source analysis engines into a single command-line tool. It generates, verifies, and heals code autonomously — with or without an internet connection.

- **56 Engines** — AST parsers, linters, security scanners, performance profilers, test runners, and more
- **8-Team Verification Pipeline** — Every code change passes through 8 specialized analysis teams
- **SEAL Contract Generation** — AI generates code in parallel using structured contracts, not chat
- **Offline-First** — 10 self-healing rules work without any AI API
- **WebSocket Daemon** — Connects to VS Code and web apps via real-time protocol
- **4 Languages** — Korean, English, Japanese, Chinese command aliases

---

## Quick Start

```bash
# Initialize project
cs init

# Generate code from natural language
cs generate "REST API with JWT auth and Zod validation"

# Verify entire project (8-team pipeline)
cs verify ./src

# Start background daemon for VS Code integration
cs daemon --port 8443
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│            3-Tier Architecture                   │
│                                                  │
│  Web App  ←── REST ──→  CS Quill CLI (Daemon)    │
│                         ↕ WebSocket              │
│  VS Code  ←── WS ────→  CS Quill CLI (Daemon)    │
└─────────────────────────────────────────────────┘
```

| Layer | Components | Lines |
|-------|-----------|-------|
| **Commands** | 21 CLI commands + 7 utility commands | 4,299 |
| **Core** | 28 modules (pipeline, AI bridge, CFG engine, data-flow) | 7,170 |
| **Adapters** | 18 engine adapters (AST, lint, security, perf, test) | 4,217 |
| **AI** | 4 orchestration modules (planner, team-lead, cross-judge) | 848 |
| **Daemon** | WebSocket server + HTTP fallback | 681 |
| **Total** | **77 files** | **18,238** |

---

## 56 Integrated Engines

### AST & Parsing (6)
| # | Package | License | Purpose |
|---|---------|---------|---------|
| 1 | typescript | Apache 2.0 | Type inference + Compiler API |
| 2 | ts-morph | MIT | AST parsing/manipulation wrapper |
| 3 | acorn | MIT | Lightweight JS parser |
| 4 | estraverse | BSD-2 | AST tree traversal |
| 5 | esquery | BSD-3 | CSS selector-based AST search |
| 6 | @babel/parser | MIT | JSX/TS parsing |

### Lint & Quality (6)
| # | Package | License | Purpose |
|---|---------|---------|---------|
| 7 | eslint | MIT | JS/TS linting |
| 8 | @typescript-eslint | MIT | TS-specific rules |
| 9 | biome | MIT | Ultra-fast lint + format |
| 10 | prettier | MIT | Code formatting |
| 11 | jscpd | MIT | Duplicate code detection |
| 12 | madge | MIT | Circular dependency detection |

### Security (6)
| # | Package | License | Purpose |
|---|---------|---------|---------|
| 13 | njsscan | LGPL | Node.js security scanner |
| 14 | lockfile-lint | Apache 2.0 | Lockfile tamper detection |
| 15 | socket (CLI) | MIT | Malicious package detection |
| 16 | retire.js | Apache 2.0 | Vulnerable library detection |
| 17 | npm audit | Built-in | CVE vulnerability check |
| 18 | snyk (CLI) | Apache 2.0 | Deep security scan |

### Performance (5)
| # | Package | License | Purpose |
|---|---------|---------|---------|
| 19 | autocannon | MIT | HTTP load testing |
| 20 | clinic.js | MIT | Node profiling |
| 21 | 0x | MIT | Flamegraph generation |
| 22 | tinybench | MIT | Function benchmarking |
| 23 | c8 | ISC | Coverage measurement |

### Testing (3)
| # | Package | License | Purpose |
|---|---------|---------|---------|
| 24 | vitest | MIT | Ultra-fast test runner |
| 25 | fast-check | MIT | Property-based fuzzing |
| 26 | stryker | Apache 2.0 | Mutation testing |

### TUI & CLI (10)
| # | Package | License | Purpose |
|---|---------|---------|---------|
| 27 | ink | MIT | React-based TUI |
| 28 | commander | MIT | Command parser |
| 29 | chalk | MIT | Color output |
| 30 | ora | MIT | Spinner |
| 31 | boxen | MIT | Box drawing |
| 32 | cli-table3 | MIT | Tables |
| 33 | figures | MIT | Unicode icons |
| 34 | inquirer | MIT | Interactive prompts |
| 35 | update-notifier | BSD-2 | Update alerts |
| 36 | conf | MIT | Config management |

### License & IP (3)
| # | Package | License | Purpose |
|---|---------|---------|---------|
| 37 | license-checker | BSD-3 | Dependency license scan |
| 38 | spdx-license-list | CC0 | SPDX license database |
| 39 | detective | MIT | require/import tracing |

### Formal Verification (1)
| # | Package | License | Purpose |
|---|---------|---------|---------|
| 40 | z3-solver | MIT | SMT logic proving |

### Data & Language (3)
| # | Package | License | Purpose |
|---|---------|---------|---------|
| 41 | better-sqlite3 | MIT | Local database |
| 42 | envinfo | MIT | Environment info collection |
| 43 | tree-sitter | MIT | Universal AST for 35+ languages |

### Extended (13)
| # | Package | License | Purpose |
|---|---------|---------|---------|
| 44 | axe-core | MPL 2.0 | Accessibility testing |
| 45 | depcheck | MIT | Unused dependency detection |
| 46 | knip | ISC | Unused file/export detection |
| 47 | dependency-cruiser | MIT | Dependency visualization |
| 48 | publint | MIT | npm publish validation |
| 49 | are-the-types-wrong | MIT | Type export validation |
| 50 | oxlint | MIT | Rust-based ultra-fast linter |
| 51 | size-limit | MIT | Bundle budget |
| 52 | lighthouse | Apache 2.0 | Web performance/SEO/a11y |
| 53 | codemod | MIT | Auto-migration |
| 54 | ripgrep (rg) | Unlicense/MIT | Ultra-fast code search |
| 55 | node-fzf | MIT | Fuzzy file search |
| 56 | jsdom | MIT | DOM simulation |

---

## Commands

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
| `cs stress [path]` | `cs s` | Load testing (static + autocannon) |
| `cs bench [path]` | `cs b` | Function benchmarking (tinybench) |
| `cs playground` | `cs p` | Full benchmark dashboard |

### Security & Compliance
| Command | Description |
|---------|-------------|
| `cs ip-scan [path]` | IP/patent/license scanning |
| `cs compliance` | Pre-deployment compliance check |
| `cs compliance --sbom cyclonedx` | Generate CycloneDX SBOM |
| `cs compliance --sbom spdx` | Generate SPDX SBOM |

### AI & Learning
| Command | Description |
|---------|-------------|
| `cs vibe <prompt>` | Natural language mode (zero technical knowledge required) |
| `cs explain [path]` | Code explanation with AST analysis |
| `cs learn` | Educational mode (explains verification failures) |
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
| `cs daemon --port 8443` | Background WebSocket daemon server |
| `cs serve [port]` | HTTP API server (8 endpoints) |
| `cs config <action>` | Configuration management |
| `cs doctor` | Environment diagnostics (Node/npm/git/AI keys) |
| `cs completion [shell]` | Shell completion scripts (bash/zsh/fish) |
| `cs report` | Daily/weekly report from verification receipts |
| `cs session [action]` | Session management (list/show/delete) |
| `cs fun [action]` | Easter eggs (poem/quiz/art/fortune/challenge) |

### Multi-Language Aliases

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
```

---

## Verification Pipeline

Every file passes through **8 specialized teams**:

```
Team 1: Regex     → Surface patterns (console.log, eval, TODO)
Team 2: AST       → TypeScript + ts-morph structural analysis
Team 3: Hollow    → Empty function / stub detection
Team 4: Dead Code → Unreachable code after return
Team 5: Design    → Prettier + design token compliance
Team 6: Cognitive  → Nesting depth, line length, ternary chains
Team 7: Bug       → Deep-verify 6 checks (P0~P2 severity)
Team 8: Security  → npm audit + pattern scanning
```

Results are signed with **HMAC-SHA256 receipt chain** for tamper-proof audit trail.

---

## Daemon Protocol

### WebSocket (ws://127.0.0.1:8443)

```json
// Client → Server
{ "type": "analyze_file", "id": "req-1", "payload": { "filePath": "src/app.ts", "content": "..." } }

// Server → Client
{ "type": "analysis_result", "id": "req-1", "payload": { "findings": [...], "score": 85, "duration": 230 } }
```

| Message | Direction | Purpose |
|---------|-----------|---------|
| `ping` / `pong` | Bidirectional | Keep-alive |
| `identify` / `identified` | C→S / S→C | Session registration |
| `analyze_file` / `analysis_result` | C→S / S→C | Single file analysis |
| `analyze_batch` / `batch_result` | C→S / S→C | Multi-file analysis |
| `get_fix` / `fix_result` | C→S / S→C | AI-powered code fix |
| `explain_code` / `explain_result` | C→S / S→C | Code explanation |
| `subscribe_file` / `file_changed` | C→S / S→C | File watch & auto-analysis |
| `get_status` / `status` | C→S / S→C | Server health |
| `get_config` / `config` | C→S / S→C | Configuration query |

### HTTP Fallback

```bash
curl http://localhost:8443/health
curl -X POST http://localhost:8443/analyze -d '{"filePath":"app.ts","content":"..."}'
```

---

## Offline Mode

CS Quill works without any AI API. When AI is unavailable:

- **10 Auto-Heal Rules**: Optional chaining, recursion guard, empty catch logging, any→unknown, Promise.all catch, parseInt radix, NaN comparison, forEach(async) detection, unused import removal, console.log cleanup
- **Evidence-Based Arena**: Automatic approve/reject based on pipeline scores (no AI agents needed)
- **Static Analysis**: All 8 verification teams run locally using regex + AST
- **Rule-Based Conflict Resolution**: Import deduplication, ours/theirs merge strategy

---

## Configuration

```bash
cs config keys           # List API keys
cs config set-key groq   # Add API key (interactive)
cs config structure      # Toggle PART structure enforcement
cs config level          # Set experience level
cs config language       # Rotate language (ko/en/ja/zh)
```

Supports 8 AI providers: **Anthropic (Claude)**, **OpenAI (GPT)**, **Google (Gemini)**, **Groq (Llama)**, **Mistral**, **Ollama**, **LM Studio**, **DeepSeek**

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

**CS Quill** — The hedgehog whose quills are 8 verification teams. Each quill catches a different type of bug. The more quills stand up, the safer your code.

---

## License

CC-BY-NC-4.0

---

*Built with 🦔 by the EH Universe team*
