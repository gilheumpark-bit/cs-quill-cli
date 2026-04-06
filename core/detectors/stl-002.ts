import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

const VERB_PREFIXES = /^(get|set|is|has|can|should|will|did|was|create|make|build|fetch|load|save|update|delete|remove|add|insert|find|search|check|validate|compute|calculate|handle|on|init|parse|format|render|transform|convert|process|map|filter|reduce|sort|merge|split|join|compare|test|assert|verify|ensure|enable|disable|show|hide|open|close|start|stop|run|execute|apply|reset|clear|read|write|send|receive|emit|dispatch|subscribe|unsubscribe|listen|trigger|notify|log|print|debug|warn|throw)/i;

export const stl002Detector: RuleDetector = {
  ruleId: 'STL-002',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    for (const fn of sourceFile.getFunctions()) {
      const name = fn.getName();
      if (!name) continue; // anonymous function
      if (name.length <= 2) continue; // too short to judge

      if (!VERB_PREFIXES.test(name)) {
        findings.push({
          line: fn.getStartLineNumber(),
          message: `함수명 '${name}'에 동사가 없습니다. 함수명은 동작을 나타내는 동사로 시작해야 합니다.`,
        });
      }
    }

    // Also check method declarations
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.MethodDeclaration) {
        const name = node.getChildAtIndex(0)?.getText() ?? '';
        if (!name || name.length <= 2) return;
        // Skip lifecycle methods and constructors
        if (['constructor', 'render', 'ngOnInit', 'ngOnDestroy', 'componentDidMount',
             'componentWillUnmount', 'toString', 'valueOf', 'toJSON'].includes(name)) return;

        if (!VERB_PREFIXES.test(name)) {
          findings.push({
            line: node.getStartLineNumber(),
            message: `메서드명 '${name}'에 동사가 없습니다. 메서드명은 동작을 나타내는 동사로 시작해야 합니다.`,
          });
        }
      }
    });

    return findings;
  }
};
