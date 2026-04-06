// ============================================================
// CS Quill 🦔 — Rule Catalog (224 Rules Master)
// ============================================================
// 16 Categories × 224 Rules
// 출처: CWE 4.19.1, arXiv 2026 TS Bug Study, OX Security,
//       CodeRabbit AI Study, JS Security Smells, SonarQube,
//       typescript-eslint, Seven Pernicious Kingdoms, NOA_OS 7000
//
// 각 rule에 severity, confidence, engine, source, action을 부여하여
// 정수 필터, AI 판정, verdict 계산에 활용.

// ============================================================
// PART 1 — Types
// ============================================================

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'high' | 'medium' | 'low';
export type Engine = 'regex' | 'ast' | 'symbol' | 'cfg' | 'metric';
export type Source = 'ai' | 'human' | 'both';
export type Action = 'hard-fail' | 'review' | 'hint';

export interface RuleMeta {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  confidence: Confidence;
  engine: Engine;
  source: Source;
  defaultAction: Action;
  cwe?: string;
  owasp?: string;
}

// ============================================================
// PART 2 — Rule Registry
// ============================================================

function r(
  id: string, title: string, category: string,
  severity: Severity, confidence: Confidence, engine: Engine,
  source: Source, action: Action, cwe?: string, owasp?: string,
): RuleMeta {
  return { id, title, category, severity, confidence, engine, source, defaultAction: action, cwe, owasp };
}

