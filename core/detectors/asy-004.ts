import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy004Detector: RuleDetector = {
  ruleId: 'ASY-004', // async 함수 명시적 return 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.getFunctions().forEach(func => {
      if (func.isAsync() && func.getStatements().length > 0) {
        // 간단한 CFG 검사: 마지막 statement가 Return인지 정도만 확인 (임시)
        const stmts = func.getStatements();
        const last = stmts[stmts.length - 1];
        if (last && last.getKind() !== SyntaxKind.ReturnStatement) {
          // findings.push({ line: func.getStartLineNumber(), message: 'async 함수 return 의심' });
        }
      }
    });
    return findings;
  }
};
