import { RuleDetector } from '../detector-registry';
import { BindingElement, SyntaxKind, VariableDeclaration } from 'ts-morph';

/** 외부 데이터로부터 구조분해 시 기본값 없음 */
export const rte007Detector: RuleDetector = {
  ruleId: 'RTE-007',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.BindingElement) return;
      const be = node as BindingElement;
      if (be.getDotDotDotToken()) return;
      if (be.getInitializer()) return;
      const vd = be.getFirstAncestorByKind(SyntaxKind.VariableDeclaration) as VariableDeclaration | undefined;
      if (!vd) return;
      const init = vd.getInitializer();
      if (!init || init.getKind() !== SyntaxKind.Identifier) return;
      const src = (init as { getText(): string }).getText();
      if (!/^(data|json|raw|body|payload|res|response|row|record|input|props)$/i.test(src)) return;
      const name = be.getNameNode().getText();
      findings.push({
        line: be.getStartLineNumber(),
        message: `구조분해 '${name}' 기본값 없음 — '${src}' 에서 속성 누락 시 undefined`,
      });
    });
    return findings;
  },
};
