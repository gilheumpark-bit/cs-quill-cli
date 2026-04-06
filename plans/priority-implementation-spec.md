# CS Quill 검증 엔진 — 우선순위 구현 사양서
> Version 1.0 | 2026-04-06
> 대상: 89 Rules (5개 카테고리)
> 현재 구현: 22/224 | 목표: 111/224 (Phase 1 완료 시)

---

## 1. 개요

### 1.1 목적
CS Quill 검증 엔진의 정확도를 현재 65%에서 85%+ 수준으로 끌어올리기 위해, 가장 ROI가 높은 89개 탐지 규칙을 우선 구현한다.

### 1.2 선정 기준
- **hard-fail 직결**: 빌드/런타임 붕괴를 일으키는 결함
- **오탐 주범 해소**: 현재 오탐의 40%를 차지하는 카테고리
- **프로덕션 장애 방지**: 실 서비스에서 크래시를 유발하는 패턴

### 1.3 기술 스택
| 계층 | 기술 | 역할 |
|---|---|---|
| Layer 1 | `ts.createSourceFile` | 구문 파싱, 노드 순회 |
| Layer 2 | `ts.createProgram` + `TypeChecker` | 심볼 해석, 타입 추론 |
| Layer 3 | `acorn` + `esquery` | CSS 셀렉터 AST 패턴 |
| Layer 4 | `rule-catalog.ts` | 메타데이터 (severity/confidence/action) |

### 1.4 구현 원칙
- 모든 detector는 `core/detectors/{ruleId}.ts` 파일로 존재
- `RuleDetector` 인터페이스 준수: `{ ruleId, detect(sourceFile) }`
- ts-morph 미설치 시 catch fallback — 시스템 전체가 중단되지 않음
- quill-engine에서 직접 구현한 규칙은 detector와 중복 실행 방지

---

## 2. 1순위: 보안 (SEC-001 ~ SEC-027) — 27개

### 2.1 분류

| 등급 | 규칙 수 | 기본 action |
|---|---|---|
| critical (hard-fail) | 12 | CI 차단 |
| high (review) | 13 | PR 코멘트 |
| medium (review) | 2 | 로컬 표시 |

### 2.2 인젝션 취약점 (SEC-001 ~ SEC-008)

**SEC-001: SQL Injection**
- engine: regex + ast
- 탐지: 문자열 연결로 구성된 SQL 쿼리 감지
- 패턴: `"SELECT * FROM " + table`, `\`DELETE FROM ${table}\``
- 면제: parameterized query (`?`, `$1`), ORM 사용 시
- CWE: CWE-89 | OWASP: A03
- suppress-fp: GQ-SC-001 (파라미터화 쿼리 존재 시)

**SEC-002: XSS — innerHTML 미검증 입력**
- engine: ast
- 탐지: `innerHTML =`, `dangerouslySetInnerHTML`에 변수 직접 할당
- 면제: DOMPurify.sanitize() 래핑 시
- CWE: CWE-79 | OWASP: A03
- suppress-fp: GQ-SC-002 (DOMPurify 존재 시)

**SEC-003: Command Injection — exec() 미검증**
- engine: ast
- 탐지: `child_process.exec()`, `execSync()`에 변수 직접 전달
- 면제: 하드코딩 문자열만 사용 시
- CWE: CWE-78 | OWASP: A03

**SEC-004: Path Traversal**
- engine: regex
- 탐지: 파일 API(`readFile`, `createReadStream`)에 사용자 입력 직접 전달
- 패턴: `../` 포함 경로 미검증
- CWE: CWE-22 | OWASP: A01

**SEC-005: LDAP Injection**
- engine: regex
- 탐지: LDAP 쿼리 문자열에 변수 연결
- CWE: CWE-90

**SEC-006: eval() 동적 실행**
- engine: ast
- 탐지: `eval()` CallExpression
- 상태: ✅ quill-engine 구현 완료
- CWE: CWE-95 | OWASP: A03

