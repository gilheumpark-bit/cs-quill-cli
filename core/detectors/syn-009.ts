import { RuleDetector } from '../detector-registry';

/**
 * Phase / Rule Category: syntax
 * Severity: critical | Confidence: high
 */
export const syn009Detector: RuleDetector = {
  ruleId: 'SYN-009', // import 경로 따옴표 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TS 구문 분석 에러(Diagnostics)를 활용하여 탐지
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      const rawMsg = diag.getMessageText();
      const msg = typeof rawMsg === 'string' ? rawMsg : (rawMsg as any).messageText || '';
      
      if (diag.getCode() === 1141 || msg.includes('String literal expected')) {
        findings.push({ 
          line: diag.getLineNumber() || 1, 
          message: `import 경로 따옴표 누락 위반: ${msg}` 
        });
      }
    }

    return findings;
  }
};
