import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const stl006Detector: RuleDetector = {
  ruleId: 'STL-006',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const lines = sourceFile.getFullText().split('\n');
    let codeLines = 0;
    let commentLines = 0;
    let inBlockComment = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (inBlockComment) {
        commentLines++;
        if (trimmed.includes('*/')) inBlockComment = false;
        continue;
      }
      if (trimmed.startsWith('/*')) {
        commentLines++;
        if (!trimmed.includes('*/')) inBlockComment = true;
        continue;
      }
      if (trimmed.startsWith('//')) {
        commentLines++;
        continue;
      }
      if (trimmed.length > 0) {
        codeLines++;
      }
    }

    // Flag if comment ratio is > 50% (AI-generated code tends to over-comment)
    if (codeLines > 10 && commentLines > codeLines * 0.5) {
      findings.push({
        line: 1,
        message: `주석 비율이 과도합니다 (코드 ${codeLines}줄, 주석 ${commentLines}줄). AI 생성 코드의 특성일 수 있으며, 자명한 주석은 제거하세요.`,
      });
    }

    // Detect obvious explanatory comments like "// This function does X"
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (/^\/\/\s*(This|The|We|Here|Below|Above|Following|Note:)\s/i.test(trimmed)) {
        findings.push({
          line: i + 1,
          message: '설명형 주석이 과도합니다. 코드 자체로 의도가 드러나도록 작성하세요.',
        });
      }
    }

    return findings;
  }
};
