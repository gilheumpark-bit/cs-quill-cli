import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

function isLiteralInitializer(kind: SyntaxKind): boolean {
  return (
    kind === SyntaxKind.StringLiteral ||
    kind === SyntaxKind.NumericLiteral ||
    kind === SyntaxKind.NoSubstitutionTemplateLiteral ||
    kind === SyntaxKind.PrefixUnaryExpression ||
    kind === SyntaxKind.BigIntLiteral
  );
}

/**
 * Phase / Rule Category: type
 */
export const typ010Detector: RuleDetector = {
  ruleId: 'TYP-010', // enum non-literal 값
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    for (const enu of sourceFile.getEnums()) {
      for (const member of enu.getMembers()) {
        const init = member.getInitializer();
        if (!init) continue;
        if (!isLiteralInitializer(init.getKind())) {
          findings.push({ line: member.getStartLineNumber(), message: 'enum 멤버 초기값이 리터럴이 아님' });
        }
      }
    }

    return findings;
  },
};
