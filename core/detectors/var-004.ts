import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';
export const var004Detector: RuleDetector = {
  ruleId: 'VAR-004',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    const outerNames = new Set<string>();
    sourceFile.getVariableDeclarations().forEach(d => {
      if (!d.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) && !d.getFirstAncestorByKind(SyntaxKind.ArrowFunction)) outerNames.add(d.getName());
    });
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.VariableDeclaration) {
        const name = (node as any).getName?.();
        if (name && outerNames.has(name) && (node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) || node.getFirstAncestorByKind(SyntaxKind.ArrowFunction))) {
          findings.push({ line: node.getStartLineNumber(), message: name + ' shadowing' });
        }
      }
    });
    return findings;
  },
};
