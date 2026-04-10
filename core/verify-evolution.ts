const { runQuillWithRepair, LearningEngine, AuditManager } = require('./quill-engine');
const fs = require('fs');

// 1. 초기 상태 확인
console.log('--- Initial State ---');
console.log('LOG-001 Weight:', LearningEngine.getWeight('LOG-001'));

// 2. 수리 성공 시뮬레이션 (LOG-001: == to ===)
const codeSuccess = `function test() { return 1 == 1; }`;
console.log('\n--- Running Success Simulation (LOG-001) ---');
const resSuccess = runQuillWithRepair(codeSuccess, 'test-success.ts');
console.log('Repaired:', resSuccess.repairCount > 0);
console.log('New LOG-001 Weight:', LearningEngine.getWeight('LOG-001'));

// 3. 수리 실패 시뮬레이션 (SEC-006: eval is verified but NOT handled in applyRepairs)
// applyRepairs에는 SEC-006 로직을 아직 안 넣었으므로, 수리 시도는 하지만 결과는 그대로일 것임 (실패 판정)
const codeFailure = `eval("1+1");`;
console.log('\n--- Running Failure Simulation (SEC-006) ---');
console.log('SEC-006 Initial Weight:', LearningEngine.getWeight('SEC-006'));
const resFailure = runQuillWithRepair(codeFailure, 'test-failure.ts');
console.log('Repair Attempted:', resFailure.repairCount > 0);
console.log('New SEC-006 Weight (Weakness Compensation):', LearningEngine.getWeight('SEC-006'));

// 4. 영속성 확인 (파일 생성 여부)
console.log('\n--- Persistence Check ---');
console.log('.quill-weights.json exists:', fs.existsSync('.quill-weights.json'));
console.log('.quill-knowledge.ledger exists:', fs.existsSync('.quill-knowledge.ledger'));

// 5. 억제(Suppression) 확인
// 가중치를 강제로 낮춰서 Suppressed 되었는지 확인
for(let i=0; i<10; i++) LearningEngine.learnFromFailure('WEAK-RULE');
console.log('\n--- Suppression Check ---');
console.log('WEAK-RULE Weight:', LearningEngine.getWeight('WEAK-RULE'));
console.log('Is WEAK-RULE suppressed?:', LearningEngine.isSuppressed('WEAK-RULE'));
