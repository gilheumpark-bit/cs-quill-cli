import { RuleDetector } from '../detector-registry';

export const stl008Detector: RuleDetector = {
  ruleId: 'STL-008',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const lines = sourceFile.getFullText().split('\n');
    let consecutiveEmpty = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '') {
        consecutiveEmpty++;
        if (consecutiveEmpty === 3) {
          findings.push({
            line: i + 1,
            message: '연속 빈 줄이 3줄 이상입니다. 최대 2줄까지만 허용하세요.',
          });
        }
      } else {
        consecutiveEmpty = 0;
      }
    }

    return findings;
  }
};
