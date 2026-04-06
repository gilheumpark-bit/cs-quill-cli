const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'core', 'detectors');

const typRules = [
  {
    id: 'TYP-001', name: 'any 타입 무분별 사용',
    logic: `
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.AnyKeyword) {
        findings.push({ line: node.getStartLineNumber(), message: 'any 타입 무분별 사용 위반' });
      }
    });`
  },
  {
    id: 'TYP-002', name: '함수 반환 타입 미선언',
    logic: `
    sourceFile.getFunctions().forEach(func => {
      if (!func.getReturnTypeNode()) {
        findings.push({ line: func.getStartLineNumber(), message: '함수 반환 타입 미선언 위반' });
      }
    });
    sourceFile.getClasses().forEach(cls => {
      cls.getMethods().forEach(method => {
        if (!method.getReturnTypeNode()) {
          findings.push({ line: method.getStartLineNumber(), message: '메서드 반환 타입 미선언 위반' });
        }
      });
    });`
  },
  {
    id: 'TYP-003', name: 'unsafe type assertion',
    logic: `
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.AsExpression || node.getKind() === SyntaxKind.TypeAssertionExpression) {
        const typeNode = (node as any).getTypeNode && (node as any).getTypeNode();
        if (typeNode && typeNode.getKind() === SyntaxKind.AnyKeyword) {
           findings.push({ line: node.getStartLineNumber(), message: 'unsafe type assertion (any) 위반' });
        }
      }
    });`
  },
  {
    id: 'TYP-004', name: '! non-null assertion 과용',
    logic: `
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.NonNullExpression) {
        findings.push({ line: node.getStartLineNumber(), message: '! non-null assertion 과용 위반' });
      }
    });`
  },
  {
    id: 'TYP-005', name: '{} empty object type',
    logic: `
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.TypeLiteral) {
        if ((node as any).getMembers().length === 0) {
          findings.push({ line: node.getStartLineNumber(), message: '{} empty object type 위반' });
        }
      }
    });`
  },
  {
    id: 'TYP-006', name: 'generics 타입 파라미터 누락',
    logic: `
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.TypeReference) {
        const typeName = (node as any).getTypeName().getText();
        if ((typeName === 'Promise' || typeName === 'Array' || typeName === 'Map' || typeName === 'Set') && (node as any).getTypeArguments().length === 0) {
          findings.push({ line: node.getStartLineNumber(), message: 'generics 타입 파라미터 누락 위반' });
        }
      }
    });`
  },
  {
    id: 'TYP-007', name: 'never 타입을 값으로 반환',
    logic: `
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.FunctionDeclaration || node.getKind() === SyntaxKind.MethodDeclaration) {
        const returnType = (node as any).getReturnTypeNode?.();
        if (returnType && returnType.getKind() === SyntaxKind.NeverKeyword) {
          findings.push({ line: node.getStartLineNumber(), message: 'never 타입을 값으로 반환 위반' });
        }
      }
    });`
  },
  {
    id: 'TYP-008', name: 'union null|undefined 미처리',
    logic: `
    // TypeChecker 기반 검사가 정밀하지만 임시로 Null 키워드가 있는 곳 조사
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.PropertyAccessExpression) {
        const expr = (node as any).getExpression();
        // 실제로는 TypeChecker가 필요. 현재는 빈 룰로 둠.
      }
    });`
  },
  {
    id: 'TYP-009', name: '함수 오버로드 시그니처 불일치',
    logic: `
    // 오버로드는 TypeChecker 필요, 여기서는 넘김
    `
  },
  {
    id: 'TYP-010', name: 'enum non-literal 값',
    logic: `
    sourceFile.getEnums().forEach(enu => {
      enu.getMembers().forEach(member => {
        const init = member.getInitializer();
        if (init && init.getKind() !== SyntaxKind.StringLiteral && init.getKind() !== SyntaxKind.NumericLiteral) {
          findings.push({ line: member.getStartLineNumber(), message: 'enum non-literal 값 위반' });
        }
      });
    });`
  },
  {
    id: 'TYP-011', name: 'interface vs type alias 혼용',
    logic: `
    // 프로젝트 전체 수준 통계가 필요. 파일 단위로는 파악 어려움.
    `
  },
  {
    id: 'TYP-012', name: 'strict 모드 미활성화',
    logic: `
    // tsconfig.json 설정 체크이므로 SourceFile에서 예외.
    `
  },
  {
    id: 'TYP-013', name: 'noImplicitAny 위반',
    logic: `
    // 파라미터 중 타입이 없는 경우 탐지
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.Parameter) {
        if (!(node as any).getTypeNode() && !(node as any).getInitializer()) {
           findings.push({ line: node.getStartLineNumber(), message: 'noImplicitAny 위반' });
        }
      }
    });`
  },
  {
    id: 'TYP-014', name: 'strictNullChecks 위반',
    logic: `
    // TypeChecker 필요
    `
  },
  {
    id: 'TYP-015', name: 'optional chaining 과용',
    logic: `
    // 한 표현식 내 optional chaining 개수 체크
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.ExpressionStatement || node.getKind() === SyntaxKind.VariableDeclaration) {
        const text = node.getText();
        const matches = text.match(/\\?\\./g);
        if (matches && matches.length > 3) {
          findings.push({ line: node.getStartLineNumber(), message: 'optional chaining 과용 위반 (>3)' });
        }
      }
    });`
  }
];

for (const rule of typRules) {
  const filename = path.join(dir, `${rule.id.toLowerCase()}.ts`);
  const content = `import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * Phase / Rule Category: type
 */
export const ${rule.id.toLowerCase().replace(/-/g, '')}Detector: RuleDetector = {
  ruleId: '${rule.id}', // ${rule.name}
  detect: (sourceFile) => {
    const findings: Array<{line: number, message: string}> = [];
    ${rule.logic}
    return findings;
  }
};
`;
  fs.writeFileSync(filename, content, 'utf8');
}
console.log('Populated TYP-001 to TYP-015');
