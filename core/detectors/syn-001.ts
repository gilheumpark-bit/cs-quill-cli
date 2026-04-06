import { RuleDetector } from '../detector-registry';

/**
 * Phase / Rule Category: syntax
 * Severity: critical | Confidence: high
 */
export const syn001Detector: RuleDetector = {
  ruleId: 'SYN-001', // 중괄호 불균형
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TS 구문 분석 에러(Diagnostics)를 활용하여 탐지
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      const rawMsg = diag.getMessageText();
      const msg = typeof rawMsg === 'string' ? rawMsg : (rawMsg as any).messageText || '';
      
      // 템플릿 리터럴에 `}` 단독 사용 시 파서 오류 방지 — 문자열 연결 사용
      const qBraceOpen = "'" + '{' + "'";
      const qBraceClose = "'" + '}' + "'";
      if (diag.getCode() === 1005 && (msg.includes(qBraceOpen) || msg.includes(qBraceClose))) {
        findings.push({ 
          line: diag.getLineNumber() || 1, 
          message: `중괄호 불균형 위반: ${msg}` 
        });
      }
    }

    return findings;
  }
};
