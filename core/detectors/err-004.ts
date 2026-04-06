import { RuleDetector } from '../detector-registry';
import { SyntaxKind, TryStatement } from 'ts-morph';

const RESOURCE_HINT =
  /(?:openSync|createReadStream|createWriteStream|readFileSync|writeFileSync|createConnection|connect\s*\(|beginTransaction|acquire|pool\.query|fs\.open)\b/;

/**
 * finally 없이 리소스/연결 패턴이 try에만 있을 때만 탐지
 */
export const err004Detector: RuleDetector = {
  ruleId: 'ERR-004', // finally 없이 리소스 미해제
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.TryStatement) return;
      const ts = node as TryStatement;
      if (ts.getFinallyBlock()) return;
      const tryText = ts.getTryBlock().getText();
      if (!RESOURCE_HINT.test(tryText)) return;
      findings.push({
        line: ts.getStartLineNumber(),
        message:
          '리소스/연결 패턴이 감지되었으나 finally가 없습니다. 해제·close를 finally로 옮기는 것을 검토하세요 (ERR-004).',
      });
    });

    return findings;
  },
};
