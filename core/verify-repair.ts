import { runQuillWithRepair } from './quill-engine';

const code = `
function demo() {
  const a = 1;
  const b = "1";
  if (a == b) { // LOG-001: == used
    console.log("Match");
  }
}
`;

console.log("=== Phase 1: Original Code ===");
console.log(code.trim());

const result = runQuillWithRepair(code, 'test-repair.ts');

console.log("\n=== Phase 2: Repairs Performed ===");
console.log(`Repaired Issues: ${result.repairCount}`);

if (result.repairedCode) {
  console.log("\n=== Phase 3: Patched & Re-Verified Code ===");
  console.log(result.repairedCode.trim());
}

console.log("\n=== Phase 4: Final Validity Check ===");
const log001Remaining = result.findings.some(f => f.ruleId === 'LOG-001');
if (!log001Remaining && result.repairCount > 0) {
  console.log("[SUCCESS] LOG-001 has been repaired and verified as fixed!");
} else {
  console.log("[INFO] No repairable LOG-001 findings remained or none were found.");
}
