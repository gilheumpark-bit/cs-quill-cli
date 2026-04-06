import { RuleDetector } from '../detector-registry';

/**
 * Phase / Rule Category: syntax
 * Severity: critical | Confidence: high
 */
export const syn006Detector: RuleDetector = {
  ruleId: 'SYN-006', // 잘못된 Unicode escape
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TS 구문 분석 에러(Diagnostics)를 활용하여 탐지
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      const rawMsg = diag.getMessageText();
      const msg = typeof rawMsg === 'string' ? rawMsg : (rawMsg as any).messageText || '';
      
      if (diag.getCode() === 1126 || diag.getCode() === 1161) {
        findings.push({ 
          line: diag.getLineNumber() || 1, 
          message: `잘못된 Unicode escape 위반: ${msg}` 
        });
      }
    }

    return findings;
  }
};
