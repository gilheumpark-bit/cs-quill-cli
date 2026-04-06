import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';
import { findSwitchFallThroughs } from './rte-helpers';

export const rte017Detector: RuleDetector = {
  ruleId: 'RTE-017',
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    sourceFile.forEachDescendant((node) => {
      if (node.getKind() !== SyntaxKind.SwitchStatement) return;
      const sw = node as import('ts-morph').SwitchStatement;
      for (const line of findSwitchFallThroughs(sw)) {
        findings.push({
          line,
          message: 'switch case fall-through — break/return/throw 없이 다음 case로 진행',
        });
      }
    });
    return findings;
  },
};