**SEC-007: Prototype Pollution**
- engine: ast
- 탐지: `__proto__`, `constructor.prototype` 직접 할당
- 패턴: `obj[key] = value` where key is user-controlled
- CWE: CWE-1321

**SEC-008: ReDoS 취약 정규식**
- engine: regex
- 탐지: 중첩 수량자 `(a+)+`, `(a|b)*c*` 패턴
- CWE: CWE-1333

### 2.3 인증·세션 취약점 (SEC-009 ~ SEC-017)

**SEC-009: 하드코딩 비밀번호/API키**
- engine: regex
- 탐지: `password = "..."`, `apiKey = "sk-..."`, `secret = "..."`
- 상태: ✅ regex팀 매핑 완료
- CWE: CWE-798 | OWASP: A07
- suppress-fp: GQ-SC-003 (process.env 사용 시)

**SEC-010: 하드코딩 시드/salt**
- engine: regex
- 탐지: `salt = "..."`, `seed = "..."` 리터럴
- CWE: CWE-259

**SEC-011: 약한 해시 MD5/SHA1**
- engine: regex + ast
- 탐지: `createHash('md5')`, `createHash('sha1')`
- 면제: 파일 체크섬 용도 (보안 아닌 무결성)
- CWE: CWE-327
- suppress-fp: GQ-SC-007 (bcrypt/argon2 존재 시)

**SEC-012: 취약한 암호화 DES/RC4**
- engine: regex + ast
- 탐지: `createCipheriv('des-...', ...)`, `'rc4'`
- CWE: CWE-326

**SEC-013: JWT 서명 검증 없음**
- engine: ast
- 탐지: `jwt.decode()` without `jwt.verify()`
- CWE: CWE-347

**SEC-014: 세션 ID URL 노출**
- engine: regex
- 탐지: URL 파라미터에 `sessionId`, `token` 포함
- CWE: CWE-598

**SEC-015: httpOnly/secure 미설정**
- engine: ast
- 탐지: `res.cookie()` 호출 시 options에 httpOnly/secure 없음
- CWE: CWE-614

**SEC-016: CORS * 와일드카드**
- engine: ast
- 탐지: `Access-Control-Allow-Origin: *` 또는 `cors({ origin: '*' })`

**SEC-017: 미검증 cross-origin 통신**
- engine: ast
- 탐지: `postMessage` origin 파라미터 `'*'`
- CWE: CWE-346

### 2.4 데이터 노출 (SEC-018 ~ SEC-023)

**SEC-018: 민감 데이터 로그 출력**
- engine: regex
- 탐지: `console.log(password)`, `console.log(token)`
- CWE: CWE-532
- suppress-fp: GQ-OB-008 (로그 마스킹 존재 시)

**SEC-019: stack trace 사용자 노출**
- engine: ast
- 탐지: `res.json(err.stack)`, `res.send(err.message)`
- CWE: CWE-209

**SEC-020: HTTP 비암호화 통신**
- engine: regex
- 탐지: `http://` 하드코딩 (localhost 제외)
- CWE: CWE-319

**SEC-021: localStorage 민감 데이터**
- engine: ast
- 탐지: `localStorage.setItem('token', ...)`, `'password'`
- CWE: CWE-312

**SEC-022: 프로덕션 디버그 잔류**
- engine: ast
- 탐지: `debugger` 문, `console.debug` 다량
- 상태: ✅ regex팀 매핑 완료

**SEC-023: 내부 IP 하드코딩**
- engine: regex
- 탐지: `192.168.`, `10.0.`, `172.16.` 리터럴
- CWE: CWE-912

### 2.5 접근 제어 (SEC-024 ~ SEC-027)

**SEC-024: IDOR 객체 참조 노출**
- engine: regex
- 탐지: `req.params.id` → DB 쿼리 직접 전달
- CWE: CWE-639 | OWASP: A01

