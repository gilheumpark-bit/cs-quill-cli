import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: performance
 * Severity: low | Confidence: medium
 */
export const prf008Detector: RuleDetector = {
  ruleId: 'PRF-008', // RegExp 루프 내 매번 생성
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const loops = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ForStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ForInStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ForOfStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.WhileStatement),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.DoStatement)
    ];

    for (const loop of loops) {
      // 1. new RegExp(...)
      const newExprs = loop.getDescendantsOfKind(SyntaxKind.NewExpression);
      for (const expr of newExprs) {
         if (expr.getExpression().getText() === 'RegExp') {
            findings.push({ line: expr.getStartLineNumber(), message: 'RegExp 루프 내 매번 생성 위반' });
         }
      }

      // 2. /regex/ literals
      const regexLiterals = loop.getDescendantsOfKind(SyntaxKind.RegularExpressionLiteral);
      for (const expr of regexLiterals) {
         findings.push({ line: expr.getStartLineNumber(), message: 'RegExp 루프 내 매번 생성 위반' });
      }
    }

    return Array.from(new Map(findings.map(f => [`${f.line}:${f.message}`, f])).values());
  }
};
