// @ts-nocheck
// ============================================================
// CS Quill 🦔 — cs explain command
// ============================================================
// 기존 코드를 PART별로 분석 + 쉬운 해설.

import { readFileSync, statSync } from 'fs';
import { basename, extname } from 'path';

// ============================================================
// PART 1 — Explain System Prompt
// ============================================================

const EXPLAIN_SYSTEM_PROMPT = `You are CS Quill's code explainer. Analyze the given code and explain it in simple terms.

FORMAT:
1. One-line summary of what the file does.
2. Break down by logical sections (if PART/SEAL comments exist, use those).
3. For each section:
   - Line range
   - What it does (simple language, no jargon)
   - Key insight or gotcha
4. End with overall assessment (complexity, quality, potential issues).

Adapt language to the user's detected language (Korean if code has Korean comments, else English).
Keep explanations SHORT. No walls of text.`;

// IDENTITY_SEAL: PART-1 | role=explain-prompt | inputs=none | outputs=EXPLAIN_SYSTEM_PROMPT

// ============================================================
// PART 2 — Code Summary Generator
// ============================================================

function generateCodeSummary(
  filePath: string,
  code: string,
  funcNames: string[],
  classNames: string[],
  ifaceNames: string[],
  exportCount: number,
  importCount: number,
): string {
  const fileName = basename(filePath);
  const ext = extname(filePath);
  const lineCount = code.split('\n').length;

  // Detect file purpose from naming patterns
  const lcName = fileName.toLowerCase();
  let purpose = '';
  if (/\.test\.|\.spec\./i.test(lcName)) purpose = '테스트 파일';
  else if (/hook|use[A-Z]/.test(lcName)) purpose = 'React Hook';
  else if (/provider/i.test(lcName)) purpose = 'Provider / Context 공급자';
  else if (/adapter|bridge/i.test(lcName)) purpose = '어댑터 / 브릿지 모듈';
  else if (/util|helper/i.test(lcName)) purpose = '유틸리티 함수 모음';
  else if (/service/i.test(lcName)) purpose = '서비스 레이어';
  else if (/component|\.tsx$/i.test(lcName)) purpose = 'UI 컴포넌트';
  else if (/route|controller/i.test(lcName)) purpose = '라우터 / 컨트롤러';
  else if (/config/i.test(lcName)) purpose = '설정 파일';
  else if (/model|schema|type/i.test(lcName)) purpose = '데이터 모델 / 타입 정의';
  else if (/middleware/i.test(lcName)) purpose = '미들웨어';
  else if (/command/i.test(lcName)) purpose = 'CLI 명령어';

  // Build summary
  const parts: string[] = [];
  parts.push(`📝 ${fileName}${purpose ? ` — ${purpose}` : ''}`);
  parts.push(`   ${lineCount}줄 | import ${importCount}개 | export ${exportCount}개`);

  if (classNames.length > 0) {
    parts.push(`   클래스: ${classNames.join(', ')}`);
  }
  if (ifaceNames.length > 0) {
    parts.push(`   인터페이스: ${ifaceNames.join(', ')}`);
  }
  if (funcNames.length > 0) {
    parts.push(`   주요 함수: ${funcNames.slice(0, 8).join(', ')}${funcNames.length > 8 ? '...' : ''}`);
  }

  // Detect patterns
  const patterns: string[] = [];
  if (code.includes('async ') || code.includes('await ')) patterns.push('비동기');
  if (code.includes('Promise')) patterns.push('Promise');
  if (/try\s*\{/.test(code)) patterns.push('에러 처리');
  if (/\bclass\b.*extends\b/.test(code)) patterns.push('상속');
  if (/implements\b/.test(code)) patterns.push('인터페이스 구현');
  if (/useState|useEffect|useRef/.test(code)) patterns.push('React Hooks');
  if (/export default/.test(code)) patterns.push('기본 내보내기');
  if (patterns.length > 0) {
    parts.push(`   패턴: ${patterns.join(', ')}`);
  }

  return parts.join('\n');
}

// IDENTITY_SEAL: PART-2 | role=code-summary | inputs=filePath,code,names | outputs=summary

// ============================================================
// PART 3 — Complexity Metrics
// ============================================================

interface FunctionComplexity {
  name: string;
  startLine: number;
  endLine: number;
  cyclomaticComplexity: number;
  paramCount: number;
  lineCount: number;
  cognitiveComplexity: number;
}

function computeComplexityFromSource(
  code: string,
  funcNames: string[],
): FunctionComplexity[] {
  const results: FunctionComplexity[] = [];
  const lines = code.split('\n');

  // Find each function/method body for complexity analysis
  const funcPattern = /^(\s*)(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/;
  const arrowPattern = /^(\s*)(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*\w+)?\s*=>/;

  for (let i = 0; i < lines.length; i++) {
    const funcMatch = lines[i].match(funcPattern) ?? lines[i].match(arrowPattern);
    if (!funcMatch) continue;

    const name = funcMatch[2];
    const params = funcMatch[3]?.split(',').filter(Boolean).length ?? 0;
    const startLine = i + 1;

    // Find end of function body (brace counting)
    let depth = 0;
    let foundOpen = false;
    let endLine = startLine;
    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') { depth++; foundOpen = true; }
        else if (ch === '}') {
          depth--;
          if (foundOpen && depth === 0) { endLine = j + 1; break; }
        }
      }
      if (foundOpen && depth === 0) break;
    }

    // Extract body
    const body = lines.slice(i, endLine).join('\n');

    // Cyclomatic complexity: count decision points
    const decisions = (body.match(/\bif\b|\belse\s+if\b|\bcase\b|\b\?\s|\b\?\?|\b&&|\b\|\||\bfor\b|\bwhile\b|\bcatch\b/g) ?? []).length;
    const cyclomatic = decisions + 1;

    // Cognitive complexity: nested decisions count more
    let cognitive = 0;
    let nestLevel = 0;
    for (const line of body.split('\n')) {
      if (/\bif\b|\bfor\b|\bwhile\b|\bswitch\b/.test(line)) {
        cognitive += 1 + nestLevel;
        if (/\{/.test(line)) nestLevel++;
      }
      if (/\}/.test(line) && nestLevel > 0) nestLevel--;
      if (/\belse\b/.test(line)) cognitive += 1;
      if (/\b\?\?|\b&&|\b\|\|/.test(line)) cognitive += 1;
    }

    results.push({
      name,
      startLine,
      endLine,
      cyclomaticComplexity: cyclomatic,
      paramCount: params,
      lineCount: endLine - startLine + 1,
      cognitiveComplexity: cognitive,
    });
  }

  return results.sort((a, b) => b.cyclomaticComplexity - a.cyclomaticComplexity);
}

