import { RuleDetector } from '../detector-registry';

/**
 * Phase / Rule Category: syntax
 * Severity: critical | Confidence: high
 */
export const syn007Detector: RuleDetector = {
  ruleId: 'SYN-007', // 템플릿 리터럴 미종결
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TS 구문 분석 에러(Diagnostics)를 활용하여 탐지
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      const rawMsg = diag.getMessageText();
      const msg = typeof rawMsg === 'string' ? rawMsg : (rawMsg as any).messageText || '';
      
      if (diag.getCode() === 1002 || diag.getCode() === 1160) {
        findings.push({ 
          line: diag.getLineNumber() || 1, 
          message: `템플릿 리터럴 미종결 위반: ${msg}` 
        });
      }
    }

    return findings;
  }
};
