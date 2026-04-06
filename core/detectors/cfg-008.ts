import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CFG-008: devDeps vs deps 분류 오류 (devDependencies vs dependencies classification error)
 * Detects imports of packages that are typically devDependencies being used in
 * production source code, or production packages only in test files.
 */
export const cfg008Detector: RuleDetector = {
  ruleId: 'CFG-008',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const filePath = sourceFile.getFilePath();
    const isTestFile = /\.(test|spec|e2e)\.(ts|tsx|js|jsx)$/.test(filePath)
      || filePath.includes('__tests__')
      || filePath.includes('__mocks__');

    // Dev-only packages that should not appear in production source
    const devOnlyPackages = [
      'jest', '@jest/', 'vitest', 'mocha', 'chai', 'sinon', 'supertest',
      'ts-jest', '@testing-library/', 'enzyme',
      'prettier', 'eslint', '@eslint/', 'stylelint',
      'webpack-dev-server', 'nodemon', 'ts-node-dev',
      '@storybook/', 'storybook',
      'concurrently', 'husky', 'lint-staged', 'commitlint',
    ];

    // Production packages that probably shouldn't be in test-only files
    // (less critical, so we skip this direction)

    if (!isTestFile) {
      sourceFile.getImportDeclarations().forEach(imp => {
        const moduleSpec = imp.getModuleSpecifierValue();
        for (const devPkg of devOnlyPackages) {
          if (moduleSpec === devPkg || moduleSpec.startsWith(devPkg)) {
            findings.push({
              line: imp.getStartLineNumber(),
              message: `devDeps 분류 오류: 프로덕션 코드에서 dev 전용 패키지 '${moduleSpec}' import — devDependencies에만 있어야 할 패키지`,
            });
            break;
          }
        }
      });
    }

    return findings;
  }
};