export const RULE_CATALOG: RuleMeta[] = [
  // ── CAT-1: 구문 오류 (10) ──
  r('SYN-001', '중괄호 불균형', 'syntax', 'critical', 'high', 'ast', 'both', 'hard-fail'),
  r('SYN-002', '소괄호 불균형', 'syntax', 'critical', 'high', 'ast', 'both', 'hard-fail'),
  r('SYN-003', '대괄호 불균형', 'syntax', 'critical', 'high', 'ast', 'both', 'hard-fail'),
  r('SYN-004', '세미콜론 누락', 'syntax', 'low', 'high', 'ast', 'both', 'hint'),
  r('SYN-005', '예약어 식별자 사용', 'syntax', 'high', 'high', 'ast', 'both', 'review'),
  r('SYN-006', '잘못된 Unicode escape', 'syntax', 'medium', 'high', 'ast', 'both', 'review'),
  r('SYN-007', '템플릿 리터럴 미종결', 'syntax', 'critical', 'high', 'ast', 'both', 'hard-fail'),
  r('SYN-008', '정규식 플래그 중복', 'syntax', 'medium', 'high', 'ast', 'both', 'review'),
  r('SYN-009', 'import 경로 따옴표 누락', 'syntax', 'high', 'high', 'ast', 'both', 'review'),
  r('SYN-010', 'JSON-in-JS 파싱 실패', 'syntax', 'high', 'high', 'ast', 'both', 'review'),

  // ── CAT-2: 타입 오류 (15) ──
  r('TYP-001', 'any 타입 무분별 사용', 'type', 'high', 'high', 'ast', 'both', 'review'),
  r('TYP-002', '함수 반환 타입 미선언', 'type', 'medium', 'high', 'ast', 'both', 'review'),
  r('TYP-003', 'unsafe type assertion', 'type', 'high', 'medium', 'ast', 'ai', 'review'),
  r('TYP-004', '! non-null assertion 과용', 'type', 'high', 'medium', 'ast', 'ai', 'review'),
  r('TYP-005', '{} empty object type', 'type', 'medium', 'high', 'ast', 'both', 'review'),
  r('TYP-006', 'generics 타입 파라미터 누락', 'type', 'medium', 'high', 'ast', 'both', 'review'),
  r('TYP-007', 'never 타입을 값으로 반환', 'type', 'high', 'high', 'symbol', 'both', 'review'),
  r('TYP-008', 'union null|undefined 미처리', 'type', 'high', 'high', 'symbol', 'both', 'review', 'CWE-476'),
  r('TYP-009', '함수 오버로드 시그니처 불일치', 'type', 'high', 'high', 'symbol', 'both', 'review'),
  r('TYP-010', 'enum non-literal 값', 'type', 'medium', 'high', 'ast', 'both', 'review'),
  r('TYP-011', 'interface vs type alias 혼용', 'type', 'low', 'medium', 'ast', 'both', 'hint'),
  r('TYP-012', 'strict 모드 미활성화', 'type', 'high', 'high', 'ast', 'both', 'review'),
  r('TYP-013', 'noImplicitAny 위반', 'type', 'high', 'high', 'ast', 'both', 'review'),
  r('TYP-014', 'strictNullChecks 위반', 'type', 'high', 'high', 'symbol', 'both', 'review', 'CWE-476'),
  r('TYP-015', 'optional chaining 과용', 'type', 'low', 'medium', 'ast', 'ai', 'hint'),

  // ── CAT-3: 변수·선언 (12) ──
  r('VAR-001', 'let/const TDZ 위반', 'variable', 'critical', 'high', 'symbol', 'both', 'hard-fail'),
  r('VAR-002', 'var 호이스팅 의존', 'variable', 'medium', 'medium', 'ast', 'both', 'review'),
  r('VAR-003', '미선언 전역 변수', 'variable', 'high', 'high', 'symbol', 'both', 'review'),
  r('VAR-004', '변수 shadowing', 'variable', 'medium', 'medium', 'symbol', 'both', 'review'),
  r('VAR-005', '미사용 변수', 'variable', 'medium', 'high', 'symbol', 'both', 'review'),
  r('VAR-006', '미사용 파라미터', 'variable', 'low', 'high', 'symbol', 'both', 'hint'),
  r('VAR-007', '미사용 import', 'variable', 'medium', 'high', 'symbol', 'both', 'review'),
  r('VAR-008', '재할당 불필요 let → const', 'variable', 'low', 'high', 'cfg', 'both', 'hint'),
  r('VAR-009', '루프 변수 클로저 캡처 오류', 'variable', 'high', 'high', 'cfg', 'both', 'review'),
  r('VAR-010', '동일 스코프 중복 선언', 'variable', 'high', 'high', 'symbol', 'both', 'review'),
  r('VAR-011', '전역 오염 window 직접 할당', 'variable', 'medium', 'medium', 'ast', 'both', 'review', 'CWE-1321'),
  r('VAR-012', 'dead declaration', 'variable', 'medium', 'high', 'symbol', 'both', 'review'),

  // ── CAT-4: 비동기·이벤트 (15) ──
  r('ASY-001', 'async 함수 내 await 누락', 'async', 'critical', 'high', 'ast', 'both', 'hard-fail'),
  r('ASY-002', 'await in loop — 병렬 처리 가능', 'async', 'high', 'high', 'cfg', 'both', 'review'),
  r('ASY-003', 'Unhandled Promise rejection', 'async', 'critical', 'high', 'ast', 'both', 'hard-fail', 'CWE-248'),
  r('ASY-004', 'async 함수 명시적 return 누락', 'async', 'medium', 'medium', 'cfg', 'both', 'review'),
  r('ASY-005', '.then() + async/await 혼용', 'async', 'low', 'medium', 'ast', 'ai', 'hint'),
  r('ASY-006', 'Promise.all vs 순차 await 오류', 'async', 'medium', 'medium', 'cfg', 'both', 'review'),
  r('ASY-007', 'Promise.race timeout 없음', 'async', 'high', 'medium', 'ast', 'both', 'review'),
  r('ASY-008', 'await 없는 async 함수', 'async', 'low', 'high', 'cfg', 'both', 'hint'),
  r('ASY-009', 'event listener 제거 누락', 'async', 'high', 'medium', 'cfg', 'both', 'review', 'CWE-401'),
  r('ASY-010', 'event listener 중복 등록', 'async', 'medium', 'medium', 'ast', 'both', 'review'),
  r('ASY-011', '동기 heavy computation — event loop 블로킹', 'async', 'high', 'medium', 'cfg', 'both', 'review'),
  r('ASY-012', 'setTimeout 내 throw', 'async', 'high', 'medium', 'cfg', 'both', 'review'),
  r('ASY-013', 'Promise 생성자 async 콜백', 'async', 'medium', 'medium', 'ast', 'both', 'review'),
  r('ASY-014', 'for await 없이 async iterable', 'async', 'medium', 'medium', 'ast', 'both', 'review'),
  r('ASY-015', 'race condition — 공유 상태', 'async', 'critical', 'low', 'cfg', 'both', 'review', 'CWE-362'),

  // ── CAT-5: 에러 핸들링 (12) ──
  r('ERR-001', 'empty catch block', 'error-handling', 'high', 'high', 'ast', 'ai', 'review', 'CWE-390'),
  r('ERR-002', 'catch에서 console.log만', 'error-handling', 'high', 'high', 'ast', 'ai', 'review', 'CWE-390'),
  r('ERR-003', 'catch 정보 손실', 'error-handling', 'medium', 'medium', 'ast', 'both', 'review'),
  r('ERR-004', 'finally 없이 리소스 미해제', 'error-handling', 'high', 'medium', 'cfg', 'both', 'review', 'CWE-404'),
  r('ERR-005', '문자열 throw', 'error-handling', 'medium', 'high', 'ast', 'both', 'review'),
  r('ERR-006', 'catch 범위 과도', 'error-handling', 'medium', 'medium', 'ast', 'ai', 'review'),
  r('ERR-007', '중첩 try-catch 3단+', 'error-handling', 'medium', 'medium', 'ast', 'ai', 'review'),
  r('ERR-008', 'error 메시지 민감 정보', 'error-handling', 'high', 'low', 'regex', 'ai', 'review', 'CWE-209'),
  r('ERR-009', 'stack trace 사용자 노출', 'error-handling', 'high', 'medium', 'ast', 'ai', 'review', 'CWE-209'),
  r('ERR-010', '비동기 에러를 동기 catch', 'error-handling', 'high', 'high', 'cfg', 'both', 'review'),
  r('ERR-011', '타입 구분 없이 catch', 'error-handling', 'medium', 'medium', 'ast', 'ai', 'review'),
  r('ERR-012', '오류 복구 후 상태 초기화 누락', 'error-handling', 'high', 'low', 'cfg', 'both', 'review'),

  // ── CAT-6: 런타임 예외 (20) ──
  r('RTE-001', 'null dereference', 'runtime', 'critical', 'high', 'symbol', 'both', 'hard-fail', 'CWE-476'),
  r('RTE-002', 'undefined dereference', 'runtime', 'critical', 'high', 'symbol', 'both', 'hard-fail', 'CWE-476'),
  r('RTE-003', 'optional chaining 미사용 직접 접근', 'runtime', 'high', 'medium', 'ast', 'both', 'review', 'CWE-476'),
  r('RTE-004', 'nullish ?? 대신 || 오사용', 'runtime', 'medium', 'medium', 'ast', 'both', 'review'),
  r('RTE-005', 'Array 길이 확인 없음', 'runtime', 'high', 'medium', 'ast', 'both', 'review'),
  r('RTE-006', 'arr[0] 빈 배열 가능성', 'runtime', 'high', 'medium', 'ast', 'both', 'review'),
  r('RTE-007', '구조분해 기본값 없음', 'runtime', 'medium', 'medium', 'ast', 'both', 'review'),
  r('RTE-008', 'JSON.parse try-catch 없음', 'runtime', 'high', 'high', 'ast', 'ai', 'review', 'CWE-248'),
  r('RTE-009', 'parseInt NaN 미처리', 'runtime', 'high', 'medium', 'ast', 'both', 'review'),
  r('RTE-010', 'division by zero', 'runtime', 'high', 'medium', 'cfg', 'both', 'review', 'CWE-369'),
  r('RTE-011', '무한 루프', 'runtime', 'critical', 'medium', 'cfg', 'both', 'hard-fail'),
  r('RTE-012', '재귀 base case 없음', 'runtime', 'critical', 'medium', 'cfg', 'both', 'hard-fail'),
  r('RTE-013', '스택 오버플로 재귀 깊이', 'runtime', 'high', 'low', 'cfg', 'both', 'review'),
  r('RTE-014', 'off-by-one error', 'runtime', 'high', 'medium', 'cfg', 'both', 'review', 'CWE-193'),
  r('RTE-015', '루프 내 배열 수정', 'runtime', 'high', 'medium', 'cfg', 'both', 'review'),
  r('RTE-016', 'for...in on Array', 'runtime', 'high', 'high', 'ast', 'both', 'review'),
  r('RTE-017', 'switch fall-through', 'runtime', 'medium', 'medium', 'cfg', 'both', 'review'),
  r('RTE-018', 'switch default 없음', 'runtime', 'medium', 'high', 'ast', 'both', 'review'),
  r('RTE-019', 'unreachable code', 'runtime', 'medium', 'high', 'cfg', 'both', 'review'),
  r('RTE-020', 'dead branch', 'runtime', 'medium', 'medium', 'cfg', 'both', 'review'),

  // ── CAT-7: 로직·의미 (20) ──
  r('LOG-001', '== loose equality', 'logic', 'high', 'high', 'ast', 'ai', 'review'),
  r('LOG-002', '!= loose inequality', 'logic', 'high', 'high', 'ast', 'ai', 'review'),
  r('LOG-003', 'boolean 리터럴 비교', 'logic', 'low', 'high', 'ast', 'ai', 'hint'),
  r('LOG-004', '!! 불필요 사용', 'logic', 'low', 'high', 'ast', 'ai', 'hint'),
  r('LOG-005', 'NaN 직접 비교', 'logic', 'high', 'high', 'ast', 'both', 'review'),
  r('LOG-006', '객체 동일성 오해', 'logic', 'high', 'medium', 'ast', 'both', 'review'),
  r('LOG-007', '비트/논리 연산자 혼동', 'logic', 'high', 'medium', 'ast', 'both', 'review'),
  r('LOG-008', '삼항 중첩 3단+', 'logic', 'medium', 'high', 'ast', 'both', 'review'),
  r('LOG-009', '드모르간 미적용', 'logic', 'high', 'low', 'cfg', 'both', 'review'),
  r('LOG-010', 'guard clause 부재', 'logic', 'low', 'medium', 'ast', 'ai', 'hint'),
  r('LOG-011', '.sort() comparator 없음', 'logic', 'high', 'high', 'ast', 'both', 'review'),
  r('LOG-012', '.map() 결과 미사용', 'logic', 'medium', 'high', 'ast', 'ai', 'review'),
  r('LOG-013', '.filter().map() vs .reduce()', 'logic', 'low', 'medium', 'ast', 'ai', 'hint'),
  r('LOG-014', '원본 배열 변형', 'logic', 'medium', 'medium', 'ast', 'both', 'review'),
  r('LOG-015', '문자열 + 숫자 연결 오류', 'logic', 'high', 'medium', 'ast', 'both', 'review'),
  r('LOG-016', '부동소수점 직접 비교', 'logic', 'medium', 'medium', 'ast', 'both', 'review', 'CWE-1339'),
  r('LOG-017', '정수 나눗셈 Math.floor 없음', 'logic', 'medium', 'medium', 'ast', 'both', 'review'),
  r('LOG-018', 'timezone 미고려 날짜 연산', 'logic', 'high', 'low', 'regex', 'both', 'review'),
  r('LOG-019', 'typeof null === object', 'logic', 'high', 'high', 'ast', 'both', 'review'),
  r('LOG-020', '얕은 복사 깊은 수정 원본 영향', 'logic', 'medium', 'medium', 'ast', 'ai', 'review'),

  // ── CAT-8: API 오용 (15) ──
  r('API-001', '존재하지 않는 메서드 호출 (hallucination)', 'api-misuse', 'critical', 'high', 'symbol', 'ai', 'hard-fail'),
  r('API-002', 'deprecated API 사용', 'api-misuse', 'medium', 'high', 'symbol', 'both', 'review'),
  r('API-003', 'Array 메서드 비배열 사용', 'api-misuse', 'high', 'high', 'symbol', 'both', 'review'),
  r('API-004', 'Object.keys vs entries 의도 불일치', 'api-misuse', 'low', 'medium', 'ast', 'both', 'hint'),
  r('API-005', 'localStorage 동기 차단 대용량', 'api-misuse', 'medium', 'medium', 'ast', 'ai', 'review'),
  r('API-006', 'console.log 프로덕션 잔류', 'api-misuse', 'low', 'high', 'ast', 'ai', 'hint'),
  r('API-007', 'eval() 사용', 'api-misuse', 'critical', 'high', 'ast', 'both', 'hard-fail', 'CWE-95'),
  r('API-008', 'new Function() 사용', 'api-misuse', 'critical', 'high', 'ast', 'both', 'hard-fail', 'CWE-95'),
  r('API-009', 'document.write()', 'api-misuse', 'high', 'high', 'ast', 'both', 'review', 'CWE-79'),
  r('API-010', 'innerHTML 직접 할당', 'api-misuse', 'high', 'high', 'ast', 'both', 'review', 'CWE-79'),
  r('API-011', 'setTimeout 문자열 인자', 'api-misuse', 'high', 'high', 'ast', 'both', 'review', 'CWE-95'),
  r('API-012', 'Array 생성자 숫자 1개', 'api-misuse', 'medium', 'medium', 'ast', 'both', 'review'),
  r('API-013', 'Object.assign mutate 혼동', 'api-misuse', 'medium', 'medium', 'ast', 'ai', 'review'),
  r('API-014', 'WeakMap 없이 private 관리', 'api-misuse', 'low', 'low', 'ast', 'both', 'hint'),
  r('API-015', 'Symbol 대신 문자열 키', 'api-misuse', 'low', 'low', 'ast', 'ai', 'hint'),

  // ── CAT-9: 보안 (27) ──
  r('SEC-001', 'SQL Injection', 'security', 'critical', 'high', 'regex', 'both', 'hard-fail', 'CWE-89', 'A03'),
  r('SEC-002', 'XSS innerHTML', 'security', 'critical', 'high', 'ast', 'both', 'hard-fail', 'CWE-79', 'A03'),
  r('SEC-003', 'Command Injection exec()', 'security', 'critical', 'high', 'ast', 'both', 'hard-fail', 'CWE-78', 'A03'),
  r('SEC-004', 'Path Traversal ../', 'security', 'critical', 'high', 'regex', 'both', 'hard-fail', 'CWE-22', 'A01'),
  r('SEC-005', 'LDAP Injection', 'security', 'high', 'medium', 'regex', 'both', 'review', 'CWE-90'),
  r('SEC-006', 'eval() 동적 실행', 'security', 'critical', 'high', 'ast', 'both', 'hard-fail', 'CWE-95', 'A03'),
  r('SEC-007', 'Prototype Pollution', 'security', 'critical', 'high', 'ast', 'both', 'hard-fail', 'CWE-1321'),
  r('SEC-008', 'ReDoS 취약 정규식', 'security', 'high', 'medium', 'regex', 'both', 'review', 'CWE-1333'),
  r('SEC-009', '하드코딩 비밀번호/API키', 'security', 'critical', 'medium', 'regex', 'both', 'hard-fail', 'CWE-798', 'A07'),
  r('SEC-010', '하드코딩 시드/salt', 'security', 'critical', 'medium', 'regex', 'both', 'hard-fail', 'CWE-259'),
  r('SEC-011', '약한 해시 MD5/SHA1', 'security', 'high', 'high', 'regex', 'ai', 'review', 'CWE-327'),
  r('SEC-012', '취약한 암호화 DES/RC4', 'security', 'high', 'high', 'regex', 'ai', 'review', 'CWE-326'),
  r('SEC-013', 'JWT 서명 검증 없음', 'security', 'critical', 'medium', 'ast', 'ai', 'review', 'CWE-347'),
  r('SEC-014', '세션 ID URL 노출', 'security', 'high', 'medium', 'regex', 'both', 'review', 'CWE-598'),
  r('SEC-015', 'httpOnly/secure 미설정', 'security', 'high', 'high', 'ast', 'both', 'review', 'CWE-614'),
  r('SEC-016', 'CORS * 와일드카드', 'security', 'high', 'high', 'ast', 'ai', 'review'),
  r('SEC-017', '미검증 cross-origin 통신', 'security', 'high', 'medium', 'ast', 'both', 'review', 'CWE-346'),
  r('SEC-018', '민감 데이터 로그 출력', 'security', 'high', 'low', 'regex', 'ai', 'review', 'CWE-532'),
  r('SEC-019', 'stack trace 노출', 'security', 'high', 'medium', 'ast', 'ai', 'review', 'CWE-209'),
  r('SEC-020', 'HTTP 비암호화 통신', 'security', 'high', 'high', 'regex', 'ai', 'review', 'CWE-319'),
  r('SEC-021', 'localStorage 민감 데이터', 'security', 'high', 'medium', 'ast', 'ai', 'review', 'CWE-312'),
  r('SEC-022', '프로덕션 디버그 잔류', 'security', 'medium', 'high', 'ast', 'ai', 'review'),
  r('SEC-023', '내부 IP 하드코딩', 'security', 'medium', 'medium', 'regex', 'ai', 'review', 'CWE-912'),
  r('SEC-024', 'IDOR 객체 참조 노출', 'security', 'critical', 'low', 'regex', 'both', 'review', 'CWE-639', 'A01'),
  r('SEC-025', '인증 없는 API 엔드포인트', 'security', 'critical', 'low', 'ast', 'both', 'review', 'CWE-306', 'A07'),
  r('SEC-026', '권한 검사 클라이언트만', 'security', 'critical', 'low', 'ast', 'ai', 'review', 'CWE-602'),
  r('SEC-027', 'CSRF 토큰 미사용', 'security', 'high', 'medium', 'ast', 'both', 'review', 'CWE-352', 'A01'),

  // ── CAT-10: 복잡도 (18) ──
  r('CMX-001', '함수 50줄 초과', 'complexity', 'medium', 'high', 'metric', 'both', 'review'),
  r('CMX-002', '파라미터 5개 초과', 'complexity', 'medium', 'high', 'ast', 'both', 'review'),
  r('CMX-003', '클래스 500줄 초과', 'complexity', 'medium', 'high', 'metric', 'both', 'review'),
  r('CMX-004', '파일 1000줄 초과', 'complexity', 'medium', 'high', 'metric', 'both', 'review'),
  r('CMX-005', '클래스 메서드 20개 초과', 'complexity', 'low', 'high', 'metric', 'both', 'hint'),
  r('CMX-006', '생성자 100줄 초과', 'complexity', 'medium', 'high', 'metric', 'both', 'review'),
  r('CMX-007', '중첩 깊이 5단 초과', 'complexity', 'high', 'high', 'ast', 'both', 'review'),
  r('CMX-008', 'Cyclomatic Complexity 10 초과', 'complexity', 'medium', 'high', 'cfg', 'both', 'review'),
  r('CMX-009', 'Cognitive Complexity 15 초과', 'complexity', 'medium', 'high', 'cfg', 'both', 'review'),
  r('CMX-010', '삼항 중첩 3단+', 'complexity', 'medium', 'high', 'ast', 'ai', 'review'),
  r('CMX-011', 'callback hell 4단+', 'complexity', 'high', 'high', 'ast', 'both', 'review'),
  r('CMX-012', 'if-else 체인 7개+', 'complexity', 'medium', 'high', 'ast', 'ai', 'review'),
  r('CMX-013', '줄 120자 초과', 'complexity', 'low', 'high', 'regex', 'both', 'hint'),
  r('CMX-014', '동일 로직 3회+ 복붙', 'complexity', 'medium', 'low', 'regex', 'ai', 'review'),
  r('CMX-015', '매직 넘버', 'complexity', 'low', 'medium', 'ast', 'both', 'hint'),
  r('CMX-016', '매직 문자열 반복', 'complexity', 'low', 'medium', 'regex', 'both', 'hint'),
  r('CMX-017', 'Long Parameter List 7+', 'complexity', 'medium', 'high', 'ast', 'ai', 'review'),
  r('CMX-018', 'Feature Envy', 'complexity', 'low', 'low', 'ast', 'both', 'hint'),

  // ── CAT-11: AI 안티패턴 (12) ──
  r('AIP-001', '과도한 인라인 주석', 'ai-pattern', 'info', 'medium', 'regex', 'ai', 'hint'),
  r('AIP-002', '리팩터링 회피 — 중복 구현', 'ai-pattern', 'medium', 'low', 'metric', 'ai', 'review'),
  r('AIP-003', '엣지 케이스 과잉 명세', 'ai-pattern', 'low', 'low', 'cfg', 'ai', 'hint'),
  r('AIP-004', 'By-the-book 고집', 'ai-pattern', 'info', 'low', 'metric', 'ai', 'hint'),
  r('AIP-005', 'Phantom Bug 처리', 'ai-pattern', 'medium', 'low', 'metric', 'ai', 'review'),
  r('AIP-006', 'Vanilla Style — 라이브러리 대신 직접 구현', 'ai-pattern', 'medium', 'low', 'ast', 'ai', 'review'),
  r('AIP-007', 'null 체크 불필요 위치', 'ai-pattern', 'low', 'low', 'symbol', 'ai', 'hint'),
  r('AIP-008', 'Exception swallowing', 'ai-pattern', 'high', 'high', 'ast', 'ai', 'review'),
  r('AIP-009', 'Copy-paste coupling', 'ai-pattern', 'medium', 'low', 'metric', 'ai', 'review'),
  r('AIP-010', 'Hallucinated API', 'ai-pattern', 'critical', 'high', 'symbol', 'ai', 'hard-fail'),
  r('AIP-011', '구형 패턴 고집', 'ai-pattern', 'low', 'medium', 'symbol', 'ai', 'hint'),
  r('AIP-012', '불필요한 wrapper function', 'ai-pattern', 'info', 'medium', 'ast', 'ai', 'hint'),

  // ── CAT-12: 성능 (10) ──
  r('PRF-001', '루프 내 DOM 조작 반복', 'performance', 'high', 'medium', 'ast', 'both', 'review'),
  r('PRF-002', 'O(n²) 중첩 루프 선형 탐색', 'performance', 'high', 'low', 'cfg', 'ai', 'review'),
  r('PRF-003', 'JSON.parse(JSON.stringify()) 깊은 복사', 'performance', 'medium', 'medium', 'ast', 'ai', 'review'),
  r('PRF-004', 'await in loop → Promise.all', 'performance', 'high', 'high', 'cfg', 'both', 'review'),
  r('PRF-005', '메모이제이션 없이 비싼 연산 반복', 'performance', 'medium', 'low', 'cfg', 'ai', 'review'),
  r('PRF-006', 'Event listener 누적', 'performance', 'high', 'medium', 'cfg', 'both', 'review'),
  r('PRF-007', '.find() 반복 → Map 최적화', 'performance', 'medium', 'low', 'ast', 'ai', 'review'),
  r('PRF-008', 'RegExp 루프 내 매번 생성', 'performance', 'low', 'medium', 'ast', 'ai', 'hint'),
  r('PRF-009', 'scroll 이벤트 레이아웃 강제', 'performance', 'high', 'medium', 'ast', 'both', 'review'),
  r('PRF-010', '전체 상태 구독', 'performance', 'medium', 'low', 'ast', 'ai', 'review'),

  // ── CAT-13: 리소스 관리 (8) ──
  r('RES-001', '파일 스트림 close 누락', 'resource', 'high', 'medium', 'cfg', 'both', 'review', 'CWE-404'),
  r('RES-002', 'DB connection 반환 누락', 'resource', 'high', 'medium', 'cfg', 'both', 'review', 'CWE-772'),
  r('RES-003', 'clearTimeout/Interval 누락', 'resource', 'medium', 'medium', 'cfg', 'both', 'review', 'CWE-401'),
  r('RES-004', 'AbortController 없이 fetch', 'resource', 'medium', 'medium', 'ast', 'both', 'review'),
  r('RES-005', 'Worker thread 종료 누락', 'resource', 'high', 'medium', 'cfg', 'both', 'review', 'CWE-401'),
  r('RES-006', 'Event emitter 리스너 leak', 'resource', 'high', 'medium', 'cfg', 'both', 'review', 'CWE-401'),
  r('RES-007', '전역 캐시 무한 성장', 'resource', 'medium', 'low', 'ast', 'ai', 'review'),
  r('RES-008', 'WeakRef 부재 대형 객체 참조', 'resource', 'low', 'low', 'ast', 'ai', 'hint'),

  // ── CAT-14: 빌드·툴링 (11) ──
  r('CFG-001', 'strict: false', 'config', 'high', 'high', 'ast', 'both', 'review'),
  r('CFG-002', 'noUnusedLocals: false', 'config', 'medium', 'high', 'ast', 'both', 'review'),
  r('CFG-003', 'skipLibCheck: true', 'config', 'medium', 'high', 'ast', 'ai', 'review'),
  r('CFG-004', 'target: ES3', 'config', 'medium', 'high', 'ast', 'both', 'review'),
  r('CFG-005', 'moduleResolution 부재', 'config', 'medium', 'high', 'ast', 'both', 'review'),
  r('CFG-006', 'paths alias 불일치', 'config', 'high', 'medium', 'symbol', 'both', 'review'),
  r('CFG-007', '순환 의존성', 'config', 'high', 'medium', 'symbol', 'both', 'review'),
  r('CFG-008', 'devDeps vs deps 분류 오류', 'config', 'medium', 'high', 'ast', 'ai', 'review'),
  r('CFG-009', 'peerDependencies 미선언', 'config', 'medium', 'medium', 'ast', 'both', 'review'),
  r('CFG-010', '.env git 추적 포함', 'config', 'critical', 'medium', 'regex', 'both', 'hard-fail'),
  r('CFG-011', 'devDeps 프로덕션 빌드 포함', 'config', 'medium', 'medium', 'ast', 'ai', 'review'),

  // ── CAT-15: 테스트 오류 (9) ──
  r('TST-001', '빈 테스트 — assertion 없음', 'test', 'high', 'high', 'ast', 'both', 'review'),
  r('TST-002', 'setTimeout 비결정적 테스트', 'test', 'high', 'medium', 'ast', 'both', 'review'),
  r('TST-003', 'mock 미설정 외부 실제 호출', 'test', 'high', 'medium', 'ast', 'both', 'review'),
  r('TST-004', 'assertion 없이 resolves/rejects', 'test', 'high', 'high', 'ast', 'both', 'review'),
  r('TST-005', 'hardcoded 날짜 — 미래 실패', 'test', 'medium', 'medium', 'regex', 'both', 'review'),
  r('TST-006', '단일 테스트 복수 단위 테스트', 'test', 'low', 'medium', 'ast', 'ai', 'hint'),
  r('TST-007', 'shared state 오염', 'test', 'high', 'medium', 'cfg', 'both', 'review'),
  r('TST-008', 'happy path만 커버', 'test', 'medium', 'low', 'cfg', 'ai', 'review'),
  r('TST-009', 'coverage 100% 무의미 assertion', 'test', 'info', 'low', 'ast', 'ai', 'hint'),

  // ── CAT-16: 명명·스타일 (10) ──
  r('STL-001', '단일 문자 변수명 혼동', 'style', 'medium', 'high', 'regex', 'both', 'review'),
  r('STL-002', '함수명 동사 없음', 'style', 'info', 'low', 'regex', 'both', 'hint'),
  r('STL-003', 'boolean is/has/can 없음', 'style', 'info', 'low', 'regex', 'both', 'hint'),
  r('STL-004', '상수 소문자', 'style', 'info', 'high', 'regex', 'both', 'hint'),
  r('STL-005', '파일명 대소문자 불일치', 'style', 'medium', 'medium', 'regex', 'both', 'review'),
  r('STL-006', '과도한 주석 (AI 특성)', 'style', 'info', 'low', 'regex', 'ai', 'hint'),
  r('STL-007', '주석 vs 코드 불일치', 'style', 'low', 'low', 'regex', 'both', 'hint'),
  r('STL-008', '빈 줄 과다 3줄+', 'style', 'info', 'high', 'regex', 'both', 'hint'),
  r('STL-009', 'quote style 불일치', 'style', 'info', 'high', 'regex', 'both', 'hint'),
  r('STL-010', 'TODO/FIXME/HACK 잔류', 'style', 'low', 'high', 'regex', 'both', 'hint'),
];

