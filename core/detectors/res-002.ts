import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: high | Confidence: medium
 */
export const res002Detector: RuleDetector = {
  ruleId: 'RES-002', // DB connection 반환 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // Heuristic: pool.connect() or getConnection() without release() or close()
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    let hasConnect = false;
    let connectLines: number[] = [];
    let hasRelease = false;

    for (const call of calls) {
       const expr = call.getExpression();
       if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
          const propName = expr.getName();
          if (propName === 'getConnection' || (expr.getExpression().getText() === 'pool' && propName === 'connect')) {
             hasConnect = true;
             connectLines.push(call.getStartLineNumber());
          } else if (propName === 'release' || propName === 'end' || propName === 'close') {
             hasRelease = true;
          }
       }
    }

    if (hasConnect && !hasRelease) {
       for (const line of connectLines) {
           findings.push({ line, message: 'DB connection 반환 누락 위반' });
       }
    }

    return findings;
  }
};