**SEC-025: 인증 없는 API 엔드포인트**
- engine: ast
- 탐지: 라우트 핸들러에 auth 미들웨어 체인 없음
- CWE: CWE-306 | OWASP: A07

**SEC-026: 권한 검사 클라이언트만**
- engine: ast
- 탐지: 프론트엔드에서만 role 체크, 서버 미구현
- CWE: CWE-602

**SEC-027: CSRF 토큰 미사용**
- engine: ast
- 탐지: POST/PUT/DELETE 핸들러에 csrf 검증 없음
- CWE: CWE-352 | OWASP: A01
- suppress-fp: GQ-SC-012 (CSRF 검증 존재 시)

---

## 3. 2순위: 에러 핸들링 (ERR-001 ~ ERR-012) — 12개

### 3.1 분류

| 등급 | 규칙 수 | 핵심 이슈 |
|---|---|---|
| high | 8 | silent failure, 리소스 leak |
| medium | 4 | 코드 품질, 디버깅 난이도 |

### 3.2 상세

**ERR-001: empty catch block**
- engine: ast
- 탐지: catch 블록 statements.length === 0
- 상태: ✅ detector 구현 완료
- 면제: 주석으로 의도 명시 시 (`// intentional`, `// best-effort`)
- CWE: CWE-390
- suppress-fp: GQ-EH-003 (catch에서 복구/재throw 존재 시)

**ERR-002: catch에서 console.log만**
- engine: ast
- 탐지: catch 내 유일한 statement가 console.log
- CWE: CWE-390

**ERR-003: catch 정보 손실**
- engine: ast
- 탐지: `throw new Error("실패")` — 원본 error의 cause 미포함
- 권장: `throw new Error("실패", { cause: e })`

**ERR-004: finally 없이 리소스 미해제**
- engine: cfg
- 탐지: try-catch에 리소스 open이 있지만 finally 없음
- CWE: CWE-404
- suppress-fp: GQ-EH-004 (finally 존재 시), GQ-RS-001

**ERR-005: 문자열 throw**
- engine: ast
- 탐지: `throw "error"` — ThrowStatement + StringLiteral
- 상태: ✅ quill-engine 구현 완료

**ERR-006: catch 범위 과도**
- engine: ast
- 탐지: try 블록 50줄+ (과도하게 넓은 범위)

**ERR-007: 중첩 try-catch 3단+**
- engine: ast
- 탐지: TryStatement 내부에 TryStatement 3단 이상

**ERR-008: error 메시지 민감 정보**
- engine: regex
- 탐지: Error 생성자에 password, apiKey, token 변수 포함
- CWE: CWE-209

**ERR-009: stack trace 사용자 노출**
- engine: ast
- 탐지: response에 err.stack 직접 전달
- CWE: CWE-209

**ERR-010: 비동기 에러 동기 catch**
- engine: cfg
- 탐지: async 함수를 try-catch 없이 호출 (Promise rejection 미처리)
- suppress-fp: GQ-AS-005 (try-catch-finally 완전 쌍 시)

**ERR-011: 타입 구분 없이 catch**
- engine: ast
- 탐지: catch(e) 내부에 instanceof 체크 없음
- suppress-fp: GQ-EH-002 (instanceof 에러 구분 시)

**ERR-012: 오류 복구 후 상태 초기화 누락**
- engine: cfg
- 탐지: catch 내 state 변경 후 정상 경로 state와 불일치

---

## 4. 3순위: 런타임 예외 (RTE-001 ~ RTE-020) — 20개

### 4.1 분류

| 등급 | 규칙 수 | 핵심 이슈 |
|---|---|---|
| critical | 4 | null crash, 무한 루프, 스택 오버플로 |
| high | 12 | 데이터 손실, 비정상 동작 |
| medium | 4 | 예측 불가 동작 |

### 4.2 Null/Undefined (RTE-001 ~ RTE-010)

**RTE-001: null dereference**
- engine: symbol (TypeChecker)
- 탐지: nullable 타입의 직접 속성 접근 (`.property` without null check)
- CWE: CWE-476
- suppress-fp: GQ-NL-010 (타입 narrowing 존재 시)

