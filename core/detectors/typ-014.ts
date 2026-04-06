import { RuleDetector } from '../detector-registry';

const ts = require('typescript') as typeof import('typescript');

/** strict null 관련 진단 코드 (대표) */
const STRICT_NULL_CODES = new Set([2531, 2532, 2533, 2536, 2537, 2538]);

/**
 * Phase / Rule Category: type
 */
export const typ014Detector: RuleDetector = {
  ruleId: 'TYP-014', // strictNullChecks 위반
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    for (const d of sourceFile.getPreEmitDiagnostics()) {
      const raw = d.compilerObject;
      const code = raw.code;
      if (!STRICT_NULL_CODES.has(code)) continue;
      const text = ts.flattenDiagnosticMessageText(raw.messageText, '\n');
      const line = d.getLineNumber() ?? 1;
      findings.push({
        line,
        message: `strictNullChecks: ${text.slice(0, 120)}`,
      });
    }

    return findings;
  },
};
