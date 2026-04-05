// ============================================================
// CS Quill 🦔 — Reference DB (AI 레퍼런스 패턴 저장소)
// ============================================================
// 5대 AI가 생성한 코드의 평균 패턴을 저장.
// 생성 시 레퍼런스로 주입해서 품질/속도 향상.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getGlobalConfigDir } from './config';

// ============================================================
// PART 1 — Types
// ============================================================

export interface ReferencePattern {
  id: string;
  category: string;
  name: string;
  description: string;
  framework: string;
  language: string;
  tags: string[];
  sources: Array<{
    ai: string;
    code: string;
    score?: number;
  }>;
  mergedPattern: string;
  bestPractices: string[];
  antiPatterns: string[];
  createdAt: number;
  usedCount: number;
}

export interface ReferenceDB {
  version: 1;
  patterns: ReferencePattern[];
}

// Categories
export const CATEGORIES = [
  'auth', 'crud', 'api', 'ui-component', 'state', 'file',
  'payment', 'email', 'search', 'websocket', 'testing',
  'middleware', 'database', 'cache', 'validation',
] as const;

export type ReferenceCategory = typeof CATEGORIES[number];

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=ReferencePattern,ReferenceDB

// ============================================================
// PART 2 — Storage
// ============================================================

function getDBDir(): string {
  return join(getGlobalConfigDir(), 'references');
}

function getDBPath(category: string): string {
  return join(getDBDir(), `${category}.json`);
}

function loadCategory(category: string): ReferencePattern[] {
  const path = getDBPath(category);
  if (!existsSync(path)) return [];
  try {
    const db: ReferenceDB = JSON.parse(readFileSync(path, 'utf-8'));
    return db.patterns;
  } catch { return []; }
}

function saveCategory(category: string, patterns: ReferencePattern[]): void {
  mkdirSync(getDBDir(), { recursive: true });
  const db: ReferenceDB = { version: 1, patterns };
  writeFileSync(getDBPath(category), JSON.stringify(db, null, 2));
}

export function loadAllPatterns(): ReferencePattern[] {
  const all: ReferencePattern[] = [];
  for (const cat of CATEGORIES) {
    all.push(...loadCategory(cat));
  }
  return all;
}

// IDENTITY_SEAL: PART-2 | role=storage | inputs=category | outputs=ReferencePattern[]

// ============================================================
// PART 3 — Pattern CRUD
// ============================================================

