import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const stl005Detector: RuleDetector = {
  ruleId: 'STL-005',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    // Check import declarations for filename case inconsistency
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.ImportDeclaration) {
        const moduleSpecifier = node.getChildrenOfKind(SyntaxKind.StringLiteral)[0];
        if (!moduleSpecifier) return;

        const path = moduleSpecifier.getText().replace(/['"]/g, '');
        // Only check relative imports
        if (!path.startsWith('.')) return;

        const fileName = path.split('/').pop() ?? '';
        // Check if filename uses mixed conventions (PascalCase file with camelCase, or has uppercase in non-component file)
        if (fileName.includes('_') && /[A-Z]/.test(fileName)) {
          findings.push({
            line: node.getStartLineNumber(),
            message: `import 경로 '${fileName}'에서 snake_case와 PascalCase가 혼용됩니다. 일관된 파일 명명 규칙을 사용하세요.`,
          });
        }
      }
    });

    // Check exports for naming consistency
    const names: string[] = [];
    for (const fn of sourceFile.getFunctions()) {
      const name = fn.getName();
      if (name) names.push(name);
    }
    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName();
      if (name) names.push(name);
    }

    const hasCamel = names.some(n => /^[a-z]/.test(n));
    const hasPascal = names.some(n => /^[A-Z]/.test(n));
    const hasSnake = names.some(n => n.includes('_') && n === n.toLowerCase());

    if (hasCamel && hasSnake) {
      findings.push({
        line: 1,
        message: '파일 내에서 camelCase와 snake_case 명명 규칙이 혼용되고 있습니다. 하나의 규칙으로 통일하세요.',
      });
    }

    return findings;
  }
};
