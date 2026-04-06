import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

export const prf010Detector: RuleDetector = {
  ruleId: 'PRF-010',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const text = node.getText();

        // useSelector(state => state) — subscribing to entire store
        if (/useSelector\s*\(\s*\(?\s*state\s*\)?\s*=>\s*state\s*\)/.test(text)) {
          findings.push({
            line: node.getStartLineNumber(),
            message: 'useSelector로 전체 상태를 구독하고 있습니다. 필요한 슬라이스만 선택하세요.',
          });
        }

        // useSelector(state => state.xxx) is fine, but useSelector((s) => s) is not
        if (/useSelector\s*\(\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\s*\)/.test(text) &&
            !/useSelector\s*\(\s*\(?\s*\w+\s*\)?\s*=>\s*\w+\s*\./.test(text)) {
          // Entire state returned without property access
          if (!findings.some(f => f.line === node.getStartLineNumber())) {
            findings.push({
              line: node.getStartLineNumber(),
              message: 'useSelector에서 상태 전체를 반환하고 있습니다. 특정 프로퍼티만 선택하여 불필요한 리렌더링을 방지하세요.',
            });
          }
        }

        // Also detect store.getState() usage in render context
        if (text.includes('store.getState()') || text.includes('getState()')) {
          findings.push({
            line: node.getStartLineNumber(),
            message: 'getState()로 전체 상태를 직접 가져오고 있습니다. 선택적 구독 패턴을 사용하세요.',
          });
        }
      }
    });

    return findings;
  }
};
