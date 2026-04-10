import { runQuillEngine } from './core/quill-engine';

const dirtyCode = `
function empty() {
  // ERR-001: Empty function
}

function legacy(a, b) {
  if (a == b) { // LOG-001: Strict equality
    eval("console.log(a)"); // SEC-006: eval
  }
}

async function complex() {
  // This will test the complexity accumulation
  if (true) { if (true) { if (true) { console.log(1); } } }
  for (let i=0; i<10; i++) {
    while(false) {
      const x = (1 > 0) ? (2 > 1 ? 3 : 4) : 5;
    }
  }
}
`;

try {
  console.log("=== Quill Engine Logical Verification Start ===");
  const result = runQuillEngine(dirtyCode, 'verify-test.ts');

  console.log("\n[1] Performance Metrics:");
  console.log(JSON.stringify(result.performance, null, 2));

  console.log("\n[2] Structural Metrics:");
  console.log(`Node Count: ${result.nodeCount}`);
  console.log(`Cyclomatic Complexity: ${result.cyclomaticComplexity}`);
  console.log(`Engines Used: ${result.enginesUsed.join(', ')}`);

  console.log("\n[3] Detected Findings:");
  result.findings.forEach(f => {
    console.log(`[${f.severity.toUpperCase()}] ${f.ruleId} at Line ${f.line}: ${f.message}`);
  });

  // 논리 무결성 확인
  const expectedRules = ['ERR-001', 'LOG-001', 'SEC-006'];
  const detectedRules = result.findings.map(f => f.ruleId);
  const allDetected = expectedRules.every(r => detectedRules.includes(r));

  if (allDetected) {
    console.log("\n✅ LOGIC VERIFICATION PASSED: All core rules triggered correctly.");
  } else {
    console.log("\n❌ LOGIC VERIFICATION FAILED: Some rules were missed.");
  }

} catch (e) {
  console.error("\n❌ ENGINE CRASHED during verification:", e);
}
