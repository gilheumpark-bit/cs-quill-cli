// ============================================================
// CS Quill 🦔 — Patent Pattern DB
// ============================================================
// 생성 전 차단: 알려진 특허/위험 알고리즘 패턴 DB.
// 생성 프롬프트에 경고 주입해서 AI가 대안 사용하도록 유도.

// ============================================================
// PART 1 — Patent Patterns
// ============================================================

export interface PatentPattern {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  alternative: string;
  severity: 'block' | 'warn';
  expired?: boolean;
}

export const PATENT_PATTERNS: PatentPattern[] = [
  {
    id: 'lzw', name: 'LZW Compression',
    description: 'Lempel-Ziv-Welch 압축 알고리즘 (GIF 특허)',
    keywords: ['lzw', 'lempel-ziv-welch', 'gif compression'],
    alternative: 'Use deflate/gzip (zlib) or Brotli instead',
    severity: 'warn', expired: true,
  },
  {
    id: 'rsa-pkcs1', name: 'RSA PKCS#1 v1.5 Padding',
    description: 'RSA 패딩 취약점 (Bleichenbacher attack)',
    keywords: ['pkcs1', 'rsa padding', 'pkcs#1 v1.5'],
    alternative: 'Use OAEP (PKCS#1 v2.x) padding instead',
    severity: 'warn',
  },
  {
    id: 'gif-lzw', name: 'GIF Format (LZW)',
    description: 'GIF 포맷 내부 LZW 압축',
    keywords: ['gif encoder', 'gif creator', 'create gif'],
    alternative: 'Use PNG/WebP for static, WebM/MP4 for animation',
    severity: 'warn', expired: true,
  },
  {
    id: 'mp3-fraunhofer', name: 'MP3 Encoding',
    description: 'MP3 인코딩 특허 (Fraunhofer)',
    keywords: ['mp3 encoder', 'lame encoder', 'mp3 encoding'],
    alternative: 'Use Opus/OGG/AAC for audio encoding',
    severity: 'warn', expired: true,
  },
  {
    id: 'h264-core', name: 'H.264/AVC Core',
    description: 'H.264 비디오 코덱 특허 풀',
    keywords: ['h264 encoder', 'h.264', 'avc encoder', 'x264'],
    alternative: 'Use AV1 (royalty-free) or VP9',
    severity: 'warn',
  },
  {
    id: 'exfat', name: 'exFAT File System',
    description: 'exFAT 파일시스템 (Microsoft 특허, 일부 오픈)',
    keywords: ['exfat', 'extended fat'],
    alternative: 'Use ext4 or NTFS (with proper licensing)',
    severity: 'warn',
  },
  {
    id: 'double-click', name: 'One-Click Purchase',
    description: 'Amazon 1-Click 특허 (만료)',
    keywords: ['one-click purchase', 'one click buy', '1-click'],
    alternative: 'Patent expired 2017, safe to use',
    severity: 'warn', expired: true,
  },
  {
    id: 'slide-unlock', name: 'Slide to Unlock',
    description: 'Apple 슬라이드 잠금해제 특허',
    keywords: ['slide to unlock', 'swipe unlock'],
    alternative: 'Use PIN/biometric/pattern unlock',
    severity: 'warn',
  },
  {
    id: 'rc4', name: 'RC4 Stream Cipher',
    description: 'RC4 암호화 (취약, 사용 금지)',
    keywords: ['rc4', 'arc4', 'arcfour'],
    alternative: 'Use AES-GCM or ChaCha20-Poly1305',
    severity: 'block',
  },
  {
    id: 'md5-auth', name: 'MD5 for Authentication',
    description: 'MD5 해시를 인증에 사용 (충돌 공격 가능)',
    keywords: ['md5 password', 'md5 hash auth', 'md5 login'],
    alternative: 'Use bcrypt, scrypt, or Argon2 for passwords. SHA-256+ for checksums.',
    severity: 'block',
  },
  {
    id: 'sha1-auth', name: 'SHA-1 for Authentication',
    description: 'SHA-1 해시를 인증에 사용 (충돌 발견됨)',
    keywords: ['sha1 password', 'sha1 hash auth', 'sha1 login', 'createHash("sha1")'],
    alternative: 'Use bcrypt, scrypt, or Argon2 for passwords. SHA-256+ for checksums.',
    severity: 'block',
  },
  {
    id: 'des-encrypt', name: 'DES Encryption',
    description: 'DES 56비트 암호화 (무차별 공격 가능)',
    keywords: ['des encrypt', 'des cipher', 'createCipheriv("des'],
    alternative: 'Use AES-256-GCM or ChaCha20-Poly1305',
    severity: 'block',
  },
  {
    id: 'jwt-none', name: 'JWT None Algorithm',
    description: 'JWT alg:none 허용 시 서명 우회 가능',
    keywords: ['algorithm: "none"', 'alg: "none"', 'algorithms: ["none"]'],
    alternative: 'Always verify JWT with RS256 or HS256. Never allow none.',
    severity: 'block',
  },
  {
    id: 'cors-star', name: 'CORS Allow All',
    description: 'Access-Control-Allow-Origin: * 는 보안 위험',
    keywords: ['Access-Control-Allow-Origin: *', "cors({ origin: '*'", 'origin: true'],
    alternative: 'Specify exact origins. Use environment-based allowlist.',
    severity: 'warn',
  },
];

// IDENTITY_SEAL: PART-1 | role=patent-patterns | inputs=none | outputs=PATENT_PATTERNS

// ============================================================
// PART 2 — Pre-Generation Check
// ============================================================

export interface PatentCheckResult {
  safe: boolean;
  warnings: PatentPattern[];
  blocks: PatentPattern[];
  directive: string;
}

export function checkPatentPatterns(prompt: string): PatentCheckResult {
  const lower = prompt.toLowerCase();
  const warnings: PatentPattern[] = [];
  const blocks: PatentPattern[] = [];

  for (const pattern of PATENT_PATTERNS) {
    const matched = pattern.keywords.some(kw => lower.includes(kw));
    if (!matched) continue;

    if (pattern.severity === 'block') {
      blocks.push(pattern);
    } else {
      warnings.push(pattern);
    }
  }

  // Build directive to inject into generation prompt
  const directives: string[] = [];
  for (const b of blocks) {
    directives.push(`BLOCKED: Do NOT use ${b.name}. ${b.alternative}`);
  }
  for (const w of warnings) {
    directives.push(`WARNING: ${w.name} has patent concerns${w.expired ? ' (expired, but consider alternatives)' : ''}. ${w.alternative}`);
  }

  return {
    safe: blocks.length === 0,
    warnings,
    blocks,
    directive: directives.length > 0 ? `[IP Safety]\n${directives.join('\n')}` : '',
  };
}

// IDENTITY_SEAL: PART-2 | role=pre-check | inputs=prompt | outputs=PatentCheckResult
