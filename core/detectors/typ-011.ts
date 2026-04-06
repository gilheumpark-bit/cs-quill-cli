import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * 동일 파일에 interface 선언과 type alias가 함께 있으면 스타일 혼용으로 보고
 * Phase / Rule Category: type
 */
export const typ011Detector: RuleDetector = {
  ruleId: 'TYP-011', // interface vs type alias 혼용
  detect: (sourceFile) => {
    const findings: Array<{ line: number; message: string }> = [];

    let iface = 0;
    let alias = 0;
    for (const s of sourceFile.getStatements()) {
      const k = s.getKind();
      if (k === SyntaxKind.InterfaceDeclaration) iface++;
      if (k === SyntaxKind.TypeAliasDeclaration) alias++;
    }

    if (iface > 0 && alias > 0) {
      findings.push({
        line: 1,
        message: `interface(${iface})와 type alias(${alias}) 혼용 — 한 파일 내 스타일 통일 권장`,
      });
    }

    return findings;
  },
};
