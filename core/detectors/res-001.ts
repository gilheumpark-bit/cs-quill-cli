import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: resource
 * Severity: high | Confidence: medium
 */
export const res001Detector: RuleDetector = {
  ruleId: 'RES-001', // 파일 스트림 close 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // Heuristic: createReadStream, createWriteStream or fs.open without close()
    const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    let hasOpen = false;
    let openLines: number[] = [];
    let hasClose = false;

    for (const call of calls) {
       const expr = call.getExpression();
       if (expr.isKind(SyntaxKind.Identifier)) {
          const name = expr.getText();
          if (name === 'createReadStream' || name === 'createWriteStream') {
             hasOpen = true;
             openLines.push(call.getStartLineNumber());
          }
       } else if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
          const propName = expr.getName();
          if (propName === 'createReadStream' || propName === 'createWriteStream' || propName === 'open') {
             hasOpen = true;
             openLines.push(call.getStartLineNumber());
          } else if (propName === 'close' || propName === 'closeSync') {
             hasClose = true;
          }
       }
    }

    if (hasOpen && !hasClose) {
       for (const line of openLines) {
           findings.push({ line, message: '파일 스트림 close 누락 위반' });
       }
    }

    return findings;
  }
};
