import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * AIP-005: Phantom Bug 처리 (Phantom Bug handling)
 * AI inserts try-catch or error handling for scenarios that cannot actually occur.
 * Detects catch blocks that handle errors which the try body cannot plausibly throw.
 */
export const aip005Detector: RuleDetector = {
  ruleId: 'AIP-005',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.TryStatement) return;

      const tryStmt = node;
      const tryBlock = tryStmt.getChildAtIndex(1); // try block
      if (!tryBlock) return;

      const tryText = tryBlock.getText();

      // Heuristic: try block only has synchronous assignments, simple math, or string ops
      const hasOnlySafe = /^[\s{}\n]*(?:(?:const|let|var)\s+\w+\s*=\s*(?:\d+|['"`][^'"`]*['"`]|\w+\s*[+\-*/]\s*\w+|\[.*?\]|{.*?});\s*)*[\s}]*$/.test(tryText);

      // Heuristic: try block is very short (1-2 statements) with no function calls
      const lines = tryText.split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('{') && !l.trim().startsWith('}'));
      const hasNoCallExpr = !tryBlock.getDescendantsOfKind(SyntaxKind.CallExpression).length
        && !tryBlock.getDescendantsOfKind(SyntaxKind.NewExpression).length
        && !tryBlock.getDescendantsOfKind(SyntaxKind.AwaitExpression).length
        && !tryBlock.getDescendantsOfKind(SyntaxKind.ElementAccessExpression).length;

      if (lines.length <= 2 && hasNoCallExpr) {
        findings.push({
          line: node.getStartLineNumber(),
          message: 'Phantom Bug: try 블록에 예외 발생 가능성 없는 코드만 존재 — 불필요한 try-catch',
        });
      }
    });

    return findings;
  }
};
