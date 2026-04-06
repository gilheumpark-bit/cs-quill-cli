import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const prf007Detector: RuleDetector = {
  ruleId: 'PRF-007',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const findCalls: Array<{line: number; arrayName: string}> = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const text = node.getText();
        const match = text.match(/(\w+)\s*\.\s*find\s*\(/);
        if (match) {
          findCalls.push({ line: node.getStartLineNumber(), arrayName: match[1] });
        }
      }
    });

    // Group by array name and flag repeated .find() on same array
    const countByArray = new Map<string, Array<{line: number}>>();
    for (const call of findCalls) {
      if (!countByArray.has(call.arrayName)) countByArray.set(call.arrayName, []);
      countByArray.get(call.arrayName)!.push({ line: call.line });
    }

    for (const [arrayName, calls] of countByArray) {
      if (calls.length >= 2) {
        for (const call of calls) {
          findings.push({
            line: call.line,
            message: `'${arrayName}.find()'가 ${calls.length}회 호출됩니다. Map으로 인덱싱하면 O(1) 조회가 가능합니다.`,
          });
        }
      }
    }

    return findings;
  }
};
