import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CFG-009: peerDependencies 미선언 (Undeclared peerDependencies)
 * Detects packages imported via require/import that are commonly expected
 * as peerDependencies in library code but may not be declared.
 * Flags patterns in library-like source files.
 */
export const cfg009Detector: RuleDetector = {
  ruleId: 'CFG-009',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const filePath = sourceFile.getFilePath();

    // Common frameworks that should be peerDeps if used in a library
    const peerCandidates = ['react', 'react-dom', 'vue', 'angular', '@angular/core',
      'svelte', 'next', 'express', 'koa', 'fastify'];

    // Heuristic: check if this looks like library code (has export declarations)
    const hasExports = sourceFile.getExportDeclarations().length > 0 ||
                       sourceFile.getExportedDeclarations().size > 0;

    // Also check if file is in an src/ or lib/ directory
    const isLibLike = filePath.includes('/src/') || filePath.includes('/lib/') ||
                      filePath.includes('\\src\\') || filePath.includes('\\lib\\');

    if (!hasExports && !isLibLike) return findings;

    // Check for framework imports that should be peer deps
    sourceFile.getImportDeclarations().forEach(imp => {
      const moduleSpec = imp.getModuleSpecifierValue();
      if (peerCandidates.includes(moduleSpec)) {
        findings.push({
          line: imp.getStartLineNumber(),
          message: `peerDependencies 미선언 의심: '${moduleSpec}'은(는) 라이브러리에서 peerDependency로 선언해야 할 수 있음`,
        });
      }
    });

    return findings;
  }
};
