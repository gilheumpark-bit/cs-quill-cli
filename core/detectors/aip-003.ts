import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * AIP-003: 엣지 케이스 과잉 명세 (Edge case over-specification)
 * AI code tends to add excessive defensive checks. Detects functions with
 * an unusually high density of if-statements checking for null/undefined/edge cases.
 */
export const aip003Detector: RuleDetector = {
  ruleId: 'AIP-003',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    const allFns = [
      ...sourceFile.getFunctions(),
      ...sourceFile.getClasses().flatMap(c => c.getMethods()),
    ];

    for (const fn of allFns) {
      const body = fn.getBody();
      if (!body) continue;
      const stmts = body.getDescendantStatements();
      const totalStmts = stmts.length;
      if (totalStmts < 5) continue;

      // Count if-statements that check for null, undefined, typeof, length === 0, etc.
      let edgeGuards = 0;
      const edgePatterns = /(?:=== (?:null|undefined|void 0|''|0|false))|(?:!== (?:null|undefined))|(?:typeof\s+\w+)|(?:\.length\s*===?\s*0)|(?:!\w+)/;
      body.getDescendantsOfKind(SyntaxKind.IfStatement).forEach(ifStmt => {
        const cond = ifStmt.getExpression().getText();
        if (edgePatterns.test(cond)) edgeGuards++;
      });

      if (edgeGuards >= 4 && edgeGuards / totalStmts > 0.4) {
        findings.push({
          line: fn.getStartLineNumber(),
          message: `엣지 케이스 과잉 명세: '${fn.getName() ?? '(anonymous)'}' 함수에 방어적 가드가 ${edgeGuards}개 (전체 ${totalStmts}문 중 ${Math.round(edgeGuards / totalStmts * 100)}%) — 과잉 방어 패턴`,
        });
      }
    }

    return findings;
  }
};
