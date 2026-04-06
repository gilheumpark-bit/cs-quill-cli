import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CFG-005: moduleResolution 부재 (Missing moduleResolution)
 * Detects tsconfig files that lack a moduleResolution setting,
 * which can cause import resolution issues in monorepos and modern toolchains.
 */
export const cfg005Detector: RuleDetector = {
  ruleId: 'CFG-005',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();
    const filePath = sourceFile.getFilePath();

    if (!filePath.includes('tsconfig')) return findings;

    // Check if compilerOptions exists but moduleResolution is missing
    const hasCompilerOptions = fullText.includes('"compilerOptions"');
    const hasModuleResolution = fullText.includes('"moduleResolution"');
    const hasModule = fullText.includes('"module"');

    if (hasCompilerOptions && !hasModuleResolution) {
      // Find the line of compilerOptions
      const match = fullText.match(/"compilerOptions"/);
      const line = match ? fullText.substring(0, match.index).split('\n').length : 1;
      findings.push({
        line,
        message: 'CFG-005: moduleResolution 설정 부재 — "node", "node16", 또는 "bundler" 중 명시적 설정 권장',
      });
    }

    return findings;
  }
};
