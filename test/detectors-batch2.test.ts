// ============================================================
// CS Quill — Detector Unit Tests (Batch 2)
// SEC, AIP, PRF, RES detectors
// ============================================================

import { Project, SourceFile } from 'ts-morph';

function createSourceFile(code: string): SourceFile {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile('test.ts', code);
}

// ============================================================
// PART 1 — SEC Detectors
// ============================================================

describe('SEC-001: SQL Injection', () => {
  const { detectSec001 } = require('../core/detectors/sec-helpers');

  test('detects SQL template literal injection', () => {
    const sf = createSourceFile(`
      const query = \`SELECT * FROM users WHERE id = \${userId}\`;
    `);
    const findings = detectSec001(sf);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].message).toMatch(/SQL/i);
  });

  test('passes clean parameterized query', () => {
    const sf = createSourceFile(`
      const query = 'SELECT * FROM users WHERE id = ?';
      db.query(query, [userId]);
    `);
    const findings = detectSec001(sf);
    expect(findings).toHaveLength(0);
  });
});

describe('SEC-002: innerHTML / dangerouslySetInnerHTML', () => {
  const { detectSec002 } = require('../core/detectors/sec-helpers');

  test('detects innerHTML with non-constant assignment', () => {
    const sf = createSourceFile(`
      const el = document.getElementById('app');
      el.innerHTML = userInput;
    `);
    const findings = detectSec002(sf);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].message).toMatch(/innerHTML/);
  });

  test('passes innerHTML with string literal', () => {
    const sf = createSourceFile(`
      const el = document.getElementById('app');
      el.innerHTML = '<div>Hello</div>';
    `);
    const findings = detectSec002(sf);
    expect(findings).toHaveLength(0);
  });
});

describe('SEC-006: hardcoded secret (delegated)', () => {
  const { detectSec006 } = require('../core/detectors/sec-helpers');

  test('returns empty (handled by quill-engine AST)', () => {
    const sf = createSourceFile(`
      const password = 'hunter2';
    `);
    const findings = detectSec006(sf);
    expect(findings).toHaveLength(0);
  });

  test('passes clean code', () => {
    const sf = createSourceFile(`
      const x = 1 + 2;
    `);
    const findings = detectSec006(sf);
    expect(findings).toHaveLength(0);
  });
});

describe('SEC-010: hardcoded salt/seed/iv', () => {
  const { detectSec010 } = require('../core/detectors/sec-helpers');

  test('detects hardcoded salt literal', () => {
    const sf = createSourceFile(`
      const salt = 'my_fixed_salt_value';
    `);
    const findings = detectSec010(sf);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].message).toMatch(/salt|seed|iv/i);
  });

  test('passes salt from process.env', () => {
    const sf = createSourceFile(`
      const salt = process.env.SALT;
    `);
    const findings = detectSec010(sf);
    expect(findings).toHaveLength(0);
  });
});

// ============================================================
// PART 2 — AIP Detectors
// ============================================================

describe('AIP-001: Excessive inline comments', () => {
  const { aip001Detector } = require('../core/detectors/aip-001');

  test('detects 5+ consecutive comment lines', () => {
    const sf = createSourceFile(`
// This is comment 1
// This is comment 2
// This is comment 3
// This is comment 4
// This is comment 5
const x = 1;
    `);
    const findings = aip001Detector.detect(sf);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].message).toMatch(/주석/);
  });

  test('passes normal amount of comments', () => {
    const sf = createSourceFile(`
// Single header comment
const x = 1;
// Another comment
const y = 2;
    `);
    const findings = aip001Detector.detect(sf);
    expect(findings).toHaveLength(0);
  });
});

describe('AIP-006: Vanilla reimplementation', () => {
  const { aip006Detector } = require('../core/detectors/aip-006');

  test('detects deepClone function implementation', () => {
    const sf = createSourceFile(`
function deepClone(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}
    `);
    const findings = aip006Detector.detect(sf);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].message).toMatch(/Vanilla Style/);
  });

  test('passes normal function names', () => {
    const sf = createSourceFile(`
function processData(data: any): any {
  return data.map((x: number) => x * 2);
}
    `);
    const findings = aip006Detector.detect(sf);
    expect(findings).toHaveLength(0);
  });
});

describe('AIP-008: Exception swallowing', () => {
  const { aip008Detector } = require('../core/detectors/aip-008');

  test('detects empty catch block', () => {
    const sf = createSourceFile(`
try {
  doSomething();
} catch (e) {
}
    `);
    const findings = aip008Detector.detect(sf);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].message).toMatch(/catch/i);
  });

  test('passes catch block with rethrow', () => {
    const sf = createSourceFile(`
try {
  doSomething();
} catch (e) {
  console.error(e);
  throw e;
}
    `);
    const findings = aip008Detector.detect(sf);
    expect(findings).toHaveLength(0);
  });
});

