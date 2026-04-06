import { RuleDetector } from '../detector-registry';

export const stl007Detector: RuleDetector = {
  ruleId: 'STL-007',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const lines = sourceFile.getFullText().split('\n');

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Detect comments that say "do X" but the next line does something different
      // Simple heuristic: comment mentions a function/variable name that doesn't appear on the next line
      if (trimmed.startsWith('//') && i + 1 < lines.length) {
        const commentText = trimmed.replace(/^\/\/\s*/, '').toLowerCase();
        const nextLine = lines[i + 1].trim();

        // "// unused" or "// deprecated" but no actual deprecation marker
        if (/\b(unused|deprecated|remove|delete|temporary|hack)\b/.test(commentText) &&
            nextLine.length > 0 && !nextLine.startsWith('//') && !nextLine.startsWith('/*')) {
          // Code after the comment is active but comment says it's unused/deprecated
          if (commentText.includes('unused') && !nextLine.includes('eslint-disable') &&
              !nextLine.includes('@deprecated')) {
            findings.push({
              line: i + 1,
              message: '주석에서 "unused"라고 했지만 활성 코드가 이어집니다. 주석과 코드가 불일치합니다.',
            });
          }
          if (commentText.includes('deprecated') && !nextLine.includes('@deprecated')) {
            findings.push({
              line: i + 1,
              message: '주석에서 "deprecated"라고 했지만 @deprecated 어노테이션이 없습니다. 주석과 코드가 불일치합니다.',
            });
          }
        }
      }
    }

    return findings;
  }
};
