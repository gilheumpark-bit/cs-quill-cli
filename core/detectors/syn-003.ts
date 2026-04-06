import { RuleDetector } from '../detector-registry';

/**
 * Phase / Rule Category: syntax
 * Severity: critical | Confidence: high
 */
export const syn003Detector: RuleDetector = {
  ruleId: 'SYN-003', // 대괄호 불균형
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TS 구문 분석 에러(Diagnostics)를 활용하여 탐지
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      const rawMsg = diag.getMessageText();
      const msg = typeof rawMsg === 'string' ? rawMsg : (rawMsg as any).messageText || '';
      
      const qBrackOpen = "'" + '[' + "'";
      const qBrackClose = "'" + ']' + "'";
      if (diag.getCode() === 1005 && (msg.includes(qBrackOpen) || msg.includes(qBrackClose))) {
        findings.push({ 
          line: diag.getLineNumber() || 1, 
          message: `대괄호 불균형 위반: ${msg}` 
        });
      }
    }

    return findings;
  }
};
