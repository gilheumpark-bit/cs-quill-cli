import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
 */
export const stl006Detector: RuleDetector = {
  ruleId: 'STL-006', // 과도한 주석 (AI 특성)
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    // 파일 단위 주석 비율 체크
    return findings;
  }
};
