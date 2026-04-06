import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';
export const var009Detector: RuleDetector = {
  ruleId: 'VAR-009',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.forEachDescendant(node => {
      if (node.getKind() !== SyntaxKind.ForStatement) return;
      const init = (node as any).getInitializer?.();
      if (init?.getText().startsWith('var ')) {
        const body = (node as any).getStatement?.()?.getText() || '';
        if (body.includes('=>') || body.includes('function')) findings.push({ line: node.getStartLineNumber(), message: 'for(var) closure capture risk' });
      }
    });
    return findings;
  },
};
