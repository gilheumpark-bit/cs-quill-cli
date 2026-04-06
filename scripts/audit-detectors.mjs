/**
 * Detector 정밀 감사: 미연결(인덱스 미등록), 미배선(파일명≠ruleId),
 * 카탈로그 누락, 스캐폴드/미구현 휴리스틱
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const detDir = path.join(__dirname, '../core/detectors');
const idxPath = path.join(detDir, 'index.ts');
const catalogPath = path.join(__dirname, '../core/rule-catalog.ts');

const idx = fs.readFileSync(idxPath, 'utf8');
const catalog = fs.readFileSync(catalogPath, 'utf8');
const catalogIds = new Set(
  [...catalog.matchAll(/r\('([A-Z]{3}-\d{3})'/g)].map((x) => x[1]),
);

const files = fs
  .readdirSync(detDir)
  .filter((f) => /^[a-z]{3}-\d{3}\.ts$/i.test(f))
  .sort();

const importRe = /from '\.\/([a-z]{3}-\d{3})'/gi;
const imported = new Set();
let m;
while ((m = importRe.exec(idx)) !== null) imported.add(m[1].toLowerCase() + '.ts');

const notImported = files.filter((f) => !imported.has(f.toLowerCase()));
const importGhost = [...imported].filter((f) => !files.includes(f));

function expectedRuleId(fname) {
  const [p, n] = fname.replace('.ts', '').split('-');
  return `${p.toUpperCase()}-${n.padStart(3, '0')}`;
}

function analyzeFile(fname) {
  const s = fs.readFileSync(path.join(detDir, fname), 'utf8');
  const rid = s.match(/ruleId:\s*['"]([A-Z]{3}-\d{3})['"]/);
  const ruleId = rid ? rid[1] : null;
  const expected = expectedRuleId(fname);

  const issues = [];
  if (!/detect\s*:\s*\(/.test(s) && !/detect\s*\(/.test(s))
    issues.push('detect 메서드 없음');

  if (ruleId && ruleId !== expected) issues.push(`ruleId 불일치: 파일=${expected}, 코드=${ruleId}`);
  if (!ruleId) issues.push('ruleId 추출 실패');

  if (ruleId && !catalogIds.has(ruleId)) issues.push(`카탈로그에 없음: ${ruleId}`);

  // 코드 내 includes('TODO') 등은 제외 — 주석/문자열 위주
  const scaffoldMarkers =
    /\/\/[^\n]*(스캐폴딩|임시|미구현|FIXME|placeholder|정밀\s*구현\s*예정)/i.test(s) ||
    /\/\*[\s\S]*?(스캐폴딩|임시|미구현|FIXME|placeholder|정밀\s*구현\s*예정)[\s\S]*?\*\//i.test(
      s,
    ) ||
    /\*\s*[^\n]*(스캐폴딩|임시\s*블록|미구현)/i.test(s);
  if (scaffoldMarkers) issues.push('스캐폴드/미구현 마커(주석)');

  return {
    file: fname,
    ruleId: ruleId || expected,
    issues,
    implNote: scaffoldMarkers ? 'scaffold' : 'ok',
  };
}

const report = files.map(analyzeFile);
const withIssues = report.filter((r) => r.issues.length > 0);

console.log(
  JSON.stringify(
    {
      summary: {
        detectorFiles: files.length,
        indexImports: imported.size,
        notImportedInIndex: notImported,
        indexImportsMissingFile: importGhost,
        catalogRuleCount: catalogIds.size,
        filesWithAnyIssue: withIssues.length,
      },
      bySeverity: {
        structural: notImported.length + importGhost.length,
        perFileIssues: withIssues.length,
      },
      // 전체 목록 (1파일 1행 — 정밀 검사 결과)
      perFile: report,
    },
    null,
    2,
  ),
);
