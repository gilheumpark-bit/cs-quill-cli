const { runQuillWithRepair } = require('./quill-engine');
const aiBridge = require('./ai-bridge');

// 1. AI 호출 모킹 (테스트를 위해)
const originalQuickAsk = aiBridge.quickAsk;
aiBridge.quickAsk = async (prompt, system, task) => {
  console.log('\n[MOCK AI] Received Prompt:', prompt.substring(0, 100) + '...');
  
  // SEC-006 (eval) 수리 요청인 경우 안전한 코드로 변환 시뮬레이션
  if (prompt.includes('SEC-006')) {
    return 'const result = 1 + 1; // AI Patched: Removed eval';
  }
  return null;
};

// 2. 테스트 코드 준비
const code = `
function risky() {
  const x = "1+1";
  eval(x); // SEC-006: Replace with safe logic
}
`;

async function runTest() {
  console.log('--- AI Patch Synergy Test ---');
  console.log('Original Code:', code.trim());

  // 3. 수리 실행 (REPLACE_LOGIC 전략이 작동해야 함)
  const result = await runQuillWithRepair(code, 'risky.ts');

  console.log('\n--- Repair Result ---');
  console.log('Repair Count:', result.repairCount);
  if (result.repairedCode) {
    console.log('Repaired Code:');
    console.log(result.repairedCode.trim());
    
    if (result.repairedCode.includes('AI Patched')) {
      console.log('\nVerification: SUCCESS! AI Synergy generated and applied the patch.');
    } else {
      console.log('\nVerification: FAILED. AI patch not found.');
    }
  }

  // 원복
  aiBridge.quickAsk = originalQuickAsk;
}

runTest();
