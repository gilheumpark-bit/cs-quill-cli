import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * AIP-004: By-the-book 고집 (By-the-book stubbornness)
 * AI tends to over-engineer with excessive abstraction layers (interfaces, abstract classes,
 * design pattern boilerplate) even for simple tasks. Detects suspicious over-abstraction.
 */
export const aip004Detector: RuleDetector = {
  ruleId: 'AIP-004',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const totalLines = sourceFile.getEndLineNumber();

    // Heuristic: too many interfaces/type aliases in a small file
    const interfaces = sourceFile.getInterfaces();
    const typeAliases = sourceFile.getTypeAliases();
    const abstractCount = interfaces.length + typeAliases.length;

    const functions = sourceFile.getFunctions();
    const classes = sourceFile.getClasses();
    const implCount = functions.length + classes.length;

    // Flag if type definitions vastly outnumber implementations in a non-.d.ts file
    if (!sourceFile.getFilePath().endsWith('.d.ts') && abstractCount > 4 && implCount > 0 && abstractCount > implCount * 2) {
      findings.push({
        line: 1,
        message: `By-the-book 고집: 타입 정의(${abstractCount}개)가 구현(${implCount}개)의 2배 초과 — 과도한 추상화 의심`,
      });
    }

    // Detect abstract classes that only have abstract members (no implementation)
    for (const cls of classes) {
      if (!cls.isAbstract()) continue;
      const methods = cls.getMethods();
      const allAbstract = methods.length > 0 && methods.every(m => m.isAbstract());
      if (allAbstract && methods.length >= 2) {
        findings.push({
          line: cls.getStartLineNumber(),
          message: `By-the-book 고집: 추상 클래스 '${cls.getName() ?? '(anonymous)'}' 의 모든 메서드가 abstract — interface로 대체 가능`,
        });
      }
    }

    return findings;
  }
};