**RTE-002: undefined dereference**
- engine: symbol
- 탐지: optional 파라미터/프로퍼티 직접 접근
- CWE: CWE-476
- suppress-fp: GQ-NL-010

**RTE-003: optional chaining 미사용**
- engine: ast
- 탐지: nullable 값에 `.` 직접 접근 (`?.` 미사용)
- CWE: CWE-476
- suppress-fp: GQ-NL-001 (optional chaining 사용 시)

**RTE-004: ?? 대신 || 오사용**
- engine: ast
- 탐지: `value || default` where value can be 0, "", false
- suppress-fp: GQ-NL-002 (nullish coalescing 사용 시)

**RTE-005: Array 길이 미확인**
- engine: ast
- 탐지: `arr[0]`, `arr[index]` without length/bounds check
- suppress-fp: GQ-NL-004, GQ-NW-010

**RTE-006: arr[0] 빈 배열 가능성**
- engine: ast
- 탐지: 첫 원소 접근 시 빈 배열 가능성
- 권장: `arr.at(0)` 또는 `arr[0] ?? default`
- suppress-fp: GQ-NW-006 (Array.at 사용 시)

**RTE-007: 구조분해 기본값 없음**
- engine: ast
- 탐지: `const { name } = obj` without default
- suppress-fp: GQ-NL-005

**RTE-008: JSON.parse try-catch 없음**
- engine: ast
- 탐지: JSON.parse() without surrounding try-catch
- CWE: CWE-248
- suppress-fp: GQ-NL-007

**RTE-009: parseInt NaN 미처리**
- engine: ast
- 탐지: parseInt/parseFloat 결과 isNaN 미체크
- suppress-fp: GQ-NL-008

**RTE-010: division by zero**
- engine: cfg
- 탐지: 나눗셈 연산에 분모 0 체크 없음
- CWE: CWE-369

### 4.3 루프·제어 흐름 (RTE-011 ~ RTE-020)

**RTE-011: 무한 루프**
- engine: cfg
- 탐지: while(true) / for(;;) without break/return in body

**RTE-012: 재귀 base case 없음**
- engine: cfg
- 탐지: 자기 호출 함수 내 조건 return 없음

**RTE-013: 스택 오버플로 재귀**
- engine: cfg
- 탐지: 재귀 깊이 제한 없는 패턴

**RTE-014: off-by-one error**
- engine: cfg
- 탐지: `<=` vs `<` 경계 조건, `length` vs `length - 1`
- CWE: CWE-193

**RTE-015: 루프 내 배열 수정**
- engine: cfg
- 탐지: for 내부에서 순회 대상 배열 splice/push/shift

**RTE-016: for...in on Array**
- engine: ast
- 탐지: ForInStatement on Array type variable
- 상태: ✅ quill-engine 구현 완료

**RTE-017: switch fall-through**
- engine: cfg
- 탐지: case 블록에 break/return 없이 다음 case로 진행

**RTE-018: switch default 없음**
- engine: ast
- 탐지: SwitchStatement without DefaultClause
- 상태: ✅ quill-engine 구현 완료

**RTE-019: unreachable code**
- engine: cfg
- 탐지: return/throw/continue/break 이후 코드

**RTE-020: dead branch**
- engine: cfg
- 탐지: 항상 true/false인 조건 (`if (false)`, `if (typeof x === 'string' && typeof x === 'number')`)

---

## 5. 4순위: 비동기·이벤트 (ASY-001 ~ ASY-015) — 15개

### 5.1 분류

| 등급 | 규칙 수 | 핵심 이슈 |
|---|---|---|
| critical | 3 | Unhandled rejection, race condition |
| high | 7 | 성능 저하, 메모리 누수 |
| medium | 3 | 코드 품질 |
| low | 2 | 스타일 |

### 5.2 상세

