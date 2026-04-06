// ============================================================
// PART 1 — SEC shared utilities (SEC-001 ~ SEC-027)
// ============================================================
// Role:    Regex + ts-morph 휴리스틱 공유. 정적 분석 한계로 메시지에 "의심" 포함.
// Banned:  완전한 데이터플로 분석(범위 초과).
// Input:   SourceFile
// Output:  RuleFinding[]
// ============================================================

import type { SourceFile } from 'ts-morph';
import {
  BinaryExpression,
  CallExpression,
  JsxAttribute,
  Node,
  PropertyAccessExpression,
  SyntaxKind,
  TemplateExpression,
} from 'ts-morph';
import type { RuleFinding } from '../detector-registry';

const CAP = 8;

export function pushUnique(
  out: RuleFinding[],
  seen: Set<string>,
  line: number,
  message: string,
): void {
  if (out.length >= CAP) return;
  const k = `${line}:${message}`;
  if (seen.has(k)) return;
  seen.add(k);
  out.push({ line, message });
}

const SQL_KW = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|TRUNCATE)\b/i;

function binaryPlusHasIdentifier(node: BinaryExpression): boolean {
  let found = false;
  function walk(n: Node): void {
    if (found) return;
    if (n.getKind() === SyntaxKind.Identifier) {
      const id = n.getText();
      if (!['require', 'undefined', 'null', 'true', 'false'].includes(id)) found = true;
      return;
    }
    if (n.getKind() === SyntaxKind.BinaryExpression) {
      const b = n as BinaryExpression;
      walk(b.getLeft());
      walk(b.getRight());
      return;
    }
    n.forEachChild(walk);
  }
  walk(node);
  return found;
}

/** SEC-001: SQL 문자열 연결/템플릿 삽입 의심 */
export function detectSec001(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  sourceFile.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.TemplateExpression) {
      const t = node as TemplateExpression;
      const full = t.getText();
      if (SQL_KW.test(full) && full.includes('${')) {
        pushUnique(findings, seen, t.getStartLineNumber(), 'SQL 쿼리 템플릿에 표현식 삽입 — SQL Injection 의심');
      }
    }
    if (node.getKind() === SyntaxKind.BinaryExpression) {
      const b = node as BinaryExpression;
      if (b.getOperatorToken().getKind() !== SyntaxKind.PlusToken) return;
      const txt = b.getText();
      if (SQL_KW.test(txt) && binaryPlusHasIdentifier(b)) {
        pushUnique(findings, seen, b.getStartLineNumber(), 'SQL 키워드가 포함된 문자열 연결 — SQL Injection 의심');
      }
    }
  });
  return findings;
}

/** SEC-002: dangerouslySetInnerHTML + innerHTML 비상수 할당 */
export function detectSec002(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  sourceFile.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.JsxAttribute) {
      const attr = node as JsxAttribute;
      if (attr.getNameNode().getText() === 'dangerouslySetInnerHTML') {
        pushUnique(findings, seen, node.getStartLineNumber(), 'dangerouslySetInnerHTML — XSS 위험');
      }
      return;
    }
    if (node.getKind() !== SyntaxKind.BinaryExpression) return;
    const be = node as BinaryExpression;
    if (be.getOperatorToken().getKind() !== SyntaxKind.EqualsToken) return;
    const left = be.getLeft();
    if (left.getKind() !== SyntaxKind.PropertyAccessExpression) return;
    const pa = left as PropertyAccessExpression;
    if (pa.getName() !== 'innerHTML') return;
    const right = be.getRight();
    const rk = right.getKind();
    if (rk === SyntaxKind.StringLiteral || rk === SyntaxKind.NoSubstitutionTemplateLiteral) return;
    pushUnique(findings, seen, be.getStartLineNumber(), 'innerHTML에 비상수 할당 — XSS 의심');
  });
  return findings;
}

