import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 */
export const stl005Detector: RuleDetector = {
  ruleId: 'STL-005', // 파일명 대소문자 불일치
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // 파일 시스템 레벨 검사
    return findings;
  }
};
