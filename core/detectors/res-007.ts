import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const res007Detector: RuleDetector = {
  ruleId: 'RES-007',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    // Detect module-level Map/Object used as cache without size limit
    for (const varStmt of sourceFile.getVariableStatements()) {
      for (const decl of varStmt.getDeclarations()) {
        const init = decl.getInitializer();
        if (!init) continue;
        const text = init.getText();
        const name = decl.getName();

        // Detect: const cache = new Map() or {} at module level
        const isModuleLevel = varStmt.getParent() === sourceFile;
        if (isModuleLevel && (text === 'new Map()' || text === 'new Map' || text === '{}')) {
          // Check if there's .set() or property assignment but no .delete() or size check
          const fullText = sourceFile.getFullText();
          const hasSet = fullText.includes(`${name}.set(`) || fullText.includes(`${name}[`);
          const hasDelete = fullText.includes(`${name}.delete(`) || fullText.includes(`delete ${name}`);
          const hasSizeCheck = fullText.includes(`${name}.size`) || fullText.includes(`Object.keys(${name})`);

          if (hasSet && !hasDelete && !hasSizeCheck) {
            findings.push({
              line: varStmt.getStartLineNumber(),
              message: `전역 캐시 '${name}'에 항목을 추가하지만 삭제/크기 제한이 없습니다. 무한 메모리 증가 가능성이 있습니다.`,
            });
          }
        }
      }
    }

    return findings;
  }
};
