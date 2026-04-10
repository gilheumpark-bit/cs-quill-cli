# Contributing to CS Quill

Thank you for your interest in contributing. This guide covers everything you need to get started.

---

## Prerequisites

- **Node.js** 18, 20, or 22 (LTS recommended)
- **npm** 9+
- **Git** 2.30+
- A configured AI API key is optional but recommended (`cs config set-key google`)

## Development Setup

```bash
git clone https://github.com/gilheumpark-bit/cs-quill-cli.git
cd cs-quill-cli
npm install
npm run build        # TypeScript -> dist/
npm test             # Must pass all 611 tests
npm run test:coverage
```

## Project Structure

```
src/
  core/           # 4-layer verification engine, rule catalogs, false-positive filter
  commands/       # 29 CLI command handlers (Commander.js)
  adapters/       # 18 integrations (security, perf, git, search, license, SBOM, etc.)
  ai/             # AI orchestration, SEAL contracts, multi-key fallback, judge system
  daemon/         # WebSocket + HTTP server (port 8443)
test/             # 16 test suites, 611 tests (Jest + ts-jest)
```

## Coding Standards

1. **PART Structure** -- Files over 100 lines must use labeled `// === PART N: Title ===` sections. No flat, unstructured code.
2. **SEAL Contracts** -- AI-generated code uses structured SEAL contracts, not free-form chat prompts.
3. **Module System** -- Use `require()` and `module.exports`. Do not use `import()` or ES module syntax in core source.
4. **IDENTITY_SEAL** -- Each module must include an identity seal block declaring its purpose, author, and version.
5. **Type Safety** -- Prefer `unknown` over `any`. Use TypeScript strict mode.
6. **No eval / Function** -- Dynamic code execution is prohibited. See SECURITY.md.

## Test Requirements

- All PRs must pass the full test suite: **611 tests, 0 failures**.
- New features require accompanying tests.
- Run `npm run test:ci` to simulate CI conditions (coverage + forceExit).
- Aim to maintain or improve the current ~55% statement coverage.

## Pull Request Guidelines

1. Fork the repository and create a feature branch from `main`.
2. Keep commits atomic and messages descriptive.
3. Run `npm run build && npm test` before submitting.
4. Describe the change, motivation, and any breaking impacts in the PR body.
5. One feature or fix per PR. Avoid mixing unrelated changes.
6. Ensure `npm audit` reports 0 vulnerabilities.

## Reporting Issues

Use [GitHub Issues](https://github.com/gilheumpark-bit/cs-quill-cli/issues). Include Node version, OS, and reproduction steps.

## License

By contributing, you agree that your contributions will be licensed under the project's dual license (CC-BY-NC-4.0 for non-commercial use; commercial license available separately).

---

*Built with care by the EH Universe team.*
