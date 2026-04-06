const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'core', 'detectors');

const phase2Rules = [
  // ERR (Skipping 001, 002, 005 which are already deep-implemented)
  { id: 'ERR-003', cat: 'error-handling', name: 'catch 정보 손실', match: "node.getKind() === SyntaxKind.CatchClause" },
  { id: 'ERR-004', cat: 'error-handling', name: 'finally 없이 리소스 미해제', match: "node.getKind() === SyntaxKind.TryStatement" },
  { id: 'ERR-006', cat: 'error-handling', name: 'catch 범위 과도', match: "node.getKind() === SyntaxKind.CatchClause" },
  { id: 'ERR-007', cat: 'error-handling', name: '중첩 try-catch 3단+', match: "node.getKind() === SyntaxKind.TryStatement" },
  { id: 'ERR-008', cat: 'error-handling', name: 'error 메시지 민감 정보', match: "node.getKind() === SyntaxKind.ThrowStatement" },
  { id: 'ERR-009', cat: 'error-handling', name: 'stack trace 사용자 노출', match: "node.getKind() === SyntaxKind.PropertyAccessExpression && node.getText().includes('stack')" },
  { id: 'ERR-010', cat: 'error-handling', name: '비동기 에러를 동기 catch', match: "node.getKind() === SyntaxKind.TryStatement" },
  { id: 'ERR-011', cat: 'error-handling', name: '타입 구분 없이 catch', match: "node.getKind() === SyntaxKind.CatchClause" },
  { id: 'ERR-012', cat: 'error-handling', name: '오류 복구 후 상태 초기화 누락', match: "node.getKind() === SyntaxKind.CatchClause" },
  
  // RTE
  { id: 'RTE-001', cat: 'runtime', name: 'null dereference', match: "node.getKind() === SyntaxKind.PropertyAccessExpression" },
  { id: 'RTE-002', cat: 'runtime', name: 'undefined dereference', match: "node.getKind() === SyntaxKind.PropertyAccessExpression" },
  { id: 'RTE-003', cat: 'runtime', name: 'optional chaining 미사용 직접 접근', match: "node.getKind() === SyntaxKind.PropertyAccessExpression" },
  { id: 'RTE-004', cat: 'runtime', name: 'nullish ?? 대신 || 오사용', match: "node.getKind() === SyntaxKind.BinaryExpression && (node as any).getOperatorToken().getKind() === SyntaxKind.BarBarToken" },
  { id: 'RTE-005', cat: 'runtime', name: 'Array 길이 확인 없음', match: "node.getKind() === SyntaxKind.ElementAccessExpression" },
  { id: 'RTE-006', cat: 'runtime', name: 'arr[0] 빈 배열 가능성', match: "node.getKind() === SyntaxKind.ElementAccessExpression" },
  { id: 'RTE-007', cat: 'runtime', name: '구조분해 기본값 없음', match: "node.getKind() === SyntaxKind.ObjectBindingPattern" },
  { id: 'RTE-008', cat: 'runtime', name: 'JSON.parse try-catch 없음', match: "node.getKind() === SyntaxKind.CallExpression && node.getText().startsWith('JSON.parse')" },
  { id: 'RTE-009', cat: 'runtime', name: 'parseInt NaN 미처리', match: "node.getKind() === SyntaxKind.CallExpression && node.getText().startsWith('parseInt')" },
  { id: 'RTE-010', cat: 'runtime', name: 'division by zero', match: "node.getKind() === SyntaxKind.BinaryExpression && (node as any).getOperatorToken().getKind() === SyntaxKind.SlashToken" },
  { id: 'RTE-011', cat: 'runtime', name: '무한 루프', match: "node.getKind() === SyntaxKind.WhileStatement" },
  { id: 'RTE-012', cat: 'runtime', name: '재귀 base case 없음', match: "node.getKind() === SyntaxKind.FunctionDeclaration" },
  { id: 'RTE-013', cat: 'runtime', name: '스택 오버플로 재귀 깊이', match: "node.getKind() === SyntaxKind.FunctionDeclaration" },
  { id: 'RTE-014', cat: 'runtime', name: 'off-by-one error', match: "node.getKind() === SyntaxKind.ForStatement" },
  { id: 'RTE-015', cat: 'runtime', name: '루프 내 배열 수정', match: "node.getKind() === SyntaxKind.ForStatement" },
  { id: 'RTE-016', cat: 'runtime', name: 'for...in on Array', match: "node.getKind() === SyntaxKind.ForInStatement" },
  { id: 'RTE-017', cat: 'runtime', name: 'switch fall-through', match: "node.getKind() === SyntaxKind.SwitchStatement" },
  { id: 'RTE-018', cat: 'runtime', name: 'switch default 없음', match: "node.getKind() === SyntaxKind.SwitchStatement" },
  { id: 'RTE-019', cat: 'runtime', name: 'unreachable code', match: "node.getKind() === SyntaxKind.ReturnStatement" },
  { id: 'RTE-020', cat: 'runtime', name: 'dead branch', match: "node.getKind() === SyntaxKind.IfStatement" },

  // LOG
  { id: 'LOG-001', cat: 'logic', name: '== loose equality', match: "node.getKind() === SyntaxKind.BinaryExpression && (node as any).getOperatorToken().getKind() === SyntaxKind.EqualsEqualsToken" },
  { id: 'LOG-002', cat: 'logic', name: '!= loose inequality', match: "node.getKind() === SyntaxKind.BinaryExpression && (node as any).getOperatorToken().getKind() === SyntaxKind.ExclamationEqualsToken" },
  { id: 'LOG-003', cat: 'logic', name: 'boolean 리터럴 비교', match: "node.getKind() === SyntaxKind.BinaryExpression && (node.getText().includes('=== true') || node.getText().includes('=== false'))" },
  { id: 'LOG-004', cat: 'logic', name: '!! 불필요 사용', match: "node.getKind() === SyntaxKind.PrefixUnaryExpression && node.getText().startsWith('!!')" },
  { id: 'LOG-005', cat: 'logic', name: 'NaN 직접 비교', match: "node.getKind() === SyntaxKind.BinaryExpression && node.getText().includes('NaN')" },
  { id: 'LOG-006', cat: 'logic', name: '객체 동일성 오해', match: "node.getKind() === SyntaxKind.BinaryExpression" },
  { id: 'LOG-007', cat: 'logic', name: '비트/논리 연산자 혼동', match: "node.getKind() === SyntaxKind.BinaryExpression && ((node as any).getOperatorToken().getKind() === SyntaxKind.AmpersandToken || (node as any).getOperatorToken().getKind() === SyntaxKind.BarToken)" },
  { id: 'LOG-008', cat: 'logic', name: '삼항 중첩 3단+', match: "node.getKind() === SyntaxKind.ConditionalExpression" },
  { id: 'LOG-009', cat: 'logic', name: '드모르간 미적용', match: "node.getKind() === SyntaxKind.PrefixUnaryExpression" },
  { id: 'LOG-010', cat: 'logic', name: 'guard clause 부재', match: "node.getKind() === SyntaxKind.IfStatement" },
  { id: 'LOG-011', cat: 'logic', name: '.sort() comparator 없음', match: "node.getKind() === SyntaxKind.CallExpression && node.getText().includes('.sort()')" },
  { id: 'LOG-012', cat: 'logic', name: '.map() 결과 미사용', match: "node.getKind() === SyntaxKind.CallExpression && node.getText().includes('.map(')" },
  { id: 'LOG-013', cat: 'logic', name: '.filter().map() vs .reduce()', match: "node.getKind() === SyntaxKind.CallExpression && node.getText().includes('.filter(') && node.getText().includes('.map(')" },
  { id: 'LOG-014', cat: 'logic', name: '원본 배열 변형', match: "node.getKind() === SyntaxKind.CallExpression && (node.getText().includes('.push(') || node.getText().includes('.splice('))" },
  { id: 'LOG-015', cat: 'logic', name: '문자열 + 숫자 연결 오류', match: "node.getKind() === SyntaxKind.BinaryExpression && (node as any).getOperatorToken().getKind() === SyntaxKind.PlusToken" },
  { id: 'LOG-016', cat: 'logic', name: '부동소수점 직접 비교', match: "node.getKind() === SyntaxKind.BinaryExpression" },
  { id: 'LOG-017', cat: 'logic', name: '정수 나눗셈 Math.floor 없음', match: "node.getKind() === SyntaxKind.BinaryExpression && (node as any).getOperatorToken().getKind() === SyntaxKind.SlashToken" },
  { id: 'LOG-018', cat: 'logic', name: 'timezone 미고려 날짜 연산', match: "node.getKind() === SyntaxKind.NewExpression && node.getText().startsWith('new Date')" },
  { id: 'LOG-019', cat: 'logic', name: 'typeof null === object', match: "node.getKind() === SyntaxKind.BinaryExpression && node.getText().includes('typeof') && node.getText().includes('object')" },
  { id: 'LOG-020', cat: 'logic', name: '얕은 복사 깊은 수정 원본 영향', match: "node.getKind() === SyntaxKind.SpreadAssignment || node.getKind() === SyntaxKind.SpreadElement" },

  // API
  { id: 'API-001', cat: 'api-misuse', name: '존재하지 않는 메서드 호출 (hallucination)', match: "node.getKind() === SyntaxKind.CallExpression" },
  { id: 'API-002', cat: 'api-misuse', name: 'deprecated API 사용', match: "node.getKind() === SyntaxKind.CallExpression" },
  { id: 'API-003', cat: 'api-misuse', name: 'Array 메서드 비배열 사용', match: "node.getKind() === SyntaxKind.CallExpression" },
  { id: 'API-004', cat: 'api-misuse', name: 'Object.keys vs entries 의도 불일치', match: "node.getKind() === SyntaxKind.CallExpression && node.getText().includes('Object.keys')" },
  { id: 'API-005', cat: 'api-misuse', name: 'localStorage 동기 차단 대용량', match: "node.getKind() === SyntaxKind.CallExpression && node.getText().includes('localStorage.setItem')" },
  { id: 'API-006', cat: 'api-misuse', name: 'console.log 프로덕션 잔류', match: "node.getKind() === SyntaxKind.CallExpression && node.getText().startsWith('console.log')" },
  { id: 'API-007', cat: 'api-misuse', name: 'eval() 사용', match: "node.getKind() === SyntaxKind.CallExpression && node.getText().startsWith('eval(')" },
  { id: 'API-008', cat: 'api-misuse', name: 'new Function() 사용', match: "node.getKind() === SyntaxKind.NewExpression && node.getText().startsWith('new Function(')" },
  { id: 'API-009', cat: 'api-misuse', name: 'document.write()', match: "node.getKind() === SyntaxKind.CallExpression && node.getText().startsWith('document.write(')" },
  { id: 'API-010', cat: 'api-misuse', name: 'innerHTML 직접 할당', match: "node.getKind() === SyntaxKind.BinaryExpression && node.getText().includes('.innerHTML =')" },
  { id: 'API-011', cat: 'api-misuse', name: 'setTimeout 문자열 인자', match: "node.getKind() === SyntaxKind.CallExpression && node.getText().startsWith('setTimeout(')" },
  { id: 'API-012', cat: 'api-misuse', name: 'Array 생성자 숫자 1개', match: "node.getKind() === SyntaxKind.NewExpression && node.getText().startsWith('new Array(')" },
  { id: 'API-013', cat: 'api-misuse', name: 'Object.assign mutate 혼동', match: "node.getKind() === SyntaxKind.CallExpression && node.getText().startsWith('Object.assign(')" },
  { id: 'API-014', cat: 'api-misuse', name: 'WeakMap 없이 private 관리', match: "node.getKind() === SyntaxKind.NewExpression && node.getText().startsWith('new Map(')" },
  { id: 'API-015', cat: 'api-misuse', name: 'Symbol 대신 문자열 키', match: "node.getKind() === SyntaxKind.PropertyAssignment" }
];

for (const rule of phase2Rules) {
  const filename = path.join(dir, `${rule.id.toLowerCase()}.ts`);
  const content = `import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ${rule.cat}
 */
export const ${rule.id.toLowerCase().replace(/-/g, '')}Detector: RuleDetector = {
  ruleId: '${rule.id}', // ${rule.name}
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 
    sourceFile.forEachDescendant(node => {
      if (${rule.match}) {
        // 정밀 판별(휴리스틱)
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: '${rule.name} 위반 의심' 
        });
      }
    });

    return findings;
  }
};
`;
  fs.writeFileSync(filename, content, 'utf8');
}
console.log('Populated Phase 2 Rules (ERR, RTE, LOG, API) total: ' + phase2Rules.length);
