// @ts-nocheck
// ============================================================
// CS Quill 🦔 — Fun & Creative Features
// ============================================================
// 이스터에그 + 코드 아트 + 코드 포엠 + 코드 퀴즈

// ============================================================
// PART 1 — ASCII Art Generator
// ============================================================

const QUILL_ART = `
    /\\_/\\
   ( o.o )  CS Quill 🦔
    > ^ <   Code Quality Guardian
  /||||||\\
`;

const QUILL_ART_CELEBRATE = `
    /\\_/\\   ★
   ( ^.^ ) ★  PERFECT SCORE!
    > ^ < ★
  /||||||\\
   ★  ★  ★
`;

const QUILL_ART_SAD = `
    /\\_/\\
   ( ;.; )  Needs work...
    > ^ <
  /||||||\\
`;

export function getQuillMood(score: number): string {
  if (score >= 95) return QUILL_ART_CELEBRATE;
  if (score >= 70) return QUILL_ART;
  return QUILL_ART_SAD;
}

// IDENTITY_SEAL: PART-1 | role=ascii-art | inputs=score | outputs=string

// ============================================================
// PART 2 — Code Poetry (코드로 시 쓰기)
// ============================================================

export async function generateCodePoem(topic: string): Promise<void> {
  console.log('🦔 CS Quill — 코드 포엠 ✨\n');

  try {
    const { streamChat } = require('../core/ai-bridge');

    process.stdout.write('  ');
    await streamChat({
      systemInstruction: `You are a creative programmer-poet. Write a short poem (4-8 lines) using REAL programming syntax that also reads as poetry. Mix code keywords with poetic meaning. Include comments as emotional annotations. Example:

// when the sun sets
while (hope.exists()) {
  let tomorrow = await dream.resolve();
  if (tomorrow.isBeautiful()) break;
  patience++;
}
// the dawn always comes

Language: match user's language (Korean/English). Make it beautiful AND valid syntax.`,
      messages: [{ role: 'user', content: `Write a code poem about: ${topic}` }],
      onChunk: (t: string) => { process.stdout.write(t); },
      temperature: 0.9,
    });
    console.log('\n');
  } catch {
    // Fallback: pre-written poems (12개)
    const poems = [
      `// ${topic}에 대하여\nwhile (life.continues()) {\n  const meaning = search(everywhere);\n  if (meaning === undefined) continue;\n  return meaning; // 찾았다\n}`,
      `// ${topic}\ntry {\n  await love.find();\n} catch (heartbreak) {\n  heal(time);\n  await love.find(); // 다시\n}`,
      `// ${topic}\nconst dreams = new Set();\nfor (const day of lifetime) {\n  dreams.add(day.wish);\n  if (dreams.size > 1000) break;\n}\n// 충분히 꿨다`,
      `// ${topic}\nclass Developer {\n  constructor() { this.coffee = Infinity; }\n  code() { return this.coffee-- > 0 ? '✨' : '💤'; }\n}`,
      `// ${topic}\nconst stack = ['배움', '실패', '성장'];\nwhile (stack.length) {\n  const lesson = stack.pop();\n  console.log(lesson); // 모두 필요했다\n}`,
      `// ${topic}\nasync function journey() {\n  const start = Date.now();\n  await Promise.all([learn(), fail(), grow()]);\n  return Date.now() - start; // 시간이 답이다\n}`,
      `// ${topic}\nconst me = { bugs: 99, fixes: 0 };\nwhile (me.bugs > 0) {\n  me.fixes++;\n  me.bugs += Math.random() > 0.5 ? -1 : 1;\n}\n// 결국 고쳤다`,
      `// ${topic}\nif (today.isHard()) {\n  tomorrow.willBeBetter();\n} else {\n  celebrate();\n}\n// 어느 쪽이든 괜찮다`,
      `// ${topic}\nconst errors = [];\ntry { riskyThing(); }\ncatch (e) { errors.push(e); learn(e); }\nfinally { keepGoing(); }`,
      `// ${topic}\nfunction recursion(depth = 0) {\n  if (depth > 100) return '깨달음';\n  return recursion(depth + 1); // 계속 파고들어\n}`,
      `// ${topic}\nconst map = new Map();\nmap.set('문제', '해결');\nmap.set('버그', '기능');\nmap.set('실패', '경험');\n// 관점의 전환`,
      `// ${topic}\nPromise.race([\n  sleep(8 * 60 * 60 * 1000),\n  code(Infinity),\n]).then(() => '개발자의 하루');`,
    ];
    console.log('  ' + poems[Math.floor(Math.random() * poems.length)] + '\n');
  }
}

// IDENTITY_SEAL: PART-2 | role=code-poem | inputs=topic | outputs=console

// ============================================================
// PART 3 — Code Quiz (코드 퀴즈)
// ============================================================