export function addPattern(pattern: Omit<ReferencePattern, 'id' | 'createdAt' | 'usedCount'>): ReferencePattern {
  const full: ReferencePattern = {
    ...pattern,
    id: `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
    usedCount: 0,
  };

  const patterns = loadCategory(pattern.category);
  patterns.push(full);
  saveCategory(pattern.category, patterns);
  return full;
}

export function removePattern(category: string, patternId: string): boolean {
  const patterns = loadCategory(category);
  const idx = patterns.findIndex(p => p.id === patternId);
  if (idx < 0) return false;
  patterns.splice(idx, 1);
  saveCategory(category, patterns);
  return true;
}

export function recordUsage(category: string, patternId: string): void {
  const patterns = loadCategory(category);
  const pattern = patterns.find(p => p.id === patternId);
  if (pattern) {
    pattern.usedCount++;
    saveCategory(category, patterns);
  }
}

// IDENTITY_SEAL: PART-3 | role=crud | inputs=pattern | outputs=ReferencePattern

// ============================================================
// PART 4 — Search (태스크 → 레퍼런스 매칭)
// ============================================================

export function searchPatterns(query: string, framework?: string, limit: number = 3): ReferencePattern[] {
  const all = loadAllPatterns();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  const scored = all.map(pattern => {
    let score = 0;

    // Name match
    if (pattern.name.toLowerCase().includes(queryLower)) score += 10;

    // Tag match
    for (const tag of pattern.tags) {
      if (queryWords.some(w => tag.toLowerCase().includes(w))) score += 5;
    }

    // Description match
    for (const word of queryWords) {
      if (pattern.description.toLowerCase().includes(word)) score += 3;
    }

    // Category match (from query keywords)
    const categoryKeywords: Record<string, string[]> = {
      auth: ['로그인', 'login', '회원가입', 'register', 'jwt', 'oauth', '인증', 'auth', 'password'],
      crud: ['crud', '목록', 'list', '생성', 'create', '수정', 'update', '삭제', 'delete', '상세', 'detail'],
      api: ['api', 'route', 'endpoint', 'rest', 'middleware', '라우트'],
      'ui-component': ['버튼', 'button', '폼', 'form', '모달', 'modal', '테이블', 'table', '탭', 'tab', '드롭다운', 'dropdown'],
      state: ['상태', 'state', 'store', 'context', 'redux', 'zustand'],
      file: ['업로드', 'upload', '다운로드', 'download', '파일', 'file', '이미지', 'image'],
      payment: ['결제', 'payment', 'stripe', '구독', 'subscription', '웹훅', 'webhook'],
      validation: ['검증', 'validation', 'zod', 'schema', '유효성'],
      database: ['db', 'database', 'prisma', 'drizzle', 'query', '쿼리'],
      testing: ['테스트', 'test', 'jest', 'vitest', 'mock'],
    };

    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (cat === pattern.category && keywords.some(k => queryLower.includes(k))) {
        score += 8;
      }
    }

    // Framework match
    if (framework && pattern.framework.toLowerCase().includes(framework.toLowerCase())) {
      score += 5;
    }

    // Usage popularity boost
    score += Math.min(5, pattern.usedCount);

    return { pattern, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.pattern);
}

// IDENTITY_SEAL: PART-4 | role=search | inputs=query,framework | outputs=ReferencePattern[]

// ============================================================
// PART 5 — Reference Prompt Builder
// ============================================================

export function buildReferencePrompt(patterns: ReferencePattern[]): string {
  if (patterns.length === 0) return '';

  const lines: string[] = [
    '[REFERENCE PATTERNS — 참고만 하고 복사하지 마라]',
    'Below are reference patterns from multiple AI sources.',
    'Use the STRUCTURE and APPROACH as inspiration, but write entirely new code.',
    'Do NOT copy variable names, function names, or logic verbatim.',
    '',
  ];

  for (const [i, pattern] of patterns.entries()) {
    lines.push(`--- Reference ${i + 1}: ${pattern.name} (${pattern.framework}) ---`);

    // Show merged pattern (average of AI outputs)
    if (pattern.mergedPattern) {
      lines.push('Pattern:');
      lines.push(pattern.mergedPattern.slice(0, 1500));
    }

    // Best practices
    if (pattern.bestPractices.length > 0) {
      lines.push('Best practices: ' + pattern.bestPractices.join(', '));
    }

    // Anti-patterns
    if (pattern.antiPatterns.length > 0) {
      lines.push('AVOID: ' + pattern.antiPatterns.join(', '));
    }

    lines.push('');
  }

  lines.push('[END REFERENCES — Write new code inspired by above, do NOT copy]');

  return lines.join('\n');
}

// IDENTITY_SEAL: PART-5 | role=prompt-builder | inputs=ReferencePattern[] | outputs=string

// ============================================================
// PART 6 — Built-in Seed Patterns (빈 껍데기 — 나중에 채움)
// ============================================================

export const SEED_PATTERNS: Array<Omit<ReferencePattern, 'id' | 'createdAt' | 'usedCount'>> = [
  {
    category: 'auth', name: 'JWT Login API', description: 'JWT 기반 로그인 API Route',
    framework: 'Next.js', language: 'typescript', tags: ['login', 'jwt', 'auth', 'api', '로그인'],
    sources: [], // 나중에 AI 5개로 채움
    mergedPattern: `// Pattern: JWT Login
// 1. Input validation (Zod schema)
// 2. User lookup (DB query)
// 3. Password verify (bcrypt.compare)
// 4. Token generation (jose/jsonwebtoken)
// 5. HttpOnly cookie set
// 6. Error handling (try-catch + typed errors)`,
    bestPractices: ['HttpOnly cookie for token', 'bcrypt for password', 'Zod for input validation', 'Rate limiting'],
    antiPatterns: ['localStorage for JWT', 'plain text password comparison', 'no input validation', 'hardcoded secrets'],
  },
  {
    category: 'crud', name: 'REST CRUD API', description: 'RESTful CRUD API with validation',
    framework: 'Next.js', language: 'typescript', tags: ['crud', 'rest', 'api', 'create', 'read', 'update', 'delete'],
    sources: [],
    mergedPattern: `// Pattern: REST CRUD
// 1. GET /items — list with pagination (page, limit, cursor)
// 2. GET /items/:id — single item with 404 handling
// 3. POST /items — create with Zod validation + 201 response
// 4. PUT /items/:id — update with partial validation
// 5. DELETE /items/:id — soft delete with 204 response
// 6. Error middleware (typed errors, no stack in prod)`,
    bestPractices: ['Pagination on list', 'Zod input validation', 'Proper HTTP status codes', 'Soft delete'],
    antiPatterns: ['No pagination', 'No input validation', 'Returning stack traces', 'Hard delete'],
  },
  {
    category: 'ui-component', name: 'React Form', description: 'React Hook Form + Zod validation',
    framework: 'React', language: 'typescript', tags: ['form', 'validation', 'react', 'zod', '폼', '검증'],
    sources: [],
    mergedPattern: `// Pattern: React Form
// 1. Zod schema definition
// 2. useForm with zodResolver
// 3. Controlled inputs with register()
// 4. Error display per field (formState.errors)
// 5. Loading state on submit
// 6. Success/error toast feedback
// 7. Accessibility: label htmlFor, aria-describedby`,
    bestPractices: ['Zod + React Hook Form combo', 'Field-level error display', 'Loading state', 'Accessible labels'],
    antiPatterns: ['Manual validation', 'alert() for errors', 'No loading state', 'Missing labels'],
  },
  {
    category: 'state', name: 'Global State (Zustand)', description: 'Zustand store with persistence',
    framework: 'React', language: 'typescript', tags: ['state', 'zustand', 'store', 'global', '상태'],
    sources: [],
    mergedPattern: `// Pattern: Zustand Store
// 1. Interface for state shape
// 2. create() with typed state + actions
// 3. Selectors for derived state
// 4. persist middleware for localStorage
// 5. devtools middleware for debugging
// 6. Separate slice per domain`,
    bestPractices: ['Typed state interface', 'Selectors over direct access', 'Persist for user preferences', 'Slice pattern'],
    antiPatterns: ['Single massive store', 'No types', 'Direct mutation', 'No persistence for user data'],
  },
  {
    category: 'middleware', name: 'Auth Middleware', description: 'JWT verification middleware',
    framework: 'Next.js', language: 'typescript', tags: ['middleware', 'auth', 'jwt', 'protect', '미들웨어', '인증'],
    sources: [],
    mergedPattern: `// Pattern: Auth Middleware
// 1. Extract token from cookie/header
// 2. Verify with jose/jsonwebtoken
// 3. Attach user to request context
// 4. Role-based access control (RBAC)
// 5. 401 for missing token, 403 for insufficient role
// 6. Token refresh if near expiry`,
    bestPractices: ['Cookie > Authorization header', 'Role-based checks', 'Token refresh', 'Typed user context'],
    antiPatterns: ['Token in query params', 'No role check', 'Catch-all 500', 'User data in JWT payload'],
  },
  {
    category: 'file', name: 'File Upload', description: '파일 업로드 + 검증 + 저장',
    framework: 'Next.js', language: 'typescript', tags: ['upload', 'file', 'multipart', '업로드', '파일'],
    sources: [],
    mergedPattern: `// Pattern: File Upload
// 1. Multipart form parsing (formidable or multer)
// 2. File type validation (magic bytes, not just extension)
// 3. Size limit enforcement
// 4. Sanitize filename (path traversal prevention)
// 5. Store to cloud (S3/GCS) or local with unique name
// 6. Return URL + metadata`,
    bestPractices: ['Magic byte validation', 'Unique file names (UUID)', 'Size limits', 'Cloud storage'],
    antiPatterns: ['Trust file extension', 'Store in public dir', 'No size limit', 'Original filename'],
  },
  {
    category: 'testing', name: 'Unit Test Pattern', description: 'Vitest/Jest 유닛 테스트',
    framework: 'React', language: 'typescript', tags: ['test', 'jest', 'vitest', '테스트', 'unit'],
    sources: [],
    mergedPattern: `// Pattern: Unit Test
// 1. describe block per function/component
// 2. it/test for each behavior (not implementation)
// 3. Arrange → Act → Assert pattern
// 4. Mock external deps (API, DB)
// 5. Edge cases: null, empty, boundary values
// 6. Snapshot for UI components`,
    bestPractices: ['AAA pattern', 'Mock externals only', 'Test behavior not implementation', 'Edge cases'],
    antiPatterns: ['Test implementation details', 'Shared mutable state', 'No cleanup', 'Skip edge cases'],
  },
  {
    category: 'validation', name: 'Zod Schema', description: 'Zod 스키마 검증 패턴',
    framework: 'TypeScript', language: 'typescript', tags: ['zod', 'validation', 'schema', '검증', '유효성'],
    sources: [],
    mergedPattern: `// Pattern: Zod Validation
// 1. Define schema with z.object()
// 2. Infer TypeScript type from schema
// 3. Parse at API boundary (safeParse for errors)
// 4. Custom error messages (Korean/English)
// 5. Compose schemas (extend, merge, pick, omit)
// 6. Transform/preprocess (trim, lowercase)`,
    bestPractices: ['Infer types from schema', 'safeParse over parse', 'Custom messages', 'Reuse with extend'],
    antiPatterns: ['Manual validation', 'typeof checks', 'No error messages', 'Duplicate schemas'],
  },
  {
    category: 'database', name: 'Prisma CRUD', description: 'Prisma ORM 데이터베이스 작업',
    framework: 'Node.js', language: 'typescript', tags: ['prisma', 'database', 'db', 'orm', '데이터베이스'],
    sources: [],
    mergedPattern: `// Pattern: Prisma CRUD
// 1. Schema definition (schema.prisma)
// 2. Client singleton (prevent connection exhaustion)
// 3. Type-safe queries (findUnique, findMany, create, update, delete)
// 4. Relations (include, select)
// 5. Transactions for multi-step operations
// 6. Error handling (PrismaClientKnownRequestError)`,
    bestPractices: ['Client singleton', 'Select only needed fields', 'Transactions', 'Typed error handling'],
    antiPatterns: ['New client per request', 'Select all fields', 'No transactions', 'Raw SQL without parameterization'],
  },
];

