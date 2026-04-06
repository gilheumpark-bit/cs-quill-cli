import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const typ011Detector: RuleDetector = {
  ruleId: 'TYP-011', // interface vs type alias 혼용
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // 프로젝트 전체 수준 통계가 필요. 파일 단위로는 파악 어려움.
    
    return findings;
  }
};
