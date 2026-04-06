import { RuleDetector } from '../detector-registry';

/**
 * Phase / Rule Category: syntax
 * Severity: critical | Confidence: high
 */
export const syn010Detector: RuleDetector = {
  ruleId: 'SYN-010', // JSON-in-JS 파싱 실패
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TS 구문 분석 에러(Diagnostics)를 활용하여 탐지
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      const rawMsg = diag.getMessageText();
      const msg = typeof rawMsg === 'string' ? rawMsg : (rawMsg as any).messageText || '';
      
      if (diag.getCode() === 1126) {
        findings.push({ 
          line: diag.getLineNumber() || 1, 
          message: `JSON-in-JS 파싱 실패 위반: ${msg}` 
        });
      }
    }

    return findings;
  }
};
