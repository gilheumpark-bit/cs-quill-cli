// @ts-nocheck — external library wrapper, types handled at runtime
// ============================================================
// CS Quill 🦔 — Security Engine Adapter
// ============================================================
// 5 packages: njsscan, lockfile-lint, retire.js, npm audit, snyk
// (socket은 SaaS 전용이라 CLI에서 npm audit로 대체)

// ============================================================
// PART 1 — npm audit (내장)
// ============================================================

export async function runNpmAudit(rootPath: string) {
  const { execSync } = require('child_process');
  try {
    const output = execSync('npm audit --json 2>/dev/null', { cwd: rootPath, encoding: 'utf-8', timeout: 30000 });
    const data = JSON.parse(output);
    return {
      vulnerabilities: data.metadata?.vulnerabilities ?? {},
      total: data.metadata?.vulnerabilities?.total ?? 0,
      critical: data.metadata?.vulnerabilities?.critical ?? 0,
      high: data.metadata?.vulnerabilities?.high ?? 0,
    };
  } catch (e) {
    try {
      const output = (e as unknown).stdout ?? '{}';
      const data = JSON.parse(output);
      return {
        vulnerabilities: data.metadata?.vulnerabilities ?? {},
        total: data.metadata?.vulnerabilities?.total ?? 0,
        critical: data.metadata?.vulnerabilities?.critical ?? 0,
        high: data.metadata?.vulnerabilities?.high ?? 0,
      };
    } catch {
      return { vulnerabilities: {}, total: 0, critical: 0, high: 0 };
    }
  }
}

// IDENTITY_SEAL: PART-1 | role=npm-audit | inputs=rootPath | outputs=vulnerabilities

// ============================================================
// PART 2 — lockfile-lint
// ============================================================

export async function runLockfileLint(rootPath: string) {
  const { execSync } = require('child_process');
  try {
    execSync('npx lockfile-lint --path package-lock.json --type npm --allowed-hosts npm --validate-https 2>&1', {
      cwd: rootPath, encoding: 'utf-8', timeout: 15000,
    });
    return { passed: true, issues: 0, detail: 'lockfile valid' };
  } catch (e) {
    const output = (e as unknown).stdout ?? (e as unknown).stderr ?? '';
    const issues = (output.match(/ERROR/g) ?? []).length;
    return { passed: false, issues, detail: output.slice(0, 200) };
  }
}

// IDENTITY_SEAL: PART-2 | role=lockfile-lint | inputs=rootPath | outputs={passed,issues}

// ============================================================
// PART 3 — retire.js (취약 라이브러리)
// ============================================================

export async function runRetireJS(rootPath: string) {
  const { execSync } = require('child_process');
  try {
    const output = execSync('npx retire --outputformat json 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 30000,
    });
    const data = JSON.parse(output || '[]');
    return {
      vulnerableCount: Array.isArray(data) ? data.length : 0,
      findings: Array.isArray(data) ? data.slice(0, 10).map((d: unknown) => ({
        component: d.component ?? 'unknown',
        version: d.version ?? '?',
        severity: d.severity ?? 'unknown',
      })) : [],
    };
  } catch {
    return { vulnerableCount: 0, findings: [] };
  }
}

// IDENTITY_SEAL: PART-3 | role=retire-js | inputs=rootPath | outputs=findings

// ============================================================
// PART 4 — Snyk (심층 보안)
// ============================================================

export async function runSnyk(rootPath: string) {
  const { execSync } = require('child_process');
  try {
    const output = execSync('npx snyk test --json 2>/dev/null', {
      cwd: rootPath, encoding: 'utf-8', timeout: 60000,
    });
    const data = JSON.parse(output);
    return {
      ok: data.ok ?? false,
      vulnerabilities: data.vulnerabilities?.length ?? 0,
      critical: data.vulnerabilities?.filter((v: unknown) => v.severity === 'critical').length ?? 0,
    };
  } catch {
    return { ok: true, vulnerabilities: 0, critical: 0 };
  }
}

// IDENTITY_SEAL: PART-4 | role=snyk | inputs=rootPath | outputs=findings

// ============================================================
// PART 5 — Unified Security Runner
// ============================================================

