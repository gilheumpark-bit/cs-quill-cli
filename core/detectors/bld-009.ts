import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config (build/tooling)
 */
export const bld009Detector: RuleDetector = {
  ruleId: 'BLD-009', // peerDependencies 미선언
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // package.json 체크
    return findings;
  }
};
