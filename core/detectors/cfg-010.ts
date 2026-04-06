import { RuleDetector } from '../detector-registry';
import { SyntaxKind } from 'ts-morph';

/**
 * CFG-010: .env git 추적 포함 (.env file tracked in git)
 * Detects code that reads from .env files without checking .gitignore,
 * and flags hardcoded secrets/credentials in source code that look like
 * they should be in .env files.
 */
export const cfg010Detector: RuleDetector = {
  ruleId: 'CFG-010',
  detect: (sourceFile) => {
    const findings: Array<{line: number; message: string}> = [];
    const fullText = sourceFile.getFullText();
    const lines = fullText.split('\n');

    // Detect hardcoded secret-like values
    const secretPatterns = [
      { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"`](?!process\.env)[A-Za-z0-9_\-]{16,}['"`]/i, name: 'API key' },
      { pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*['"`](?!process\.env)[^'"`]{8,}['"`]/i, name: 'secret/password' },
      { pattern: /(?:token|auth[_-]?token)\s*[:=]\s*['"`](?!process\.env)[A-Za-z0-9_\-\.]{16,}['"`]/i, name: 'token' },
      { pattern: /(?:database[_-]?url|db[_-]?url|connection[_-]?string)\s*[:=]\s*['"`](?:postgres|mysql|mongodb|redis):\/\//i, name: 'DB connection string' },
      { pattern: /(?:aws[_-]?access|aws[_-]?secret)\s*[:=]\s*['"`][A-Za-z0-9\/+=]{16,}['"`]/i, name: 'AWS credential' },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

      for (const { pattern, name } of secretPatterns) {
        if (pattern.test(line)) {
          findings.push({
            line: i + 1,
            message: `하드코딩된 ${name} 감지 — .env 파일로 이동하고 process.env 사용 권장 (git 추적에서 .env 제외 필수)`,
          });
          break;
        }
      }
    }

    // Detect .env file path references without gitignore mentions
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.StringLiteral) {
        const text = node.getText().replace(/['"]/g, '');
        if (text === '.env' || text === '.env.local' || text === '.env.production') {
          // This is fine, but flag it as a reminder
          findings.push({
            line: node.getStartLineNumber(),
            message: `'${text}' 파일 참조 감지 — .gitignore에 ${text}가 포함되어 있는지 확인 필요`,
          });
        }
      }
    });

    return findings;
  }
};
