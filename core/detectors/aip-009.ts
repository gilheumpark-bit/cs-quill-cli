import { RuleDetector } from '../detector-registry';
import { SyntaxKind, Node, Block } from 'ts-morph';

/**
 * AIP-009: Copy-paste coupling
 * Detects code blocks that appear to be copy-pasted with minimal changes.
 * Looks for adjacent similar statements (e.g., repeated property assignments
 * or method calls following the same pattern).
 */
export const aip009Detector: RuleDetector = {
  ruleId: 'AIP-009',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    const allFns = [
      ...sourceFile.getFunctions(),
      ...sourceFile.getClasses().flatMap(c => c.getMethods()),
    ];

    for (const fn of allFns) {
      const body = fn.getBody();
      if (!body || !Node.isBlock(body)) continue;
      const stmts = (body as Block).getStatements();
      if (stmts.length < 4) continue;

      // Normalize: replace all identifiers/literals with placeholders, then compare
      const normalize = (text: string) =>
        text.replace(/['"`].*?['"`]/g, '"_STR_"')
            .replace(/\b\d+\.?\d*\b/g, '_NUM_')
            .replace(/\b[a-z]\w*\b/gi, '_ID_')
            .replace(/\s+/g, ' ').trim();

      let repeatCount = 0;
      let repeatStart = 0;
      for (let i = 1; i < stmts.length; i++) {
        const prev = normalize(stmts[i - 1].getText());
        const curr = normalize(stmts[i].getText());
        if (prev === curr && prev.length > 10) {
          if (repeatCount === 0) repeatStart = stmts[i - 1].getStartLineNumber();
          repeatCount++;
        } else {
          if (repeatCount >= 3) {
            findings.push({
              line: repeatStart,
              message: `Copy-paste coupling: ${repeatCount + 1}개의 구조적으로 동일한 연속 문장 감지 — 루프 또는 유틸 함수로 리팩터링 권장`,
            });
          }
          repeatCount = 0;
        }
      }
      if (repeatCount >= 3) {
        findings.push({
          line: repeatStart,
          message: `Copy-paste coupling: ${repeatCount + 1}개의 구조적으로 동일한 연속 문장 감지`,
        });
      }
    }

    return findings;
  }
};
