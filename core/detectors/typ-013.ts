import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ013Detector: RuleDetector = {
  ruleId: 'TYP-013', // noImplicitAny 위반
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.Parameter) return;
      const p = node as import('ts-morph').ParameterDeclaration;
      if (p.getDotDotDotToken()) return;
      if (p.getName() === 'this') return;
      const nameNode = p.getNameNode();
      if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern || nameNode.getKind() === SyntaxKind.ArrayBindingPattern) {
        return;
      }
      if (!p.getTypeNode() && !p.getInitializer()) {
        findings.push({ line: node.getStartLineNumber(), message: '파라미터 타입 미표기 (noImplicitAny)' });
      }
    });

    return findings;
  },
};
