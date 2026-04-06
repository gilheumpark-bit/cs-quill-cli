import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * AIP-008: Exception swallowing
 * Detects empty catch blocks or catch blocks that only log without rethrowing,
 * effectively swallowing errors silently.
 */
export const aip008Detector: RuleDetector = {
  ruleId: 'AIP-008',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.CatchClause) return;

      const block = node.getChildAtIndex(node.getChildCount() - 1);
      if (!block) return;
      const blockText = block.getText();

      // Strip braces and whitespace
      const inner = blockText.replace(/^\{/, '').replace(/\}$/, '').trim();

      // Empty catch block
      if (inner.length === 0) {
        findings.push({
          line: node.getStartLineNumber(),
          message: 'Exception swallowing: 빈 catch 블록 — 에러가 무시됨',
        });
        return;
      }

      // Catch block that only has console.log/console.error/console.warn
      const stmts = block.getDescendantStatements();
      const allConsole = stmts.length > 0 && stmts.every(s => {
        const text = s.getText();
        return /^console\.(log|error|warn|info|debug)\(/.test(text.trim());
      });

      // Check if there's no rethrow
      const hasThrow = block.getDescendantsOfKind(SyntaxKind.ThrowStatement).length > 0;
      const hasReturn = block.getDescendantsOfKind(SyntaxKind.ReturnStatement).length > 0;

      if (allConsole && !hasThrow && !hasReturn) {
        findings.push({
          line: node.getStartLineNumber(),
          message: 'Exception swallowing: catch 블록이 console 출력만 하고 재throw/return 없음 — 에러가 삼켜짐',
        });
      }
    });

    return findings;
  }
};