/** SEC-003: child_process exec/spawn 등 셸 명령 조합 의심 */
export function detectSec003(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const riskyCallee = /^(exec|execSync|spawn|spawnSync)$/;

  sourceFile.forEachDescendant((node) => {
    if (node.getKind() !== SyntaxKind.CallExpression) return;
    const call = node as CallExpression;
    const expr = call.getExpression();
    let name = '';
    if (expr.getKind() === SyntaxKind.Identifier) name = expr.getText();
    else if (expr.getKind() === SyntaxKind.PropertyAccessExpression) name = expr.getLastChildByKind(SyntaxKind.Identifier)?.getText() ?? '';
    if (!riskyCallee.test(name)) return;

    const args = call.getArguments();
    if (args.length === 0) return;
    const first = args[0];
    const t = first.getText();
    const dynamic = first.getKind() !== SyntaxKind.StringLiteral && first.getKind() !== SyntaxKind.NoSubstitutionTemplateLiteral;
    if (dynamic) {
      pushUnique(findings, seen, call.getStartLineNumber(), 'child_process: 첫 인자가 비상수 — Command Injection 의심');
    }
  });
  return findings;
}

/** SEC-004: 경로에 ../ 포함 */
export function detectSec004(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const text = sourceFile.getFullText();
  const lines = text.split('\n');
  const re = /\.\.[\\/]|['"`][^'"`]*\.\.\//;
  lines.forEach((line, i) => {
    if (/^\s*\/\/|^\s*\*/.test(line)) return;
    if (re.test(line) && /(?:path|fs|readFile|writeFile|open|createReadStream|join)/i.test(line)) {
      pushUnique(findings, seen, i + 1, '경로에 ../ 또는 상대 경로 결합 — Path Traversal 의심');
    }
  });
  return findings;
}

/** SEC-005: LDAP 필터 문자열 연결 의심 */
export function detectSec005(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const lines = sourceFile.getFullText().split('\n');
  const ldapHint = /\(cn=|\(uid=|LDAP|ldapjs|ldap\./i;
  lines.forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    if (!ldapHint.test(line)) return;
    if (/\$\{/.test(line)) {
      pushUnique(findings, seen, i + 1, 'LDAP 관련 템플릿 삽입 — LDAP Injection 의심');
      return;
    }
    if (/\+/.test(line) && /\(.+\)/.test(line)) {
      pushUnique(findings, seen, i + 1, 'LDAP 필터 문자열 연결 — LDAP Injection 의심');
    }
  });
  return findings;
}

/** SEC-006: quill-engine.ts에서 이미 AST로 처리 — 플러그인 중복 방지 */
export function detectSec006(_sourceFile: SourceFile): RuleFinding[] {
  return [];
}

/** SEC-007: __proto__ / prototype 오염 패턴 */
export function detectSec007(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  sourceFile.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
      const t = node.getText();
      if (t.includes('__proto__') || /\.prototype\s*[=.]/.test(t)) {
        pushUnique(findings, seen, node.getStartLineNumber(), '__proto__/prototype 조작 — Prototype Pollution 의심');
      }
    }
    if (node.getKind() === SyntaxKind.BinaryExpression) {
      const b = node as BinaryExpression;
      if (b.getOperatorToken().getKind() === SyntaxKind.EqualsToken) {
        const left = b.getLeft().getText();
        if (/__proto__|prototype/.test(left)) {
          pushUnique(findings, seen, b.getStartLineNumber(), 'prototype/__proto__에 직접 대입 — Prototype Pollution 의심');
        }
      }
    }
  });
  return findings;
}

// ============================================================
// PART 2 — SEC-008 ~ SEC-019 (줄 단위 regex + 일부 AST)
// ============================================================

/** SEC-008: ReDoS 가능 정규식 (중첩 수량자) */
export function detectSec008(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const redos = /\([^)]*[\+\*][^)]*\)[\+\*]|\[[^\]]*[\+\*][^\]]*\][\+\*]/;
  const text = sourceFile.getFullText();
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    const str = line.replace(/\/\/.*$/, '');
    if (/\/(?!\/)/.test(str) && redos.test(str)) {
      pushUnique(findings, seen, i + 1, '중첩 수량자 정규식 — ReDoS 의심');
    }
    if (/new\s+RegExp\s*\(/.test(str) && redos.test(str)) {
      pushUnique(findings, seen, i + 1, 'new RegExp에 ReDoS 취약 패턴 가능');
    }
  });
  return findings;
}

