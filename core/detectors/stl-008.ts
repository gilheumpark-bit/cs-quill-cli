import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 */
export const stl008Detector: RuleDetector = {
  ruleId: 'STL-008', // 빈 줄 과다 3줄+
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    const text = sourceFile.getFullText();
    const lines = text.split('\n');
    let emptyCount = 0;
    lines.forEach((line, i) => {
      if (line.trim() === '') {
        emptyCount++;
        if (emptyCount === 3) {
           findings.push({ line: i + 1, message: '빈 줄 3줄 이상 위반' });
        }
      } else {
        emptyCount = 0;
      }
    });
    return findings;
  }
};
