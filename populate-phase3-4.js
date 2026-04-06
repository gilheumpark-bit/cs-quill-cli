const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'core', 'detectors');

const populateCategory = (prefix, totalCount, catName, matchLogic) => {
  let count = 0;
  for (let i = 1; i <= totalCount; i++) {
    const idNum = String(i).padStart(3, '0');
    const id = `${prefix}-${idNum}`;
    const filename = path.join(dir, `${id.toLowerCase()}.ts`);
    if (!fs.existsSync(filename)) {
        console.warn('File not found: ' + filename);
        continue;
    }
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
total += populateCategory('SEC', 27, 'security', "node.getKind() === SyntaxKind.CallExpression && node.getText().includes('eval')");
total += populateCategory('CMX', 18, 'complexity', "node.getKind() === SyntaxKind.FunctionDeclaration && node.getText().split('\\n').length > 50");
total += populateCategory('AIP', 12, 'ai-antipattern', "node.getKind() === SyntaxKind.Identifier && node.getText().includes('TODO')");
total += populateCategory('PRF', 10, 'performance', "node.getKind() === SyntaxKind.CallExpression && node.getText().includes('map')");
total += populateCategory('RES', 8, 'resource', "node.getKind() === SyntaxKind.CallExpression && node.getText().includes('setTimeout')");
total += populateCategory('CFG', 11, 'build-config', "node.getKind() === SyntaxKind.StringLiteral && node.getText().includes('webpack')");
total += populateCategory('TST', 9, 'test', "node.getKind() === SyntaxKind.CallExpression && node.getText().includes('test')");
total += populateCategory('STL', 10, 'style', "node.getKind() === SyntaxKind.FunctionDeclaration && node.getText().includes('any')");

console.log('Populated Phase 3 & 4 Rules (SEC, CMX, AIP, PRF, RES, CFG, TST, STL) total: ' + total);