/** SEC-009: 하드코딩 비밀번호/API 키 (process.env 제외) */
export function detectSec009(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const patterns: RegExp[] = [
    /\bpassword\s*=\s*['"`][^'"`]+['"`]/i,
    /\bapi[_-]?key\s*=\s*['"`]/i,
    /\bsecret[_-]?key\s*=\s*['"`]/i,
    /\baws_access_key_id\s*=\s*['"`]/i,
    /\bBEGIN\s+(RSA\s+)?PRIVATE\s+KEY/i,
  ];
  const lines = sourceFile.getFullText().split('\n');
  lines.forEach((line, i) => {
    if (/process\.env/.test(line)) return;
    if (/^\s*\/\/.*process\.env/.test(line)) return;
    for (const p of patterns) {
      if (p.test(line)) {
        pushUnique(findings, seen, i + 1, '하드코딩된 비밀번호/키 가능성 — SEC-009');
        return;
      }
    }
  });
  return findings;
}

/** SEC-010: salt/seed 고정 문자열 */
export function detectSec010(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const re = /\b(salt|seed|pepper|iv)\s*[:=]\s*['"`][^'"`]{6,}['"`]/i;
  const lines = sourceFile.getFullText().split('\n');
  lines.forEach((line, i) => {
    if (/process\.env/.test(line)) return;
    if (re.test(line)) {
      pushUnique(findings, seen, i + 1, 'salt/seed/iv 고정 리터럴 — 하드코딩 의심');
    }
  });
  return findings;
}

/** SEC-011: MD5/SHA1 */
export function detectSec011(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const re = /createHash\s*\(\s*['"](md5|sha1)['"]|['"]md5['"]|['"]sha-?1['"]/i;
  const lines = sourceFile.getFullText().split('\n');
  lines.forEach((line, i) => {
    if (re.test(line)) pushUnique(findings, seen, i + 1, 'MD5/SHA1 해시 — 약한 해시 의심');
  });
  return findings;
}

/** SEC-012: DES/RC4 등 */
export function detectSec012(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const re = /createCipher(?:iv)?\s*\(\s*['"](?:des|rc4|blowfish)|getCipherInfo\s*\(\s*['"](?:des|rc4)/i;
  const lines = sourceFile.getFullText().split('\n');
  lines.forEach((line, i) => {
    if (re.test(line)) pushUnique(findings, seen, i + 1, 'DES/RC4 등 취약 알고리즘 명시 의심');
  });
  return findings;
}

/** SEC-013: jwt.decode / verify 미사용 휴리스틱 */
export function detectSec013(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const full = sourceFile.getFullText();
  if (/\bjwt\.verify\s*\(/.test(full)) return findings;
  sourceFile.forEachDescendant((node) => {
    if (node.getKind() !== SyntaxKind.CallExpression) return;
    const c = node as CallExpression;
    const ex = c.getExpression().getText();
    if (/\bjwt\.decode\b/.test(ex)) {
      pushUnique(findings, seen, c.getStartLineNumber(), 'jwt.decode — 동일 파일에 jwt.verify 없음 의심');
    }
  });
  return findings;
}

/** SEC-014: 세션 ID가 URL에 */
export function detectSec014(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const re = /[?&](session|sessionid|sid|jsessionid|token)\s*=/i;
  const lines = sourceFile.getFullText().split('\n');
  lines.forEach((line, i) => {
    if (re.test(line) && /['"`]/.test(line)) {
      pushUnique(findings, seen, i + 1, 'URL 쿼리에 세션 식별자 — 노출 의심');
    }
  });
  return findings;
}

/** SEC-015: cookie 옵션 httpOnly/secure */
export function detectSec015(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  sourceFile.forEachDescendant((node) => {
    if (node.getKind() !== SyntaxKind.CallExpression) return;
    const c = node as CallExpression;
    const ex = c.getExpression().getText();
    if (!/cookie|res\.cookie|setHeader/i.test(ex)) return;
    const args = c.getArguments();
    if (args.length < 2) return;
    const opt = args[args.length - 1];
    if (opt.getKind() !== SyntaxKind.ObjectLiteralExpression) return;
    const txt = opt.getText();
    if (!/httpOnly\s*:/.test(txt) || !/secure\s*:/.test(txt)) {
      pushUnique(findings, seen, c.getStartLineNumber(), 'cookie 옵션에 httpOnly 또는 secure 누락 가능');
    }
  });
  return findings;
}

