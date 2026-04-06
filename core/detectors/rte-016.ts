import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/** for...in — Array/유사 배열에 사용 시 인덱스가 string */
export const rte016Detector: RuleDetector = {
  ruleId: 'RTE-016',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.ForInStatement) return;
      const rhs = (node as import('ts-morph').ForInStatement).getExpression();
      if (rhs.getKind() !== SyntaxKind.Identifier) return;
      const n = rhs.getText();
      if (!/^(arr|array|list|items|rows|data|results|stack|queue)$/i.test(n)) return;
      findings.push({
        line: node.getStartLineNumber(),
        message: `for...in '${n}' — 배열이면 인덱스가 string. for...of 권장`,
      });
    });
    return findings;
  },
};
