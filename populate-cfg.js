const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'core', 'detectors');

const cfgRules = [
  { id: 'CFG-001', name: 'strict: false', logic: `
    // tsconfig.json 체크용이므로 소스코드 레벨에서는 보통 스킵
    ` },
  { id: 'CFG-002', name: 'noUnusedLocals: false', logic: `// tsconfig.json 체크` },
  { id: 'CFG-003', name: 'skipLibCheck: true', logic: `// tsconfig.json 체크` },
  { id: 'CFG-004', name: 'target: ES3', logic: `// tsconfig.json 체크` },
  { id: 'CFG-005', name: 'moduleResolution 부재', logic: `// tsconfig.json 체크` },
  { id: 'CFG-006', name: 'paths alias 불일치', logic: `// 프로젝트 레벨 체크` },
  { id: 'CFG-007', name: '순환 의존성', logic: `// Madge 등 외부 도구 필요` },
  { id: 'CFG-008', name: 'devDeps vs deps 분류 오류', logic: `// package.json 체크` },
  { id: 'CFG-009', name: 'peerDependencies 미선언', logic: `// package.json 체크` },
  { id: 'CFG-010', name: '.env git 추적 포함', logic: `// .gitignore 체크` },
  { id: 'CFG-011', name: 'devDeps 프로덕션 빌드 포함', logic: `// package.json 체크` },
];

for (const rule of cfgRules) {
  const filename = path.join(dir, `${rule.id.toLowerCase()}.ts`);
  const content = `import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: config
 */
export const ${rule.id.toLowerCase().replace(/-/g, '')}Detector: RuleDetector = {
  ruleId: '${rule.id}', // ${rule.name}
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    ${rule.logic}
    return findings;
  }
};
`;
  fs.writeFileSync(filename, content, 'utf8');
}
console.log('Populated CFG-001 to CFG-011');
