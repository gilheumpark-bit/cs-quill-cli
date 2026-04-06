import { RuleDetector } from '../detector-registry';
import {
  SyntaxKind,
  BinaryExpression,
  Identifier,
  FunctionDeclaration,
  MethodDeclaration,
  ArrowFunction,
} from 'ts-morph';

function getOwningAsyncFunction(node: import('ts-morph').Node): import('ts-morph').Node | undefined {
  const fn =
    node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) ??
    node.getFirstAncestorByKind(SyntaxKind.MethodDeclaration) ??
    node.getFirstAncestorByKind(SyntaxKind.ArrowFunction);
  if (!fn) return undefined;
  if (fn.getKind() === SyntaxKind.FunctionDeclaration) {
    return (fn as FunctionDeclaration).isAsync() ? fn : undefined;
  }
  if (fn.getKind() === SyntaxKind.MethodDeclaration) {
    return (fn as MethodDeclaration).hasModifier(SyntaxKind.AsyncKeyword) ? fn : undefined;
  }
  if (fn.getKind() === SyntaxKind.ArrowFunction) {
    return (fn as ArrowFunction).hasModifier(SyntaxKind.AsyncKeyword) ? fn : undefined;
  }
  return undefined;
}

/**
 * Phase / Rule Category: async
 * 서로 다른 async 함수에서 동일 식별자에 대입 (공유 가변 상태 + await 사이 레이스 가능성)
 */
export const asy015Detector: RuleDetector = {
  ruleId: 'ASY-015', // race condition — 공유 상태
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    /** 변수명 → async 함수 시작 라인 집합 */
    const writers = new Map<string, Set<number>>();
    /** 변수명 → 보고할 대표 라인 */
    const firstLine = new Map<string, number>();

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.BinaryExpression) return;
      const be = node as BinaryExpression;
      if (be.getOperatorToken().getKind() !== SyntaxKind.EqualsToken) return;
      const left = be.getLeft();
      if (left.getKind() !== SyntaxKind.Identifier) return;
      const name = (left as Identifier).getText();
      const owner = getOwningAsyncFunction(node);
      if (!owner) return;
      const lineKey = owner.getStartLineNumber();
      if (!writers.has(name)) {
        writers.set(name, new Set());
        firstLine.set(name, node.getStartLineNumber());
      }
      writers.get(name)!.add(lineKey);
    });

    for (const [name, funcLines] of writers) {
      if (funcLines.size >= 2) {
        findings.push({
          line: firstLine.get(name) ?? 0,
          message: `여러 async 함수에서 동일 변수 "${name}"에 대입합니다 (ASY-015). 공유 상태·레이스 조건을 검토하세요.`,
        });
      }
    }

    return findings;
  },
};
