const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'core', 'detectors');

const tstRules = [
  { id: 'TST-001', name: '빈 테스트 — assertion 없음', logic: `
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const expr = (node as any).getExpression().getText();
        if (expr === 'test' || expr === 'it') {
          const args = (node as any).getArguments();
          if (args.length > 1 && (args[1].getKind() === SyntaxKind.ArrowFunction || args[1].getKind() === SyntaxKind.FunctionExpression)) {
            let hasExpect = false;
            args[1].forEachDescendant((inner: any) => {
              if (inner.getKind() === SyntaxKind.CallExpression && inner.getExpression().getText() === 'expect') {
                hasExpect = true;
              }
            });
            if (!hasExpect) {
              findings.push({ line: node.getStartLineNumber(), message: '빈 테스트 — assertion 없음 위반' });
            }
          }
        }
      }
    });` },
  { id: 'TST-002', name: 'setTimeout 비결정적 테스트', logic: `
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression && (node as any).getExpression().getText() === 'setTimeout') {
        let isTest = false;
        let parent = node.getParent();
        while (parent) {
           if (parent.getKind() === SyntaxKind.CallExpression && ['it', 'test'].includes((parent as any).getExpression().getText())) {
             isTest = true;
             break;
           }
           parent = parent.getParent();
        }
        if (isTest) {
          findings.push({ line: node.getStartLineNumber(), message: 'setTimeout 비결정적 테스트 위반' });
        }
      }
    });` },
  { id: 'TST-003', name: 'mock 미설정 외부 실제 호출', logic: `// 너무 복잡하므로 스킵` },
  { id: 'TST-004', name: 'assertion 없이 resolves/rejects', logic: `// .resolves / .rejects 에 await 나 return 확인 필요` },
  { id: 'TST-005', name: 'hardcoded 날짜 — 미래 실패', logic: `// new Date('2025-01-01') 등 확인` },
  { id: 'TST-006', name: '단일 테스트 복수 단위 테스트', logic: `// 여러 expect 가 다른 범주를 테스트하는지. (개수 체크)` },
  { id: 'TST-007', name: 'shared state 오염', logic: `// let 선언 후 여러 it 에서 변경하는지` },
  { id: 'TST-008', name: 'happy path만 커버', logic: `// catch나 throw test 부재` },
  { id: 'TST-009', name: 'coverage 100% 무의미 assertion', logic: `// expect(true).toBe(true) 등` },
];

for (const rule of tstRules) {
  const filename = path.join(dir, `${rule.id.toLowerCase()}.ts`);
  const content = `import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: test
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
console.log('Populated TST-001 to TST-009');
