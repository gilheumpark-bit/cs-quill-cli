// ============================================================
// CS Quill — Detector Unit Tests (Batch 1: CMX, STL, TST)
// ============================================================

import { Project } from 'ts-morph';

function createSourceFile(code: string, fileName = 'test.ts') {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile(fileName, code);
}

// ============================================================
// PART 1 — CMX Detectors (Complexity)
// ============================================================

describe('CMX detectors', () => {

  // ----------------------------------------------------------
  // CMX-001: Function > 50 lines
  // ----------------------------------------------------------
  describe('CMX-001: Function > 50 lines', () => {
    const { cmx001Detector } = require('../core/detectors/cmx-001');

    it('should detect function exceeding 50 lines', () => {
      const body = Array.from({ length: 55 }, (_, i) => `  const x${i} = ${i};`).join('\n');
      const code = `function longFunc() {\n${body}\n}`;
      const sf = createSourceFile(code);
      const results = cmx001Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('50');
    });

    it('should pass short function', () => {
      const code = `function shortFunc() {\n  return 1;\n}`;
      const sf = createSourceFile(code);
      const results = cmx001Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // CMX-002: Parameters > 5
  // ----------------------------------------------------------
  describe('CMX-002: Parameters > 5', () => {
    const { cmx002Detector } = require('../core/detectors/cmx-002');

    it('should detect function with more than 5 parameters', () => {
      const code = `function many(a: number, b: number, c: number, d: number, e: number, f: number) { return a; }`;
      const sf = createSourceFile(code);
      const results = cmx002Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('6');
    });

    it('should pass function with 5 or fewer parameters', () => {
      const code = `function few(a: number, b: number, c: number) { return a; }`;
      const sf = createSourceFile(code);
      const results = cmx002Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // CMX-003: Class > 500 lines
  // ----------------------------------------------------------
  describe('CMX-003: Class > 500 lines', () => {
    const { cmx003Detector } = require('../core/detectors/cmx-003');

    it('should detect class exceeding 500 lines', () => {
      const methods = Array.from({ length: 60 }, (_, i) =>
        `  method${i}() {\n${'    const v = 1;\n'.repeat(8)}  }`
      ).join('\n');
      const code = `class HugeClass {\n${methods}\n}`;
      const sf = createSourceFile(code);
      const results = cmx003Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('500');
    });

    it('should pass small class', () => {
      const code = `class SmallClass {\n  greet() { return 'hi'; }\n}`;
      const sf = createSourceFile(code);
      const results = cmx003Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // CMX-004: File > 1000 lines
  // ----------------------------------------------------------
  describe('CMX-004: File > 1000 lines', () => {
    const { cmx004Detector } = require('../core/detectors/cmx-004');

    it('should detect file exceeding 1000 lines', () => {
      const code = Array.from({ length: 1005 }, (_, i) => `const v${i} = ${i};`).join('\n');
      const sf = createSourceFile(code);
      const results = cmx004Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('1000');
    });

    it('should pass file under 1000 lines', () => {
      const code = `const x = 1;\nconst y = 2;`;
      const sf = createSourceFile(code);
      const results = cmx004Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // CMX-005: Class methods > 20 (God class)
  // ----------------------------------------------------------
  describe('CMX-005: Class methods > 20', () => {
    const { cmx005Detector } = require('../core/detectors/cmx-005');

    it('should detect class with more than 20 methods', () => {
      const methods = Array.from({ length: 22 }, (_, i) => `  method${i}() { return ${i}; }`).join('\n');
      const code = `class GodClass {\n${methods}\n}`;
      const sf = createSourceFile(code);
      const results = cmx005Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('22');
    });

    it('should pass class with 20 or fewer methods', () => {
      const methods = Array.from({ length: 3 }, (_, i) => `  m${i}() { return ${i}; }`).join('\n');
      const code = `class NormalClass {\n${methods}\n}`;
      const sf = createSourceFile(code);
      const results = cmx005Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // CMX-006: Constructor > 100 lines
  // ----------------------------------------------------------
  describe('CMX-006: Constructor > 100 lines', () => {
    const { cmx006Detector } = require('../core/detectors/cmx-006');

    it('should detect constructor exceeding 100 lines', () => {
      const body = Array.from({ length: 105 }, (_, i) => `    this.v${i} = ${i};`).join('\n');
      const code = `class Big {\n  constructor() {\n${body}\n  }\n}`;
      const sf = createSourceFile(code);
      const results = cmx006Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('100');
    });

    it('should pass short constructor', () => {
      const code = `class Small {\n  constructor() {\n    this.x = 1;\n  }\n}`;
      const sf = createSourceFile(code);
      const results = cmx006Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // CMX-007: Nesting depth > 5
  // ----------------------------------------------------------
  describe('CMX-007: Nesting depth > 5', () => {
    const { cmx007Detector } = require('../core/detectors/cmx-007');

    it('should detect nesting deeper than 5 levels', () => {
      const code = `
function deep() {
  if (true) {
    if (true) {
      for (let i = 0; i < 1; i++) {
        while (true) {
          if (true) {
            if (true) {
              console.log('too deep');
            }
          }
        }
      }
    }
  }
}`;
      const sf = createSourceFile(code);
      const results = cmx007Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('5');
    });

    it('should pass shallow nesting', () => {
      const code = `
function shallow() {
  if (true) {
    for (let i = 0; i < 1; i++) {
      console.log(i);
    }
  }
}`;
      const sf = createSourceFile(code);
      const results = cmx007Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // CMX-008: Cyclomatic Complexity > 10
  // ----------------------------------------------------------
  describe('CMX-008: Cyclomatic Complexity > 10', () => {
    const { cmx008Detector } = require('../core/detectors/cmx-008');

    it('should detect function with high cyclomatic complexity', () => {
      const branches = Array.from({ length: 12 }, (_, i) =>
        `  if (x === ${i}) return ${i};`
      ).join('\n');
      const code = `function complex(x: number) {\n${branches}\n  return -1;\n}`;
      const sf = createSourceFile(code);
      const results = cmx008Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('10');
    });

    it('should pass simple function', () => {
      const code = `function simple(x: number) {\n  if (x > 0) return x;\n  return 0;\n}`;
      const sf = createSourceFile(code);
      const results = cmx008Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // CMX-009: Cognitive Complexity > 15
  // ----------------------------------------------------------
  describe('CMX-009: Cognitive Complexity > 15', () => {
    const { cmx009Detector } = require('../core/detectors/cmx-009');

    it('should detect function with high cognitive complexity', () => {
      // Deeply nested branches accumulate cognitive complexity fast
      const code = `
function cognitiveHell(a: number, b: number) {
  if (a > 0) {
    if (b > 0) {
      for (let i = 0; i < a; i++) {
        if (i % 2 === 0) {
          while (i > 0) {
            if (i === 5) {
              switch (b) {
                case 1: break;
                case 2: break;
                case 3: break;
                case 4: break;
              }
            }
            break;
          }
        }
      }
    }
  }
  return 0;
}`;
      const sf = createSourceFile(code);
      const results = cmx009Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('15');
    });

    it('should pass function with low cognitive complexity', () => {
      const code = `function easy(x: number) {\n  if (x > 0) return x;\n  return 0;\n}`;
      const sf = createSourceFile(code);
      const results = cmx009Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // CMX-010: Nested ternary 3+ levels
  // ----------------------------------------------------------
  describe('CMX-010: Nested ternary 3+ levels', () => {
    const { cmx010Detector } = require('../core/detectors/cmx-010');

    it('should detect deeply nested ternary expressions', () => {
      const code = `const v = a ? b ? c ? 1 : 2 : 3 : 4;`;
      const sf = createSourceFile(code);
      const results = cmx010Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('3');
    });

    it('should pass simple ternary', () => {
      const code = `const v = a ? 1 : 2;`;
      const sf = createSourceFile(code);
      const results = cmx010Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });
});

// ============================================================
// PART 2 — STL Detectors (Style / Naming)
// ============================================================

describe('STL detectors', () => {

  // ----------------------------------------------------------
  // STL-001: Single-character variable name (non-idiomatic)
  // ----------------------------------------------------------
  describe('STL-001: Single-char variable name', () => {
    const { stl001Detector } = require('../core/detectors/stl-001');

    it('should detect non-idiomatic single-char variable', () => {
      const code = `const a = 10;\nconst b = 20;`;
      const sf = createSourceFile(code);
      const results = stl001Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should pass idiomatic single-char variables (i, j, k, x, y, etc.)', () => {
      const code = `for (let i = 0; i < 10; i++) { const x = i; }`;
      const sf = createSourceFile(code);
      const results = stl001Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // STL-002: Function name missing verb prefix
  // ----------------------------------------------------------
  describe('STL-002: Function name without verb', () => {
    const { stl002Detector } = require('../core/detectors/stl-002');

    it('should detect function name without verb prefix', () => {
      const code = `function dataProcessor() { return null; }`;
      const sf = createSourceFile(code);
      const results = stl002Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('dataProcessor');
    });

    it('should pass function name with verb prefix', () => {
      const code = `function getData() { return null; }\nfunction processItems() { return []; }`;
      const sf = createSourceFile(code);
      const results = stl002Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // STL-003: Boolean variable missing is/has/can prefix
  // ----------------------------------------------------------
  describe('STL-003: Boolean without is/has/can prefix', () => {
    const { stl003Detector } = require('../core/detectors/stl-003');

    it('should detect boolean variable without proper prefix', () => {
      const code = `const active: boolean = true;`;
      const sf = createSourceFile(code);
      const results = stl003Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('active');
    });

    it('should pass boolean with is/has prefix', () => {
      const code = `const isActive: boolean = true;\nconst hasPermission: boolean = false;`;
      const sf = createSourceFile(code);
      const results = stl003Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // STL-004: Module-level const not UPPER_SNAKE_CASE
  // ----------------------------------------------------------
  describe('STL-004: Constant not UPPER_SNAKE_CASE', () => {
    const { stl004Detector } = require('../core/detectors/stl-004');

    it('should detect lowercase module-level constant', () => {
      const code = `const maxRetries = 3;`;
      const sf = createSourceFile(code);
      const results = stl004Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('maxRetries');
    });

    it('should pass UPPER_SNAKE_CASE constant', () => {
      const code = `const MAX_RETRIES = 3;\nconst API_URL = 'https://example.com';`;
      const sf = createSourceFile(code);
      const results = stl004Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // STL-005: Mixed naming conventions in file
  // ----------------------------------------------------------
  describe('STL-005: Mixed naming conventions', () => {
    const { stl005Detector } = require('../core/detectors/stl-005');

    it('should detect mixed snake_case and PascalCase in imports', () => {
      const code = `import { Foo } from './Some_Module';`;
      const sf = createSourceFile(code);
      const results = stl005Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('Some_Module');
    });

    it('should pass consistent naming', () => {
      const code = `import { getData } from './dataService';`;
      const sf = createSourceFile(code);
      const results = stl005Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });
});

// ============================================================
// PART 3 — TST Detectors (Testing)
// ============================================================

describe('TST detectors', () => {

  // ----------------------------------------------------------
  // TST-001: Empty test (no assertion)
  // ----------------------------------------------------------
  describe('TST-001: Empty test without assertion', () => {
    const { tst001Detector } = require('../core/detectors/tst-001');

    it('should detect test block without expect/assert', () => {
      const code = `
it('should work', () => {
  const x = 1;
  console.log(x);
});`;
      const sf = createSourceFile(code);
      const results = tst001Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('expect');
    });

    it('should pass test with assertion', () => {
      const code = `
it('should add', () => {
  const x = 1 + 1;
  expect(x).toBe(2);
});`;
      const sf = createSourceFile(code);
      const results = tst001Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // TST-002: setTimeout in tests (non-deterministic)
  // ----------------------------------------------------------
  describe('TST-002: setTimeout in test', () => {
    const { tst002Detector } = require('../core/detectors/tst-002');

    it('should detect setTimeout inside test block', () => {
      const code = `
it('waits', () => {
  setTimeout(() => {
    expect(true).toBe(true);
  }, 1000);
});`;
      const sf = createSourceFile(code);
      const results = tst002Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('setTimeout');
    });

    it('should pass test without timer calls', () => {
      const code = `
it('instant', () => {
  expect(1 + 1).toBe(2);
});`;
      const sf = createSourceFile(code);
      const results = tst002Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // TST-003: Unmocked external call in test
  // ----------------------------------------------------------
  describe('TST-003: Unmocked external call', () => {
    const { tst003Detector } = require('../core/detectors/tst-003');

    it('should detect fetch without mock in test file', () => {
      const code = `
it('loads data', async () => {
  const res = await fetch('/api/data');
  expect(res).toBeDefined();
});`;
      const sf = createSourceFile(code, 'api.test.ts');
      const results = tst003Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('fetch');
    });

    it('should pass when mock is present', () => {
      const code = `
jest.mock('node-fetch');
it('loads data', async () => {
  const res = await fetch('/api/data');
  expect(res).toBeDefined();
});`;
      const sf = createSourceFile(code, 'api.test.ts');
      const results = tst003Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // TST-004: resolves/rejects without matcher
  // ----------------------------------------------------------
  describe('TST-004: resolves/rejects without matcher', () => {
    const { tst004Detector } = require('../core/detectors/tst-004');

    it('should detect resolves without matcher', () => {
      const code = `
it('resolves', async () => {
  await expect(promise).resolves;
});`;
      const sf = createSourceFile(code);
      const results = tst004Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('resolves');
    });

    it('should pass resolves with matcher', () => {
      const code = `
it('resolves properly', async () => {
  await expect(promise).resolves.toBe(42);
});`;
      const sf = createSourceFile(code);
      const results = tst004Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // TST-005: Hardcoded date in test
  // ----------------------------------------------------------
  describe('TST-005: Hardcoded date literal', () => {
    const { tst005Detector } = require('../core/detectors/tst-005');

    it('should detect hardcoded date string in test file', () => {
      const code = `
it('checks date', () => {
  const d = new Date('2024-01-15');
  expect(d).toBeDefined();
});`;
      const sf = createSourceFile(code, 'date.test.ts');
      const results = tst005Detector.detect(sf);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].message).toContain('날짜');
    });

    it('should pass test without hardcoded dates', () => {
      const code = `
it('checks date', () => {
  const d = new Date();
  expect(d).toBeDefined();
});`;
      const sf = createSourceFile(code, 'date.test.ts');
      const results = tst005Detector.detect(sf);
      expect(results.length).toBe(0);
    });
  });
});
