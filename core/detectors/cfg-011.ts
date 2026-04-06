import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CFG-011: devDeps 프로덕션 빌드 포함 (devDependencies included in production build)
 * Detects when development-only modules are imported in production entry points
 * or bundler configs that would cause them to be included in the production bundle.
 */
export const cfg011Detector: RuleDetector = {
  ruleId: 'CFG-011',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const filePath = sourceFile.getFilePath();

    // Skip test files — dev deps are expected there
    if (/\.(test|spec|e2e)\.(ts|tsx|js|jsx)$/.test(filePath) ||
        filePath.includes('__tests__') || filePath.includes('__mocks__')) {
      return findings;
    }

    // Dev-only tools that should never be in production bundles
    const devBundlePackages = [
      'webpack-dev-server', 'webpack-dev-middleware',
      '@pmmmwh/react-refresh-webpack-plugin', 'react-refresh',
      'source-map-loader', 'style-loader',
      'ts-node', 'ts-node-dev', 'nodemon',
      '@types/', 'typedoc',
      'faker', '@faker-js/',
      'msw', 'nock',
      'cypress', 'playwright', '@playwright/',
      'jest', 'vitest', 'mocha',
    ];

    // Check if this is a build/entry file
    const isBuildConfig = filePath.includes('webpack.config') ||
                          filePath.includes('rollup.config') ||
                          filePath.includes('vite.config') ||
                          filePath.includes('esbuild') ||
                          filePath.includes('next.config');
    const isEntryPoint = filePath.endsWith('/index.ts') ||
                         filePath.endsWith('/main.ts') ||
                         filePath.endsWith('/app.ts') ||
                         filePath.endsWith('\\index.ts') ||
                         filePath.endsWith('\\main.ts') ||
                         filePath.endsWith('\\app.ts');

    if (!isBuildConfig && !isEntryPoint) {
      // Still check for dev tools in regular source
      sourceFile.getImportDeclarations().forEach(imp => {
        const moduleSpec = imp.getModuleSpecifierValue();
        for (const pkg of devBundlePackages) {
          if (moduleSpec === pkg || moduleSpec.startsWith(pkg)) {
            findings.push({
              line: imp.getStartLineNumber(),
              message: `devDeps 프로덕션 빌드 포함: '${moduleSpec}'은 dev 전용 — 프로덕션 번들에 포함되면 번들 크기 증가`,
            });
            break;
          }
        }
      });
    }

    // In build configs, check for dev middleware in production mode
    if (isBuildConfig) {
      sourceFile.forEachDescendant(node => {
        if (node.getKind() === SyntaxKind.CallExpression) {
          const text = node.getText();
          if (text.includes('HotModuleReplacementPlugin') || text.includes('ReactRefreshPlugin')) {
            // Check if there's a production guard
            const parent = node.getParent();
            const ancestors = [];
            let curr = parent;
            while (curr) {
              ancestors.push(curr.getText());
              curr = curr.getParent();
            }
            const hasProductionGuard = ancestors.some(a =>
              a.includes("process.env.NODE_ENV") || a.includes("'production'") || a.includes('"production"'));
            if (!hasProductionGuard) {
              findings.push({
                line: node.getStartLineNumber(),
                message: `devDeps 프로덕션 빌드 포함: HMR/refresh 플러그인이 production 가드 없이 사용됨`,
              });
            }
          }
        }
      });
    }

    return findings;
  }
};
