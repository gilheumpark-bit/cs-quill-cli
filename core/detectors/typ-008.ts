import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * nullable 타입에 대해 optional chaining 없이 속성 접근 (휴리스틱)
 * Phase / Rule Category: type
 */
export const typ008Detector: RuleDetector = {
  ruleId: 'TYP-008', // union null|undefined 미처리
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.PropertyAccessExpression) return;
      const pae = node as import('ts-morph').PropertyAccessExpression;
      // optional chain — 제외
      const questionDot = (pae.compilerNode as { questionDotToken?: unknown }).questionDotToken;
      if (questionDot) return;

      const expr = pae.getExpression();
      try {
        const t = expr.getType();
        if (t.isNullable()) {
          findings.push({
            line: node.getStartLineNumber(),
            message: 'nullable 표현식에 non-null 접근 — narrowing 또는 ?. 권장',
          });
        }
      } catch {
        /* 타입 정보 없음 */
      }
    });

    return findings;
  },
};
