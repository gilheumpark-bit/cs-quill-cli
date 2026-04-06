const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'core', 'detectors');

const asyRules = [
  // ASY-001: Already implemented
  {
    id: 'ASY-002', name: 'await in loop — 병렬 처리 가능',
    logic: `
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.AwaitExpression) {
        const parentLoop = node.getFirstAncestorByKind(SyntaxKind.ForStatement) || 
                           node.getFirstAncestorByKind(SyntaxKind.ForInStatement) || 
                           node.getFirstAncestorByKind(SyntaxKind.ForOfStatement) || 
                           node.getFirstAncestorByKind(SyntaxKind.WhileStatement);
        if (parentLoop) {
          findings.push({ line: node.getStartLineNumber(), message: 'await in loop 위반' });
        }
      }
    });`
  },
  {
    id: 'ASY-003', name: 'Unhandled Promise rejection',
    logic: `// Symbol이나 CallExpression chaining 추적 필요 (catch 호출여부)`
  },
  {
    id: 'ASY-004', name: 'async 함수 명시적 return 누락',
    logic: `
    sourceFile.getFunctions().forEach(func => {
      if (func.isAsync() && func.getStatements().length > 0) {
        // 간단한 CFG 검사: 마지막 statement가 Return인지 정도만 확인 (임시)
        const stmts = func.getStatements();
        const last = stmts[stmts.length - 1];
        if (last && last.getKind() !== SyntaxKind.ReturnStatement) {
          // findings.push({ line: func.getStartLineNumber(), message: 'async 함수 return 의심' });
        }
      }
    });`
  },
  {
    id: 'ASY-005', name: '.then() + async/await 혼용',
    logic: `
    sourceFile.getFunctions().forEach(func => {
      if (func.isAsync()) {
        func.forEachDescendant(node => {
          if (node.getKind() === SyntaxKind.PropertyAccessExpression && (node as any).getName() === 'then') {
            findings.push({ line: node.getStartLineNumber(), message: '.then() + async/await 혼용' });
          }
        });
      }
    });`
  },
  {
    id: 'ASY-006', name: 'Promise.all vs 순차 await 오류',
    logic: `// 복수의 연속된 await 식 탐지가 필요`
  },
  {
    id: 'ASY-007', name: 'Promise.race timeout 없음',
    logic: `// Promise.race의 인수로 setTimeout 기반 Promise가 있는지 확인 필요`
  },
  {
    id: 'ASY-008', name: 'await 없는 async 함수',
    logic: `
    sourceFile.getFunctions().forEach(func => {
      if (func.isAsync()) {
        let hasAwait = false;
        func.forEachDescendant(node => {
          if (node.getKind() === SyntaxKind.AwaitExpression) hasAwait = true;
        });
        if (!hasAwait) {
          findings.push({ line: func.getStartLineNumber(), message: 'await 없는 async 함수' });
        }
      }
    });`
  },
  {
    id: 'ASY-009', name: 'event listener 제거 누락',
    logic: `// addEventListener 시 removeEventListener 보장 확인 필요 (React는 useEffect return)`
  },
  {
    id: 'ASY-010', name: 'event listener 중복 등록',
    logic: `// 루프 안이나 React render 내 addEventListener 확인`
  },
  {
    id: 'ASY-011', name: '동기 heavy computation — event loop 블로킹',
    logic: `// readFileSync 등 동기 I/O 함수나 큰 루프 탐지`
  },
  {
    id: 'ASY-012', name: 'setTimeout 내 throw',
    logic: `
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const expr = (node as any).getExpression().getText();
        if (expr === 'setTimeout' || expr === 'setInterval') {
          node.forEachDescendant(inner => {
            if (inner.getKind() === SyntaxKind.ThrowStatement) {
              findings.push({ line: inner.getStartLineNumber(), message: 'setTimeout 내 throw 금지' });
            }
          });
        }
      }
    });`
  },
  {
    id: 'ASY-013', name: 'Promise 생성자 async 콜백',
    logic: `
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.NewExpression && (node as any).getExpression().getText() === 'Promise') {
        const args = (node as any).getArguments();
        if (args.length > 0 && (args[0].getKind() === SyntaxKind.ArrowFunction || args[0].getKind() === SyntaxKind.FunctionExpression)) {
          if ((args[0] as any).hasModifier(SyntaxKind.AsyncKeyword)) {
            findings.push({ line: node.getStartLineNumber(), message: 'Promise 생성자에 async 콜백 금지' });
          }
        }
      }
    });`
  },
  {
    id: 'ASY-014', name: 'for await 없이 async iterable',
    logic: `// TypeChecker로 iterable의 반환 타입이 AsyncIterable인지 확인 필요`
  },
  {
    id: 'ASY-015', name: 'race condition — 공유 상태',
    logic: `// await 전후 상태 변경 추적 필요`
  }
];

for (const rule of asyRules) {
  const filename = path.join(dir, `${rule.id.toLowerCase()}.ts`);
  const content = `import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
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
console.log('Populated ASY-002 to ASY-015');
