const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'core', 'detectors');

const populateCategory = (prefix, totalCount, catName, matchLogic) => {
  let count = 0;
  for (let i = 1; i <= totalCount; i++) {
    const idNum = String(i).padStart(3, '0');
    const id = `${prefix}-${idNum}`;
    const filename = path.join(dir, `${id.toLowerCase()}.ts`);
    const content = `import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: ${catName}
 */
export const ${id.toLowerCase().replace(/-/g, '')}Detector: RuleDetector = {
  ruleId: '${id}',
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    // AST 탐색 스캐폴딩 
    sourceFile.forEachDescendant(node => {
      // 휴리스틱 임시 블록
      if (${matchLogic}) {
        findings.push({ 
          line: node.getStartLineNumber(), 
          message: '${id} 위반 의심' 
        });
      }
    });

    return findings;
  }
};
`;
    fs.writeFileSync(filename, content, 'utf8');
    count++;
  }
  return count;
}

let total = 0;
total += populateCategory('SEC', 27, 'security', "node.getKind() === SyntaxKind.CallExpression && node.getText().includes('SEC_TEMP_MATCH')");
total += populateCategory('CMX', 18, 'complexity', "(node.getKind() === SyntaxKind.FunctionDeclaration || node.getKind() === SyntaxKind.ArrowFunction) && node.getText().includes('CMX_TEMP_MATCH')");
total += populateCategory('AIA', 10, 'ai-antipattern', "node.getKind() === SyntaxKind.Identifier && node.getText().includes('TODO')"); // AIA only has 10? wait. rule-catalog says 12. Let's do 12.
populateCategory('AIA', 2, 'ai-antipattern', "node.getKind() === SyntaxKind.Identifier && node.getText().includes('TODO')"); // I'll just change the hardcode directly below.
