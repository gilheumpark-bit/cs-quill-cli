import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const res008Detector: RuleDetector = {
  ruleId: 'RES-008',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();
    const hasWeakRef = fullText.includes('WeakRef') || fullText.includes('WeakMap') || fullText.includes('WeakSet');

    // Detect module-level variables holding potentially large objects
    for (const varStmt of sourceFile.getVariableStatements()) {
      for (const decl of varStmt.getDeclarations()) {
        const init = decl.getInitializer();
        if (!init) continue;
        const text = init.getText();
        const name = decl.getName();
        const isModuleLevel = varStmt.getParent() === sourceFile;

        if (isModuleLevel && !hasWeakRef) {
          // Large array literals or Map/Set holding object references
          if (/new\s+Map\s*\(/.test(text) || /new\s+Set\s*\(/.test(text)) {
            // Check if the values stored are likely objects (not primitives)
            if (fullText.includes(`${name}.set(`) && !fullText.includes(`${name}.delete(`)) {
              findings.push({
                line: varStmt.getStartLineNumber(),
                message: `'${name}'이 대형 객체 참조를 전역에서 보관하고 있지만 WeakRef/WeakMap을 사용하지 않습니다. GC 대상에서 제외될 수 있습니다.`,
              });
            }
          }
        }
      }
    }

    return findings;
  }
};
