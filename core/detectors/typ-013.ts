import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ013Detector: RuleDetector = {
  ruleId: 'TYP-013', // noImplicitAny 위반
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // 파라미터 중 타입이 없는 경우 탐지
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.Parameter) {
        if (!(node as any).getTypeNode() && !(node as any).getInitializer()) {
           findings.push({ line: node.getStartLineNumber(), message: 'noImplicitAny 위반' });
        }
      }
    });
    return findings;
  }
};
