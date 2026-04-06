import { RuleDetector } from '../detector-registry';
import { ForStatement, SyntaxKind } from 'ts-morph';

/** 조건에 나온 배열과 같은 이름에 대해 루프 본문에서 splice/push */
export const rte015Detector: RuleDetector = {
  ruleId: 'RTE-015',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.ForStatement) return;
      const fs = node as ForStatement;
      const cond = fs.getCondition()?.getText() ?? '';
      const m = /(\w+)\s*\.\s*length/.exec(cond);
      if (!m) return;
      const arrName = m[1];
      const body = fs.getStatement();
      const bodyText = body.getText();
      if (!new RegExp(`\\b${arrName}\\s*\\.(splice|push|unshift|shift|pop)\\s*\\(`).test(bodyText)) {
        return;
      }
      findings.push({
        line: fs.getStartLineNumber(),
        message: `for 루프 조건의 '${arrName}' 에 대해 본문에서 배열 변형 — 인덱스/길이 불일치 위험`,
      });
    });
    return findings;
  },
};
