import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node } from 'ts-morph';

/**
 * AIP-001: 과도한 인라인 주석 (Excessive inline comments)
 * AI-generated code often has too many inline comments explaining obvious logic.
 * Detects functions where comment-to-code ratio is excessively high.
 */
export const aip001Detector: RuleDetector = {
  ruleId: 'AIP-001',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();
    const lines = fullText.split('\n');

    // Count consecutive single-line comment blocks
    let commentStreak = 0;
    let streakStart = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('//') && !trimmed.startsWith('///') && !trimmed.startsWith('// eslint') && !trimmed.startsWith('// @ts-')) {
        if (commentStreak === 0) streakStart = i;
        commentStreak++;
      } else {
        if (commentStreak >= 5) {
          findings.push({
            line: streakStart + 1,
            message: `과도한 인라인 주석: ${commentStreak}줄 연속 주석 블록 감지 (5줄 이상 연속 주석은 과도할 수 있음)`,
          });
        }
        commentStreak = 0;
      }
    }
    if (commentStreak >= 5) {
      findings.push({
        line: streakStart + 1,
        message: `과도한 인라인 주석: ${commentStreak}줄 연속 주석 블록 감지`,
      });
    }

    // Check functions with high comment-to-code ratio
    sourceFile.getFunctions().forEach(fn => {
      const body = fn.getBody();
      if (!body) return;
      const bodyText = body.getFullText();
      const bodyLines = bodyText.split('\n').filter(l => l.trim().length > 0);
      const commentLines = bodyLines.filter(l => l.trim().startsWith('//'));
      const codeLines = bodyLines.filter(l => !l.trim().startsWith('//'));
      if (codeLines.length > 0 && commentLines.length / codeLines.length > 1.0 && commentLines.length >= 4) {
        findings.push({
          line: fn.getStartLineNumber(),
          message: `과도한 인라인 주석: 함수 '${fn.getName() ?? '(anonymous)'}' 내 주석(${commentLines.length}줄)이 코드(${codeLines.length}줄)보다 많음`,
        });
      }
    });

    return findings;
  }
};
