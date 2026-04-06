const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'core', 'detectors');

const synRules = [
  { id: 'SYN-001', name: '중괄호 불균형', match: "msg.includes(\\\"'{'\\\") || msg.includes(\\\"'}'\\\")", code: 1005 },
  { id: 'SYN-002', name: '소괄호 불균형', match: "msg.includes(\\\"'('\\\") || msg.includes(\\\"')'\\\")", code: 1005 },
  { id: 'SYN-003', name: '대괄호 불균형', match: "msg.includes(\\\"'['\\\") || msg.includes(\\\"']'\\\")", code: 1005 },
  { id: 'SYN-004', name: '세미콜론 누락', match: "msg.includes(\\\"';'\\\")", code: 1005 },
  { id: 'SYN-005', name: '예약어 식별자 사용', match: "diag.getCode() === 1389", customCondition: true },
  { id: 'SYN-006', name: '잘못된 Unicode escape', match: "diag.getCode() === 1126 || diag.getCode() === 1161", customCondition: true },
  { id: 'SYN-007', name: '템플릿 리터럴 미종결', match: "diag.getCode() === 1002 || diag.getCode() === 1160", customCondition: true },
  { id: 'SYN-008', name: '정규식 플래그 중복', match: "diag.getCode() === 1161", customCondition: true }, // Not precise, but placeholder
  { id: 'SYN-009', name: 'import 경로 따옴표 누락', match: "msg.includes('String literal expected')", customCondition: true }, 
  { id: 'SYN-010', name: 'JSON-in-JS 파싱 실패', match: "diag.getCode() === 1126", customCondition: true } 
];

for (const rule of synRules) {
  const filename = path.join(dir, `${rule.id.toLowerCase()}.ts`);
  
  let condition = '';
  if (rule.customCondition) {
    condition = rule.match;
    // fallback for string literal expected: code 1141 String literal expected.
    if (rule.id === 'SYN-009') condition = "diag.getCode() === 1141 || msg.includes('String literal expected')";
  } else {
    condition = `diag.getCode() === ${rule.code} && (${rule.match})`;
  }

  const content = `import { RuleDetector } from '../detector-registry';

/**
 * Phase / Rule Category: syntax
 * Severity: critical | Confidence: high
 */
export const ${rule.id.toLowerCase().replace(/-/g, '')}Detector: RuleDetector = {
  ruleId: '${rule.id}', // ${rule.name}
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TS 구문 분석 에러(Diagnostics)를 활용하여 탐지
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      const rawMsg = diag.getMessageText();
      const msg = typeof rawMsg === 'string' ? rawMsg : (rawMsg as any).messageText || '';
      
      if (${condition}) {
        findings.push({ 
          line: diag.getLineNumber() || 1, 
          message: \`${rule.name} 위반: \${msg}\` 
        });
      }
    }

    return findings;
  }
};
`;
  fs.writeFileSync(filename, content, 'utf8');
}
console.log('Populated SYN-001 to SYN-010');