export function seedDB(): number {
  let count = 0;
  for (const seed of SEED_PATTERNS) {
    const existing = loadCategory(seed.category);
    if (existing.some(p => p.name === seed.name)) continue;
    addPattern(seed);
    count++;
  }
  return count;
}

// IDENTITY_SEAL: PART-6 | role=seeds | inputs=none | outputs=SEED_PATTERNS

// ============================================================
// PART 7 — Stats
// ============================================================

export function getRefStats(): { total: number; byCategory: Record<string, number>; topUsed: ReferencePattern[] } {
  const all = loadAllPatterns();
  const byCategory: Record<string, number> = {};
  for (const p of all) {
    byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;
  }
  const topUsed = [...all].sort((a, b) => b.usedCount - a.usedCount).slice(0, 5);
  return { total: all.length, byCategory, topUsed };
}

// IDENTITY_SEAL: PART-7 | role=stats | inputs=none | outputs=stats

// ============================================================
// PART 8 — External Reference Loader (new1/ 레퍼런스 자동 적재)
// ============================================================

const WORKFLOW_MAP: Record<string, { category: string; tags: string[] }> = {
  '01-zero-to-one': { category: 'ui-component', tags: ['zero-to-one', 'ui', 'shell', 'dashboard', 'layout', 'signup', 'kanban', 'table', 'modal'] },
  '02-feature-logic': { category: 'api', tags: ['feature', 'api', 'auth', 'webhook', 'rate-limit', 'server-action', 'fetch'] },
  '03-refactoring-optimization': { category: 'state', tags: ['refactoring', 'memo', 'reducer', 'compound', 'lazy', 'hook', 'barrel'] },
  '04-debugging-healing': { category: 'testing', tags: ['debugging', 'hydration', 'error-boundary', 'ssr', 'lcp', 'stacking'] },
  '05-chore-typing': { category: 'validation', tags: ['chore', 'typing', 'zod', 'enum', 'jest', 'eslint', 'branded'] },
};

