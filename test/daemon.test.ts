// ============================================================
// CS Quill 🦔 — Daemon E2E Tests
// ============================================================

import * as http from 'http';
import * as crypto from 'crypto';
import * as net from 'net';

let daemonProcess: { stop: () => void } | null = null;
const PORT = 9876;

beforeAll((done) => {
  const { startDaemon } = require('../daemon');
  daemonProcess = startDaemon({ port: PORT, host: '127.0.0.1' });
  setTimeout(done, 1000); // 서버 시작 대기
});

afterAll(async () => {
  if (daemonProcess) await daemonProcess.stop();
});

// ============================================================
// PART 1 — HTTP Endpoints
// ============================================================

describe('Daemon HTTP', () => {
  function httpGet(path: string): Promise<any> {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}${path}`, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
      }).on('error', reject);
    });
  }

  function httpPost(path: string, body: object): Promise<any> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = http.request({ hostname: '127.0.0.1', port: PORT, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
        let resp = '';
        res.on('data', (c) => { resp += c; });
        res.on('end', () => { try { resolve(JSON.parse(resp)); } catch { resolve(resp); } });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  test('GET /health returns status ok', async () => {
    const data = await httpGet('/health');
    expect(data.status).toBe('ok');
    expect(data.version).toBe('0.1.0');
    expect(typeof data.uptime).toBe('number');
  });

  test('GET /status returns sessions array', async () => {
    const data = await httpGet('/status');
    expect(data).toHaveProperty('sessions');
    expect(Array.isArray(data.sessions)).toBe(true);
  });

  test('POST /analyze returns score', async () => {
    const data = await httpPost('/analyze', { filePath: 'test.ts', content: 'const x = 1;' });
    expect(typeof data.score).toBe('number');
    expect(data.teams).toBe(8);
  });

  test('POST /analyze with eval gets findings', async () => {
    const data = await httpPost('/analyze', { filePath: 'test.ts', content: 'eval("bad");' });
    expect(data.findings).toBeGreaterThan(0);
  });

  test('POST /analyze with empty content', async () => {
    const data = await httpPost('/analyze', { filePath: 'empty.ts', content: '' });
    expect(data.score).toBeGreaterThanOrEqual(90);
  });

  test('POST /analyze with bad JSON returns error', async () => {
    return new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port: PORT, path: '/analyze', method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          const parsed = JSON.parse(data);
          expect(parsed).toHaveProperty('error');
          resolve(undefined);
        });
      });
      req.on('error', reject);
      req.write('NOT JSON');
      req.end();
    });
  });

  test('GET /unknown returns 404', async () => {
    return new Promise((resolve) => {
      http.get(`http://127.0.0.1:${PORT}/unknown`, (res) => {
        expect(res.statusCode).toBe(404);
        resolve(undefined);
      });
    });
  });
});

// ============================================================
// PART 2 — WebSocket Connection (handshake only, frame-level tested in manual E2E)
// ============================================================

describe('Daemon WebSocket', () => {
  test('WebSocket upgrade handshake succeeds', async () => {
    return new Promise<void>((resolve, reject) => {
      const key = crypto.randomBytes(16).toString('base64');
      const req = http.request({
        hostname: '127.0.0.1', port: PORT, path: '/', method: 'GET',
        headers: { 'Connection': 'Upgrade', 'Upgrade': 'websocket', 'Sec-WebSocket-Key': key, 'Sec-WebSocket-Version': '13' },
      });
      req.on('upgrade', (_res, socket) => {
        expect(socket).toBeDefined();
        socket.destroy();
        resolve();
      });
      req.on('error', reject);
      req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
      req.end();
    });
  });

  test('WebSocket connection count tracked', async () => {
    // handshake 후 status 확인
    const data = await new Promise<any>((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}/health`, (res) => {
        let d = '';
        res.on('data', (c) => { d += c; });
        res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });
    expect(typeof data.connections).toBe('number');
  });
});

// ============================================================
// PART 3 — Stress / Stability
// ============================================================

describe('Daemon Stability', () => {
  test('10 sequential requests succeed', async () => {
    for (let i = 0; i < 10; i++) {
      const data = await new Promise<any>((resolve, reject) => {
        const body = JSON.stringify({ filePath: `t${i}.ts`, content: `const x${i} = ${i};` });
        const req = http.request({ hostname: '127.0.0.1', port: PORT, path: '/analyze', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
          let d = '';
          res.on('data', (c) => { d += c; });
          res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });
      expect(data.score).toBeGreaterThanOrEqual(0);
    }
  });

  test('daemon survives large input', async () => {
    const bigContent = 'const x = 1;\n'.repeat(5000);
    const data = await new Promise<any>((resolve, reject) => {
      const body = JSON.stringify({ filePath: 'big.ts', content: bigContent });
      const req = http.request({ hostname: '127.0.0.1', port: PORT, path: '/analyze', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
        let d = '';
        res.on('data', (c) => { d += c; });
        res.on('end', () => resolve(JSON.parse(d)));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    expect(data.score).toBeDefined();
  });

  test('health check after stress', async () => {
    const data = await new Promise<any>((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}/health`, (res) => {
        let d = '';
        res.on('data', (c) => { d += c; });
        res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });
    expect(data.status).toBe('ok');
  });
});
