import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CFG-006: paths alias 불일치 (Path alias mismatch)
 * Detects imports using path aliases (e.g., @/utils, ~/components) when
 * no tsconfig paths configuration is visible, or detects misconfigured aliases.
 */
export const cfg006Detector: RuleDetector = {
  ruleId: 'CFG-006',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    // Check for path alias usage in imports
    const aliasPatterns = /^[@~#]/;

    sourceFile.getImportDeclarations().forEach(imp => {
      const moduleSpec = imp.getModuleSpecifierValue();

      // Detect path aliases that might be misconfigured
      if (aliasPatterns.test(moduleSpec) && !moduleSpec.startsWith('@types/')) {
        // Skip known npm scoped packages (@angular/, @nestjs/, @babel/, etc.)
        const knownScopes = ['@angular/', '@nestjs/', '@babel/', '@types/', '@typescript-eslint/',
          '@testing-library/', '@emotion/', '@mui/', '@chakra-ui/', '@reduxjs/',
          '@tanstack/', '@trpc/', '@prisma/', '@aws-sdk/', '@azure/', '@google-cloud/'];
        if (knownScopes.some(s => moduleSpec.startsWith(s))) return;

        // Flag potential alias usage
        if (moduleSpec.startsWith('@/') || moduleSpec.startsWith('~/') || moduleSpec.startsWith('#/')) {
          // These are custom path aliases — check if they resolve
          findings.push({
            line: imp.getStartLineNumber(),
            message: `paths alias 사용: '${moduleSpec}' — tsconfig.json의 paths 설정과 일치하는지 확인 필요`,
          });
        }
      }
    });

    // In tsconfig-like files, detect paths with no baseUrl
    const fullText = sourceFile.getFullText();
    const filePath = sourceFile.getFilePath();
    if (filePath.includes('tsconfig')) {
      const hasPaths = fullText.includes('"paths"');
      const hasBaseUrl = fullText.includes('"baseUrl"');
      if (hasPaths && !hasBaseUrl) {
        const match = fullText.match(/"paths"/);
        const line = match ? fullText.substring(0, match.index).split('\n').length : 1;
        findings.push({
          line,
          message: 'CFG-006: paths가 설정되었지만 baseUrl이 없음 — paths alias가 올바르게 해석되지 않을 수 있음',
        });
      }
    }

    return findings;
  }
};
