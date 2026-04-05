// ============================================================
// CS Quill 🦔 — cs serve command
// ============================================================
// 로컬 API 서버. 웹/IDE에서 HTTP로 검증 파이프라인 호출.

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { readFileSync } from 'fs';

// ============================================================
// PART 1 — Route Handlers
// ============================================================

async function handleVerify(body: string): Promise<object> {
  const { code, language } = JSON.parse(body);
  const { runStaticPipeline } = await import('../core/pipeline-bridge');
  return await runStaticPipeline(code ?? '', language ?? 'typescript');
}

async function handleHollow(body: string): Promise<object> {
  const { code, fileName } = JSON.parse(body);
  const { scanForHollowCode } = await import('../core/pipeline-bridge');
  return { findings: scanForHollowCode(code ?? '', fileName ?? 'unknown') };
}

async function handleDeadCode(body: string): Promise<object> {
  const { code, language } = JSON.parse(body);
  const { scanDeadCode } = await import('../core/pipeline-bridge');
  return { findings: scanDeadCode(code ?? '', language ?? 'typescript') };
}

async function handleDesignLint(body: string): Promise<object> {
  const { code } = JSON.parse(body);
  const { runDesignLint } = await import('../core/pipeline-bridge');
  return runDesignLint(code ?? '');
}

async function handleCognitiveLoad(body: string): Promise<object> {
  const { code } = JSON.parse(body);
  const { analyzeCognitiveLoad } = await import('../core/pipeline-bridge');
  return analyzeCognitiveLoad(code ?? '');
}

async function handleBugfinder(body: string): Promise<object> {
  const { code } = JSON.parse(body);
  const { findBugsStatic } = await import('../core/pipeline-bridge');
  return { bugs: findBugsStatic(code ?? '') };
}

async function handleIPScan(body: string): Promise<object> {
  const { files } = JSON.parse(body);
  const { scanProject } = await import('../core/pipeline-bridge');
  return scanProject(files ?? []);
}

async function handleHealth(): Promise<object> {
  const { loadMergedConfig } = await import('../core/config');
  const config = loadMergedConfig();
  return {
    status: 'ok',
    version: '0.1.0',
    engine: 'CS Quill 🦔',
    language: config.language,
    level: config.level,
    keys: config.keys.length,
    uptime: Math.round(process.uptime()),
  };
}

// IDENTITY_SEAL: PART-1 | role=route-handlers | inputs=body | outputs=object

// ============================================================
// PART 2 — Server
// ============================================================

export async function runServe(port: string): Promise<void> {
  const portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    console.log(`  ❌ 유효하지 않은 포트: ${port} (1-65535)`);
    return;
  }

  const ROUTES: Record<string, (body: string) => Promise<object>> = {
    '/health': async () => handleHealth(),
    '/verify': handleVerify,
    '/hollow': handleHollow,
    '/dead-code': handleDeadCode,
    '/design-lint': handleDesignLint,
    '/cognitive-load': handleCognitiveLoad,
    '/bugfinder': handleBugfinder,
    '/ip-scan': handleIPScan,
  };

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = req.url ?? '/';
    const handler = ROUTES[url];

    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found', routes: Object.keys(ROUTES) }));
      return;
    }

    try {
      let body = '';
      if (req.method === 'POST') {
        body = await new Promise<string>((resolve) => {
          const chunks: Buffer[] = [];
          req.on('data', (c: Buffer) => chunks.push(c));
          req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
          setTimeout(() => resolve('{}'), 10000); // 10s timeout
        });
      }
      const parsed = body || '{}';
      try { JSON.parse(parsed); } catch { body = '{}'; }
      const result = await handler(parsed);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (err as Error).message }));
    }
  });

  server.listen(portNum, () => {
    console.log(`🦔 CS Quill Serve — http://localhost:${portNum}\n`);
    console.log('  Endpoints:');
    for (const route of Object.keys(ROUTES)) {
      console.log(`    POST http://localhost:${portNum}${route}`);
    }
    console.log('\n  Ctrl+C 로 종료\n');
  });
}

// IDENTITY_SEAL: PART-2 | role=server | inputs=port | outputs=http-server