interface Quiz {
  question: string;
  code: string;
  options: string[];
  answer: number;
  explanation: string;
}

const QUIZZES: Quiz[] = [
  {
    question: '이 코드의 출력은?',
    code: 'console.log(typeof null)',
    options: ['A) "null"', 'B) "object"', 'C) "undefined"', 'D) Error'],
    answer: 1,
    explanation: 'JavaScript의 유명한 버그. typeof null === "object"',
  },
  {
    question: '이 코드의 결과는?',
    code: 'console.log(0.1 + 0.2 === 0.3)',
    options: ['A) true', 'B) false', 'C) undefined', 'D) Error'],
    answer: 1,
    explanation: 'IEEE 754 부동소수점. 0.1 + 0.2 = 0.30000000000000004',
  },
  {
    question: '이 코드의 출력은?',
    code: 'console.log([1,2,3].map(parseInt))',
    options: ['A) [1, 2, 3]', 'B) [1, NaN, NaN]', 'C) [1, NaN, 3]', 'D) Error'],
    answer: 1,
    explanation: 'parseInt(value, radix). map은 (value, index)를 넘겨서 parseInt(2, 1)은 NaN',
  },
  {
    question: '이 코드의 결과는?',
    code: "console.log('b' + 'a' + + 'a' + 'a')",
    options: ['A) "baaa"', 'B) "baNaNa"', 'C) "ba0a"', 'D) Error'],
    answer: 1,
    explanation: '+ "a"는 NaN, 문자열 결합으로 "baNaNa" 🍌',
  },
  {
    question: '빈 배열의 타입은?',
    code: 'console.log(typeof [])',
    options: ['A) "array"', 'B) "object"', 'C) "undefined"', 'D) "list"'],
    answer: 1,
    explanation: 'JS에서 배열은 객체. Array.isArray()로 확인해야 함',
  },
  {
    question: 'Promise.all에서 하나가 실패하면?',
    code: 'await Promise.all([fetch(ok), fetch(fail)])',
    options: ['A) 성공한 것만 반환', 'B) 전부 실패', 'C) 첫 에러로 reject', 'D) undefined'],
    answer: 2,
    explanation: 'Promise.all은 하나라도 실패하면 전체 reject. allSettled 쓰면 다 받음',
  },
];

export async function runQuiz(): Promise<void> {
  console.log('🦔 CS Quill — 코드 퀴즈 🎯\n');

  try {
    const { quickAsk } = require('../core/ai-bridge');

    const raw = await quickAsk(
      'Generate a JavaScript/TypeScript code quiz. Return ONLY valid JSON with this exact structure: {"question":"...","code":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":0,"explanation":"..."}. The answer field is the 0-based index of the correct option. Make it tricky but educational. Language: Korean for text, English for code.',
      'You are a programming quiz master. Output ONLY raw JSON, no markdown fences, no extra text.',
      'creative',
    );

    const parsed = JSON.parse(raw.replace(/```json?\s*/g, '').replace(/```/g, '').trim());
    if (parsed.question && parsed.code && parsed.options && typeof parsed.answer === 'number') {
      console.log(`  Q: ${parsed.question}\n`);
      console.log(`  \`\`\`\n  ${parsed.code}\n  \`\`\`\n`);
      for (const opt of parsed.options) {
        console.log(`  ${opt}`);
      }
      console.log(`\n  정답: ${parsed.options[parsed.answer]}`);
      console.log(`  💡 ${parsed.explanation}\n`);
      return;
    }
  } catch { /* AI unavailable or parse failed, use fallback */ }

  // Fallback: hardcoded quizzes
  if (QUIZZES.length === 0) { console.log('  퀴즈가 없습니다.\n'); return; }
  const quiz = QUIZZES[Math.floor(Math.random() * QUIZZES.length)];

  console.log(`  Q: ${quiz.question}\n`);
  console.log(`  \`\`\`\n  ${quiz.code}\n  \`\`\`\n`);
  for (const opt of quiz.options) {
    console.log(`  ${opt}`);
  }
  console.log(`\n  정답: ${quiz.options[quiz.answer]}`);
  console.log(`  💡 ${quiz.explanation}\n`);
}

// IDENTITY_SEAL: PART-3 | role=quiz | inputs=none | outputs=console

// ============================================================
// PART 4 — Code Art (코드로 그림 그리기)
// ============================================================

export async function generateCodeArt(subject: string): Promise<void> {
  console.log('🦔 CS Quill — 코드 아트 🎨\n');

  try {
    const { streamChat } = require('../core/ai-bridge');

    process.stdout.write('  ');
    await streamChat({
      systemInstruction: `Create ASCII art using programming syntax elements. Use characters like { } ( ) [ ] / \\ | - _ = + * # @ ~ to draw. The art should be recognizable and creative. Max 15 lines, 60 chars wide. Output ONLY the art, no explanation.`,
      messages: [{ role: 'user', content: `Create code-style ASCII art of: ${subject}` }],
      onChunk: (t: string) => { process.stdout.write(t); },
      temperature: 0.9,
    });
    console.log('\n');
  } catch {
    console.log(QUILL_ART);
  }
}

