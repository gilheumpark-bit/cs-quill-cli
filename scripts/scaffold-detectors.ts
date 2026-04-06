import * as fs from 'fs';
import * as path from 'path';
import { RULE_CATALOG } from '../core/rule-catalog';

const DETECTORS_DIR = path.join(__dirname, '../core/detectors');

async function scaffold() {
  if (!fs.existsSync(DETECTORS_DIR)) {
    fs.mkdirSync(DETECTORS_DIR, { recursive: true });
  }

  let indexContent = `import { detectorRegistry } from '../detector-registry';\n\n`;
  let registerContent = `// [CS Quill 정밀 기계 탑재 구역]\n`;

  let count = 0;

  for (const rule of RULE_CATALOG) {
    const fileName = rule.id.toLowerCase();
    const filePath = path.join(DETECTORS_DIR, `${fileName}.ts`);
    const varName = `${fileName.replace(/-/g, '')}Detector`;

    // Only generate if it doesn't exist
    if (!fs.existsSync(filePath)) {
      const template = `import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ${rule.category}
 * Severity: ${rule.severity} | Confidence: ${rule.confidence}
 */
export const ${varName}: RuleDetector = {
  ruleId: '${rule.id}', // ${rule.title}
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // TODO: Implement precise AST matching logic for ${rule.title}
    /*
    sourceFile.forEachDescendant(node => {
      // if (node.getKind() === SyntaxKind.TargetNode) {
      //   findings.push({ line: node.getStartLineNumber(), message: '${rule.title} 위반' });
      // }
    });
    */

    return findings;
  }
};
`;
      fs.writeFileSync(filePath, template, 'utf-8');
      count++;
    }

    indexContent += `import { ${varName} } from './${fileName}';\n`;
    registerContent += `detectorRegistry.register(${varName});\n`;
  }

  indexContent += `\n${registerContent}\n`;
  indexContent += `export function loadAllDetectors() {\n  return detectorRegistry;\n}\n`;

  fs.writeFileSync(path.join(DETECTORS_DIR, 'index.ts'), indexContent, 'utf-8');

  console.log(`✅ Successfully scaffolded ${count} new rule detectors.`);
  console.log(`✅ Updated index.ts to register all ${RULE_CATALOG.length} rules.`);
}

scaffold().catch(console.error);
