import { RuleDetector } from '../detector-registry';

/**
 * Phase / Rule Category: syntax
 * Severity: critical | Confidence: high
 */
export const syn008Detector: RuleDetector = {
  ruleId: 'SYN-008', // 정규식 플래그 중복
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TS 구문 분석 에러(Diagnostics)를 활용하여 탐지
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      const rawMsg = diag.getMessageText();
      const msg = typeof rawMsg === 'string' ? rawMsg : (rawMsg as any).messageText || '';
      
      if (diag.getCode() === 1161) {
        findings.push({ 
          line: diag.getLineNumber() || 1, 
          message: `정규식 플래그 중복 위반: ${msg}` 
        });
      }
    }

    return findings;
  }
};