// IDENTITY_SEAL: PART-4 | role=code-art | inputs=subject | outputs=console

// ============================================================
// PART 5 — Fortune Cookie (오늘의 코딩 운세)
// ============================================================

const FORTUNES = [
  { fortune: '오늘 작성할 코드에 버그가 없을 것이다 🌟', lucky: 'const', avoid: 'any' },
  { fortune: '누군가 당신의 PR을 즉시 승인할 것이다 ✨', lucky: 'async', avoid: 'callback' },
  { fortune: 'Stack Overflow 첫 번째 답이 정답일 것이다 🎯', lucky: 'map', avoid: 'for...in' },
  { fortune: '오늘 밤 배포는 순탄할 것이다 🚀', lucky: 'test', avoid: 'setTimeout' },
  { fortune: '레거시 코드가 의외로 잘 작동할 것이다 😮', lucky: 'refactor', avoid: 'eval' },
  { fortune: '동료가 커피를 사줄 것이다 ☕', lucky: 'TypeScript', avoid: 'JavaScript' },
  { fortune: 'npm install이 한 번에 성공할 것이다 🎉', lucky: 'pnpm', avoid: 'rm -rf node_modules' },
  { fortune: '당신의 코드가 Code Review를 무사통과할 것이다 🛡️', lucky: 'interface', avoid: 'any' },
  { fortune: 'merge conflict 없는 하루가 될 것이다 🌈', lucky: 'rebase', avoid: 'force push' },
  { fortune: '오늘 CS Quill 점수가 90+ 나올 것이다 🦔', lucky: 'verify', avoid: 'skip' },
  { fortune: '작성한 테스트가 모두 통과할 것이다 ✅', lucky: 'expect', avoid: 'skip' },
  { fortune: '문서를 읽지 않아도 API가 직관적일 것이다 📖', lucky: 'README', avoid: 'RTFM' },
];

export async function showFortune(): Promise<void> {
  console.log('🦔 CS Quill — 오늘의 코딩 운세 🔮\n');

  try {
    const { quickAsk } = require('../core/ai-bridge');
    const today = new Date().toISOString().slice(0, 10);

    const raw = await quickAsk(
      `Today is ${today}. Generate a fun developer fortune cookie. Return ONLY valid JSON: {"fortune":"...","lucky":"...","avoid":"..."}. fortune: a witty coding fortune in Korean with one emoji. lucky: a lucky programming keyword. avoid: something to avoid today. Be creative and different each time.`,
      'You are a mystical developer fortune teller. Output ONLY raw JSON, no markdown.',
      'creative',
    );

    const parsed = JSON.parse(raw.replace(/```json?\s*/g, '').replace(/```/g, '').trim());
    if (parsed.fortune && parsed.lucky && parsed.avoid) {
      console.log(`  ${parsed.fortune}\n`);
      console.log(`  행운의 키워드: ${parsed.lucky}`);
      console.log(`  피해야 할 것: ${parsed.avoid}\n`);
      return;
    }
  } catch { /* AI unavailable, use fallback */ }

  // Fallback: hardcoded fortunes
  const today = new Date();
  const idx = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % FORTUNES.length;
  const fortune = FORTUNES[idx];

  console.log(`  ${fortune.fortune}\n`);
  console.log(`  행운의 키워드: ${fortune.lucky}`);
  console.log(`  피해야 할 것: ${fortune.avoid}\n`);
}

// IDENTITY_SEAL: PART-5 | role=fortune | inputs=none | outputs=console

// ============================================================
// PART 6 — Code Creator (앱 창작 — 원본 app-generator 연동)
// ============================================================

