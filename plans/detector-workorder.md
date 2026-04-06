# CS Quill Detector 구현 작업지시서
> 436룰 (불량 224 + 양품 212) — 5단위 배치
> 현재: 4/224 구현 완료, 220 스텁

---

## Phase 1: 구문 오류 (SYN 1~10) — AST 기반, confidence high

### Batch 1 (SYN-001 ~ SYN-005)
- SYN-001: 중괄호 불균형 → `ts.createSourceFile` parse 실패 감지
- SYN-002: 소괄호 불균형 → 동일
- SYN-003: 대괄호 불균형 → 동일
- SYN-004: 세미콜론 누락 → ASI 규칙 위반 탐지
- SYN-005: 예약어 식별자 → `ts.isIdentifier` + 예약어 Set 매칭

### Batch 2 (SYN-006 ~ SYN-010)
- SYN-006: 잘못된 Unicode escape → regex `\\u{` 검증
- SYN-007: 템플릿 리터럴 미종결 → parse error 감지
- SYN-008: 정규식 플래그 중복 → `/pattern/gg` AST 탐지
- SYN-009: import 경로 따옴표 누락 → ImportDeclaration 검사
- SYN-010: JSON-in-JS 파싱 실패 → JSON.parse 인자 검증

---

## Phase 2: 타입 오류 (TYP 1~15) — AST+Symbol 기반

> **상태 (2026-04):** `core/detectors/typ-001.ts` ~ `typ-015.ts` 구현 + `runQuillEngine`에서 ts-morph TYP 패스 병합. `eh-universe-web/src/cli/core` 동기화됨.

### Batch 3 (TYP-001 ~ TYP-005)
- TYP-001: any 무분별 사용 → ✅ ts-morph (AnyKeyword)
- TYP-002: 함수 반환 타입 미선언 → ✅ 함수·클래스 메서드·변수 초기화 화살표/함수
- TYP-003: unsafe type assertion → ✅ `as unknown as`, `as any`
- TYP-004: ! non-null 과용 → ✅ NonNullExpression
- TYP-005: {} empty object type → ✅ 빈 TypeLiteral

### Batch 4 (TYP-006 ~ TYP-010)
- TYP-006: generics 파라미터 누락 → ✅ Promise/Array/Map/Set 인자 없음
- TYP-007: never를 값으로 반환 → ✅ never 반환 + `return expr` (값 반환)
- TYP-008: union null|undefined 미처리 → ✅ nullable 타입에 대한 non-optional 속성 접근 (휴리스틱)
- TYP-009: 함수 오버로드 불일치 → ✅ 오버로드 vs 구현 파라미터 개수
- TYP-010: enum non-literal 값 → ✅ EnumMember initializer 비리터럴

### Batch 5 (TYP-011 ~ TYP-015)
- TYP-011: interface vs type 혼용 → ✅ 동일 파일에 interface·type 동시 존재
- TYP-012: strict 모드 미활성 → ✅ 디스크 `tsconfig.json`의 `strict` (인메모리 단일 파일은 스킵)
- TYP-013: noImplicitAny 위반 → ✅ 타입·초기값 없는 단순 파라미터 (this 제외)
- TYP-014: strictNullChecks 위반 → ✅ `getPreEmitDiagnostics` 코드 2531~2538 등
- TYP-015: optional chaining 과용 → ✅ 객체/배열 리터럴에 `?.` (불필요 가능)

---

## Phase 3: 변수·선언 (VAR 1~12) — Symbol 기반

### Batch 6 (VAR-001 ~ VAR-005)
- VAR-001: let/const TDZ 위반 → TypeChecker symbol 위치 비교
- VAR-002: var 호이스팅 의존 → ✅ quill-engine 구현됨
- VAR-003: 미선언 전역 변수 → ✅ quill-engine 구현됨
- VAR-004: 변수 shadowing → scope graph parent 검색
- VAR-005: 미사용 변수 → symbol references count

