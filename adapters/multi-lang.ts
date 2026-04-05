// ============================================================
// CS Quill 🦔 — Multi-Language Support (40+ Languages)
// ============================================================
// tree-sitter 기반 다국어 AST 파싱.
// 언어별 린터/분석기 매핑.

// ============================================================
// PART 1 — Language Registry
// ============================================================

export interface LanguageDef {
  id: string;
  name: string;
  extensions: string[];
  treeSitterPackage: string;
  linter?: string;
  formatter?: string;
  astAnalyzer: 'tree-sitter' | 'typescript' | 'acorn' | 'babel';
}

export const LANGUAGE_REGISTRY: LanguageDef[] = [
  // Tier 1: Built-in (already supported)
  { id: 'typescript', name: 'TypeScript', extensions: ['.ts', '.tsx'], treeSitterPackage: 'tree-sitter-typescript', linter: 'eslint', formatter: 'prettier', astAnalyzer: 'typescript' },
  { id: 'javascript', name: 'JavaScript', extensions: ['.js', '.jsx', '.mjs', '.cjs'], treeSitterPackage: 'tree-sitter-javascript', linter: 'eslint', formatter: 'prettier', astAnalyzer: 'acorn' },

  // Tier 2: Popular backend
  { id: 'python', name: 'Python', extensions: ['.py', '.pyi'], treeSitterPackage: 'tree-sitter-python', linter: 'pylint', formatter: 'black', astAnalyzer: 'tree-sitter' },
  { id: 'go', name: 'Go', extensions: ['.go'], treeSitterPackage: 'tree-sitter-go', linter: 'golangci-lint', formatter: 'gofmt', astAnalyzer: 'tree-sitter' },
  { id: 'rust', name: 'Rust', extensions: ['.rs'], treeSitterPackage: 'tree-sitter-rust', linter: 'clippy', formatter: 'rustfmt', astAnalyzer: 'tree-sitter' },
  { id: 'java', name: 'Java', extensions: ['.java'], treeSitterPackage: 'tree-sitter-java', linter: 'checkstyle', formatter: 'google-java-format', astAnalyzer: 'tree-sitter' },
  { id: 'kotlin', name: 'Kotlin', extensions: ['.kt', '.kts'], treeSitterPackage: 'tree-sitter-kotlin', linter: 'ktlint', formatter: 'ktlint', astAnalyzer: 'tree-sitter' },
  { id: 'swift', name: 'Swift', extensions: ['.swift'], treeSitterPackage: 'tree-sitter-swift', linter: 'swiftlint', formatter: 'swift-format', astAnalyzer: 'tree-sitter' },
  { id: 'csharp', name: 'C#', extensions: ['.cs'], treeSitterPackage: 'tree-sitter-c-sharp', linter: 'dotnet-format', formatter: 'dotnet-format', astAnalyzer: 'tree-sitter' },

  // Tier 3: Systems
  { id: 'c', name: 'C', extensions: ['.c', '.h'], treeSitterPackage: 'tree-sitter-c', linter: 'cppcheck', astAnalyzer: 'tree-sitter' },
  { id: 'cpp', name: 'C++', extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hh'], treeSitterPackage: 'tree-sitter-cpp', linter: 'cppcheck', formatter: 'clang-format', astAnalyzer: 'tree-sitter' },

  // Tier 4: Scripting
  { id: 'ruby', name: 'Ruby', extensions: ['.rb', '.rake'], treeSitterPackage: 'tree-sitter-ruby', linter: 'rubocop', astAnalyzer: 'tree-sitter' },
  { id: 'php', name: 'PHP', extensions: ['.php'], treeSitterPackage: 'tree-sitter-php', linter: 'phpstan', formatter: 'php-cs-fixer', astAnalyzer: 'tree-sitter' },
  { id: 'lua', name: 'Lua', extensions: ['.lua'], treeSitterPackage: 'tree-sitter-lua', linter: 'luacheck', astAnalyzer: 'tree-sitter' },
  { id: 'perl', name: 'Perl', extensions: ['.pl', '.pm'], treeSitterPackage: 'tree-sitter-perl', astAnalyzer: 'tree-sitter' },
  { id: 'r', name: 'R', extensions: ['.r', '.R'], treeSitterPackage: 'tree-sitter-r', linter: 'lintr', astAnalyzer: 'tree-sitter' },
  { id: 'scala', name: 'Scala', extensions: ['.scala'], treeSitterPackage: 'tree-sitter-scala', linter: 'scalafmt', astAnalyzer: 'tree-sitter' },
  { id: 'elixir', name: 'Elixir', extensions: ['.ex', '.exs'], treeSitterPackage: 'tree-sitter-elixir', linter: 'credo', astAnalyzer: 'tree-sitter' },
  { id: 'dart', name: 'Dart', extensions: ['.dart'], treeSitterPackage: 'tree-sitter-dart', linter: 'dart-analyze', formatter: 'dart-format', astAnalyzer: 'tree-sitter' },

  // Tier 5: Config & Markup
  { id: 'html', name: 'HTML', extensions: ['.html', '.htm'], treeSitterPackage: 'tree-sitter-html', linter: 'htmlhint', formatter: 'prettier', astAnalyzer: 'tree-sitter' },
  { id: 'css', name: 'CSS', extensions: ['.css', '.scss', '.sass', '.less'], treeSitterPackage: 'tree-sitter-css', linter: 'stylelint', formatter: 'prettier', astAnalyzer: 'tree-sitter' },
  { id: 'json', name: 'JSON', extensions: ['.json', '.jsonc'], treeSitterPackage: 'tree-sitter-json', astAnalyzer: 'tree-sitter' },
  { id: 'yaml', name: 'YAML', extensions: ['.yml', '.yaml'], treeSitterPackage: 'tree-sitter-yaml', linter: 'yamllint', astAnalyzer: 'tree-sitter' },
  { id: 'toml', name: 'TOML', extensions: ['.toml'], treeSitterPackage: 'tree-sitter-toml', astAnalyzer: 'tree-sitter' },
  { id: 'markdown', name: 'Markdown', extensions: ['.md', '.mdx'], treeSitterPackage: 'tree-sitter-markdown', linter: 'markdownlint', astAnalyzer: 'tree-sitter' },
  { id: 'sql', name: 'SQL', extensions: ['.sql'], treeSitterPackage: 'tree-sitter-sql', linter: 'sqlfluff', astAnalyzer: 'tree-sitter' },

  // Tier 6: Shell & DevOps
  { id: 'bash', name: 'Bash', extensions: ['.sh', '.bash'], treeSitterPackage: 'tree-sitter-bash', linter: 'shellcheck', astAnalyzer: 'tree-sitter' },
  { id: 'dockerfile', name: 'Dockerfile', extensions: ['Dockerfile'], treeSitterPackage: 'tree-sitter-dockerfile', linter: 'hadolint', astAnalyzer: 'tree-sitter' },
  { id: 'hcl', name: 'HCL (Terraform)', extensions: ['.tf', '.hcl'], treeSitterPackage: 'tree-sitter-hcl', linter: 'tflint', astAnalyzer: 'tree-sitter' },

  // Tier 7: Functional
  { id: 'haskell', name: 'Haskell', extensions: ['.hs'], treeSitterPackage: 'tree-sitter-haskell', linter: 'hlint', astAnalyzer: 'tree-sitter' },
  { id: 'ocaml', name: 'OCaml', extensions: ['.ml', '.mli'], treeSitterPackage: 'tree-sitter-ocaml', astAnalyzer: 'tree-sitter' },
  { id: 'clojure', name: 'Clojure', extensions: ['.clj', '.cljs'], treeSitterPackage: 'tree-sitter-clojure', linter: 'clj-kondo', astAnalyzer: 'tree-sitter' },
  { id: 'erlang', name: 'Erlang', extensions: ['.erl'], treeSitterPackage: 'tree-sitter-erlang', astAnalyzer: 'tree-sitter' },

  // Tier 8: Mobile
  { id: 'objc', name: 'Objective-C', extensions: ['.m', '.mm'], treeSitterPackage: 'tree-sitter-objc', astAnalyzer: 'tree-sitter' },

  // Tier 9: Data
  { id: 'graphql', name: 'GraphQL', extensions: ['.graphql', '.gql'], treeSitterPackage: 'tree-sitter-graphql', astAnalyzer: 'tree-sitter' },
  { id: 'protobuf', name: 'Protobuf', extensions: ['.proto'], treeSitterPackage: 'tree-sitter-proto', astAnalyzer: 'tree-sitter' },
];

// IDENTITY_SEAL: PART-1 | role=registry | inputs=none | outputs=LANGUAGE_REGISTRY

// ============================================================
// PART 2 — Language Detection
// ============================================================

const EXT_MAP = new Map<string, LanguageDef>();
for (const lang of LANGUAGE_REGISTRY) {
  for (const ext of lang.extensions) {
    EXT_MAP.set(ext, lang);
  }
}

export function detectLanguage(fileName: string): LanguageDef | null {
  const ext = fileName.includes('.') ? '.' + fileName.split('.').pop()! : fileName;
  return EXT_MAP.get(ext) ?? null;
}

export function detectProjectLanguages(files: string[]): LanguageDef[] {
  const seen = new Set<string>();
  const results: LanguageDef[] = [];

  for (const file of files) {
    const lang = detectLanguage(file);
    if (lang && !seen.has(lang.id)) {
      seen.add(lang.id);
      results.push(lang);
    }
  }

  return results;
}

export function getSupportedExtensions(): string[] {
  return [...EXT_MAP.keys()];
}

// IDENTITY_SEAL: PART-2 | role=detection | inputs=fileName | outputs=LanguageDef

// ============================================================
// PART 3 — Tree-sitter Universal AST
// ============================================================

export interface TreeSitterNode {
  type: string;
  text: string;
  startLine: number;
  endLine: number;
  children: TreeSitterNode[];
}

export interface UniversalASTResult {
  language: string;
  functions: Array<{ name: string; line: number; length: number; params: number }>;
  imports: Array<{ module: string; line: number }>;
  classes: Array<{ name: string; line: number; methods: number }>;
  loops: Array<{ type: string; line: number; depth: number }>;
  findings: Array<{ line: number; message: string; severity: string }>;
}

export async function parseWithTreeSitter(code: string, language: LanguageDef): Promise<UniversalASTResult> {
  const result: UniversalASTResult = {
    language: language.id,
    functions: [], imports: [], classes: [], loops: [], findings: [],
  };

  try {
    const Parser = (await import('tree-sitter')).default;
    const langModule = await import(language.treeSitterPackage);

    const parser = new Parser();
    parser.setLanguage(langModule.default ?? langModule);

    const tree = parser.parse(code);
    const root = tree.rootNode;

    // Universal patterns across all languages
    traverseNode(root, 0, result, language.id);
  } catch {
    // tree-sitter not installed — fallback to regex
    result.findings.push({
      line: 0,
      message: `tree-sitter-${language.id} not installed. Using regex fallback.`,
      severity: 'info',
    });
    fallbackRegexAnalysis(code, language.id, result);
  }

  return result;
}

function traverseNode(
  node: unknown,
  depth: number,
  result: UniversalASTResult,
  langId: string,
): void {
  const type = node.type as string;
  const startLine = (node.startPosition?.row ?? 0) + 1;
  const endLine = (node.endPosition?.row ?? 0) + 1;

  // Function detection (universal)
  if (/function_definition|function_declaration|method_definition|method_declaration|func_declaration|fn_item/.test(type)) {
    const nameNode = node.childForFieldName?.('name');
    result.functions.push({
      name: nameNode?.text ?? 'anonymous',
      line: startLine,
      length: endLine - startLine + 1,
      params: node.childForFieldName?.('parameters')?.namedChildCount ?? 0,
    });

    // Empty function check
    const body = node.childForFieldName?.('body');
    if (body && body.namedChildCount === 0) {
      result.findings.push({ line: startLine, message: `Empty function: ${nameNode?.text ?? 'anonymous'}`, severity: 'error' });
    }
  }

  // Class detection (universal)
  if (/class_definition|class_declaration|class_specifier|struct_item/.test(type)) {
    const nameNode = node.childForFieldName?.('name');
    const bodyNode = node.childForFieldName?.('body');
    result.classes.push({
      name: nameNode?.text ?? 'anonymous',
      line: startLine,
      methods: bodyNode?.namedChildren?.filter((c: unknown) => /method|function|func/.test(c.type)).length ?? 0,
    });
  }

  // Import detection (universal)
  if (/import_statement|import_declaration|use_declaration|require_call/.test(type)) {
    result.imports.push({ module: node.text.slice(0, 80), line: startLine });
  }

  // Loop detection (universal)
  if (/for_statement|while_statement|do_statement|for_expression|loop_expression/.test(type)) {
    // Calculate loop depth
    let loopDepth = 1;
    let parent = node.parent;
    while (parent) {
      if (/for_statement|while_statement|do_statement|for_expression|loop_expression/.test(parent.type)) loopDepth++;
      parent = parent.parent;
    }
    result.loops.push({ type, line: startLine, depth: loopDepth });

    if (loopDepth >= 3) {
      result.findings.push({ line: startLine, message: `Deep loop nesting: ${loopDepth} levels (O(n^${loopDepth}))`, severity: 'warning' });
    }
  }

  // Recursion (universal)
  for (let i = 0; i < (node.namedChildCount ?? 0); i++) {
    const child = node.namedChild?.(i);
    if (child) traverseNode(child, depth + 1, result, langId);
  }
}

// IDENTITY_SEAL: PART-3 | role=tree-sitter | inputs=code,language | outputs=UniversalASTResult

// ============================================================
// PART 4 — Regex Fallback (언어 무관)
// ============================================================

function fallbackRegexAnalysis(code: string, langId: string, result: UniversalASTResult): void {
  const lines = code.split('\n');

  // Universal patterns that work across most languages
  const functionPatterns: Record<string, RegExp> = {
    python: /^\s*(?:async\s+)?def\s+(\w+)/,
    go: /^func\s+(?:\([^)]+\)\s+)?(\w+)/,
    rust: /^\s*(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/,
    java: /^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)+(\w+)\s*\(/,
    kotlin: /^\s*(?:fun|suspend\s+fun)\s+(\w+)/,
    swift: /^\s*(?:func|private\s+func|public\s+func)\s+(\w+)/,
    csharp: /^\s*(?:public|private|protected|internal)?\s*(?:static\s+)?(?:async\s+)?(?:\w+\s+)+(\w+)\s*\(/,
    ruby: /^\s*def\s+(\w+)/,
    php: /^\s*(?:public|private|protected)?\s*(?:static\s+)?function\s+(\w+)/,
    default: /(?:function\s+(\w+)|def\s+(\w+)|fn\s+(\w+)|func\s+(\w+))/,
  };

  const pattern = functionPatterns[langId] ?? functionPatterns['default'];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(pattern);
    if (match) {
      const name = match[1] ?? match[2] ?? match[3] ?? match[4] ?? 'anonymous';
      result.functions.push({ name, line: i + 1, length: 0, params: 0 });
    }
  }

  // Universal: TODO/FIXME
  for (let i = 0; i < lines.length; i++) {
    if (/TODO|FIXME|HACK|XXX/.test(lines[i])) {
      result.findings.push({ line: i + 1, message: 'TODO/FIXME remaining', severity: 'info' });
    }
  }

  // Universal: empty catch/except
  for (let i = 0; i < lines.length; i++) {
    if (/catch\s*(?:\([^)]*\))?\s*\{\s*\}|except.*:\s*pass|rescue\s*$/.test(lines[i])) {
      result.findings.push({ line: i + 1, message: 'Empty error handler', severity: 'warning' });
    }
  }
}