export async function createApp(description: string): Promise<void> {
  console.log('🦔 CS Quill — 코드 창작 🎨\n');
  console.log(`  "${description}" 만드는 중...\n`);

  try {
    const { generateApp } = require('../core/pipeline-bridge');

    const result = await generateApp(description, (status: string) => {
      console.log(`  ⏳ ${status}`);
    });

    console.log(`\n  ✅ ${result.files.length}개 파일 생성!\n`);
    for (const file of result.files) {
      console.log(`  📄 ${file.path} (${file.content.length}자)`);
    }

    // Save to .cs/created/
    const { mkdirSync, writeFileSync } = require('fs');
    const { join } = require('path');
    const createdDir = join(process.cwd(), '.cs', 'created', description.replace(/[^a-zA-Z0-9가-힣]/g, '-').slice(0, 30));
    mkdirSync(createdDir, { recursive: true });

    for (const file of result.files) {
      const filePath = join(createdDir, file.path);
      const { dirname } = require('path');
      const fileDir = dirname(filePath);
      if (fileDir && fileDir !== '.') mkdirSync(fileDir, { recursive: true });
      writeFileSync(filePath, file.content, 'utf-8');
    }

    console.log(`\n  💾 저장: ${createdDir}`);
    if (result.installCommand) console.log(`  📦 설치: ${result.installCommand}`);
    if (result.startCommand) console.log(`  🚀 실행: ${result.startCommand}`);
    console.log(`\n  ${result.summary}\n`);
  } catch {
    console.log('  ⚠️  앱 생성기 로드 실패. cs generate 로 대체하세요.\n');
  }
}

// IDENTITY_SEAL: PART-6 | role=code-creator | inputs=description | outputs=files

// ============================================================
// PART 7 — Code Challenge (코딩 챌린지)
// ============================================================

const CHALLENGES = [
  { title: 'FizzBuzz 변형', desc: '3의 배수: Fizz, 5의 배수: Buzz, 7의 배수: Quill 🦔', difficulty: '쉬움' },
  { title: '괄호 매칭', desc: '문자열의 괄호가 올바르게 닫히는지 검사', difficulty: '보통' },
  { title: 'LRU 캐시', desc: 'get/put O(1) LRU Cache 구현', difficulty: '어려움' },
  { title: '미니 파서', desc: 'JSON.parse 직접 구현 (객체+배열+문자열)', difficulty: '매우 어려움' },
  { title: '비동기 큐', desc: '동시 실행 N개 제한 Promise 큐', difficulty: '보통' },
  { title: '디바운서', desc: 'debounce + throttle + cancel 기능', difficulty: '쉬움' },
];

export async function showChallenge(): Promise<void> {
  console.log('🦔 CS Quill — 코딩 챌린지 💪\n');

  try {
    const { quickAsk } = require('../core/ai-bridge');

    const raw = await quickAsk(
      'Generate a unique coding challenge for a developer. Return ONLY valid JSON: {"title":"...","desc":"...","difficulty":"쉬움|보통|어려움|매우 어려움","hints":["...","..."]}. Title and description in Korean. Make it practical and educational. Include 2 hints.',
      'You are a coding challenge designer. Output ONLY raw JSON, no markdown.',
      'creative',
    );

    const parsed = JSON.parse(raw.replace(/```json?\s*/g, '').replace(/```/g, '').trim());
    if (parsed.title && parsed.desc && parsed.difficulty) {
      console.log(`  [${parsed.difficulty}] ${parsed.title}`);
      console.log(`  ${parsed.desc}\n`);
      if (parsed.hints && parsed.hints.length > 0) {
        console.log('  힌트:');
        for (const hint of parsed.hints) {
          console.log(`    - ${hint}`);
        }
        console.log('');
      }
      console.log(`  만들어보세요: cs generate "${parsed.title}"\n`);
      return;
    }
  } catch { /* AI unavailable, use fallback */ }

  // Fallback: hardcoded challenges
  const ch = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
  console.log(`  [${ch.difficulty}] ${ch.title}`);
  console.log(`  ${ch.desc}\n`);
  console.log(`  만들어보세요: cs generate "${ch.title}"\n`);
}

// IDENTITY_SEAL: PART-7 | role=challenge | inputs=none | outputs=console

// ============================================================
// PART 8 — Fun Runner
// ============================================================

export async function runFun(action: string, args?: string[]): Promise<void> {
  switch (action) {
    case 'poem':
      await generateCodePoem(args?.[0] ?? '사랑');
      break;
    case 'quiz':
      await runQuiz();
      break;
    case 'art':
      await generateCodeArt(args?.[0] ?? 'cat');
      break;
    case 'fortune':
      await showFortune();
      break;
    case 'quill':
      console.log(QUILL_ART);
      break;
    case 'create':
      await createApp(args?.join(' ') ?? 'todo app');
      break;
    case 'challenge':
      await showChallenge();
      break;
    default:
      console.log('🦔 CS Quill — Fun 모드\n');
      console.log('  cs fun poem [주제]        코드로 시 쓰기');
      console.log('  cs fun quiz               코드 퀴즈');
      console.log('  cs fun art [주제]         코드 아트');
      console.log('  cs fun fortune            오늘의 코딩 운세');
      console.log('  cs fun quill              고슴도치 만나기');
      console.log('  cs fun create [설명]      앱 창작 (코드 스튜디오 연동)');
      console.log('  cs fun challenge          코딩 챌린지\n');
  }
}

// IDENTITY_SEAL: PART-6 | role=fun-runner | inputs=action | outputs=console