### Batch 7 (VAR-006 ~ VAR-010)
- VAR-006: 미사용 파라미터 → parameter references count
- VAR-007: 미사용 import → ImportDeclaration references
- VAR-008: 재할당 불필요 let → cfg 분석, 할당 1회만이면 const
- VAR-009: 루프 변수 클로저 캡처 → for(var) + 내부 함수 감지
- VAR-010: 동일 스코프 중복 선언 → scope graph declared Set

### Batch 8 (VAR-011 ~ VAR-012)
- VAR-011: 전역 오염 window 할당 → window.xxx = 패턴
- VAR-012: dead declaration → 선언 후 참조 0회

---

## Phase 4: 비동기·이벤트 (ASY 1~15) — CFG 기반

### Batch 9 (ASY-001 ~ ASY-005)
- ASY-001: async 내 await 누락 → ✅ quill-engine 구현됨 (ASY-008로)
- ASY-002: await in loop → ForStatement 내 AwaitExpression
- ASY-003: Unhandled Promise rejection → CallExpression .then 없는 Promise
- ASY-004: async 함수 return 누락 → 모든 경로에 return 확인
- ASY-005: .then + async/await 혼용 → 같은 함수 내 두 패턴

### Batch 10 (ASY-006 ~ ASY-010)
- ASY-006: Promise.all vs 순차 await → 독립 await 연속 감지
- ASY-007: Promise.race timeout 없음 → race 인자에 timeout 없음
- ASY-008: await 없는 async → ✅ quill-engine 구현됨
- ASY-009: event listener 제거 누락 → addEventListener without removeEventListener
- ASY-010: event listener 중복 등록 → 같은 핸들러 재등록

### Batch 11 (ASY-011 ~ ASY-015)
- ASY-011: 동기 heavy computation → readFileSync, JSON.parse 대용량
- ASY-012: setTimeout 내 throw → setTimeout 콜백 내 throw
- ASY-013: Promise 생성자 async 콜백 → new Promise(async ...)
- ASY-014: for await 없이 async iterable → Symbol.asyncIterator
- ASY-015: race condition 공유 상태 → 복수 async 함수 동일 변수 쓰기

---

## Phase 5: 에러 핸들링 (ERR 1~12) — AST 기반

### Batch 12 (ERR-001 ~ ERR-005)
- ERR-001: empty catch → ✅ detector 구현됨
- ERR-002: catch에서 console.log만 → catch block statements 분석
- ERR-003: catch 정보 손실 → throw new Error() 에 cause 없음
- ERR-004: finally 없이 리소스 미해제 → try-catch without finally + open()
- ERR-005: 문자열 throw → ✅ quill-engine 구현됨

### Batch 13 (ERR-006 ~ ERR-010)
- ERR-006: catch 범위 과도 → try 블록 100줄+ 감지
- ERR-007: 중첩 try-catch 3단+ → AST depth 계산
- ERR-008: error 메시지 민감 정보 → error.message에 password/key 포함
- ERR-009: stack trace 노출 → res.json(err.stack) 패턴
- ERR-010: 비동기 에러 동기 catch → async 함수를 try-catch 없이 호출

### Batch 14 (ERR-011 ~ ERR-012)
- ERR-011: 타입 구분 없이 catch → catch(e) without instanceof
- ERR-012: 오류 복구 후 상태 초기화 누락 → catch 후 state reset 없음

---

## Phase 6: 런타임 예외 (RTE 1~20) — Symbol+CFG 기반

### Batch 15 (RTE-001 ~ RTE-005)
- RTE-001: null dereference → TypeChecker nullable 접근
- RTE-002: undefined dereference → optional 값 직접 접근
- RTE-003: optional chaining 미사용 → nullable.prop 패턴
- RTE-004: ?? 대신 || 오사용 → falsy 값 (0, "") 손실
- RTE-005: Array 길이 미확인 → arr[0] without length check

