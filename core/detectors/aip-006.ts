import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * AIP-006: Vanilla Style — 라이브러리 대신 직접 구현
 * AI often reimplements well-known utility functions (deep clone, debounce, throttle,
 * flatten, chunk, merge, etc.) instead of using lodash/underscore/ramda.
 */
export const aip006Detector: RuleDetector = {
  ruleId: 'AIP-006',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];

    // Common utility function names that should use a library
    const vanillaPatterns: Record<string, string> = {
      deepClone: 'structuredClone 또는 lodash.cloneDeep',
      deepCopy: 'structuredClone 또는 lodash.cloneDeep',
      debounce: 'lodash.debounce',
      throttle: 'lodash.throttle',
      flattenArray: 'Array.prototype.flat() 또는 lodash.flatten',
      flattenDeep: 'lodash.flattenDeep',
      chunkArray: 'lodash.chunk',
      mergeDeep: 'lodash.merge',
      deepMerge: 'lodash.merge',
      isEqual: 'lodash.isEqual',
      deepEqual: 'lodash.isEqual',
      uniqueArray: 'lodash.uniq 또는 [...new Set()]',
      groupBy: 'lodash.groupBy 또는 Object.groupBy',
      sortBy: 'lodash.sortBy',
      capitalize: 'lodash.capitalize',
      camelCase: 'lodash.camelCase',
    };

    for (const fn of sourceFile.getFunctions()) {
      const name = fn.getName();
      if (!name) continue;
      for (const [pattern, suggestion] of Object.entries(vanillaPatterns)) {
        if (name.toLowerCase() === pattern.toLowerCase()) {
          findings.push({
            line: fn.getStartLineNumber(),
            message: `Vanilla Style: '${name}' 직접 구현 대신 ${suggestion} 사용 권장`,
          });
        }
      }
    }

    // Also check class methods
    for (const cls of sourceFile.getClasses()) {
      for (const method of cls.getMethods()) {
        const name = method.getName();
        for (const [pattern, suggestion] of Object.entries(vanillaPatterns)) {
          if (name.toLowerCase() === pattern.toLowerCase()) {
            findings.push({
              line: method.getStartLineNumber(),
              message: `Vanilla Style: '${name}' 직접 구현 대신 ${suggestion} 사용 권장`,
            });
          }
        }
      }
    }

    return findings;
  }
};
