// @ts-nocheck
// ============================================================
// CS Quill 🦔 — cs explain command
// ============================================================
// 기존 코드를 PART별로 분석 + 쉬운 해설.

import { readFileSync, statSync } from 'fs';

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
   - 💡 Key insight or gotcha
4. End with overall assessment (complexity, quality, potential issues).

Adapt language to the user's detected language (Korean if code has Korean comments, else English).
Keep explanations SHORT. No walls of text.`;

// IDENTITY_SEAL: PART-1 | role=explain-prompt | inputs=none | outputs=EXPLAIN_SYSTEM_PROMPT

// ============================================================
// PART 2 — Explain Runner
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

      // Dependency graph summary from imports
      const depMap = new Map<string, string[]>();
      for (const imp of imports) {
        const moduleSpec = imp.getModuleSpecifierValue();
        const namedImports = imp.getNamedImports().map((n: any) => n.getName());
        const defaultImport = imp.getDefaultImport()?.getText();
        const names = [...namedImports];
        if (defaultImport) names.unshift(defaultImport);
        depMap.set(moduleSpec, names);
      }
      if (depMap.size > 0) {
        console.log(`\n  🔗 의존성 그래프:`);
        for (const [mod, names] of depMap) {
          const label = names.length > 0 ? ` → { ${names.slice(0, 5).join(', ')}${names.length > 5 ? '...' : ''} }` : '';
          const kind = mod.startsWith('.') ? '로컬' : mod.startsWith('@') ? '스코프' : '외부';
          console.log(`     [${kind}] ${mod}${label}`);
        }
      }

      // Complexity per function
      const complexFns: { name: string; complexity: number }[] = [];
      for (const fn of functions) {
        const body = fn.getBody()?.getText() ?? '';
        const complexity = (body.match(/\bif\b|\belse\b|\bcase\b|\b\?\s/g) ?? []).length + 1;
        if (complexity > 3) complexFns.push({ name: fn.getName() || '<anon>', complexity });
      }
      if (complexFns.length > 0) {
        console.log(`\n  🧠 복잡도 높은 함수:`);
        for (const cf of complexFns.sort((a, b) => b.complexity - a.complexity).slice(0, 5)) {
          const icon = cf.complexity > 10 ? '🔴' : cf.complexity > 5 ? '🟡' : '🟢';
          console.log(`     ${icon} ${cf.name}: 순환복잡도 ~${cf.complexity}`);
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
      console.log('');
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

        console.log(`  📐 구조:`);
        console.log(`     Import: ${(code.match(/^import /gm) ?? []).length}개`);
        console.log(`     함수: ${funcs.length}개 ${funcs.length > 0 ? `(${funcs.slice(0, 5).join(', ')}${funcs.length > 5 ? '...' : ''})` : ''}`);
        console.log(`     Export: ${(code.match(/^export /gm) ?? []).length}개`);
        console.log(`     PART: ${Math.ceil(partCount)}개`);

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
        console.log('');
        astDone = true;
      } catch { /* ast-engine not available */ }
    }

    // ── Strategy 3: regex last resort ──
    if (!astDone) {
      console.log(`  📦 Import: ${(code.match(/^import /gm) ?? []).length}개`);
      console.log(`  📝 함수: ${(code.match(/function\s+\w+/g) ?? []).length}개`);
      console.log(`  📤 Export: ${(code.match(/^export /gm) ?? []).length}개`);
      console.log('');
    }
  }
}

// IDENTITY_SEAL: PART-2 | role=explain-runner | inputs=path | outputs=console
