// ============================================================
// CS Quill 🦔 — cs apply + cs undo commands
// ============================================================
// 원본 보존 모드: .cs/generated/ → 원본에 적용 / 롤백.

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';

// ============================================================
// PART 1 — Apply
// ============================================================

interface ApplyOptions {
  all?: boolean;
}

export async function runApply(file: string | undefined, opts: ApplyOptions): Promise<void> {
  const generatedDir = join(process.cwd(), '.cs', 'generated');
  const backupDir = join(process.cwd(), '.cs', 'backup');

  // Check file mode
  try {
    const { loadMergedConfig } = require('../core/config');
    const config = loadMergedConfig();
    if (config.fileMode === 'yolo' && !opts.all) {
      opts.all = true; // Yolo = auto apply all
      console.log('  ⚡ Yolo 모드 — 전체 자동 적용\n');
    }
  } catch {}

  if (!existsSync(generatedDir)) {
    console.log('  ⚠️  적용할 파일이 없습니다. (.cs/generated/ 비어있음)');
    return;
  }

  mkdirSync(backupDir, { recursive: true });

  const filesToApply = opts.all
    ? readdirSync(generatedDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx'))
    : file ? [basename(file)] : [];

  if (filesToApply.length === 0) {
    console.log('  ⚠️  파일을 지정하세요: cs apply <filename> 또는 cs apply --all');
    return;
  }

  console.log('🦔 CS Quill — 수정본 적용\n');

  for (const f of filesToApply) {
    const generatedPath = join(generatedDir, f);
    const targetPath = join(process.cwd(), 'src', f);

    if (!existsSync(generatedPath)) {
      console.log(`  ⚠️  ${f} — 수정본 없음`);
      continue;
    }

    // Show diff before applying (safe/auto mode)
    if (existsSync(targetPath)) {
      try {
        const { loadMergedConfig } = require('../core/config');
        const cfg = loadMergedConfig();
        if (cfg.fileMode !== 'yolo') {
          const { computeDiff, formatDiff, printDiffSummary } = require('../tui/diff-preview');
          const original = readFileSync(targetPath, 'utf-8');
          const modified = readFileSync(generatedPath, 'utf-8');
          const diff = computeDiff(original, modified);
          const changed = diff.filter(d => d.type !== 'unchanged').length;
          if (changed > 0) {
            console.log(`\n  📊 ${f}: ${printDiffSummary(diff)}`);
            if (changed < 30) console.log(formatDiff(diff));
          }
        }
      } catch { /* diff optional */ }

      // Backup
      const backupName = `${f}.${Date.now()}`;
      copyFileSync(targetPath, join(backupDir, backupName));
      console.log(`  📋 ${f} 백업 → .cs/backup/${backupName}`);
    }

    // Apply
    const content = readFileSync(generatedPath, 'utf-8');
    mkdirSync(join(process.cwd(), 'src'), { recursive: true });
    writeFileSync(targetPath, content, 'utf-8');
    console.log(`  ✅ ${f} → src/${f} 적용 완료`);
  }

  console.log('');
}

// IDENTITY_SEAL: PART-1 | role=apply | inputs=file,opts | outputs=files

// ============================================================
// PART 2 — Undo
// ============================================================

interface UndoOptions {
  all?: boolean;
}

export async function runUndo(opts: UndoOptions): Promise<void> {
  const backupDir = join(process.cwd(), '.cs', 'backup');

  if (!existsSync(backupDir)) {
    console.log('  ⚠️  되돌릴 백업이 없습니다.');
    return;
  }

  const backups = readdirSync(backupDir)
    .filter(f => /\.\d+$/.test(f))
    .sort()
    .reverse();

  if (backups.length === 0) {
    console.log('  ⚠️  되돌릴 백업이 없습니다.');
    return;
  }

  console.log('🦔 CS Quill — 되돌리기\n');

  const toRestore = opts.all ? backups : [backups[0]];

  for (const backup of toRestore) {
    const originalName = backup.replace(/\.\d+$/, '');
    const targetPath = join(process.cwd(), 'src', originalName);
    const backupPath = join(backupDir, backup);

    copyFileSync(backupPath, targetPath);
    console.log(`  ↩️  ${originalName} 복원 완료 (from ${backup})`);
  }

  console.log('');
}

// IDENTITY_SEAL: PART-2 | role=undo | inputs=opts | outputs=files