// IDENTITY_SEAL: PART-3 | role=complexity-metrics | inputs=code,funcNames | outputs=FunctionComplexity[]

// ============================================================
// PART 4 — Dependency Graph Visualization
// ============================================================

function buildDependencyTree(code: string, filePath: string): string {
  const importRegex = /^import\s+(?:(?:\{[^}]*\}|[\w*]+)\s+from\s+)?['"]([^'"]+)['"];?/gm;
  const requireRegex = /(?:const|let|var)\s+(?:\{[^}]*\}|[\w]+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/gm;

  const deps: Array<{ module: string; kind: 'local' | 'scoped' | 'external'; names: string[] }> = [];

  // Parse imports
  const importLines = code.match(/^import\s.+$/gm) ?? [];
  for (const line of importLines) {
    const modMatch = line.match(/from\s+['"]([^'"]+)['"]/);
    if (!modMatch) continue;

    const mod = modMatch[1];
    const nameMatch = line.match(/\{\s*([^}]+)\s*\}/);
    const defaultMatch = line.match(/import\s+(\w+)\s+from/);
    const names: string[] = [];
    if (nameMatch) names.push(...nameMatch[1].split(',').map(n => n.trim().split(' as ')[0].trim()).filter(Boolean));
    if (defaultMatch) names.unshift(defaultMatch[1]);

    const kind = mod.startsWith('.') ? 'local' : mod.startsWith('@') ? 'scoped' : 'external';
    deps.push({ module: mod, kind, names });
  }

  // Parse requires
  let m;
  const reqRegex = /(?:const|let|var)\s+(?:\{([^}]*)\}|(\w+))\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = reqRegex.exec(code)) !== null) {
    const names = m[1] ? m[1].split(',').map((n: string) => n.trim()).filter(Boolean) : m[2] ? [m[2]] : [];
    const mod = m[3];
    const kind = mod.startsWith('.') ? 'local' : mod.startsWith('@') ? 'scoped' : 'external';
    if (!deps.some(d => d.module === mod)) {
      deps.push({ module: mod, kind, names });
    }
  }

  if (deps.length === 0) return '';

  // Build tree display
  const fileName = basename(filePath);
  const lines: string[] = [`  🌳 ${fileName}`];

  const localDeps = deps.filter(d => d.kind === 'local');
  const externalDeps = deps.filter(d => d.kind !== 'local');

  if (localDeps.length > 0) {
    lines.push('     ├─ [로컬 의존성]');
    for (let i = 0; i < localDeps.length; i++) {
      const d = localDeps[i];
      const isLast = i === localDeps.length - 1 && externalDeps.length === 0;
      const prefix = isLast ? '└' : '├';
      const nameStr = d.names.length > 0 ? ` { ${d.names.slice(0, 4).join(', ')}${d.names.length > 4 ? '...' : ''} }` : '';
      lines.push(`     │  ${prefix}─ ${d.module}${nameStr}`);
    }
  }

  if (externalDeps.length > 0) {
    lines.push('     └─ [외부 의존성]');
    for (let i = 0; i < externalDeps.length; i++) {
      const d = externalDeps[i];
      const prefix = i === externalDeps.length - 1 ? '└' : '├';
      const nameStr = d.names.length > 0 ? ` { ${d.names.slice(0, 4).join(', ')}${d.names.length > 4 ? '...' : ''} }` : '';
      lines.push(`        ${prefix}─ ${d.module}${nameStr}`);
    }
  }

  return lines.join('\n');
}

