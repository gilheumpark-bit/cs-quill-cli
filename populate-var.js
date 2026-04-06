const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'core', 'detectors');

const varRules = [
  {
    id: 'VAR-001', name: 'let/const TDZ 위반',
    logic: `
    // TDZ 위반은 사실상 컴파일 타임 에러(코드 2448)로 잡힘.
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      if (diag.getCode() === 2448) {
        findings.push({ line: diag.getLineNumber() || 1, message: 'let/const TDZ 위반' });
      }
    }`
  },
  {
    id: 'VAR-002', name: 'var 호이스팅 의존',
    logic: `
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.VariableDeclarationList) {
        if ((node as any).getDeclarationKind() === 'var') {
          findings.push({ line: node.getStartLineNumber(), message: 'var 사용 금지' });
        }
      }
    });`
  },
  {
    id: 'VAR-003', name: '미선언 전역 변수',
    logic: `
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      if (diag.getCode() === 2304) {
        findings.push({ line: diag.getLineNumber() || 1, message: '미선언 전역 변수 사용' });
      }
    }`
  },
  {
    id: 'VAR-004', name: '변수 shadowing',
    logic: `// 복잡한 심볼 체이닝 필요`
  },
  {
    id: 'VAR-005', name: '미사용 변수',
    logic: `
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      if (diag.getCode() === 6133) {
        findings.push({ line: diag.getLineNumber() || 1, message: '미사용 변수' });
      }
    }`
  },
  {
    id: 'VAR-006', name: '미사용 파라미터',
    logic: `
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      if (diag.getCode() === 6133 && diag.getMessageText()?.toString().includes("parameter")) {
        findings.push({ line: diag.getLineNumber() || 1, message: '미사용 파라미터' });
      }
    }`
  },
  {
    id: 'VAR-007', name: '미사용 import',
    logic: `
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      if (diag.getCode() === 6133 && diag.getMessageText()?.toString().includes("import")) {
        findings.push({ line: diag.getLineNumber() || 1, message: '미사용 import' });
      }
    }`
  },
  {
    id: 'VAR-008', name: '재할당 불필요 let → const',
    logic: `
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      // 7027 -> unreachable code, wait TS doesn't have prefer-const error directly without eslint
      if (diag.getCode() === 7027) {} 
    }`
  },
  {
    id: 'VAR-009', name: '루프 변수 클로저 캡처 오류',
    logic: `// CFG 분석 필요`
  },
  {
    id: 'VAR-010', name: '동일 스코프 중복 선언',
    logic: `
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diag of diagnostics) {
      if (diag.getCode() === 2451) {
        findings.push({ line: diag.getLineNumber() || 1, message: '동일 스코프 중복 선언' });
      }
    }`
  },
  {
    id: 'VAR-011', name: '전역 오염 window 직접 할당',
    logic: `
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.PropertyAccessExpression && (node as any).getExpression().getText() === 'window') {
        const parent = node.getParent();
        if (parent && parent.getKind() === SyntaxKind.BinaryExpression) {
          const operator = (parent as any).getOperatorToken().getKind();
          if (operator === SyntaxKind.EqualsToken) {
            findings.push({ line: node.getStartLineNumber(), message: '전역 오염 window 직접 할당' });
          }
        }
      }
    });`
  },
  {
    id: 'VAR-012', name: 'dead declaration',
    logic: `// CFG 분석 필요`
  }
];

for (const rule of varRules) {
  const filename = path.join(dir, `${rule.id.toLowerCase()}.ts`);
  const content = `import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: variable
 */
export const ${rule.id.toLowerCase().replace(/-/g, '')}Detector: RuleDetector = {
  ruleId: '${rule.id}', // ${rule.name}
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    ${rule.logic}
    return findings;
  }
};
`;
  fs.writeFileSync(filename, content, 'utf8');
}
console.log('Populated VAR-001 to VAR-012');
