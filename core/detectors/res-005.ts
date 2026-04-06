import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: high | Confidence: medium
 */
export const res005Detector: RuleDetector = {
  ruleId: 'RES-005', // Worker thread 종료 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const newExprs = sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression);

    let hasWorker = false;
    let workerLines: number[] = [];

    for (const expr of newExprs) {
       if (expr.getExpression().getText() === 'Worker') {
          hasWorker = true;
          workerLines.push(expr.getStartLineNumber());
       }
    }

    let hasTerminate = false;
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const call of calls) {
       const expr = call.getExpression();
       if (expr.isKind(SyntaxKind.PropertyAccessExpression) && expr.getName() === 'terminate') {
          hasTerminate = true;
       }
    }

    if (hasWorker && !hasTerminate) {
       for (const line of workerLines) {
           findings.push({ line, message: 'Worker thread 종료 누락 위반' });
       }
    }

    return findings;
  }
};