// IDENTITY_SEAL: PART-4 | role=dep-graph | inputs=code,filePath | outputs=treeString

// ============================================================
// PART 5 — Explain Runner
// ============================================================

export async function runExplain(path: string): Promise<void> {
  console.log('🦔 CS Quill — 코드 해설\n');

  const stat = statSync(path);
  if (!stat.isFile()) {
    console.log('  ⚠️  파일을 지정하세요.');
    console.log('  예: cs explain ./src/auth.ts');
    return;
  }

  const code = readFileSync(path, 'utf-8');
  const lines = code.split('\n').length;
  console.log(`  📄 ${path} (${lines}줄)\n`);

  // Check for PART/SEAL structure
  const partCount = (code.match(/\/\/ PART \d|IDENTITY_SEAL/g) ?? []).length / 2;
  if (partCount > 0) {
    console.log(`  📐 PART 구조 감지: ${Math.ceil(partCount)}개 PART\n`);
  }

  // AI explanation
  try {
    const { streamChat } = require('../core/ai-bridge');

    process.stdout.write('  ');
    await streamChat({
      systemInstruction: EXPLAIN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Explain this code:\n\n\`\`\`\n${code.slice(0, 8000)}\n\`\`\`` }],
      onChunk: (t: string) => { process.stdout.write(t); },
    });
    console.log('\n');
  } catch {
    console.log('  ⚠️  AI 해설 불가. AST 정적 분석으로 대체:\n');

    // Fallback: ts-morph AST analysis, then ast-engine, then regex last resort
    let astDone = false;
    let collectedFuncNames: string[] = [];
    let collectedClassNames: string[] = [];
    let collectedIfaceNames: string[] = [];
    let collectedExportCount = 0;
    let collectedImportCount = 0;

    // ── Strategy 1: ts-morph (real AST) ──
    try {
      const { Project, SyntaxKind } = require('ts-morph');
      const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true } });
      const ext = path.endsWith('.js') || path.endsWith('.jsx') ? '.tsx' : '.ts';
      const sourceFile = project.createSourceFile(`analysis${ext}`, code);

      const functions = sourceFile.getFunctions();
      const classes = sourceFile.getClasses();
      const interfaces = sourceFile.getInterfaces();
      const typeAliases = sourceFile.getTypeAliases();
      const enums = sourceFile.getEnums();
      const exportedDecls = sourceFile.getExportedDeclarations();
      const imports = sourceFile.getImportDeclarations();
      const arrowFns = sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction);
      const varStmts = sourceFile.getVariableStatements();

      // Exported arrow functions (const foo = () => {})
      const exportedArrows: string[] = [];
      for (const vs of varStmts) {
        if (vs.isExported()) {
          for (const decl of vs.getDeclarations()) {
            const init = decl.getInitializer();
            if (init && init.getKind() === SyntaxKind.ArrowFunction) {
              exportedArrows.push(decl.getName());
            }
          }
        }
      }

      const funcNames = functions.map((f: any) => f.getName() || '<anonymous>');
      const classNames = classes.map((c: any) => c.getName() || '<anonymous>');
      const ifaceNames = interfaces.map((i: any) => i.getName());
      const typeNames = typeAliases.map((t: any) => t.getName());

      collectedFuncNames = [...funcNames, ...exportedArrows];
      collectedClassNames = classNames;
      collectedIfaceNames = ifaceNames;
      collectedExportCount = exportedDecls.size;
      collectedImportCount = imports.length;

      console.log(`  📐 AST 구조 (ts-morph):`);
      console.log(`     Import:     ${imports.length}개`);
      console.log(`     함수:       ${functions.length + arrowFns.length}개 (named: ${funcNames.length}, arrow: ${arrowFns.length})`);
      if (funcNames.length > 0) console.log(`                 ${funcNames.slice(0, 6).join(', ')}${funcNames.length > 6 ? '...' : ''}`);
      console.log(`     클래스:     ${classes.length}개${classNames.length > 0 ? ` (${classNames.join(', ')})` : ''}`);
      console.log(`     인터페이스: ${interfaces.length}개${ifaceNames.length > 0 ? ` (${ifaceNames.join(', ')})` : ''}`);
      if (typeNames.length > 0) console.log(`     타입:       ${typeNames.length}개 (${typeNames.join(', ')})`);
      if (enums.length > 0) console.log(`     Enum:       ${enums.length}개`);
      console.log(`     Export:     ${exportedDecls.size}개`);
      if (exportedArrows.length > 0) console.log(`                 arrow exports: ${exportedArrows.join(', ')}`);
      console.log(`     PART:       ${Math.ceil(partCount)}개`);

      // Dependency graph (tree visualization)
      const depTree = buildDependencyTree(code, path);
      if (depTree) {
        console.log(`\n${depTree}`);
      }

      // Complexity per function (using ts-morph bodies)
      const complexFns: { name: string; complexity: number; cognitive: number; params: number }[] = [];
      for (const fn of functions) {
        const body = fn.getBody()?.getText() ?? '';
        const complexity = (body.match(/\bif\b|\belse\s+if\b|\bcase\b|\b\?\s|\bfor\b|\bwhile\b|\bcatch\b/g) ?? []).length + 1;
        const params = fn.getParameters().length;

        // Cognitive complexity
        let cognitive = 0;
        let nestLevel = 0;
        for (const bl of body.split('\n')) {
          if (/\bif\b|\bfor\b|\bwhile\b|\bswitch\b/.test(bl)) {
            cognitive += 1 + nestLevel;
            if (/\{/.test(bl)) nestLevel++;
          }
          if (/\}/.test(bl) && nestLevel > 0) nestLevel--;
          if (/\belse\b/.test(bl)) cognitive += 1;
        }

        complexFns.push({ name: fn.getName() || '<anon>', complexity, cognitive, params });
      }
      if (complexFns.length > 0) {
        const sorted = complexFns.sort((a, b) => b.complexity - a.complexity).slice(0, 5);
        console.log(`\n  🧠 함수별 복잡도 메트릭:`);
        console.log(`     ${'함수'.padEnd(25)} 순환  인지  매개변수`);
        console.log(`     ${'─'.repeat(25)} ──── ──── ────────`);
        for (const cf of sorted) {
          const icon = cf.complexity > 10 ? '🔴' : cf.complexity > 5 ? '🟡' : '🟢';
          console.log(`     ${icon} ${cf.name.padEnd(23)} ${String(cf.complexity).padStart(4)} ${String(cf.cognitive).padStart(4)} ${String(cf.params).padStart(4)}`);
        }
      }

      // PART structure
      const partMatches = [...code.matchAll(/\/\/\s*PART\s*(\d+)\s*—\s*(.+)/g)];
      if (partMatches.length > 0) {
        console.log(`\n  📋 PART 구조:`);
        for (const pm of partMatches) {
          console.log(`     PART ${pm[1]}: ${pm[2].trim()}`);
        }
      }

      const todos = (code.match(/TODO|FIXME|HACK/g) ?? []).length;
      if (todos > 0) console.log(`\n  ⚠️  TODO/FIXME: ${todos}개`);

      astDone = true;
    } catch { /* ts-morph not available, fall through */ }

    // ── Strategy 2: ast-engine adapter ──
    if (!astDone) {
      try {
        const { analyzeWithTypeScript, analyzeWithTsMorph } = require('../adapters/ast-engine');
        const tsFindings = await analyzeWithTypeScript(code, path);
        const tsMorphFindings = await analyzeWithTsMorph(code, path);

        const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
        const funcs: string[] = [];
        let m;
        while ((m = funcRegex.exec(code)) !== null) funcs.push(m[1] ?? m[2]);

        collectedFuncNames = funcs;
        collectedImportCount = (code.match(/^import /gm) ?? []).length;
        collectedExportCount = (code.match(/^export /gm) ?? []).length;

        console.log(`  📐 구조:`);
        console.log(`     Import: ${collectedImportCount}개`);
        console.log(`     함수: ${funcs.length}개 ${funcs.length > 0 ? `(${funcs.slice(0, 5).join(', ')}${funcs.length > 5 ? '...' : ''})` : ''}`);
        console.log(`     Export: ${collectedExportCount}개`);
        console.log(`     PART: ${Math.ceil(partCount)}개`);

        // Dependency graph
        const depTree = buildDependencyTree(code, path);
        if (depTree) console.log(`\n${depTree}`);

        // Complexity from source code
        const complexities = computeComplexityFromSource(code, funcs);
        if (complexities.length > 0) {
          console.log(`\n  🧠 함수별 복잡도 메트릭:`);
          console.log(`     ${'함수'.padEnd(25)} 순환  인지  매개변수`);
          console.log(`     ${'─'.repeat(25)} ──── ──── ────────`);
          for (const cf of complexities.slice(0, 5)) {
            const icon = cf.cyclomaticComplexity > 10 ? '🔴' : cf.cyclomaticComplexity > 5 ? '🟡' : '🟢';
            console.log(`     ${icon} ${cf.name.padEnd(23)} ${String(cf.cyclomaticComplexity).padStart(4)} ${String(cf.cognitiveComplexity).padStart(4)} ${String(cf.paramCount).padStart(4)}`);
          }
        }

        const allFindings = [...tsFindings, ...tsMorphFindings];
        if (allFindings.length > 0) {
          console.log(`\n  🔬 AST 분석 (${allFindings.length}건):`);
          for (const f of allFindings.slice(0, 8)) {
            const icon = f.severity === 'error' ? '🔴' : '🟡';
            console.log(`     ${icon} :${f.line ?? 0} ${f.message}`);
          }
        }

        const partMatches = [...code.matchAll(/\/\/\s*PART\s*(\d+)\s*—\s*(.+)/g)];
        if (partMatches.length > 0) {
          console.log(`\n  📋 PART 구조:`);
          for (const pm of partMatches) {
            console.log(`     PART ${pm[1]}: ${pm[2].trim()}`);
          }
        }

        const todos = (code.match(/TODO|FIXME|HACK/g) ?? []).length;
        if (todos > 0) console.log(`\n  ⚠️  TODO/FIXME: ${todos}개`);

        astDone = true;
      } catch { /* ast-engine not available */ }
    }

    // ── Strategy 3: regex last resort ──
    if (!astDone) {
      collectedImportCount = (code.match(/^import /gm) ?? []).length;
      const funcMatches = code.match(/function\s+(\w+)/g) ?? [];
      collectedFuncNames = funcMatches.map(m => m.replace('function ', ''));
      collectedExportCount = (code.match(/^export /gm) ?? []).length;

      console.log(`  📦 Import: ${collectedImportCount}개`);
      console.log(`  📝 함수: ${collectedFuncNames.length}개`);
      console.log(`  📤 Export: ${collectedExportCount}개`);

      // Dependency graph even for regex fallback
      const depTree = buildDependencyTree(code, path);
      if (depTree) console.log(`\n${depTree}`);

      // Basic complexity from source
      const complexities = computeComplexityFromSource(code, collectedFuncNames);
      if (complexities.length > 0) {
        console.log(`\n  🧠 복잡도 높은 함수:`);
        for (const cf of complexities.slice(0, 5)) {
          const icon = cf.cyclomaticComplexity > 10 ? '🔴' : cf.cyclomaticComplexity > 5 ? '🟡' : '🟢';
          console.log(`     ${icon} ${cf.name}: 순환복잡도 ~${cf.cyclomaticComplexity}, 인지복잡도 ~${cf.cognitiveComplexity}`);
        }
      }
    }

    // Code summary (always generated regardless of strategy)
    console.log('');
    console.log(generateCodeSummary(
      path, code,
      collectedFuncNames, collectedClassNames, collectedIfaceNames,
      collectedExportCount, collectedImportCount,
    ));
    console.log('');
  }
}

// IDENTITY_SEAL: PART-5 | role=explain-runner | inputs=path | outputs=console