**ASY-001: async 함수 내 await 누락**
- engine: ast + symbol
- 탐지: async 함수 내 Promise 반환 함수 호출에 await 없음
- 상태: ✅ quill-engine에서 ASY-008로 일부 구현

**ASY-002: await in loop**
- engine: cfg
- 탐지: for/while 내 await — Promise.all로 병렬화 가능
- suppress-fp: GQ-AS-002 (Promise.all 사용 시)

**ASY-003: Unhandled Promise rejection**
- engine: ast
- 탐지: Promise 체인에 .catch() 없음, async 함수 호출에 try-catch 없음
- CWE: CWE-248
- suppress-fp: GQ-AS-005

**ASY-004: async 함수 return 누락**
- engine: cfg
- 탐지: async 함수의 일부 경로에 return 없음

**ASY-005: .then() + async/await 혼용**
- engine: ast
- 탐지: 같은 함수 내 .then() 체인과 await 동시 사용
- suppress-fp: GQ-AS-001

**ASY-006: Promise.all vs 순차 await 오류**
- engine: cfg
- 탐지: 독립적인 await 3개+ 연속 (병렬화 가능)

**ASY-007: Promise.race timeout 없음**
- engine: ast
- 탐지: Promise.race 인자에 timeout Promise 없음
- suppress-fp: GQ-AS-009

**ASY-008: await 없는 async**
- engine: cfg
- 상태: ✅ quill-engine 구현 완료

**ASY-009: event listener 제거 누락**
- engine: cfg
- 탐지: addEventListener 호출에 대응하는 removeEventListener 없음
- CWE: CWE-401
- suppress-fp: GQ-AS-007

**ASY-010: event listener 중복 등록**
- engine: ast
- 탐지: 같은 이벤트+핸들러를 반복 등록 (useEffect 내 등)

**ASY-011: 동기 heavy computation**
- engine: cfg
- 탐지: readFileSync 대용량, JSON.parse 대형 문자열, crypto 동기 호출

**ASY-012: setTimeout 내 throw**
- engine: cfg
- 탐지: setTimeout/setInterval 콜백 내 throw (catch 불가)

**ASY-013: Promise 생성자 async 콜백**
- engine: ast
- 탐지: `new Promise(async (resolve, reject) => { ... })`

**ASY-014: for await 없이 async iterable**
- engine: ast
- 탐지: Symbol.asyncIterator 구현체를 일반 for로 순회

**ASY-015: race condition 공유 상태**
- engine: cfg
- 탐지: 복수 async 함수가 동일 변수에 동시 쓰기
- CWE: CWE-362

---

## 6. 5순위: 타입 시스템 (TYP-001 ~ TYP-015) — 15개

### 6.1 분류

| 등급 | 규칙 수 | 핵심 이슈 |
|---|---|---|
| high | 10 | 타입 안전성 붕괴 |
| medium | 3 | 코드 품질 |
| low | 2 | 스타일 |

### 6.2 상세

**TYP-001: any 무분별 사용**
- engine: ast
- 탐지: TypeReference === 'any'
- 상태: ✅ quill-engine 구현 완료
- suppress-fp: GQ-TS-004 (unknown 사용 시)

**TYP-002: 함수 반환 타입 미선언**
- engine: ast
- 탐지: FunctionDeclaration without returnType annotation
- suppress-fp: GQ-TS-002

**TYP-003: unsafe type assertion**
- engine: ast
- 탐지: `as unknown as T`, `<any>value` 패턴

**TYP-004: ! non-null assertion 과용**
- engine: ast
- 탐지: NonNullExpression 5개+ 한 파일 내
- 상태: ✅ quill-engine 구현 완료

**TYP-005: {} empty object type**
- engine: ast
- 탐지: TypeLiteral with 0 members (Record<string, never> 의도)

**TYP-006: generics 파라미터 누락**
- engine: ast
- 탐지: Generic 함수/클래스 호출 시 <> 없음