describe('AIP-011: Legacy patterns', () => {
  const { aip011Detector } = require('../core/detectors/aip-011');

  test('detects var declaration', () => {
    const sf = createSourceFile(`
var x = 10;
var y = 20;
    `);
    const findings = aip011Detector.detect(sf);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].message).toMatch(/var/);
  });

  test('passes modern const/let declarations', () => {
    const sf = createSourceFile(`
const x = 10;
let y = 20;
    `);
    const findings = aip011Detector.detect(sf);
    // Should not flag var-related findings
    const varFindings = findings.filter((f: any) => f.message.includes('var'));
    expect(varFindings).toHaveLength(0);
  });
});

// ============================================================
// PART 3 — PRF Detectors
// ============================================================

describe('PRF-001: DOM query in loop', () => {
  const { prf001Detector } = require('../core/detectors/prf-001');

  test('detects querySelector inside for loop', () => {
    const sf = createSourceFile(`
for (let i = 0; i < 10; i++) {
  const el = document.querySelector('.item');
  el.textContent = String(i);
}
    `);
    const findings = prf001Detector.detect(sf);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].message).toMatch(/DOM/);
  });

  test('passes DOM query outside loop', () => {
    const sf = createSourceFile(`
const el = document.querySelector('.item');
for (let i = 0; i < 10; i++) {
  el.textContent = String(i);
}
    `);
    const findings = prf001Detector.detect(sf);
    expect(findings).toHaveLength(0);
  });
});

describe('PRF-003: JSON deep copy', () => {
  const { prf003Detector } = require('../core/detectors/prf-003');

  test('detects JSON.parse(JSON.stringify(...))', () => {
    const sf = createSourceFile(`
const copy = JSON.parse(JSON.stringify(original));
    `);
    const findings = prf003Detector.detect(sf);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].message).toMatch(/JSON\.parse.*JSON\.stringify|structuredClone/);
  });

  test('passes structuredClone usage', () => {
    const sf = createSourceFile(`
const copy = structuredClone(original);
    `);
    const findings = prf003Detector.detect(sf);
    expect(findings).toHaveLength(0);
  });
});

describe('PRF-004: await in loop', () => {
  const { prf004Detector } = require('../core/detectors/prf-004');

  test('detects await inside for loop', () => {
    const sf = createSourceFile(`
async function fetchAll(urls: string[]) {
  for (const url of urls) {
    const res = await fetch(url);
  }
}
    `);
    const findings = prf004Detector.detect(sf);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].message).toMatch(/await|Promise\.all/);
  });

  test('passes await outside loop', () => {
    const sf = createSourceFile(`
async function fetchOne(url: string) {
  const res = await fetch(url);
  return res.json();
}
    `);
    const findings = prf004Detector.detect(sf);
    expect(findings).toHaveLength(0);
  });
});

// ============================================================
// PART 4 — RES Detectors
// ============================================================

describe('RES-001: Unclosed stream', () => {
  const { res001Detector } = require('../core/detectors/res-001');

  test('detects createReadStream without close', () => {
    const sf = createSourceFile(`
import * as fs from 'fs';
const stream = fs.createReadStream('/path/to/file');
stream.on('data', (chunk) => { console.log(chunk); });
    `);
    const findings = res001Detector.detect(sf);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].message).toMatch(/스트림|stream|close|리소스/i);
  });

  test('passes stream with close call', () => {
    const sf = createSourceFile(`
import * as fs from 'fs';
const stream = fs.createReadStream('/path/to/file');
stream.on('data', (chunk) => { console.log(chunk); });
stream.close();
    `);
    const findings = res001Detector.detect(sf);
    expect(findings).toHaveLength(0);
  });
});

describe('RES-003: setInterval without clearInterval', () => {
  const { res003Detector } = require('../core/detectors/res-003');

  test('detects setInterval without clearInterval', () => {
    const sf = createSourceFile(`
const timer = setInterval(() => {
  console.log('tick');
}, 1000);
    `);
    const findings = res003Detector.detect(sf);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings[0].message).toMatch(/setInterval|clearInterval|타이머/);
  });

  test('passes setInterval with clearInterval', () => {
    const sf = createSourceFile(`
const timer = setInterval(() => {
  console.log('tick');
}, 1000);
clearInterval(timer);
    `);
    const findings = res003Detector.detect(sf);
    expect(findings).toHaveLength(0);
  });
});
