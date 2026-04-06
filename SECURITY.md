# Security Policy

This document describes the security measures built into CS Quill and how to report vulnerabilities.

---

## Sandbox Architecture

CS Quill executes all AI-generated code inside a restricted sandbox:

- **VM Isolation** -- Generated code runs in a Node.js `vm` context with a limited global scope. Access to `process`, `require`, `__dirname`, and `__filename` is denied.
- **Child Process Restriction** -- `child_process` methods (`exec`, `spawn`, `execFile`, `fork`) are blocked within the sandbox. No shell commands can be spawned by generated code.
- **Escape Testing** -- 9 out of 10 documented sandbox escape vectors are blocked, including prototype pollution, constructor traversal, and `this` context leaks. See the test suite for details.

## Eval and Function Blocking

Dynamic code execution primitives are prohibited throughout the codebase:

- `eval()` is flagged by the regex pre-filter (Team 1) and the security scanner (Team 8).
- `new Function()` construction is detected at the AST layer (Team 2).
- Any PR introducing these patterns will fail the verification pipeline.

## HMAC Receipt Chain

Every verification result is signed with an HMAC-SHA256 digest:

1. The receipt includes the file path, findings, score, timestamp, and the previous receipt's hash.
2. Each new receipt chains to its predecessor, forming a tamper-evident audit trail.
3. Receipts are stored in SQLite and can be exported via `cs report`.
4. Breaking the chain (modifying or deleting a receipt) is detectable by comparing the stored hash against a recomputed value.

## False-Positive Filter Validation

The 5-stage false-positive filter is validated against a curated set of known true positives and known false positives:

1. **Context Analysis** -- Checks surrounding code to distinguish intentional patterns from violations.
2. **Scope Resolution** -- Tracks variable scope to avoid flagging shadowed or locally scoped identifiers.
3. **Usage Tracking** -- Confirms whether a flagged symbol is actually used downstream.
4. **Pattern Matching** -- Compares against the 212 good-pattern catalog.
5. **Confidence Scoring** -- Assigns a numeric confidence. Findings below the threshold are suppressed; P0/P1 findings receive boost signals that lower the suppression threshold.

## Dependency Security

- `npm audit` must report **0 vulnerabilities** before every release.
- `lockfile-lint` validates the integrity of `package-lock.json`.
- SBOM generation (CycloneDX / SPDX) provides a machine-readable inventory of all dependencies.

## Responsible Disclosure

If you discover a security vulnerability in CS Quill:

1. **Do not** open a public GitHub issue.
2. Report privately via [GitHub Security Advisories](https://github.com/gilheumpark-bit/cs-quill-cli/security/advisories/new) or contact the maintainer through the repository's issue tracker with the subject line `[SECURITY]`.
3. Include a description of the vulnerability, reproduction steps, and potential impact.
4. We aim to acknowledge reports within 48 hours and provide a fix or mitigation within 7 days.

## Scope

This policy covers the `cs-quill-cli` npm package and its first-party source code. Third-party dependencies are covered by their own security policies.

---

*Built with care by the EH Universe team.*