**TYP-007: never를 값으로 반환**
- engine: symbol
- 탐지: 함수 반환 타입이 never인데 실제 값을 return

**TYP-008: union null|undefined 미처리**
- engine: symbol
- 탐지: `string | null` 타입 변수를 null 체크 없이 사용
- CWE: CWE-476

**TYP-009: 함수 오버로드 불일치**
- engine: symbol
- 탐지: 오버로드 시그니처와 구현체 파라미터 불일치

**TYP-010: enum non-literal 값**
- engine: ast
- 탐지: enum 멤버에 변수/함수 호출 값

**TYP-011: interface vs type alias 혼용**
- engine: ast
- 탐지: 한 파일 내 interface와 type alias 혼용 (일관성 없음)

**TYP-012: strict 모드 미활성화**
- engine: ast
- 탐지: tsconfig.json strict: false 또는 미설정
- suppress-fp: GQ-TS-001, GQ-CF-001

**TYP-013: noImplicitAny 위반**
- engine: ast + symbol
- 탐지: 파라미터 타입 미선언으로 암묵적 any

**TYP-014: strictNullChecks 위반**
- engine: symbol
- 탐지: null 가능 타입의 직접 접근 (strictNullChecks 적용 시)
- CWE: CWE-476

**TYP-015: optional chaining 과용**
- engine: ast
- 탐지: non-nullable 값에 ?. 사용 (불필요한 방어)

---

## 7. 구현 일정

### 7.1 단계별 목표

| Phase | 기간 | 규칙 수 | 누적 구현 | 예상 정확도 |
|---|---|---|---|---|
| Phase 0 (현재) | 완료 | 22 | 22/224 | 65% |
| Phase 1-A: SEC | 2일 | 27 | 49/224 | 72% |
| Phase 1-B: ERR | 1일 | 12 | 61/224 | 75% |
| Phase 1-C: RTE | 2일 | 20 | 81/224 | 78% |
| Phase 1-D: ASY | 1.5일 | 15 | 96/224 | 82% |
| Phase 1-E: TYP | 1.5일 | 15 | 111/224 | 85% |

### 7.2 검증 기준

각 Phase 완료 시:
1. `cs verify .` 전체 스캔 — hard-fail 감소 확인
2. `cs verify --diff` — 신규 코드 검증 정상 동작
3. 오탐 샘플링 10건 — 진탐 비율 확인
4. 빌드 통과 확인

### 7.3 의존성

| 규칙 | 필요 기술 | 현재 상태 |
|---|---|---|
| SEC, ERR, ASY (기본) | typescript AST | ✅ 가용 |
| RTE (null deref) | TypeChecker symbol | ✅ 가용 |
| TYP (타입 추론) | TypeChecker + strict | ✅ 가용 |
| CFG 기반 규칙 | scope graph + cfg-lite | ✅ quill-engine 내장 |
| ts-morph 기반 detector | ts-morph 패키지 | ❌ 미설치 (fallback 동작) |

---

## 8. 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| ts-morph 미설치 | detector 220개 스텁 상태 | typescript API로 대체 구현 |
| 오탐 폭발 | 새 규칙이 기존 코드에서 대량 탐지 | 정수 필터 + suppress-fp 동시 확장 |
| 성능 저하 | 규칙 증가 → 스캔 시간 증가 | findings cap + bail-out |
| 자기참조 | 검증 코드 자체가 탐지됨 | SELF_FILES skip 리스트 유지 |

---

## 9. 인수 조건

Phase 1 완료 시 다음 조건을 만족해야 한다:

- [ ] 구현 규칙 111/224개 이상
- [ ] 전체 스캔 hard-fail 5건 미만 (자기참조 제외)
- [ ] 오탐률 20% 미만 (review 건 중 실제 이슈 80%+)
- [ ] `--diff` 모드 3분 이내 완료
- [ ] 빌드 통과 (Next.js + TypeScript)
- [ ] 양쪽 저장소 동기화 (cs-quill-cli + eh-universe-web)