const DATASET_MAP: Record<string, { category: string; tags: string[] }> = {
  'Zero-to-One': { category: 'ui-component', tags: ['zero-to-one', 'express', 'server', 'starter'] },
  'Feature': { category: 'crud', tags: ['feature', 'controller', 'crud', 'api'] },
  'Refactoring': { category: 'state', tags: ['refactoring', 'simplify', 'optimize'] },
  'Debugging': { category: 'testing', tags: ['debugging', 'fix', 'error', 'logging'] },
  'Chore': { category: 'middleware', tags: ['chore', 'config', 'setup', 'ci'] },
};

export function loadExternalReferences(basePath: string): { loaded: number; skipped: number } {
  const { readdirSync, statSync } = require('fs');
  let loaded = 0;
  let skipped = 0;

  // 1. ai-reference-by-workflow
  const workflowDir = join(basePath, 'ai-reference-by-workflow');
  if (existsSync(workflowDir)) {
    for (const [dirName, meta] of Object.entries(WORKFLOW_MAP)) {
      const dir = join(workflowDir, dirName);
      if (!existsSync(dir)) continue;

      for (const file of readdirSync(dir).filter((f: string) => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.css'))) {
        const filePath = join(dir, file);
        const code = readFileSync(filePath, 'utf-8');
        const name = file.replace(/\.\w+$/, '').replace(/^\d+-/, '');

        // 중복 체크
        const existing = loadCategory(meta.category);
        if (existing.some(p => p.name === `wf:${name}`)) { skipped++; continue; }

        addPattern({
          category: meta.category,
          name: `wf:${name}`,
          description: `워크플로우 레퍼런스: ${dirName}/${file}`,
          framework: file.endsWith('.tsx') ? 'React' : 'TypeScript',
          language: 'typescript',
          tags: [...meta.tags, ...name.split('-')],
          sources: [{ ai: 'human-curated', code: code.slice(0, 3000) }],
          mergedPattern: code.slice(0, 2000),
          bestPractices: [],
          antiPatterns: [],
        });
        loaded++;
      }
    }
  }

  // 2. reference-dataset
  const datasetDir = join(basePath, 'reference-dataset');
  if (existsSync(datasetDir)) {
    for (const [dirName, meta] of Object.entries(DATASET_MAP)) {
      const dir = join(datasetDir, dirName);
      if (!existsSync(dir)) continue;

      for (const file of readdirSync(dir).filter((f: string) => f.endsWith('.ts') || f.endsWith('.js'))) {
        const filePath = join(dir, file);
        const code = readFileSync(filePath, 'utf-8');
        const name = file.replace(/\.\w+$/, '');

        const existing = loadCategory(meta.category);
        if (existing.some(p => p.name === `ds:${name}`)) { skipped++; continue; }

        addPattern({
          category: meta.category,
          name: `ds:${name}`,
          description: `데이터셋 레퍼런스: ${dirName}/${file}`,
          framework: 'TypeScript',
          language: 'typescript',
          tags: [...meta.tags, ...name.split('-').filter(s => s.length > 2)],
          sources: [{ ai: 'dataset', code }],
          mergedPattern: code.slice(0, 1500),
          bestPractices: [],
          antiPatterns: [],
        });
        loaded++;
      }
    }
  }

  return { loaded, skipped };
}

// IDENTITY_SEAL: PART-8 | role=external-loader | inputs=basePath | outputs={loaded,skipped}
