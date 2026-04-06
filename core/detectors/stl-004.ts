import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const stl004Detector: RuleDetector = {
  ruleId: 'STL-004',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    for (const varStmt of sourceFile.getVariableStatements()) {
      // Only check const declarations
      if (varStmt.getDeclarationKind() !== 'const' as any) continue;

      for (const decl of varStmt.getDeclarations()) {
        const name = decl.getName();
        const init = decl.getInitializer();
        if (!init) continue;

        // Check if it looks like a constant (primitive literal at module level)
        const isModuleLevel = varStmt.getParent() === sourceFile;
        if (!isModuleLevel) continue;

        const initText = init.getText();
        const isPrimitive = init.getKind() === SyntaxKind.NumericLiteral ||
                            init.getKind() === SyntaxKind.StringLiteral ||
                            initText === 'true' || initText === 'false';

        if (isPrimitive && name.length > 1) {
          // Constant should be UPPER_SNAKE_CASE
          const isUpperCase = /^[A-Z][A-Z0-9_]*$/.test(name);
          if (!isUpperCase && !/^[a-z]/.test(name)) continue; // skip if mixed convention
          if (!isUpperCase) {
            findings.push({
              line: varStmt.getStartLineNumber(),
              message: `모듈 레벨 상수 '${name}'가 소문자입니다. 상수는 UPPER_SNAKE_CASE를 사용하세요.`,
            });
          }
        }
      }
    }

    return findings;
  }
};