// ============================================================
// PART 3 — Lookup Helpers
// ============================================================

const _ruleMap = new Map(RULE_CATALOG.map(r => [r.id, r]));

export function getRule(id: string): RuleMeta | undefined {
  return _ruleMap.get(id);
}

export function getRulesByCategory(category: string): RuleMeta[] {
  return RULE_CATALOG.filter(r => r.category === category);
}

export function getRulesByEngine(engine: Engine): RuleMeta[] {
  return RULE_CATALOG.filter(r => r.engine === engine);
}

export function getRulesByAction(action: Action): RuleMeta[] {
  return RULE_CATALOG.filter(r => r.defaultAction === action);
}

export function getHardFailRules(): RuleMeta[] {
  return RULE_CATALOG.filter(r => r.defaultAction === 'hard-fail');
}

export function getAISpecificRules(): RuleMeta[] {
  return RULE_CATALOG.filter(r => r.source === 'ai');
}

// ============================================================
// PART 4 — Statistics
// ============================================================

export function getCatalogStats() {
  const categories = new Set(RULE_CATALOG.map(r => r.category));
  const byAction = {
    'hard-fail': RULE_CATALOG.filter(r => r.defaultAction === 'hard-fail').length,
    review: RULE_CATALOG.filter(r => r.defaultAction === 'review').length,
    hint: RULE_CATALOG.filter(r => r.defaultAction === 'hint').length,
  };
  const byEngine = {
    regex: RULE_CATALOG.filter(r => r.engine === 'regex').length,
    ast: RULE_CATALOG.filter(r => r.engine === 'ast').length,
    symbol: RULE_CATALOG.filter(r => r.engine === 'symbol').length,
    cfg: RULE_CATALOG.filter(r => r.engine === 'cfg').length,
    metric: RULE_CATALOG.filter(r => r.engine === 'metric').length,
  };

  return {
    total: RULE_CATALOG.length,
    categories: categories.size,
    byAction,
    byEngine,
    aiSpecific: RULE_CATALOG.filter(r => r.source === 'ai').length,
    withCWE: RULE_CATALOG.filter(r => r.cwe).length,
  };
}

// IDENTITY_SEAL: PART-4 | role=rule-catalog | inputs=none | outputs=224 rules