### Batch 16 (RTE-006 ~ RTE-010)
- RTE-006: arr[0] 빈 배열 → Array.at() 또는 length 체크 권장
- RTE-007: 구조분해 기본값 없음 → const {x} = obj without default
- RTE-008: JSON.parse try-catch 없음 → JSON.parse without try
- RTE-009: parseInt NaN 미처리 → parseInt 결과 isNaN 미체크
- RTE-010: division by zero → 분모 0 체크 없는 나눗셈

### Batch 17 (RTE-011 ~ RTE-015)
- RTE-011: 무한 루프 → while(true) without break/return
- RTE-012: 재귀 base case 없음 → 자기 호출 함수 내 조건 return 없음
- RTE-013: 스택 오버플로 재귀 → 깊은 재귀 감지
- RTE-014: off-by-one → <= vs < 경계 조건
- RTE-015: 루프 내 배열 수정 → for 내 splice/push

### Batch 18 (RTE-016 ~ RTE-020)
- RTE-016: for...in on Array → ✅ quill-engine 구현됨
- RTE-017: switch fall-through → case without break/return
- RTE-018: switch default 없음 → ✅ quill-engine 구현됨
- RTE-019: unreachable code → return/throw 이후 코드
- RTE-020: dead branch → 항상 false 조건

---

## Phase 7: 로직·의미 (LOG 1~20) — AST+CFG 기반

### Batch 19 (LOG-001 ~ LOG-005)
- LOG-001: == loose equality → ✅ quill-engine 구현됨
- LOG-002: != loose inequality → ✅ quill-engine 구현됨
- LOG-003: boolean 리터럴 비교 → === true, === false
- LOG-004: !! 불필요 → Boolean() 또는 조건문에서 불필요
- LOG-005: NaN 직접 비교 → x === NaN (항상 false)

### Batch 20 (LOG-006 ~ LOG-010)
- LOG-006: 객체 동일성 오해 → {} === {} 패턴
- LOG-007: 비트/논리 연산자 혼동 → & vs &&
- LOG-008: 삼항 중첩 3단 → ✅ quill-engine 구현됨
- LOG-009: 드모르간 미적용 → !(a && b) vs !a || !b
- LOG-010: guard clause 부재 → 깊은 if 중첩

### Batch 21 (LOG-011 ~ LOG-015)
- LOG-011: .sort() comparator 없음 → 숫자 배열 sort() 무인자
- LOG-012: .map() 결과 미사용 → map 반환값 무시
- LOG-013: .filter().map() vs .reduce() → 최적화 힌트
- LOG-014: 원본 배열 변형 → sort/splice 직접 사용
- LOG-015: 문자열+숫자 연결 → "count: " + 5

### Batch 22 (LOG-016 ~ LOG-020)
- LOG-016: 부동소수점 비교 → 0.1 + 0.2 === 0.3
- LOG-017: 정수 나눗셈 Math.floor → 5/2 결과 2.5
- LOG-018: timezone 미고려 → new Date() 직접 사용
- LOG-019: typeof null === 'object' → null 체크 함정
- LOG-020: 얕은 복사 깊은 수정 → {...obj} 후 nested 수정

---

## Phase 8: API 오용 (API 1~15) — Symbol 기반

### Batch 23 (API-001 ~ API-005)
- API-001: 존재하지 않는 메서드 → TypeChecker symbol null
- API-002: deprecated API → @deprecated JSDoc 태그
- API-003: Array 메서드 비배열 사용 → type 체크 + .map() 등
- API-004: Object.keys vs entries 의도 불일치 → 사용 패턴 분석
- API-005: localStorage 동기 차단 대용량 → 크기 추정

### Batch 24 (API-006 ~ API-010)
- API-006: console.log 프로덕션 → ✅ quill-engine 구현됨
- API-007: eval() → ✅ quill-engine 구현됨 (SEC-006)
- API-008: new Function() → ✅ quill-engine 구현됨
- API-009: document.write() → ✅ quill-engine 구현됨
- API-010: innerHTML 직접 할당 → PropertyAccessExpression

