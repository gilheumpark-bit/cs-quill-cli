# Changelog

All notable changes to CS Quill will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Changed

- **Docs** — README and CONTRIBUTING now reflect the current Jest suite (**611 tests**, **16 suites**, **~55%** statement coverage). Daemon/detector-registry tests silence expected `console` output to keep CI logs readable.

---

## [0.1.0] - 2026-04-06

### Added

- **Rule Engine** -- 224 rule detectors across 16 categories (security, performance, cognitive complexity, dead code, design, bug patterns, and more).
- **Good Pattern Catalog** -- 212 approved patterns serving as positive examples for the AI judge and verification pipeline.
- **4-Layer Verification Engine** -- Pre-filter (regex), AST (ts-morph + acorn), TypeChecker (TypeScript compiler API), esquery (CSS-like AST selectors).
- **5-Stage False-Positive Filter** -- Context analysis, scope resolution, usage tracking, pattern matching, and confidence scoring. Complemented by boost signals for high-severity findings.
- **AI Judge** -- Dual-agent system: team-lead judge per verification team + cross-judge for inter-team conflict resolution.
- **29 CLI Commands** -- `init`, `generate`, `verify`, `audit`, `apply`, `undo`, `stress`, `bench`, `playground`, `ip-scan`, `compliance`, `vibe`, `explain`, `learn`, `suggest`, `sprint`, `bookmark`, `preset`, `search`, `daemon`, `serve`, `config`, `doctor`, `completion`, `report`, `session`, `debug`, `fun`, and multi-language aliases (35+).
- **18 Adapters** -- Security scanner, performance profiler, git integration, code search (ripgrep), license checker, dependency analyzer, SBOM generator, SQLite storage, tree-sitter parser, and more.
- **WebSocket Daemon** -- Persistent background server on port 8443 supporting real-time analysis, batch processing, file watching, and HTTP fallback.
- **HMAC Receipt Chain** -- SHA-256 tamper-proof audit trail linking every verification result to its predecessor.
- **Multi-Key Auto-Fallback** -- Cascading rotation across 8 AI providers (Google, Anthropic, OpenAI, Groq, Mistral, Ollama, LM Studio, DeepSeek).
- **Offline Mode** -- 10 auto-heal rules and evidence-based arena that work without any AI API connection.
- **SBOM Generation** -- CycloneDX 1.5 and SPDX 2.3 compliance reporting.
- **Multi-Language Support** -- Korean, English, Japanese, and Chinese command aliases.
- **Test Suite** -- 411 automated tests across 10 suites with approximately 43% statement coverage.

---

*Built with care by the EH Universe team.*
