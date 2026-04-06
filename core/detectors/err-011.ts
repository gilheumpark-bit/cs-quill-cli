import { RuleDetector } from '../detector-registry';
import { CatchClause, SyntaxKind } from 'ts-morph';
import { catchHasTypeNarrowing } from './err-helpers';

/**
 * instanceof / is / Error.isError 없이 catch 본문만 — 단순 재throw는 제외
 */
export const err011Detector: RuleDetector = {
  ruleId: 'ERR-011', // 타입 구분 없이 catch
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CatchClause) return;
      const cc = node as CatchClause;
      const binding = cc.getVariableDeclaration()?.getName();
      if (!binding) return;
      if (cc.getBlock().getStatements().length === 0) return;
      if (catchHasTypeNarrowing(cc)) return;
      const t = cc.getBlock().getText().replace(/\s+/g, ' ').trim();
      if (t === `throw ${binding};` || t === `throw ${binding}`) return;
      findings.push({
        line: cc.getStartLineNumber(),
        message:
          'catch에서 instanceof 등 타입 구분이 없습니다. 필요 시 Error 타입 구분을 검토하세요 (ERR-011).',
      });
    });

    return findings;
  },
};
