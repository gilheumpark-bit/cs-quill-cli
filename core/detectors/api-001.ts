import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node } from 'ts-morph';

/**
 * Phase / Rule Category: api-misuse
 *
 * 존재하지 않는 메서드 호출(hallucination) 탐지.
 * 타입 체커가 사용 가능할 때만 실제 미해결 심볼을 보고한다.
 * 타입 체커 없이는 정적 분석만으로 확정할 수 없으므로 빈 결과를 반환.
 */
export const api001Detector: RuleDetector = {
  ruleId: 'API-001',
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];

    // 타입 정보가 없으면 호출이 유효한지 확인 불가 — 빈 결과 반환
    const project = sourceFile.getProject();
    const checker = project?.getTypeChecker();
    if (!checker) return findings;

    sourceFile.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;

      try {
        const callExpr = node;
        const exprNode = callExpr.getChildAtIndex(0);
        if (!exprNode) return;

        // PropertyAccessExpression (obj.method()) 에서만 검사
        if (exprNode.getKind() === SyntaxKind.PropertyAccessExpression) {
          const propAccess = exprNode;
          const nameNode = propAccess.getLastChild();
          if (!nameNode) return;

          const sym = checker.getSymbolAtLocation(nameNode);
          if (!sym) {
            // 심볼을 찾을 수 없음 — 실제 미해결 참조
            const methodName = nameNode.getText();
            // 동적 호출 패턴이나 any 타입은 제외
            const objText = propAccess.getChildAtIndex(0)?.getText() ?? '';
            if (/\bany\b/.test(objText) || objText.includes('[')) return;

            findings.push({
              line: node.getStartLineNumber(),
              message: `존재하지 않는 메서드 호출 (hallucination) 위반 의심: .${methodName}()`,
            });
          }
        }
      } catch {
        // 타입 해석 실패 시 안전하게 무시
      }
    });

    return findings;
  }
};
