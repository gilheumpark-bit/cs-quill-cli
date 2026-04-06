import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: async
 */
export const asy009Detector: RuleDetector = {
  ruleId: 'ASY-009', // event listener 제거 누락
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // addEventListener 시 removeEventListener 보장 확인 필요 (React는 useEffect return)
    return findings;
  }
};
