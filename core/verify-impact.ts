const { runQuillWorkspaceRepair, DependencyTracker } = require('./quill-engine');
const fs = require('fs');
const path = require('path');

// 1. 가상 워크스페이스 구축
const libFile = path.resolve('impact-lib.ts');
const mainFile = path.resolve('impact-main.ts');

const libCode = `export const VERSION = 1; \nexport const check = (a: any) => a == 1;`; // LOG-001 (==) 포함
const mainCode = `import { check } from './impact-lib'; \nconsole.log(check(1));`;

fs.writeFileSync(libFile, libCode);
fs.writeFileSync(mainFile, mainCode);

console.log('--- Workspace Initialized ---');
console.log('Target:', libFile);
console.log('Dependent:', mainFile);

async function runTest() {
  try {
    // 2. 글로벌 수리 실행
    console.log('\n--- Running Global Impact Analysis & Repair ---');
    const result = await runQuillWorkspaceRepair(libFile, [libFile, mainFile]);

    // 3. 결과 검증
    if ('dependents' in result) {
       console.log('Impact Report Received (Possibility of rollback or deep impact)');
       console.log('Dependents Found:', result.dependents);
       console.log('Integrity Maintained:', result.isTotalIntegrityMaintained);
    } else {
       console.log('Local Repair Succeeded (No blast radius issues)');
       console.log('Repair Count:', result.repairCount);
    }

    // 4. 의존성 그래프 직접 확인
    console.log('\n--- Manually Checking Dependency Graph ---');
    console.log('Dependents of lib.ts:', DependencyTracker.getDependents(libFile));

  } catch (e) {
    console.error('Test Failed:', e);
  } finally {
    // 5. Cleanup
    // fs.unlinkSync(libFile);
    // fs.unlinkSync(mainFile);
  }
}

runTest();
