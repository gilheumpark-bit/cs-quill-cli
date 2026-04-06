import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CFG-007: 순환 의존성 (Circular dependency)
 * Detects potential circular import patterns within a single file:
 * - A file that imports from module X and also exports something imported by X
 * - Re-export barrels that import and re-export everything (index.ts patterns)
 * Also flags self-imports.
 */
export const cfg007Detector: RuleDetector = {
  ruleId: 'CFG-007',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const filePath = sourceFile.getFilePath();
    const fileName = filePath.split('/').pop()?.replace(/\.\w+$/, '') ?? '';

    // Detect self-imports
    sourceFile.getImportDeclarations().forEach(imp => {
      const moduleSpec = imp.getModuleSpecifierValue();
      // Self-import detection
      if (moduleSpec === `./${fileName}` || moduleSpec === `../${fileName}` || moduleSpec === `.`) {
        findings.push({
          line: imp.getStartLineNumber(),
          message: `순환 의존성: 자기 자신을 import — '${moduleSpec}'`,
        });
      }
    });

    // Detect barrel file anti-pattern: index.ts that imports and re-exports everything
    if (fileName === 'index') {
      const imports = sourceFile.getImportDeclarations();
      const exports = sourceFile.getExportDeclarations();
      // All imports are relative and all exports re-export from same modules
      const importModules = new Set(imports.map(i => i.getModuleSpecifierValue()));
      const exportModules = new Set(exports.filter(e => e.getModuleSpecifierValue()).map(e => e.getModuleSpecifierValue()!));

      // If the file re-exports from the same modules it imports
      const overlap = [...importModules].filter(m => exportModules.has(m));
      if (overlap.length > 3) {
        findings.push({
          line: 1,
          message: `순환 의존성 위험: barrel index 파일이 ${overlap.length}개 모듈을 import & re-export — 순환 참조 발생 가능`,
        });
      }
    }

    // Detect mutual import patterns: importing from a parent directory that likely imports this file
    sourceFile.getImportDeclarations().forEach(imp => {
      const moduleSpec = imp.getModuleSpecifierValue();
      if (moduleSpec === '..' || moduleSpec === '../index') {
        findings.push({
          line: imp.getStartLineNumber(),
          message: `순환 의존성 위험: 상위 디렉토리 index를 import — 순환 참조 가능성 확인 필요`,
        });
      }
    });

    return findings;
  }
};
