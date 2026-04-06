import { RuleDetector } from '../detector-registry';
import { SyntaxKind, CatchClause } from 'ts-morph';

/**
 * Phase 1 / Rule Category: error-handling
 * Severity: high | Confidence: high
 */
export const err001Detector: RuleDetector = {
  ruleId: 'ERR-001', // empty catch block
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.CatchClause) {
        const catchClause = node as CatchClause;
        const statements = catchClause.getBlock().getStatements();
        
        // Block contains no code except possible comments
        if (statements.length === 0) {
          findings.push({ 
            line: catchClause.getStartLineNumber(), 
            message: 'Critical: catch 블록이 비어있습니다 (ERR-001). 에러를 조용히 무시하면 디버깅이 불가능해집니다.' 
          });
        }
      }
    });

    return findings;
  }
};