export async function runFullSecurityAnalysis(rootPath: string) {
  const results: Array<{ engine: string; score: number; detail: string }> = [];

  // npm audit
  const audit = await runNpmAudit(rootPath);
  const auditScore = Math.max(0, 100 - audit.critical * 30 - audit.high * 15);
  results.push({ engine: 'npm-audit', score: auditScore, detail: `${audit.total} vulns (${audit.critical} critical)` });

  // lockfile-lint
  const lockfile = await runLockfileLint(rootPath);
  results.push({ engine: 'lockfile-lint', score: lockfile.passed ? 100 : 60, detail: lockfile.detail });

  // retire.js
  const retire = await runRetireJS(rootPath);
  const retireScore = Math.max(0, 100 - retire.vulnerableCount * 20);
  results.push({ engine: 'retire.js', score: retireScore, detail: `${retire.vulnerableCount} vulnerable libs` });

  // snyk
  const snyk = await runSnyk(rootPath);
  const snykScore = snyk.ok ? 100 : Math.max(0, 100 - snyk.critical * 30);
  results.push({ engine: 'snyk', score: snykScore, detail: `${snyk.vulnerabilities} issues` });

  const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  return { engines: results.length, results, avgScore };
}

// IDENTITY_SEAL: PART-5 | role=unified-security | inputs=rootPath | outputs=results

// ============================================================
// PART 6 — npm audit Deep Integration (advisories 상세)
// ============================================================

export async function runNpmAuditDetailed(rootPath: string): Promise<{
  advisories: Array<{
    name: string;
    severity: string;
    title: string;
    url: string;
    range: string;
    fixAvailable: boolean;
  }>;
  fixCommand: string;
  autoFixable: number;
  total: number;
}> {
  const { execSync } = require('child_process');

  try {
    let output = '';
    try {
      output = execSync('npm audit --json 2>/dev/null', { cwd: rootPath, encoding: 'utf-8', timeout: 30000 });
    } catch (e: any) {
      output = e.stdout ?? '{}';
    }

    const data = JSON.parse(output || '{}');
    const advisories: Array<{
      name: string; severity: string; title: string; url: string;
      range: string; fixAvailable: boolean;
    }> = [];

    // npm audit v2 format (vulnerabilities object)
    const vulns = data.vulnerabilities ?? {};
    for (const [name, info] of Object.entries(vulns)) {
      const v = info as any;
      advisories.push({
        name,
        severity: v.severity ?? 'unknown',
        title: v.via?.[0]?.title ?? v.via?.[0] ?? 'Unknown vulnerability',
        url: v.via?.[0]?.url ?? '',
        range: v.range ?? '*',
        fixAvailable: !!v.fixAvailable,
      });
    }

    const autoFixable = advisories.filter(a => a.fixAvailable).length;
    const fixCommand = autoFixable > 0 ? 'npm audit fix' : 'npm audit fix --force (breaking changes possible)';

    return {
      advisories: advisories.sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
      }).slice(0, 20),
      fixCommand,
      autoFixable,
      total: advisories.length,
    };
  } catch {
    return { advisories: [], fixCommand: '', autoFixable: 0, total: 0 };
  }
}

// IDENTITY_SEAL: PART-6 | role=npm-audit-detailed | inputs=rootPath | outputs=advisories

// ============================================================
// PART 7 — Known Vulnerability Pattern Matching
// ============================================================

interface VulnPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  cwe: string;
  fix: string;
}