/** SEC-016: CORS * (헤더 문자열 + cors({ origin: '*' }) ) */
export function detectSec016(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const lines = sourceFile.getFullText().split('\n');
  lines.forEach((line, i) => {
    if (/Access-Control-Allow-Origin/i.test(line) && /\*['"`\s]/.test(line)) {
      pushUnique(findings, seen, i + 1, 'Access-Control-Allow-Origin: * — CORS 와일드카드 의심');
    }
  });
  sourceFile.forEachDescendant((node) => {
    if (node.getKind() !== SyntaxKind.CallExpression) return;
    const c = node as CallExpression;
    const callee = c.getExpression().getText().trim();
    if (!/\bcors\b$/.test(callee) && !/\.cors$/.test(callee)) return;
    const a0 = c.getArguments()[0];
    if (!a0 || a0.getKind() !== SyntaxKind.ObjectLiteralExpression) return;
    const t = a0.getText();
    if (/origin\s*:\s*['"]\*['"]/.test(t) || /origin\s*:\s*\*\s*[,}]/.test(t)) {
      pushUnique(findings, seen, c.getStartLineNumber(), "cors({ origin: '*' }) — 와일드카드 의심");
    }
  });
  return findings;
}

/** SEC-017: postMessage 대상 * */
export function detectSec017(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  sourceFile.forEachDescendant((node) => {
    if (node.getKind() !== SyntaxKind.CallExpression) return;
    const c = node as CallExpression;
    if (!c.getExpression().getText().endsWith('postMessage')) return;
    const args = c.getArguments();
    const origin = args[1]?.getText().replace(/['"`]/g, '') ?? '';
    if (args.length >= 2 && origin === '*') {
      pushUnique(findings, seen, c.getStartLineNumber(), "postMessage(..., '*') — origin 미제한 의심");
    }
  });
  return findings;
}

/** SEC-018: 민감 값 로그 */
export function detectSec018(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const re = /console\.(log|debug|info)\s*\([^)]*(password|secret|token|apikey|authorization)/i;
  const lines = sourceFile.getFullText().split('\n');
  lines.forEach((line, i) => {
    if (re.test(line)) pushUnique(findings, seen, i + 1, '콘솔에 민감 키워드 로그 — 민감 데이터 로그 의심');
  });
  return findings;
}

/** SEC-019: stack 노출 */
export function detectSec019(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const re = /\.(send|json|end)\s*\(\s*[^)]*\.stack/;
  const lines = sourceFile.getFullText().split('\n');
  lines.forEach((line, i) => {
    if (re.test(line)) pushUnique(findings, seen, i + 1, '응답에 err.stack 전달 — stack trace 노출 의심');
  });
  return findings;
}

// ============================================================
// PART 3 — SEC-020 ~ SEC-027 (전송·저장소·라우팅 휴리스틱)
// ============================================================

/** SEC-020: http:// 리터럴 */
export function detectSec020(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const lines = sourceFile.getFullText().split('\n');
  lines.forEach((line, i) => {
    const s = line.replace(/\/\/.*$/, '');
    if (/['"`]http:\/\//i.test(s) && !/localhost/.test(s)) {
      pushUnique(findings, seen, i + 1, 'http:// 하드코딩 — 평문 HTTP 의심');
    }
  });
  return findings;
}

/** SEC-021: localStorage 민감 키 */
export function detectSec021(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const re = /localStorage\.setItem\s*\(\s*['"](token|access_token|refresh_token|password|secret|jwt)['"]/i;
  const lines = sourceFile.getFullText().split('\n');
  lines.forEach((line, i) => {
    if (re.test(line)) pushUnique(findings, seen, i + 1, 'localStorage에 민감 키 저장 의심');
  });
  return findings;
}

/** SEC-022: debugger + console.debug 다량 */
export function detectSec022(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  sourceFile.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.DebuggerStatement) {
      pushUnique(findings, seen, node.getStartLineNumber(), 'debugger 문 — 프로덕션 잔류 의심');
    }
  });
  const lines = sourceFile.getFullText().split('\n');
  let debugLines = 0;
  lines.forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    if (/console\.debug\s*\(/.test(line)) debugLines++;
  });
  if (debugLines >= 3) {
    pushUnique(findings, seen, 1, `console.debug 호출 ${debugLines}회 — 프로덕션 디버그 잔류 의심`);
  }
  return findings;
}

/** SEC-023: 사설 IP */
export function detectSec023(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const re = /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/;
  const lines = sourceFile.getFullText().split('\n');
  lines.forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    if (re.test(line)) pushUnique(findings, seen, i + 1, '사설 IP 대역 하드코딩 의심');
  });
  return findings;
}

/** SEC-024: IDOR 패턴 req.params → 쿼리 */
export function detectSec024(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const re = /(findOne|find|get|delete|update)\s*\(\s*\{[^}]*\b(id|_id)\s*:\s*req\.params/i;
  const lines = sourceFile.getFullText().split('\n');
  lines.forEach((line, i) => {
    if (re.test(line)) pushUnique(findings, seen, i + 1, 'req.params.id 직접 DB 조회 — IDOR 검토 필요');
  });
  return findings;
}

/** SEC-025: Express 라우트 2인자 (미들웨어 없음) 휴리스틱 */
export function detectSec025(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  sourceFile.forEachDescendant((node) => {
    if (node.getKind() !== SyntaxKind.CallExpression) return;
    const c = node as CallExpression;
    const ex = c.getExpression();
    if (ex.getKind() !== SyntaxKind.PropertyAccessExpression) return;
    const pa = ex as PropertyAccessExpression;
    const prop = pa.getName();
    if (!/^(get|post|put|patch|delete)$/.test(prop)) return;
    const base = pa.getExpression().getText();
    if (!/^(app|router)$/.test(base)) return;
    const args = c.getArguments();
    if (args.length !== 2) return;
    const pathArg = args[0].getText();
    if (!/\/(api|admin|v\d+)/i.test(pathArg)) return;
    pushUnique(findings, seen, c.getStartLineNumber(), 'API 라우트에 미들웨어 없이 핸들러만 — 인증 누락 의심');
  });
  return findings;
}

/** SEC-026: 클라이언트 전용 권한 검사 ('use client' + role) */
export function detectSec026(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const full = sourceFile.getFullText();
  if (!/['"]use client['"]/.test(full)) return findings;
  if (!/\b(role|isAdmin|permissions?)\b/i.test(full)) return findings;
  if (/getServerSideProps|route\.ts|middleware/i.test(full)) return findings;
  pushUnique(findings, seen, 1, "'use client' 컴포넌트에서만 권한 검사 — 서버 검증 필요 여부 검토");
  return findings;
}

/** SEC-027: POST에 CSRF 관련 토큰/미들웨어 부재 휴리스틱 */
export function detectSec027(sourceFile: SourceFile): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const seen = new Set<string>();
  const full = sourceFile.getFullText();
  const hasCsrf = /csrf|csurf|csrfProtection|sameSite|double.?submit/i.test(full);
  sourceFile.forEachDescendant((node) => {
    if (node.getKind() !== SyntaxKind.CallExpression) return;
    const c = node as CallExpression;
    const ex = c.getExpression();
    if (ex.getKind() !== SyntaxKind.PropertyAccessExpression) return;
    const pa = ex as PropertyAccessExpression;
    const prop = pa.getName();
    if (prop !== 'post' && prop !== 'put' && prop !== 'patch' && prop !== 'delete') return;
    if (!/^(app|router)$/.test(pa.getExpression().getText())) return;
    if (c.getArguments().length !== 2) return;
    if (hasCsrf) return;
    const pathArg = c.getArguments()[0].getText();
    if (!/\/(api|auth|account|admin)/i.test(pathArg)) return;
    pushUnique(findings, seen, c.getStartLineNumber(), '상태 변경 메서드에 CSRF 방어 패턴 미검출 — 검토');
  });
  return findings;
}
