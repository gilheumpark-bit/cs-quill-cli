import { RuleDetector } from '../detector-registry';
import { SyntaxKind, FunctionDeclaration, MethodDeclaration } from 'ts-morph';

/**
 * AIP-002: 리팩터링 회피 — 중복 구현 (Refactoring avoidance — duplicate implementation)
 * Detects functions with very similar bodies (same structure, same statement count)
 * that could be refactored into a single parameterized function.
 */
export const aip002Detector: RuleDetector = {
  ruleId: 'AIP-002',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    type FnLike = FunctionDeclaration | MethodDeclaration;
    const fns: FnLike[] = [
      ...sourceFile.getFunctions(),
      ...sourceFile.getClasses().flatMap(c => c.getMethods()),
    ];

    // Build a "signature" for each function body to detect near-duplicates
    const signatures = fns.map(fn => {
      const body = fn.getBody();
      if (!body) return { fn, sig: '' };
      const stmts = body.getDescendantStatements();
      // Signature: sequence of statement kinds + rough token count
      const sig = stmts.map(s => `${s.getKind()}:${Math.floor(s.getText().length / 20)}`).join('|');
      return { fn, sig };
    }).filter(e => e.sig.length > 0);

    for (let i = 0; i < signatures.length; i++) {
      for (let j = i + 1; j < signatures.length; j++) {
        const a = signatures[i], b = signatures[j];
        if (a.sig === b.sig && a.sig.split('|').length >= 3) {
          findings.push({
            line: b.fn.getStartLineNumber(),
            message: `중복 구현 의심: '${b.fn.getName() ?? '(anonymous)'}' 함수가 '${a.fn.getName() ?? '(anonymous)'}' (line ${a.fn.getStartLineNumber()})와 구조적으로 동일함 — 리팩터링 필요`,
          });
        }
      }
    }

    return findings;
  }
};
