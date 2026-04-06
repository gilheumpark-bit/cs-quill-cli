// ============================================================
// CS Quill 🦔 — Good Pattern Catalog (170 Rules)
// ============================================================
// 양품 코드 패턴 — 불량 카탈로그(224개)의 양면.
// signal: boost(가산), suppress-fp(오탐 억제), neutral(중립)
// ISO/IEC 25010:2023 + Clean Code + SOLID + GoF 기반

export type IsoQuality = 'Maintainability' | 'Reliability' | 'Security' | 'Performance';
export type GoodSignal = 'boost' | 'suppress-fp' | 'neutral';
export type GoodEngine = 'regex' | 'ast' | 'symbol' | 'cfg' | 'metric';

export interface GoodPatternMeta {
  id: string;
  title: string;
  quality: IsoQuality;
  signal: GoodSignal;
  engine: GoodEngine;
  source: 'ai' | 'human' | 'both';
  confidence: 'high' | 'medium' | 'low';
  suppresses?: string[]; // 억제하는 불량 ruleId 목록
}

function g(
  id: string, title: string, quality: IsoQuality, signal: GoodSignal,
  engine: GoodEngine, source: 'ai' | 'human' | 'both', confidence: 'high' | 'medium' | 'low',
  suppresses?: string[],
): GoodPatternMeta {
  return { id, title, quality, signal, engine, source, confidence, suppresses };
}