### Batch 25 (API-011 ~ API-015)
- API-011: setTimeout 문자열 인자 → setTimeout("code", ms)
- API-012: Array 생성자 숫자 1개 → new Array(5) 의도 혼동
- API-013: Object.assign mutate → Object.assign(target, ...) target 확인
- API-014: WeakMap 없이 private → class private 대안
- API-015: Symbol 대신 문자열 키 → 충돌 위험

---

## Phase 9: 보안 (SEC 1~27) — Regex+AST 기반

### Batch 26 (SEC-001 ~ SEC-005)
- SEC-001: SQL Injection → 문자열 연결 쿼리 감지
- SEC-002: XSS innerHTML → dangerouslySetInnerHTML 감지
- SEC-003: Command Injection → exec() child_process 감지
- SEC-004: Path Traversal → ../ 경로 미검증
- SEC-005: LDAP Injection → ldap 쿼리 감지

### Batch 27 (SEC-006 ~ SEC-010)
- SEC-006: eval() → ✅ quill-engine 구현됨
- SEC-007: Prototype Pollution → __proto__ 오염
- SEC-008: ReDoS → 취약 정규식 패턴 분석
- SEC-009: 하드코딩 비밀번호 → ✅ regex팀 매핑됨
- SEC-010: 하드코딩 시드 → salt/seed 하드코딩

### Batch 28 (SEC-011 ~ SEC-015)
- SEC-011: 약한 해시 MD5/SHA1 → createHash('md5') 감지
- SEC-012: 취약한 암호화 → DES/RC4 감지
- SEC-013: JWT 서명 검증 없음 → jwt.decode without verify
- SEC-014: 세션 ID URL 노출 → URL 파라미터에 session
- SEC-015: httpOnly/secure 미설정 → cookie 설정 검사

### Batch 29 (SEC-016 ~ SEC-020)
- SEC-016: CORS * 와일드카드 → Access-Control-Allow-Origin: *
- SEC-017: 미검증 cross-origin → postMessage origin 미확인
- SEC-018: 민감 데이터 로그 → console.log(password) 패턴
- SEC-019: stack trace 노출 → res.send(err.stack)
- SEC-020: HTTP 비암호화 → http:// 하드코딩

### Batch 30 (SEC-021 ~ SEC-025)
- SEC-021: localStorage 민감 데이터 → localStorage.setItem('token',...)
- SEC-022: 프로덕션 디버그 → debugger 문 감지
- SEC-023: 내부 IP 하드코딩 → 192.168/10.0/172.16 감지
- SEC-024: IDOR 객체 참조 → req.params.id 직접 DB 쿼리
- SEC-025: 인증 없는 API → 라우트 핸들러에 auth 미들웨어 없음

### Batch 31 (SEC-026 ~ SEC-027)
- SEC-026: 권한 검사 클라이언트만 → 서버 측 검증 누락
- SEC-027: CSRF 토큰 미사용 → POST 핸들러에 csrf 미확인

---

## Phase 10: 복잡도 (CMX 1~18) — Metric 기반

### Batch 32 (CMX-001 ~ CMX-005)
- CMX-001: 함수 50줄 초과 → ✅ quill-engine 구현됨
- CMX-002: 파라미터 5개 초과 → ✅ quill-engine 구현됨
- CMX-003: 클래스 500줄 초과 → ClassDeclaration line span
- CMX-004: 파일 1000줄 초과 → sourceFile.getEndLineNumber()
- CMX-005: 클래스 메서드 20개 초과 → methods count

### Batch 33 (CMX-006 ~ CMX-010)
- CMX-006: 생성자 100줄 초과 → constructor body line span
- CMX-007: 중첩 5단 초과 → ✅ quill-engine scope graph
- CMX-008: Cyclomatic 10 초과 → ✅ quill-engine 구현됨
- CMX-009: Cognitive 15 초과 → cognitive complexity 별도 계산
- CMX-010: 삼항 중첩 3단 → ✅ quill-engine 구현됨