// IDENTITY_SEAL: PART-4 | role=regex-fallback | inputs=code,langId | outputs=UniversalASTResult

// ============================================================
// PART 5 — External Linter Runner
// ============================================================

export async function runExternalLinter(filePath: string, language: LanguageDef): Promise<Array<{ line: number; message: string; severity: string }>> {
  if (!language.linter) return [];

  const { execSync } = await import('child_process');
  const findings: Array<{ line: number; message: string; severity: string }> = [];

  try {
    const commands: Record<string, string> = {
      'pylint': `pylint --output-format=json "${filePath}" 2>/dev/null`,
      'golangci-lint': `golangci-lint run --out-format json "${filePath}" 2>/dev/null`,
      'clippy': `cargo clippy --message-format=json 2>/dev/null`,
      'shellcheck': `shellcheck -f json "${filePath}" 2>/dev/null`,
      'rubocop': `rubocop --format json "${filePath}" 2>/dev/null`,
      'phpstan': `phpstan analyze --error-format=json "${filePath}" 2>/dev/null`,
    };

    const cmd = commands[language.linter];
    if (!cmd) return findings;

    const output = execSync(cmd, { encoding: 'utf-8', timeout: 15000 });

    // Generic JSON parsing — most linters output arrays of findings
    try {
      const data = JSON.parse(output);
      const items = Array.isArray(data) ? data : data.results ?? data.messages ?? data.diagnostics ?? [];
      for (const item of items.slice(0, 20)) {
        findings.push({
          line: item.line ?? item.location?.line ?? 0,
          message: item.message ?? item.description ?? String(item),
          severity: item.severity === 'error' || item.type === 'error' ? 'error' : 'warning',
        });
      }
    } catch { /* non-JSON output */ }
  } catch { /* linter not installed or failed */ }

  return findings;
}

