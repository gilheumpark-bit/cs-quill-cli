import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 */
export const stl010Detector: RuleDetector = {
  ruleId: 'STL-010', // TODO/FIXME/HACK 잔류
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const text = sourceFile.getFullText();
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (/(TODO|FIXME|HACK):?/.test(line)) {
        findings.push({ line: i + 1, message: 'TODO/FIXME/HACK 발견' });
      }
    });
    return findings;
  }
};
