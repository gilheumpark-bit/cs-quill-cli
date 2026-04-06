import { RuleDetector } from '../detector-registry';
import { SyntaxKind, CallExpression, PropertyAccessExpression } from 'ts-morph';

const SYNC_BLOCKING = new Set([
  'readFileSync',
  'writeFileSync',
  'appendFileSync',
  'readdirSync',
  'statSync',
  'lstatSync',
  'existsSync',
  'mkdirSync',
  'rmSync',
  'copyFileSync',
  'readSync',
  'writeSync',
  'execSync',
  'spawnSync',
  'execFileSync',
]);

/**
 * Phase / Rule Category: async
 * Node 동기 I/O / 블로킹 API 호출
 */
export const asy011Detector: RuleDetector = {
  ruleId: 'ASY-011', // 동기 heavy computation — event loop 블로킹
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.CallExpression) return;
      const call = node as CallExpression;
      const callee = call.getExpression();
      let name: string | undefined;
      if (callee.getKind() === SyntaxKind.PropertyAccessExpression) {
        name = (callee as PropertyAccessExpression).getName();
      } else if (callee.getKind() === SyntaxKind.Identifier) {
        name = callee.getText();
      }
      if (name && SYNC_BLOCKING.has(name)) {
        findings.push({
          line: call.getStartLineNumber(),
          message: `동기 블로킹 API ${name}() 호출 (ASY-011). 비동기·스트리밍으로 바꾸는 것을 검토하세요.`,
        });
      }
    });

    return findings;
  },
};
