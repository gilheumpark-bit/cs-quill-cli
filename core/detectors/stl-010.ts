import { RuleDetector } from '../detector-registry';

export const stl010Detector: RuleDetector = {
  ruleId: 'STL-010',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const lines = sourceFile.getFullText().split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match TODO, FIXME, HACK, XXX, TEMP in comments
      const match = line.match(/\/[/*]\s*(TODO|FIXME|HACK|XXX|TEMP)\b/i);
      if (match) {
        const tag = match[1].toUpperCase();
        findings.push({
          line: i + 1,
          message: `${tag} 주석이 잔류하고 있습니다. 해결 후 제거하거나 이슈 트래커에 등록하세요.`,
        });
      }
    }

    return findings;
  }
};
