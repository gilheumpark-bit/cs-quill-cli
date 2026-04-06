import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

const LAYOUT_FORCING_PROPS = [
  'offsetTop', 'offsetLeft', 'offsetWidth', 'offsetHeight',
  'scrollTop', 'scrollLeft', 'scrollWidth', 'scrollHeight',
  'clientTop', 'clientLeft', 'clientWidth', 'clientHeight',
  'getBoundingClientRect', 'getComputedStyle',
];

export const prf009Detector: RuleDetector = {
  ruleId: 'PRF-009',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const text = node.getText();
        // Check if addEventListener('scroll', ...) callback contains layout-forcing reads
        if (text.includes('addEventListener') && text.includes('scroll')) {
          for (const prop of LAYOUT_FORCING_PROPS) {
            if (text.includes(prop)) {
              findings.push({
                line: node.getStartLineNumber(),
                message: `scroll 이벤트 핸들러 내에서 레이아웃 강제 속성(${prop})을 읽고 있습니다. requestAnimationFrame으로 감싸거나 IntersectionObserver 사용을 고려하세요.`,
              });
              break;
            }
          }
        }
      }

      // Also detect layout-forcing property access patterns
      if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
        const propName = node.getText().split('.').pop() ?? '';
        if (LAYOUT_FORCING_PROPS.includes(propName)) {
          // Check if inside a function that looks like a scroll handler
          let parent = node.getParent();
          while (parent) {
            if (parent.getKind() === SyntaxKind.CallExpression &&
                parent.getText().includes('scroll')) {
              findings.push({
                line: node.getStartLineNumber(),
                message: `scroll 관련 컨텍스트에서 레이아웃 강제 속성(${propName})에 접근하고 있습니다. 강제 리플로우가 발생할 수 있습니다.`,
              });
              break;
            }
            parent = parent.getParent();
          }
        }
      }
    });

    return findings;
  }
};
