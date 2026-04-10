const { runQuillWorkspaceRepair, DependencyTracker } = require('./quill-engine');
const fs = require('fs');
const path = require('path');

// 1. 가상 워크스페이스 구축
const libFile = path.resolve('impact-lib.ts');
const mainFile = path.resolve('impact-main.ts');

const libCode = `export const check = (a: any) => a == 1;`; // LOG-001 (==) 포함
// mainCode에 critical 에러(eval)를 포함시켜 롤백 유도
const mainCode = `import { check } from './impact-lib'; \neval("bad code"); \nconsole.log(check(1));`;

fs.writeFileSync(libFile, libCode);
fs.writeFileSync(mainFile, mainCode);

console.log('--- Rollback Test Initialization ---');
console.log('Main file contains a CRITICAL error (eval), which should trigger a global rollback of lib.ts repair.');

async function runTest() {
  try {
    const originalLib = fs.readFileSync(libFile, 'utf-8');
    
    // 2. 글로벌 수리 실행
    console.log('\n--- Running Global Impact Analysis (Expecting Rollback) ---');
    const result = await runQuillWorkspaceRepair(libFile, [libFile, mainFile]);

    if ('dependents' in result) {
       console.log('Result: Global Rollback Triggered!');
       console.log('Blast Radius Dependents:', result.dependents);
       console.log('Integrity Maintained:', result.isTotalIntegrityMaintained);
       
       const currentLib = fs.readFileSync(libFile, 'utf-8');
       if (currentLib === originalLib) {
         console.log('Verification: libFile successfully rolled back to original state.');
       } else {
         console.error('Verification: Rollback FAILED! libFile was modified.');
       }
    } else {
       console.error('Test Failed: Local repair was applied without considering global integrity.');
    }

  } catch (e) {
    console.error('Test Failed with error:', e);
  }
}

runTest();
