import { RuleDetector } from '../detector-registry';
import { CatchClause, SyntaxKind } from 'ts-morph';
import { reactBusyNotResetInCatch } from './err-helpers';

/**
 * React setLoading(true) 등 try 후 catch/finally에서 false 미복구
 */
export const err012Detector: RuleDetector = {
  ruleId: 'ERR-012', // 오류 복구 후 상태 초기화 누락
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CatchClause) return;
      const cc = node as CatchClause;
      if (!reactBusyNotResetInCatch(cc)) return;
      findings.push({
        line: cc.getStartLineNumber(),
        message:
          'try에서 로딩/버튼 상태를 true로 올렸으나 catch/finally에서 false 복구가 보이지 않습니다 (ERR-012).',
      });
    });

    return findings;
  },
};
