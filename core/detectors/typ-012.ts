import * as path from 'path';
import { RuleDetector } from '../detector-registry';

/**
 * 디스크상 tsconfig.json의 strict 플래그 검사 (인메모리 단일 파일은 스킵)
 * Phase / Rule Category: type
 */
export const typ012Detector: RuleDetector = {
  ruleId: 'TYP-012', // strict 모드 미활성화
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];
    const fs = require('fs') as typeof import('fs');
    const ts = require('typescript') as typeof import('typescript');

    const fp = sourceFile.getFilePath();
    if (!fp || fp === 'memory' || /^\/[^/]+\.ts$/.test(fp)) {
      return findings;
    }

    let searchDir: string;
    try {
      const abs = path.isAbsolute(fp) ? fp : path.join(process.cwd(), fp);
      if (!fs.existsSync(abs)) return findings;
      searchDir = path.dirname(abs);
    } catch {
      return findings;
    }

    const cfgPath = ts.findConfigFile(searchDir, ts.sys.fileExists, 'tsconfig.json');
    if (!cfgPath) return findings;

    const read = ts.readConfigFile(cfgPath, ts.sys.readFile);
    if (read.error) return findings;

    const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(cfgPath));
    if (parsed.options.strict !== true) {
      findings.push({
        line: 1,
        message: `strict 모드 미활성 (${path.basename(cfgPath)} compilerOptions.strict !== true)`,
      });
    }

    return findings;
  },
};