export const GOOD_PATTERN_CATALOG: GoodPatternMeta[] = [
  // ── G1: 명명 (16) ──
  g('GQ-NM-001', '의미 있는 완전한 단어 변수명', 'Maintainability', 'boost', 'regex', 'both', 'medium'),
  g('GQ-NM-002', 'boolean is/has/can/should 접두사', 'Maintainability', 'boost', 'regex', 'both', 'high'),
  g('GQ-NM-003', '상수 UPPER_SNAKE_CASE', 'Maintainability', 'boost', 'regex', 'both', 'high', ['STL-004']),
  g('GQ-NM-004', '컬렉션 복수형', 'Maintainability', 'boost', 'regex', 'both', 'medium'),
  g('GQ-NM-005', '인덱스 i/j/k 루프 전용', 'Maintainability', 'neutral', 'regex', 'both', 'high'),
  g('GQ-NM-006', '약어 없이 전체 단어', 'Maintainability', 'boost', 'regex', 'both', 'medium'),
  g('GQ-NM-007', 'temp/data/info 회피 확인', 'Maintainability', 'suppress-fp', 'regex', 'both', 'medium', ['STL-001', 'STL-002']),
  g('GQ-NM-008', '함수명 동사 시작', 'Maintainability', 'boost', 'regex', 'both', 'high', ['STL-002']),
  g('GQ-NM-009', 'getter/setter 명명 규칙', 'Maintainability', 'boost', 'regex', 'both', 'medium'),
  g('GQ-NM-010', 'boolean 반환 함수 is/has/can', 'Maintainability', 'boost', 'regex', 'both', 'high', ['STL-003']),
  g('GQ-NM-011', '이벤트 핸들러 on/handle 접두사', 'Maintainability', 'boost', 'regex', 'both', 'medium'),
  g('GQ-NM-012', '비동기 함수 async 일관성', 'Maintainability', 'boost', 'ast', 'both', 'high'),
  g('GQ-NM-013', '인터페이스명 명사/명사구', 'Maintainability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-NM-014', '제네릭 T/K/V 규칙', 'Maintainability', 'neutral', 'ast', 'both', 'high'),
  g('GQ-NM-015', 'enum PascalCase/UPPER_SNAKE', 'Maintainability', 'boost', 'ast', 'both', 'high'),
  g('GQ-NM-016', 'type vs interface 일관성', 'Maintainability', 'neutral', 'ast', 'both', 'medium'),

  // ── G2: 타입 시스템 (15) ──
  g('GQ-TS-001', 'strict: true tsconfig', 'Reliability', 'boost', 'ast', 'both', 'high', ['TYP-012', 'TYP-013', 'TYP-014']),
  g('GQ-TS-002', '명시적 반환 타입', 'Maintainability', 'boost', 'ast', 'both', 'high', ['TYP-002']),
  g('GQ-TS-003', '파라미터 타입 완전 명시', 'Reliability', 'boost', 'ast', 'both', 'high'),
  g('GQ-TS-004', 'unknown 사용 (any 대신)', 'Reliability', 'boost', 'ast', 'both', 'high', ['TYP-001']),
  g('GQ-TS-005', 'readonly 수정자', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-TS-006', 'Readonly<T> ReadonlyArray', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-TS-007', 'Pick/Omit/Partial/Required', 'Maintainability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-TS-008', '제네릭 제약 extends', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-TS-009', '타입 가드 is 접두사', 'Reliability', 'boost', 'symbol', 'both', 'high'),
  g('GQ-TS-010', 'discriminated union', 'Reliability', 'boost', 'ast', 'both', 'high'),
  g('GQ-TS-011', 'as const 적절 사용', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-TS-012', 'branded type', 'Reliability', 'boost', 'ast', 'both', 'low'),
  g('GQ-TS-013', 'satisfies 연산자', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-TS-014', 'JSDoc 타입 설명', 'Maintainability', 'boost', 'regex', 'both', 'medium'),
  g('GQ-TS-015', 'zod/io-ts 런타임 검증', 'Reliability', 'boost', 'ast', 'both', 'high', ['SEC-001', 'SEC-002']),

  // ── G3: 함수 설계 (14) ──
  g('GQ-FN-001', '함수 20줄 이하', 'Maintainability', 'boost', 'metric', 'both', 'high', ['CMX-001']),
  g('GQ-FN-002', '파라미터 3개 이하', 'Maintainability', 'boost', 'ast', 'both', 'high', ['CMX-002']),
  g('GQ-FN-003', '단일 추상화 수준', 'Maintainability', 'boost', 'cfg', 'both', 'medium'),
  g('GQ-FN-004', 'Early return / Guard clause', 'Maintainability', 'boost', 'cfg', 'both', 'high', ['CMX-007']),
  g('GQ-FN-005', '파라미터 객체화 options', 'Maintainability', 'boost', 'ast', 'both', 'medium', ['CMX-017']),
  g('GQ-FN-006', '파라미터 기본값', 'Reliability', 'boost', 'ast', 'both', 'high'),
  g('GQ-FN-007', '순수 함수 비율 높음', 'Reliability', 'boost', 'cfg', 'both', 'medium'),
  g('GQ-FN-008', '함수형 체이닝 filter→map→reduce', 'Maintainability', 'boost', 'ast', 'both', 'high'),
  g('GQ-FN-009', 'const 우선 사용', 'Reliability', 'boost', 'ast', 'both', 'high', ['VAR-008']),
  g('GQ-FN-010', '스프레드 불변 업데이트', 'Reliability', 'boost', 'ast', 'both', 'high', ['LOG-014', 'LOG-020']),
  g('GQ-FN-011', 'Object.freeze / as const', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-FN-012', '원본 비변형 slice/concat/map', 'Reliability', 'boost', 'ast', 'both', 'high', ['LOG-014']),
  g('GQ-FN-013', '메모이제이션 useMemo/useCallback', 'Performance', 'boost', 'ast', 'both', 'medium', ['PRF-005']),
  g('GQ-FN-014', 'structuredClone 깊은 복사', 'Reliability', 'boost', 'ast', 'both', 'medium', ['PRF-003']),

  // ── G4: 비동기 (11) ──
  g('GQ-AS-001', 'async/await 일관 사용', 'Maintainability', 'boost', 'ast', 'both', 'high', ['ASY-005']),
  g('GQ-AS-002', 'Promise.all 병렬 처리', 'Performance', 'boost', 'cfg', 'both', 'high', ['ASY-002', 'PRF-004']),
  g('GQ-AS-003', 'Promise.allSettled 부분 실패 허용', 'Reliability', 'boost', 'ast', 'both', 'high'),
  g('GQ-AS-004', 'AbortController fetch 취소', 'Reliability', 'boost', 'ast', 'both', 'high', ['RES-004']),
  g('GQ-AS-005', 'try-catch-finally 완전 쌍', 'Reliability', 'boost', 'ast', 'both', 'high', ['ASY-003', 'ERR-010']),
  g('GQ-AS-006', 'for await...of 올바른 처리', 'Reliability', 'boost', 'ast', 'both', 'medium', ['ASY-014']),
  g('GQ-AS-007', 'removeEventListener 쌍 일치', 'Reliability', 'boost', 'cfg', 'both', 'high', ['ASY-009', 'PRF-006']),
  g('GQ-AS-008', 'clearTimeout 쌍', 'Reliability', 'boost', 'cfg', 'both', 'high', ['RES-003']),
  g('GQ-AS-009', 'Promise.race timeout', 'Reliability', 'boost', 'ast', 'both', 'medium', ['ASY-007']),
  g('GQ-AS-010', 'retry exponential backoff', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-AS-011', 'async 함수 명시적 Promise<T>', 'Reliability', 'boost', 'ast', 'both', 'medium'),

  // ── G5: 에러 핸들링 (10) ──
  g('GQ-EH-001', '커스텀 Error 클래스', 'Maintainability', 'boost', 'ast', 'both', 'high'),
  g('GQ-EH-002', 'instanceof 에러 타입 구분', 'Reliability', 'boost', 'ast', 'both', 'high', ['ERR-011']),
  g('GQ-EH-003', 'catch 복구 또는 재throw', 'Reliability', 'boost', 'cfg', 'both', 'high', ['ERR-001', 'ERR-002']),
  g('GQ-EH-004', 'finally 리소스 해제', 'Reliability', 'boost', 'cfg', 'both', 'high', ['ERR-004', 'RES-001']),
  g('GQ-EH-005', '에러 메시지 context 포함', 'Maintainability', 'boost', 'regex', 'both', 'medium', ['ERR-008', 'SEC-018']),
  g('GQ-EH-006', 'Result 타입 패턴', 'Reliability', 'boost', 'ast', 'both', 'high'),
  g('GQ-EH-007', '에러 로깅과 사용자 메시지 분리', 'Security', 'boost', 'ast', 'both', 'medium', ['ERR-009', 'SEC-019']),
  g('GQ-EH-008', 'Unhandled rejection 전역 핸들러', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-EH-009', 'Error Boundary 패턴', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-EH-010', 'never exhaustive check', 'Reliability', 'boost', 'ast', 'both', 'high'),

  // ── G6: Null 처리 (10) ──
  g('GQ-NL-001', '?. optional chaining 적절 사용', 'Reliability', 'boost', 'ast', 'both', 'high'),
  g('GQ-NL-002', '?? nullish coalescing', 'Reliability', 'boost', 'ast', 'both', 'high'),
  g('GQ-NL-003', '??= nullish assignment', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-NL-004', '배열 length 확인', 'Reliability', 'boost', 'cfg', 'both', 'high', ['RTE-005', 'RTE-006']),
  g('GQ-NL-005', '구조분해 기본값', 'Reliability', 'boost', 'ast', 'both', 'high', ['RTE-007']),
  g('GQ-NL-006', 'Array.isArray 런타임 검사', 'Reliability', 'boost', 'ast', 'both', 'high'),
  g('GQ-NL-007', 'JSON.parse try-catch', 'Reliability', 'boost', 'ast', 'both', 'high', ['RTE-008']),
  g('GQ-NL-008', 'Number.isNaN 사용', 'Reliability', 'boost', 'ast', 'both', 'high', ['RTE-009']),
  g('GQ-NL-009', 'Number.isFinite 사용', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-NL-010', '타입 narrowing 후 안전 접근', 'Reliability', 'suppress-fp', 'symbol', 'both', 'high', ['RTE-001', 'RTE-002', 'RTE-003']),

  // ── G7: SOLID (13) ──
  g('GQ-SL-001', '클래스 단일 책임', 'Maintainability', 'boost', 'metric', 'both', 'medium'),
  g('GQ-SL-002', '파일 응집도 높음', 'Maintainability', 'boost', 'metric', 'both', 'medium'),
  g('GQ-SL-003', '비즈니스/데이터/UI 분리', 'Maintainability', 'boost', 'symbol', 'both', 'medium'),
  g('GQ-SL-004', '전략 패턴 분기 대체', 'Maintainability', 'boost', 'ast', 'both', 'medium', ['CMX-012']),
  g('GQ-SL-005', '인터페이스 확장 지점', 'Maintainability', 'boost', 'symbol', 'both', 'medium'),
  g('GQ-SL-006', 'Map/객체 dispatch', 'Maintainability', 'boost', 'ast', 'both', 'high'),
  g('GQ-SL-007', '하위 클래스 계약 이행', 'Reliability', 'boost', 'symbol', 'both', 'low'),
  g('GQ-SL-008', 'override 키워드 사용', 'Reliability', 'boost', 'ast', 'both', 'high'),
  g('GQ-SL-009', '인터페이스 소형 유지', 'Maintainability', 'boost', 'metric', 'both', 'medium'),
  g('GQ-SL-010', '역할별 인터페이스 분리', 'Maintainability', 'boost', 'symbol', 'both', 'medium'),
  g('GQ-SL-011', '생성자 DI 패턴', 'Maintainability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-SL-012', '인터페이스에 의존', 'Maintainability', 'boost', 'symbol', 'both', 'medium'),
  g('GQ-SL-013', '팩토리 생성 분리', 'Maintainability', 'boost', 'ast', 'both', 'medium'),

  // ── G8: 디자인 패턴 (13) ──
  g('GQ-DP-001', 'Factory 함수 createXxx', 'Maintainability', 'boost', 'regex', 'both', 'high'),
  g('GQ-DP-002', 'Singleton instance', 'Reliability', 'neutral', 'ast', 'both', 'medium'),
  g('GQ-DP-003', 'Builder 체이닝 this', 'Maintainability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-DP-004', 'Abstract Factory', 'Maintainability', 'boost', 'symbol', 'both', 'low'),
  g('GQ-DP-005', 'Module 패턴 export', 'Maintainability', 'boost', 'ast', 'both', 'high'),
  g('GQ-DP-006', 'Adapter 래핑', 'Maintainability', 'boost', 'symbol', 'both', 'medium'),
  g('GQ-DP-007', 'Decorator wrapper', 'Maintainability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-DP-008', 'Proxy 패턴', 'Reliability', 'neutral', 'ast', 'both', 'medium'),
  g('GQ-DP-009', 'Observer EventEmitter', 'Maintainability', 'boost', 'ast', 'both', 'high'),
  g('GQ-DP-010', 'Strategy 교체 가능', 'Maintainability', 'boost', 'symbol', 'both', 'medium'),
  g('GQ-DP-011', 'Command 실행 취소', 'Maintainability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-DP-012', 'Chain of Responsibility', 'Maintainability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-DP-013', 'Dependency Injection', 'Maintainability', 'boost', 'symbol', 'both', 'high'),

  // ── G9: 복잡도 관리 (8) ──
  g('GQ-CM-001', 'Cyclomatic ≤ 5', 'Maintainability', 'boost', 'cfg', 'both', 'high', ['CMX-008']),
  g('GQ-CM-002', 'Cognitive ≤ 7', 'Maintainability', 'boost', 'cfg', 'both', 'high', ['CMX-009']),
  g('GQ-CM-003', '함수 ≤ 20줄', 'Maintainability', 'boost', 'metric', 'both', 'high', ['CMX-001']),
  g('GQ-CM-004', '중첩 ≤ 2단', 'Maintainability', 'boost', 'ast', 'both', 'high', ['CMX-007']),
  g('GQ-CM-005', '파라미터 ≤ 3', 'Maintainability', 'boost', 'ast', 'both', 'high', ['CMX-002']),
  g('GQ-CM-006', '파일 ≤ 300줄', 'Maintainability', 'boost', 'metric', 'both', 'high', ['CMX-004']),
  g('GQ-CM-007', '메서드 ≤ 10개', 'Maintainability', 'boost', 'metric', 'both', 'medium', ['CMX-005']),
  g('GQ-CM-008', '줄 ≤ 80자', 'Maintainability', 'boost', 'regex', 'both', 'high', ['CMX-013']),

  // ── G10: 보안 (12) ──
  g('GQ-SC-001', '파라미터화 쿼리/ORM', 'Security', 'boost', 'ast', 'both', 'high', ['SEC-001']),
  g('GQ-SC-002', 'DOMPurify/escaping', 'Security', 'boost', 'ast', 'both', 'high', ['SEC-002']),
  g('GQ-SC-003', 'process.env 사용', 'Security', 'boost', 'ast', 'both', 'high', ['SEC-009', 'SEC-010']),
  g('GQ-SC-004', 'httpOnly secure sameSite', 'Security', 'boost', 'ast', 'both', 'high', ['SEC-015']),
  g('GQ-SC-005', 'CORS 특정 origin', 'Security', 'boost', 'ast', 'both', 'high', ['SEC-016']),
  g('GQ-SC-006', 'Helmet 보안 헤더', 'Security', 'boost', 'ast', 'both', 'high'),
  g('GQ-SC-007', 'bcrypt/argon2 현대 해시', 'Security', 'boost', 'regex', 'both', 'high', ['SEC-011', 'SEC-012']),
  g('GQ-SC-008', 'JWT 만료 검증', 'Security', 'boost', 'ast', 'both', 'medium', ['SEC-013']),
  g('GQ-SC-009', 'zod/joi 입력 검증', 'Security', 'boost', 'ast', 'both', 'high', ['SEC-001', 'SEC-002', 'SEC-003']),
  g('GQ-SC-010', 'CSP 헤더 설정', 'Security', 'boost', 'ast', 'both', 'medium'),
  g('GQ-SC-011', 'Rate limiting', 'Security', 'boost', 'ast', 'both', 'medium'),
  g('GQ-SC-012', 'CSRF 토큰 검증', 'Security', 'boost', 'ast', 'both', 'medium', ['SEC-027']),

  // ── G11: 성능 (10) ──
  g('GQ-PF-001', 'Promise.all 병렬', 'Performance', 'boost', 'cfg', 'both', 'high', ['PRF-004']),
  g('GQ-PF-002', 'Map/Set 선형 탐색 최적화', 'Performance', 'boost', 'ast', 'both', 'high', ['PRF-007']),
  g('GQ-PF-003', 'DOM 배치 DocumentFragment', 'Performance', 'boost', 'ast', 'both', 'medium', ['PRF-001']),
  g('GQ-PF-004', 'requestAnimationFrame', 'Performance', 'boost', 'ast', 'both', 'medium', ['PRF-009']),
  g('GQ-PF-005', 'debounce/throttle', 'Performance', 'boost', 'ast', 'both', 'high'),
  g('GQ-PF-006', 'Lazy loading dynamic import', 'Performance', 'boost', 'ast', 'both', 'high'),
  g('GQ-PF-007', '캐시 TTL+size limit', 'Performance', 'boost', 'ast', 'both', 'medium', ['RES-007']),
  g('GQ-PF-008', 'Worker thread 분리', 'Performance', 'boost', 'ast', 'both', 'medium'),
  g('GQ-PF-009', 'IntersectionObserver', 'Performance', 'boost', 'ast', 'both', 'medium'),
  g('GQ-PF-010', 'RegExp 루프 밖 정의', 'Performance', 'boost', 'ast', 'both', 'high', ['PRF-008']),

  // ── G12: 리소스 관리 (6) ──
  g('GQ-RS-001', 'try-finally 보장 해제', 'Reliability', 'boost', 'cfg', 'both', 'high', ['RES-001', 'RES-002']),
  g('GQ-RS-002', 'using 키워드 TS 5.2', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-RS-003', 'stream pipe 에러 핸들링', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-RS-004', 'DB pool 반환 확인', 'Reliability', 'boost', 'cfg', 'both', 'medium', ['RES-002']),
  g('GQ-RS-005', 'clearTimeout/Interval 쌍', 'Reliability', 'boost', 'cfg', 'both', 'high', ['RES-003']),
  g('GQ-RS-006', 'AbortController cleanup', 'Reliability', 'boost', 'cfg', 'both', 'high', ['RES-004']),

  // ── G13: 테스트 (8) ──
  g('GQ-TS-016', '각 테스트 assertion 존재', 'Reliability', 'boost', 'ast', 'both', 'high', ['TST-001']),
  g('GQ-TS-017', 'AAA 패턴', 'Maintainability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-TS-018', 'should/when/given 설명', 'Maintainability', 'boost', 'regex', 'both', 'medium'),
  g('GQ-TS-019', 'beforeEach/afterEach 초기화', 'Reliability', 'boost', 'ast', 'both', 'high', ['TST-007']),
  g('GQ-TS-020', 'mock 명시적 설정', 'Reliability', 'boost', 'ast', 'both', 'medium', ['TST-003']),
  g('GQ-TS-021', '엣지 케이스 테스트 존재', 'Reliability', 'boost', 'ast', 'both', 'medium', ['TST-008']),
  g('GQ-TS-022', '비동기 테스트 올바른 사용', 'Reliability', 'boost', 'ast', 'both', 'high'),
  g('GQ-TS-023', '테스트 격리 공유 상태 없음', 'Reliability', 'boost', 'cfg', 'both', 'high', ['TST-007']),

  // ── G14: 빌드·구성 (10) ──
  g('GQ-CF-001', 'strict: true', 'Reliability', 'boost', 'ast', 'both', 'high', ['CFG-001']),
  g('GQ-CF-002', 'noUnusedLocals: true', 'Maintainability', 'boost', 'ast', 'both', 'high', ['CFG-002']),
  g('GQ-CF-003', 'noUnusedParameters: true', 'Maintainability', 'boost', 'ast', 'both', 'high'),
  g('GQ-CF-004', 'noImplicitReturns: true', 'Reliability', 'boost', 'ast', 'both', 'high'),
  g('GQ-CF-005', 'exactOptionalPropertyTypes', 'Reliability', 'boost', 'ast', 'both', 'medium'),
  g('GQ-CF-006', 'moduleResolution bundler/node16', 'Reliability', 'boost', 'ast', 'both', 'high', ['CFG-005']),
  g('GQ-CF-007', '.env.example + .gitignore', 'Security', 'boost', 'regex', 'both', 'high', ['CFG-010']),
  g('GQ-CF-008', 'deps/devDeps 정확 분류', 'Reliability', 'boost', 'ast', 'both', 'high', ['CFG-008']),
  g('GQ-CF-009', '순환 의존성 없음', 'Maintainability', 'boost', 'symbol', 'both', 'high', ['CFG-007']),
  g('GQ-CF-010', 'engines 노드 버전 명시', 'Reliability', 'boost', 'ast', 'both', 'medium'),

  // ── G15: 문서화 (6) ──
  g('GQ-DC-001', 'public API JSDoc', 'Maintainability', 'boost', 'regex', 'both', 'medium'),
  g('GQ-DC-002', '@param @returns @throws 완전', 'Maintainability', 'boost', 'regex', 'both', 'medium'),
  g('GQ-DC-003', 'why 설명 주석', 'Maintainability', 'boost', 'regex', 'both', 'medium', ['STL-007']),
  g('GQ-DC-004', '코드와 주석 일치', 'Maintainability', 'suppress-fp', 'regex', 'both', 'medium', ['STL-007']),
  g('GQ-DC-005', 'TODO 이슈 번호 포함', 'Maintainability', 'boost', 'regex', 'both', 'medium', ['STL-010']),
  g('GQ-DC-006', '모듈 목적 주석', 'Maintainability', 'boost', 'regex', 'both', 'medium'),

  // ── G16: AI 양품 (8) ──
  g('GQ-AI-001', '검증된 라이브러리 활용', 'Security', 'boost', 'ast', 'ai', 'medium', ['AIP-006']),
  g('GQ-AI-002', '과도 래핑 없이 직관적', 'Maintainability', 'boost', 'metric', 'ai', 'medium', ['AIP-012']),
  g('GQ-AI-003', 'why 주석 (not what)', 'Maintainability', 'boost', 'regex', 'ai', 'medium', ['AIP-001']),
  g('GQ-AI-004', '실제 발생 가능 엣지만 처리', 'Reliability', 'boost', 'cfg', 'ai', 'low', ['AIP-003', 'AIP-005']),
  g('GQ-AI-005', '일관된 코딩 스타일', 'Maintainability', 'boost', 'regex', 'ai', 'medium'),
  g('GQ-AI-006', '현대 API 사용', 'Maintainability', 'boost', 'symbol', 'ai', 'medium', ['AIP-011']),
  g('GQ-AI-007', 'dead code 없음', 'Maintainability', 'boost', 'symbol', 'ai', 'high', ['VAR-005', 'VAR-012']),
  g('GQ-AI-008', '명시적 에러 전파', 'Reliability', 'boost', 'ast', 'ai', 'high', ['AIP-008', 'ERR-001']),
];

// ============================================================
// PART 3 — Lookup & Suppression
// ============================================================

const _goodMap = new Map(GOOD_PATTERN_CATALOG.map(g => [g.id, g]));

export function getGoodPattern(id: string): GoodPatternMeta | undefined {
  return _goodMap.get(id);
}

/** 불량 ruleId를 억제하는 양품 패턴 목록 */
export function getSuppressorsFor(badRuleId: string): GoodPatternMeta[] {
  return GOOD_PATTERN_CATALOG.filter(g => g.suppresses?.includes(badRuleId));
}

/** 양품 카탈로그 통계 */
export function getGoodCatalogStats() {
  return {
    total: GOOD_PATTERN_CATALOG.length,
    boost: GOOD_PATTERN_CATALOG.filter(g => g.signal === 'boost').length,
    suppressFP: GOOD_PATTERN_CATALOG.filter(g => g.signal === 'suppress-fp').length,
    neutral: GOOD_PATTERN_CATALOG.filter(g => g.signal === 'neutral').length,
    totalSuppressions: GOOD_PATTERN_CATALOG.filter(g => g.suppresses && g.suppresses.length > 0).length,
  };
}