### Batch 34 (CMX-011 ~ CMX-015)
- CMX-011: callback hell 4단 → 중첩 CallExpression depth
- CMX-012: if-else 체인 7개 → consecutive if-else count
- CMX-013: 줄 120자 초과 → line length check
- CMX-014: 동일 로직 3회 복붙 → 코드 유사도 분석
- CMX-015: 매직 넘버 → 숫자 리터럴 const 미선언

### Batch 35 (CMX-016 ~ CMX-018)
- CMX-016: 매직 문자열 반복 → 문자열 리터럴 반복 감지
- CMX-017: Long Parameter List 7+ → 파라미터 객체화 권장
- CMX-018: Feature Envy → 외부 클래스 접근 비율

---

## Phase 11: AI 안티패턴 (AIP 1~12) — Metric 기반

### Batch 36 (AIP-001 ~ AIP-005)
- AIP-001: 과도한 인라인 주석 → 주석/코드 비율
- AIP-002: 리팩터링 회피 → 코드 유사도 감지
- AIP-003: 엣지 케이스 과잉 → 발생 불가 조건 감지
- AIP-004: By-the-book 고집 → 불필요 패턴 감지
- AIP-005: Phantom Bug → 불필요 complexity

### Batch 37 (AIP-006 ~ AIP-010)
- AIP-006: Vanilla Style → 라이브러리 대체 가능 감지
- AIP-007: null 체크 불필요 위치 → 리터럴 객체에 ?.
- AIP-008: Exception swallowing → ✅ ERR-001과 유사
- AIP-009: Copy-paste coupling → 코드 유사도
- AIP-010: Hallucinated API → TypeChecker symbol null

### Batch 38 (AIP-011 ~ AIP-012)
- AIP-011: 구형 패턴 고집 → deprecated API 사용
- AIP-012: 불필요한 wrapper → 1줄짜리 함수 감싸기

---

## Phase 12: 성능 (PRF 1~10) — CFG 기반

### Batch 39 (PRF-001 ~ PRF-005)
- PRF-001: 루프 내 DOM 조작 → for + querySelector/appendChild
- PRF-002: O(n²) 중첩 루프 → 중첩 for + 선형 탐색
- PRF-003: JSON.parse(JSON.stringify()) → deep clone 패턴
- PRF-004: await in loop → Promise.all 미사용
- PRF-005: 메모이제이션 없이 반복 → 같은 연산 반복 감지

### Batch 40 (PRF-006 ~ PRF-010)
- PRF-006: Event listener 누적 → addEventListener without remove
- PRF-007: .find() 반복 → Map 최적화 가능
- PRF-008: RegExp 루프 내 생성 → new RegExp in for
- PRF-009: scroll 레이아웃 강제 → scroll event + offsetHeight
- PRF-010: 전체 상태 구독 → useSelector 전체 store

---

## Phase 13: 리소스 관리 (RES 1~8) — CFG 기반

### Batch 41 (RES-001 ~ RES-005)
- RES-001: 파일 스트림 close 누락 → createReadStream without close
- RES-002: DB connection 반환 누락 → pool.connect without release
- RES-003: clearTimeout 누락 → setTimeout without clear
- RES-004: AbortController 없이 fetch → fetch without signal
- RES-005: Worker thread 종료 누락 → new Worker without terminate

### Batch 42 (RES-006 ~ RES-008)
- RES-006: Event emitter 리스너 leak → on without off
- RES-007: 전역 캐시 무한 성장 → Map without TTL/size limit
- RES-008: WeakRef 부재 → 대형 객체 참조 유지

---

## Phase 14: 빌드·툴링 (CFG 1~11) — AST 기반

### Batch 43 (CFG-001 ~ CFG-005)
- CFG-001: strict: false → tsconfig 파싱
- CFG-002: noUnusedLocals: false → tsconfig 파싱
- CFG-003: skipLibCheck: true → tsconfig 파싱
- CFG-004: target: ES3 → tsconfig target 확인
- CFG-005: moduleResolution 부재 → tsconfig 필드 확인