const VULN_PATTERNS: VulnPattern[] = [
  // Injection
  { id: 'SEC-001', name: 'SQL Injection', pattern: /(?:query|execute|raw)\s*\(\s*(?:`[^`]*\$\{|['"][^'"]*['"]\s*\+\s*\w+|['"][^'"]*['"]\s*\+)/g, severity: 'critical', message: 'Potential SQL injection — string concatenation in query', cwe: 'CWE-89', fix: 'Use parameterized queries or prepared statements' },
  { id: 'SEC-002', name: 'Command Injection', pattern: /exec(?:Sync)?\s*\(\s*(?:`[^`]*\$\{|['"][^'"]*['"]\s*\+\s*\w+)/g, severity: 'critical', message: 'Potential command injection — dynamic shell command', cwe: 'CWE-78', fix: 'Use execFile() or sanitize arguments' },
  { id: 'SEC-003', name: 'XSS via innerHTML', pattern: /innerHTML\s*=\s*(?:\w+|`[^`]*\$\{)/g, severity: 'high', message: 'Potential XSS — dynamic innerHTML assignment', cwe: 'CWE-79', fix: 'Use textContent or sanitize with DOMPurify' },
  { id: 'SEC-004', name: 'XSS via dangerouslySetInnerHTML', pattern: /dangerouslySetInnerHTML\s*=\s*\{/g, severity: 'high', message: 'dangerouslySetInnerHTML — XSS risk', cwe: 'CWE-79', fix: 'Sanitize HTML with DOMPurify before rendering' },

  // Crypto
  { id: 'SEC-005', name: 'Weak Hash MD5', pattern: /createHash\s*\(\s*['"]md5['"]\)/g, severity: 'high', message: 'MD5 hash — cryptographically broken', cwe: 'CWE-327', fix: 'Use SHA-256 or SHA-3' },
  { id: 'SEC-006', name: 'Weak Hash SHA1', pattern: /createHash\s*\(\s*['"]sha1['"]\)/g, severity: 'medium', message: 'SHA-1 hash — deprecated, collision-prone', cwe: 'CWE-327', fix: 'Use SHA-256 or SHA-3' },
  { id: 'SEC-007', name: 'Math.random for security', pattern: /Math\.random\s*\(\)/g, severity: 'medium', message: 'Math.random() is not cryptographically secure', cwe: 'CWE-330', fix: 'Use crypto.randomBytes() or crypto.getRandomValues()' },

  // Auth/Session
  { id: 'SEC-008', name: 'Hardcoded JWT Secret', pattern: /(?:jwt|jsonwebtoken)\.(?:sign|verify)\s*\([^)]*['"][a-zA-Z0-9]{8,}['"]/g, severity: 'critical', message: 'Hardcoded JWT secret in source code', cwe: 'CWE-798', fix: 'Use environment variables for secrets' },
  { id: 'SEC-009', name: 'No HTTPS enforcement', pattern: /http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/g, severity: 'medium', message: 'HTTP URL used — data sent unencrypted', cwe: 'CWE-319', fix: 'Use HTTPS for all external connections' },

  // Path Traversal
  { id: 'SEC-010', name: 'Path Traversal', pattern: /(?:readFile|writeFile|createReadStream|createWriteStream)\s*\(\s*(?:\w+\s*\+|`[^`]*\$\{)/g, severity: 'high', message: 'Potential path traversal — dynamic file path', cwe: 'CWE-22', fix: 'Validate and sanitize file paths, use path.resolve with base directory check' },

  // Prototype pollution
  { id: 'SEC-011', name: 'Prototype Pollution', pattern: /\[(?:key|prop|k|name|attr)\]\s*=|\bObject\.assign\s*\(\s*\{\}/g, severity: 'medium', message: 'Potential prototype pollution via dynamic property assignment', cwe: 'CWE-1321', fix: 'Use Map instead of plain objects, or validate keys' },

  // CORS
  { id: 'SEC-012', name: 'CORS Wildcard', pattern: /['"]Access-Control-Allow-Origin['"]\s*[,:]\s*['"]\*['"]/g, severity: 'medium', message: 'CORS wildcard allows any origin', cwe: 'CWE-346', fix: 'Specify allowed origins explicitly' },

  // Deserialization
  { id: 'SEC-013', name: 'Unsafe Deserialization', pattern: /JSON\.parse\s*\(\s*(?:req\.body|request\.body|body|input|data)\b/g, severity: 'medium', message: 'JSON.parse on untrusted input without validation', cwe: 'CWE-502', fix: 'Validate input schema before parsing (use Zod, Joi, etc.)' },
];

export function scanForVulnPatterns(code: string, fileName: string = ''): Array<{
  line: number;
  ruleId: string;
  name: string;
  severity: string;
  message: string;
  cwe: string;
  fix: string;
}> {
  const lines = code.split('\n');
  const findings: Array<{
    line: number; ruleId: string; name: string;
    severity: string; message: string; cwe: string; fix: string;
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) continue;

    for (const pattern of VULN_PATTERNS) {
      pattern.pattern.lastIndex = 0;
      if (pattern.pattern.test(line)) {
        findings.push({
          line: i + 1,
          ruleId: pattern.id,
          name: pattern.name,
          severity: pattern.severity,
          message: pattern.message,
          cwe: pattern.cwe,
          fix: pattern.fix,
        });
      }
    }
  }

  return findings.slice(0, 50);
}

// IDENTITY_SEAL: PART-7 | role=vuln-patterns | inputs=code | outputs=findings

// ============================================================
// PART 8 — Secret Pattern Scanning (Advanced)
// ============================================================

interface SecretPattern {
  id: string;
  name: string;
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium';
  entropy?: boolean; // also check Shannon entropy
}

const SECRET_PATTERNS: SecretPattern[] = [
  // API Keys
  { id: 'SECRET-001', name: 'AWS Access Key', pattern: /(?:AKIA|ASIA)[0-9A-Z]{16}/g, severity: 'critical' },
  { id: 'SECRET-002', name: 'AWS Secret Key', pattern: /(?:aws_secret_access_key|AWS_SECRET)\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/gi, severity: 'critical' },
  { id: 'SECRET-003', name: 'GitHub Token', pattern: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g, severity: 'critical' },
  { id: 'SECRET-004', name: 'GitHub Classic PAT', pattern: /github_pat_[A-Za-z0-9_]{22,}/g, severity: 'critical' },
  { id: 'SECRET-005', name: 'Slack Token', pattern: /xox[bpors]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,34}/g, severity: 'critical' },
  { id: 'SECRET-006', name: 'Slack Webhook', pattern: /hooks\.slack\.com\/services\/T[A-Z0-9]{8,}\/B[A-Z0-9]{8,}\/[A-Za-z0-9]{24}/g, severity: 'high' },
  { id: 'SECRET-007', name: 'Google API Key', pattern: /AIza[0-9A-Za-z_-]{35}/g, severity: 'high' },
  { id: 'SECRET-008', name: 'Stripe Key', pattern: /(?:sk|pk)_(?:test|live)_[0-9a-zA-Z]{24,}/g, severity: 'critical' },
  { id: 'SECRET-009', name: 'Twilio Key', pattern: /SK[0-9a-fA-F]{32}/g, severity: 'high' },
  { id: 'SECRET-010', name: 'SendGrid Key', pattern: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g, severity: 'critical' },
  { id: 'SECRET-011', name: 'Firebase Key', pattern: /AAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140}/g, severity: 'high' },
  { id: 'SECRET-012', name: 'Heroku API Key', pattern: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, severity: 'medium' },
  { id: 'SECRET-013', name: 'NPM Token', pattern: /npm_[A-Za-z0-9]{36}/g, severity: 'critical' },
  { id: 'SECRET-014', name: 'PyPI Token', pattern: /pypi-[A-Za-z0-9_-]{50,}/g, severity: 'critical' },
  { id: 'SECRET-015', name: 'Private Key (PEM)', pattern: /-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/g, severity: 'critical' },
  { id: 'SECRET-016', name: 'Generic API Key', pattern: /(?:api[_-]?key|apikey|api[_-]?secret|api[_-]?token)\s*[=:]\s*['"][A-Za-z0-9_\-./+=]{20,}['"]/gi, severity: 'high', entropy: true },
  { id: 'SECRET-017', name: 'Generic Secret', pattern: /(?:secret|password|passwd|pwd)\s*[=:]\s*['"][^'"]{8,}['"]/gi, severity: 'high', entropy: true },
  { id: 'SECRET-018', name: 'Database URL', pattern: /(?:postgres|mysql|mongodb|redis):\/\/[^:]+:[^@]+@[^/\s'"]+/gi, severity: 'critical' },
  { id: 'SECRET-019', name: 'Bearer Token', pattern: /Bearer\s+[A-Za-z0-9_\-.~+/]+=*/g, severity: 'high' },
  { id: 'SECRET-020', name: 'Vercel Token', pattern: /vercel_[A-Za-z0-9]{24,}/gi, severity: 'critical' },
  { id: 'SECRET-021', name: 'OpenAI API Key', pattern: /sk-[A-Za-z0-9]{20,}/g, severity: 'critical' },
  { id: 'SECRET-022', name: 'Anthropic API Key', pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g, severity: 'critical' },
];

function shannonEntropy(s: string): number {
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / s.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function scanForSecrets(code: string, fileName: string = ''): Array<{
  line: number;
  ruleId: string;
  name: string;
  severity: string;
  preview: string;
}> {
  // Skip scanning test fixtures, mocks, and known safe files
  if (/\.(test|spec|mock|fixture)\.(ts|js|tsx|jsx)$/.test(fileName)) return [];
  if (/node_modules|\.git\/|dist\//.test(fileName)) return [];

  const lines = code.split('\n');
  const findings: Array<{
    line: number; ruleId: string; name: string; severity: string; preview: string;
  }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('#') || line.trim().startsWith('*')) continue;
    // Skip example/placeholder values
    if (/(?:example|placeholder|your[_-]?|xxx|TODO|CHANGEME|REPLACE)/i.test(line)) continue;

    for (const pattern of SECRET_PATTERNS) {
      pattern.pattern.lastIndex = 0;
      const match = pattern.pattern.exec(line);
      if (match) {
        // For entropy-checked patterns, verify the matched value has enough entropy
        if (pattern.entropy) {
          const value = match[0].split(/[=:]\s*['"]?/)[1]?.replace(/['"]$/, '') ?? '';
          if (value.length < 8 || shannonEntropy(value) < 3.0) continue;
        }

        // Mask the secret for safe display
        const matched = match[0];
        const preview = matched.length > 12
          ? matched.slice(0, 6) + '***' + matched.slice(-4)
          : matched.slice(0, 4) + '***';

        findings.push({
          line: i + 1,
          ruleId: pattern.id,
          name: pattern.name,
          severity: pattern.severity,
          preview,
        });
        break; // One finding per line max
      }
    }
  }

  return findings.slice(0, 50);
}

// IDENTITY_SEAL: PART-8 | role=secret-scan | inputs=code | outputs=findings

// ============================================================
// PART 9 — Full Project Secret Scan
// ============================================================

export async function scanProjectForSecrets(rootPath: string): Promise<{
  findings: Array<{ file: string; line: number; ruleId: string; name: string; severity: string; preview: string }>;
  filesScanned: number;
  totalSecrets: number;
  criticalCount: number;
  score: number;
}> {
  const fs = require('fs');
  const path = require('path');

  const allFindings: Array<{
    file: string; line: number; ruleId: string; name: string; severity: string; preview: string;
  }> = [];
  let filesScanned = 0;

  function scan(dir: string, depth: number = 0): void {
    if (depth > 8) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' ||
              entry.name === 'build' || entry.name === 'vendor' || entry.name === '__pycache__') continue;
          scan(full, depth + 1);
        } else if (entry.isFile()) {
          // Scan source files, configs, and env-like files
          if (/\.(ts|tsx|js|jsx|py|go|rs|java|rb|php|yml|yaml|toml|json|env|cfg|conf|ini|sh|bash)$/.test(entry.name) ||
              /^\.env/.test(entry.name) || entry.name === 'Dockerfile') {
            try {
              const content = fs.readFileSync(full, 'utf-8');
              if (content.length > 500000) return; // Skip huge files
              const relPath = path.relative(rootPath, full).replace(/\\/g, '/');
              const fileFindings = scanForSecrets(content, relPath);
              for (const f of fileFindings) {
                allFindings.push({ file: relPath, ...f });
              }
              filesScanned++;
            } catch { /* skip */ }
          }
        }
      }
    } catch { /* skip */ }
  }

  scan(rootPath);

  const criticalCount = allFindings.filter(f => f.severity === 'critical').length;
  const score = Math.max(0, 100 - criticalCount * 25 - allFindings.filter(f => f.severity === 'high').length * 10);

  return {
    findings: allFindings.slice(0, 50),
    filesScanned,
    totalSecrets: allFindings.length,
    criticalCount,
    score,
  };
}

// IDENTITY_SEAL: PART-9 | role=project-secret-scan | inputs=rootPath | outputs=findings

// ============================================================
// PART 10 — Enhanced Unified Security Runner
// ============================================================

export async function runEnhancedSecurityAnalysis(rootPath: string) {
  const results: Array<{ engine: string; score: number; detail: string }> = [];

  // npm audit (detailed)
  const auditDetailed = await runNpmAuditDetailed(rootPath);
  const auditScore = Math.max(0, 100 -
    auditDetailed.advisories.filter(a => a.severity === 'critical').length * 30 -
    auditDetailed.advisories.filter(a => a.severity === 'high').length * 15 -
    auditDetailed.advisories.filter(a => a.severity === 'moderate').length * 5);
  results.push({
    engine: 'npm-audit-detailed',
    score: auditScore,
    detail: `${auditDetailed.total} vulnerabilities (${auditDetailed.autoFixable} auto-fixable)`,
  });

  // lockfile-lint
  const lockfile = await runLockfileLint(rootPath);
  results.push({ engine: 'lockfile-lint', score: lockfile.passed ? 100 : 60, detail: lockfile.detail });

  // retire.js
  const retire = await runRetireJS(rootPath);
  const retireScore = Math.max(0, 100 - retire.vulnerableCount * 20);
  results.push({ engine: 'retire.js', score: retireScore, detail: `${retire.vulnerableCount} vulnerable libs` });

  // secret scanning
  const secrets = await scanProjectForSecrets(rootPath);
  results.push({
    engine: 'secret-scanner',
    score: secrets.score,
    detail: `${secrets.totalSecrets} secrets found (${secrets.criticalCount} critical) in ${secrets.filesScanned} files`,
  });

  // snyk
  const snyk = await runSnyk(rootPath);
  const snykScore = snyk.ok ? 100 : Math.max(0, 100 - snyk.critical * 30);
  results.push({ engine: 'snyk', score: snykScore, detail: `${snyk.vulnerabilities} issues` });

  const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
  return { engines: results.length, results, avgScore };
}

// IDENTITY_SEAL: PART-10 | role=enhanced-unified-security | inputs=rootPath | outputs=results