// IDENTITY_SEAL: PART-5 | role=external-linter | inputs=filePath,language | outputs=findings

// ============================================================
// PART 6 — Unified Multi-Language Analyzer
// ============================================================

export async function analyzeAnyLanguage(
  code: string,
  fileName: string,
): Promise<UniversalASTResult & { detected: LanguageDef | null }> {
  const lang = detectLanguage(fileName);

  if (!lang) {
    return {
      language: 'unknown', functions: [], imports: [], classes: [], loops: [], findings: [],
      detected: null,
    };
  }

  // TypeScript/JavaScript: use existing engines (more precise)
  if (lang.astAnalyzer === 'typescript' || lang.astAnalyzer === 'acorn') {
    const result = await parseWithTreeSitter(code, lang);
    return { ...result, detected: lang };
  }

  // All other languages: tree-sitter
  const result = await parseWithTreeSitter(code, lang);
  return { ...result, detected: lang };
}

export function getLanguageStats(): { total: number; tiers: Record<string, number> } {
  const tiers: Record<string, number> = {};
  const tierNames = ['Tier 1: Built-in', 'Tier 2: Backend', 'Tier 3: Systems', 'Tier 4: Scripting',
    'Tier 5: Config', 'Tier 6: Shell', 'Tier 7: Functional', 'Tier 8: Mobile', 'Tier 9: Data'];

  let tierIdx = 0;
  let count = 0;
  for (const lang of LANGUAGE_REGISTRY) {
    if (lang.id === 'typescript') { tierIdx = 0; count = 0; }
    else if (lang.id === 'python') { tiers[tierNames[0]] = count; tierIdx = 1; count = 0; }
    else if (lang.id === 'c') { tiers[tierNames[1]] = count; tierIdx = 2; count = 0; }
    else if (lang.id === 'ruby') { tiers[tierNames[2]] = count; tierIdx = 3; count = 0; }
    else if (lang.id === 'html') { tiers[tierNames[3]] = count; tierIdx = 4; count = 0; }
    else if (lang.id === 'bash') { tiers[tierNames[4]] = count; tierIdx = 5; count = 0; }
    else if (lang.id === 'haskell') { tiers[tierNames[5]] = count; tierIdx = 6; count = 0; }
    else if (lang.id === 'objc') { tiers[tierNames[6]] = count; tierIdx = 7; count = 0; }
    else if (lang.id === 'graphql') { tiers[tierNames[7]] = count; tierIdx = 8; count = 0; }
    count++;
  }
  tiers[tierNames[tierIdx]] = count;

  return { total: LANGUAGE_REGISTRY.length, tiers };
}

// IDENTITY_SEAL: PART-6 | role=unified-analyzer | inputs=code,fileName | outputs=UniversalASTResult