### Batch 44 (CFG-006 ~ CFG-011)
- CFG-006: paths alias 불일치 → tsconfig paths vs import 비교
- CFG-007: 순환 의존성 → import graph cycle 탐지
- CFG-008: devDeps vs deps 분류 오류 → package.json 분석
- CFG-009: peerDependencies 미선언 → package.json 확인
- CFG-010: .env git 추적 → .gitignore 확인
- CFG-011: devDeps 프로덕션 포함 → bundler 분석

---

## Phase 15: 테스트 오류 (TST 1~9) — AST 기반

### Batch 45 (TST-001 ~ TST-005)
- TST-001: 빈 테스트 → test/it 블록 내 expect 없음
- TST-002: setTimeout 비결정적 → test 내 setTimeout
- TST-003: mock 미설정 외부 호출 → jest.mock 없이 import
- TST-004: assertion 없이 resolves → expect().resolves 없음
- TST-005: hardcoded 날짜 → new Date('2024-...') 리터럴

### Batch 46 (TST-006 ~ TST-009)
- TST-006: 단일 테스트 복수 단위 → expect 5개+ 한 test 내
- TST-007: shared state 오염 → describe 외부 let 변수
- TST-008: happy path만 → 에러 케이스 test 없음
- TST-009: coverage 100% 무의미 → expect(true).toBe(true)

---

## Phase 16: 명명·스타일 (STL 1~10) — Regex 기반

### Batch 47 (STL-001 ~ STL-005)
- STL-001: 단일 문자 변수 혼동 → l, O, I 변수명
- STL-002: 함수명 동사 없음 → 명사만 함수명
- STL-003: boolean is/has/can 없음 → boolean 반환 함수
- STL-004: 상수 소문자 → const 대문자 미준수
- STL-005: 파일명 대소문자 불일치 → import vs 실제 파일명

### Batch 48 (STL-006 ~ STL-010)
- STL-006: 과도한 주석 → 주석/코드 비율 50%+
- STL-007: 주석 vs 코드 불일치 → 함수명과 주석 비교
- STL-008: 빈 줄 과다 3줄+ → 연속 빈 줄
- STL-009: quote style 불일치 → ' vs " 혼용
- STL-010: TODO/FIXME 잔류 → ✅ regex팀 매핑됨

---

## 우선순위 (빠른 ROI 순)

| 순위 | Batch | 규칙 수 | 이유 |
|---|---|---|---|
| 1 | 26~31 | SEC 27개 | 보안 — hard-fail 직결 |
| 2 | 12~14 | ERR 12개 | 에러 핸들링 — AI 오탐 주범 |
| 3 | 15~18 | RTE 20개 | 런타임 예외 — 실제 크래시 |
| 4 | 9~11 | ASY 15개 | 비동기 — 프로덕션 장애 |
| 5 | 3~5 | TYP 15개 | 타입 — TS 프로젝트 핵심 |
| 6 | 19~22 | LOG 20개 | 로직 — AI 생성 코드 약점 |
| 7 | 32~35 | CMX 18개 | 복잡도 — 유지보수 |
| 8 | 1~2 | SYN 10개 | 구문 — 이미 AST parse로 잡힘 |
| 9 | 나머지 | 87개 | 스타일/성능/테스트/AI패턴 |

---

## 구현 예상 시간

| 난이도 | Batch 수 | 예상 시간 |
|---|---|---|
| AST 단순 (구문/타입/스타일) | 15 | 각 30분 |
| Symbol 기반 (변수/API) | 10 | 각 1시간 |
| CFG 기반 (비동기/에러/런타임) | 15 | 각 1.5시간 |
| Metric 기반 (복잡도/AI패턴) | 8 | 각 45분 |
| **총 48 배치** | | **약 40~50시간** |
