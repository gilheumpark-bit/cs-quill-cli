// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Data Flow Analysis (Level 3-4)
// ============================================================
// Level 3: 값 추적 (어디서 왔는지, null 가능한지)
// Level 4: 크로스파일 추적 (함수 리턴 타입 → 호출 측 null 체크)

// ============================================================
// PART 1 — Types
// ============================================================

export interface FlowNode {
  file: string;
  line: number;
  variable: string;
  type: 'declaration' | 'assignment' | 'access' | 'guard' | 'return';
  nullable: boolean;
  guarded: boolean;
  source?: string;
}

export interface FlowChain {
  variable: string;
  nodes: FlowNode[];
  safe: boolean;
  vulnerability?: string;
}

export interface DataFlowResult {
  chains: FlowChain[];
  findings: Array<{
    file: string;
    line: number;
    message: string;
    severity: 'error' | 'warning';
    chain: string;
  }>;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=FlowNode,FlowChain,DataFlowResult

// ============================================================
// PART 2 — Null Flow Tracker (Single File)
// ============================================================

export async function trackNullFlow(code: string, fileName: string): Promise<DataFlowResult> {
  const chains: FlowChain[] = [];
  const findings: DataFlowResult['findings'] = [];

  try {
    const { Project, SyntaxKind } = require('ts-morph');
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(fileName, code);

    // Find all variable declarations that could be null
    for (const decl of sourceFile.getVariableDeclarations()) {
      const name = decl.getName();
      const initializer = decl.getInitializer();
      if (!initializer) continue;

      const initText = initializer.getText();
      const nodes: FlowNode[] = [];

      // Check if initializer is potentially nullable
      const isNullableSource =
        /await\s/.test(initText) ||
        /\.find\(|\.querySelector|getElementById|\.get\(/.test(initText) ||
        /null|undefined/.test(initText) ||
        /\bas\s+\w+\s*\|\s*null/.test(initText);

      if (!isNullableSource) continue;

      nodes.push({
        file: fileName,
        line: decl.getStartLineNumber(),
        variable: name,
        type: 'declaration',
        nullable: true,
        guarded: false,
        source: initText.slice(0, 60),
      });

      // Track usage of this variable in subsequent lines
      const refs = decl.findReferencesAsNodes();
      let guarded = false;

      for (const ref of refs) {
        const refLine = ref.getStartLineNumber();
        if (refLine <= decl.getStartLineNumber()) continue;

        // Check if this is a guard (if (!x) return, if (x == null), x?.prop)
        const parent = ref.getParent();
        const grandParent = parent?.getParent();

        // Guard: if (!name) or if (name === null) or if (name == null)
        if (grandParent?.getKind() === SyntaxKind.IfStatement) {
          const condition = grandParent.asKind(SyntaxKind.IfStatement)?.getExpression()?.getText() ?? '';
          if (
            condition.includes(`!${name}`) ||
            condition.includes(`${name} === null`) ||
            condition.includes(`${name} == null`) ||
            condition.includes(`${name} === undefined`) ||
            condition.includes(`${name} == undefined`)
          ) {
            guarded = true;
            nodes.push({
              file: fileName, line: refLine, variable: name,
              type: 'guard', nullable: true, guarded: true,
            });
            continue;
          }
        }

        // Guard: name?.property (optional chaining)
        if (parent?.getKind() === SyntaxKind.PropertyAccessExpression) {
          const parentText = parent.getText();
          if (parentText.includes('?.')) {
            nodes.push({
              file: fileName, line: refLine, variable: name,
              type: 'access', nullable: true, guarded: true,
            });
            continue;
          }
        }

        // Unguarded property access: name.property
        if (parent?.getKind() === SyntaxKind.PropertyAccessExpression && !guarded) {
          const parentText = parent.getText();
          if (parentText.startsWith(name + '.') && !parentText.includes('?.')) {
            nodes.push({
              file: fileName, line: refLine, variable: name,
              type: 'access', nullable: true, guarded: false,
            });

            findings.push({
              file: fileName, line: refLine,
              message: `Null dereference: '${name}' from ${initText.slice(0, 30)} is nullable but accessed without guard at line ${refLine}`,
              severity: 'error',
              chain: `${name}: line ${decl.getStartLineNumber()} → ${refLine}`,
            });
          }
        }
      }

      chains.push({
        variable: name,
        nodes,
        safe: findings.filter(f => f.chain.startsWith(name)).length === 0,
      });
    }
  } catch { /* ts-morph not available */ }

  return { chains, findings };
}

// IDENTITY_SEAL: PART-2 | role=null-flow | inputs=code,fileName | outputs=DataFlowResult

// ============================================================
// PART 3 — Cross-File Flow (Level 4)
// ============================================================

export async function trackCrossFileFlow(rootPath: string): Promise<DataFlowResult> {
  const findings: DataFlowResult['findings'] = [];
  const chains: FlowChain[] = [];

  try {
    const { Project, SyntaxKind } = require('ts-morph');
    const { readdirSync } = require('fs');
    const { join } = require('path');

    const project = new Project({
      tsConfigFilePath: join(rootPath, 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add source files
    const IGNORE = new Set(['node_modules', '.next', '.git', 'dist', '.cs']);
    function addFiles(dir: string): void {
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name.startsWith('.') || IGNORE.has(e.name)) continue;
          const full = join(dir, e.name);
          if (e.isDirectory()) { addFiles(full); continue; }
          if (/\.(ts|tsx)$/.test(e.name)) {
            try { project.addSourceFileAtPath(full); } catch { /* skip */ }
          }
        }
      } catch { /* skip */ }
    }
    addFiles(join(rootPath, 'src'));

    // Find exported functions that return nullable types
    for (const sourceFile of project.getSourceFiles().slice(0, 30)) {
      for (const fn of sourceFile.getFunctions()) {
        if (!fn.isExported()) continue;

        const name = fn.getName();
        if (!name) continue;

        // Check return type for null/undefined
        const returnType = fn.getReturnType();
        const typeText = returnType.getText();
        const isNullable = typeText.includes('null') || typeText.includes('undefined') || typeText.includes('| null');

        if (!isNullable) continue;

        // Find all callers of this function across files
        const refs = fn.findReferencesAsNodes();
        for (const ref of refs) {
          const refFile = ref.getSourceFile();
          if (refFile === sourceFile) continue; // Skip same-file refs

          const refLine = ref.getStartLineNumber();
          const parent = ref.getParent();

          // Check if caller handles null
          if (parent?.getKind() === SyntaxKind.CallExpression) {
            const grandParent = parent.getParent();

            // Check: const x = fn() — is x later null-checked?
            if (grandParent?.getKind() === SyntaxKind.VariableDeclaration) {
              const varName = grandParent.asKind(SyntaxKind.VariableDeclaration)?.getName();
              if (!varName) continue;

              // Search subsequent lines for null guard
              const refFileText = refFile.getFullText();
              const linesAfter = refFileText.split('\n').slice(refLine);
              const hasGuard = linesAfter.slice(0, 10).some(l =>
                l.includes(`!${varName}`) || l.includes(`${varName} == null`) ||
                l.includes(`${varName} === null`) || l.includes(`${varName}?.`) ||
                l.includes(`${varName} === undefined`),
              );

              if (!hasGuard) {
                // Check if there's a property access without guard
                const hasUnsafeAccess = linesAfter.slice(0, 10).some(l =>
                  new RegExp(`\\b${varName}\\.(?!\\?)\\w`).test(l),
                );

                if (hasUnsafeAccess) {
                  findings.push({
                    file: refFile.getFilePath(),
                    line: refLine,
                    message: `Cross-file null risk: ${name}() returns ${typeText} but caller doesn't null-check before access`,
                    severity: 'error',
                    chain: `${sourceFile.getBaseName()}:${name}() → ${refFile.getBaseName()}:${refLine}`,
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch { /* ts-morph/tsconfig not available */ }

  return { chains, findings };
}

// IDENTITY_SEAL: PART-3 | role=cross-file-flow | inputs=rootPath | outputs=DataFlowResult

// ============================================================
// PART 4 — Taint Analysis (입력 → 출력 추적)
// ============================================================

export async function trackTaintFlow(code: string, fileName: string): Promise<DataFlowResult> {
  const findings: DataFlowResult['findings'] = [];
  const chains: FlowChain[] = [];

  try {
    const { Project, SyntaxKind } = require('ts-morph');
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(fileName, code);

    // Find taint sources: req.body, req.params, req.query, user input
    const taintSources = new Set<string>();

    sourceFile.forEachDescendant(node => {
      const text = node.getText();
      if (/req\.body|req\.params|req\.query|req\.headers|process\.env|location\.search|document\.cookie|innerHTML|localStorage\.getItem/.test(text)) {
        // Find variable this is assigned to
        const parent = node.getParent();
        if (parent?.getKind() === SyntaxKind.VariableDeclaration) {
          const varDecl = parent.asKind(SyntaxKind.VariableDeclaration);
          if (varDecl) taintSources.add(varDecl.getName());
        }
      }
    });

    // Track tainted variables to dangerous sinks
    const dangerousSinks = /eval\(|innerHTML|dangerouslySetInnerHTML|exec\(|\.query\(|\.raw\(|document\.write/;

    for (const tainted of taintSources) {
      sourceFile.forEachDescendant(node => {
        const text = node.getText();
        if (text.includes(tainted) && dangerousSinks.test(text)) {
          findings.push({
            file: fileName,
            line: node.getStartLineNumber(),
            message: `Taint flow: user input '${tainted}' reaches dangerous sink: ${text.slice(0, 50)}`,
            severity: 'error',
            chain: `taint: ${tainted} → ${text.slice(0, 30)}`,
          });
        }
      });
    }
  } catch { /* ts-morph not available */ }

  return { chains, findings };
}

// IDENTITY_SEAL: PART-4 | role=taint-analysis | inputs=code,fileName | outputs=DataFlowResult

// ============================================================
// PART 5 — Unified Data Flow Runner
// ============================================================

export async function runFullDataFlowAnalysis(
  code: string,
  fileName: string,
  rootPath: string,
): Promise<{
  nullFlow: DataFlowResult;
  crossFile: DataFlowResult;
  taint: DataFlowResult;
  totalFindings: number;
  score: number;
}> {
  const nullFlow = await trackNullFlow(code, fileName);
  const taint = await trackTaintFlow(code, fileName);

  let crossFile: DataFlowResult = { chains: [], findings: [] };
  try {
    crossFile = await trackCrossFileFlow(rootPath);
  } catch { /* skip */ }

  const totalFindings = nullFlow.findings.length + crossFile.findings.length + taint.findings.length;
  const errorCount = [...nullFlow.findings, ...crossFile.findings, ...taint.findings].filter(f => f.severity === 'error').length;
  const score = Math.max(0, 100 - errorCount * 15);

  return { nullFlow, crossFile, taint, totalFindings, score };
}

// IDENTITY_SEAL: PART-5 | role=unified-flow | inputs=code,fileName,rootPath | outputs=all-flows
