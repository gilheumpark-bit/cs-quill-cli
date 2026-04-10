import { runQuillEngine } from './quill-engine';

const code = `
function test() {
  const x = eval("1 + 1"); // SEC-006
  if (x == 2) {            // LOG-001
    console.log("Verified");
  }
}
`;

const result = runQuillEngine(code, 'test-dcsg.ts');

console.log("=== DCSG Verification Results ===");
result.findings.forEach(f => {
  console.log(`\n[${f.ruleId}] Line ${f.line}: ${f.message}`);
  console.log(` -> Verified: ${f.verified} (Gate: ${f.verificationGate})`);
  if (f.refinement) {
    console.log(` -> Strategic Refinement: ${f.refinement.strategy} (Conf: ${f.refinement.confidence})`);
    console.log(` -> Reasoning: ${f.refinement.reasoning}`);
  }
});

if (result.findings.every(f => f.verified)) {
  console.log("\n[SUCCESS] Double-Sandbox Logic Cross-Check Passed!");
} else {
  console.log("\n[WARNING] Some findings were not properly verified.");
}
