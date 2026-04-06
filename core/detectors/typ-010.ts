import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ010Detector: RuleDetector = {
  ruleId: 'TYP-010', // enum non-literal 값
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.getEnums().forEach(enu => {
      enu.getMembers().forEach(member => {
        const init = member.getInitializer();
        if (init && init.getKind() !== SyntaxKind.StringLiteral && init.getKind() !== SyntaxKind.NumericLiteral) {
          findings.push({ line: member.getStartLineNumber(), message: 'enum non-literal 값 위반' });
        }
      });
    });
    return findings;
  }
};
