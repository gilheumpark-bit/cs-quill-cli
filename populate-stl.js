const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'core', 'detectors');

const stlRules = [
  { id: 'STL-001', name: '단일 문자 변수명 혼동', logic: `
    sourceFile.getVariableDeclarations().forEach(decl => {
      const name = decl.getName();
      if (name.length === 1 && !['i', 'j', 'k', '_', 'e'].includes(name)) {
        findings.push({ line: decl.getStartLineNumber(), message: '단일 문자 변수명 위반: ' + name });
      }
    });` },
  { id: 'STL-002', name: '함수명 동사 없음', logic: `// 정규식 등 영어 품사 판별 필요` },
  { id: 'STL-003', name: 'boolean is/has/can 없음', logic: `
    sourceFile.getVariableDeclarations().forEach(decl => {
      // boolean 타입 명시된 경우만 체크
      const type = decl.getTypeNode();
      if (type && type.getKind() === SyntaxKind.BooleanKeyword) {
        const name = decl.getName();
        if (!/^(is|has|can|should|will)/.test(name)) {
          findings.push({ line: decl.getStartLineNumber(), message: 'boolean 명명 위반: ' + name });
        }
      }
    });` },
  { id: 'STL-004', name: '상수 소문자', logic: `
    sourceFile.getVariableStatements().forEach(stmt => {
      if (stmt.getDeclarationKind() === 'const') {
        stmt.getDeclarations().forEach(decl => {
          const name = decl.getName();
          // primitive literal만 대상으로 할 경우 조건 추가 필요
          if (name.length > 3 && name === name.toLowerCase() && name.includes('_')) {
             // SNAKE_CASE 여야 하는데 snake_case인 경우
             findings.push({ line: decl.getStartLineNumber(), message: '상수 대문자 위반: ' + name });
          }
        });
      }
    });` },
  { id: 'STL-005', name: '파일명 대소문자 불일치', logic: `// 파일 시스템 레벨 검사` },
  { id: 'STL-006', name: '과도한 주석 (AI 특성)', logic: `// 파일 단위 주석 비율 체크` },
  { id: 'STL-007', name: '주석 vs 코드 불일치', logic: `// AI/NLP 필요` },
  { id: 'STL-008', name: '빈 줄 과다 3줄+', logic: `
    const text = sourceFile.getFullText();
    const lines = text.split('\\n');
    let emptyCount = 0;
    lines.forEach((line, i) => {
      if (line.trim() === '') {
        emptyCount++;
        if (emptyCount === 3) {
           findings.push({ line: i + 1, message: '빈 줄 3줄 이상 위반' });
        }
      } else {
        emptyCount = 0;
      }
    });` },
  { id: 'STL-009', name: 'quote style 불일치', logic: `// Prettier 등 도구 권장` },
  { id: 'STL-010', name: 'TODO/FIXME/HACK 잔류', logic: `
    const text = sourceFile.getFullText();
    const lines = text.split('\\n');
    lines.forEach((line, i) => {
      if (/(TODO|FIXME|HACK):?/.test(line)) {
        findings.push({ line: i + 1, message: 'TODO/FIXME/HACK 발견' });
      }
    });` },
];

for (const rule of stlRules) {
  const filename = path.join(dir, `${rule.id.toLowerCase()}.ts`);
  const content = `import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: style
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
console.log('Populated STL-001 to STL-010');
