// ============================================================
// CS Quill — Pre-Filter Module
// ============================================================
// Large/obfuscated files are reworked (stripped + chunked) before
// analysis instead of being blocked outright.

// ============================================================
// PART 1 — Constants & Types
// ============================================================

const MAX_DIRECT_SIZE = 150000;   // 150 KB — files under this go straight through
const MAX_AVG_LINE   = 200;      // avg line length threshold for minified/obfuscated detection
const MAX_CHUNK_SIZE = 50000;    // target chunk size after splitting

interface PreFilterChunk {
  code: string;
  startLine: number;
  label: string;
}

interface PreFilterResult {
  chunks: PreFilterChunk[];
  stripped: boolean;
  chunked: boolean;
  originalSize: number;
  processedSize: number;
}

// IDENTITY_SEAL: PART-1 | role=constants-types | inputs=none | outputs=PreFilterResult

// ============================================================
// PART 2 — Noise Stripper
// ============================================================
// Removes comments, empties string literals, collapses blank lines.
// Used for PRE-FILTER sizing only — actual analysis still uses
// original code per-chunk.

function stripNoise(code: string): string {
  let result = code;

  // Remove multi-line comments (/* ... */)
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove single-line comments (// ...) but not inside strings
  result = result.replace(/\/\/.*$/gm, '');

  // Replace string literal contents with empty strings (preserve quotes)
  // Handle double-quoted strings
  result = result.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  // Handle single-quoted strings
  result = result.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  // Handle template literals (backtick) — simple version
  result = result.replace(/`(?:[^`\\]|\\.)*`/g, '``');

  // Collapse 3+ consecutive blank lines to 1
  result = result.replace(/(\n\s*){3,}/g, '\n\n');

  return result;
}

// IDENTITY_SEAL: PART-2 | role=noise-stripper | inputs=code | outputs=strippedCode

// ============================================================
// PART 3 — Smart Chunker
// ============================================================
// Splits code at natural boundaries (function/class/export declarations).
// Falls back to line-count splitting (~500 lines) when no boundaries found.

function splitIntoChunks(code: string, maxChunkSize: number): PreFilterChunk[] {
  const lines = code.split('\n');
  const boundaryPattern = /^(?:export\s+)?(?:function|class|const|let|interface|type|enum)\s+/;

  // Find all boundary line indices
  const boundaries: number[] = [0];
  for (let i = 1; i < lines.length; i++) {
    if (boundaryPattern.test(lines[i].trimStart())) {
      boundaries.push(i);
    }
  }

  // If no natural boundaries found (or only start), split by line count
  if (boundaries.length <= 1) {
    const LINES_PER_CHUNK = 500;
    const chunks: PreFilterChunk[] = [];
    for (let start = 0; start < lines.length; start += LINES_PER_CHUNK) {
      const end = Math.min(start + LINES_PER_CHUNK, lines.length);
      const chunkLines = lines.slice(start, end);
      chunks.push({
        code: chunkLines.join('\n'),
        startLine: start,
        label: `chunk-${chunks.length + 1} (lines ${start + 1}-${end})`,
      });
    }
    return chunks;
  }

  // Merge adjacent boundaries if combined size is under maxChunkSize
  const chunks: PreFilterChunk[] = [];
  let groupStart = boundaries[0];

  for (let b = 1; b <= boundaries.length; b++) {
    const groupEnd = b < boundaries.length ? boundaries[b] : lines.length;
    const groupLines = lines.slice(groupStart, groupEnd);
    const groupSize = groupLines.join('\n').length;

    if (groupSize > maxChunkSize && groupStart !== (b < boundaries.length ? boundaries[b] : lines.length)) {
      // Current group is already over limit — flush it
      chunks.push({
        code: groupLines.join('\n'),
        startLine: groupStart,
        label: `chunk-${chunks.length + 1} (lines ${groupStart + 1}-${groupEnd})`,
      });
      groupStart = groupEnd;
    } else if (b < boundaries.length) {
      // Check if adding the next section would exceed limit
      const nextEnd = (b + 1) < boundaries.length ? boundaries[b + 1] : lines.length;
      const extendedLines = lines.slice(groupStart, nextEnd);
      const extendedSize = extendedLines.join('\n').length;

      if (extendedSize > maxChunkSize) {
        // Flush current group, start new one at next boundary
        chunks.push({
          code: groupLines.join('\n'),
          startLine: groupStart,
          label: `chunk-${chunks.length + 1} (lines ${groupStart + 1}-${groupEnd})`,
        });
        groupStart = boundaries[b];
      }
      // Otherwise keep accumulating
    } else {
      // Last segment — flush remaining
      chunks.push({
        code: groupLines.join('\n'),
        startLine: groupStart,
        label: `chunk-${chunks.length + 1} (lines ${groupStart + 1}-${groupEnd})`,
      });
    }
  }

  // Safety: if no chunks were produced, return the whole file as one chunk
  if (chunks.length === 0) {
    chunks.push({
      code,
      startLine: 0,
      label: 'chunk-1 (full file)',
    });
  }

  return chunks;
}

// IDENTITY_SEAL: PART-3 | role=smart-chunker | inputs=code,maxChunkSize | outputs=PreFilterChunk[]

// ============================================================
// PART 4 — Pre-Filter Pipeline
// ============================================================

function preFilter(code: string, _filePath: string): PreFilterResult {
  const originalSize = code.length;
  const lines = code.split('\n');
  const avgLineLen = lines.length > 0 ? originalSize / lines.length : 0;

  // Step 1: Small file with normal line lengths — pass through
  if (originalSize <= MAX_DIRECT_SIZE && avgLineLen <= MAX_AVG_LINE) {
    return {
      chunks: [{ code, startLine: 0, label: 'pass-through (small file)' }],
      stripped: false,
      chunked: false,
      originalSize,
      processedSize: originalSize,
    };
  }

  // Step 2: Strip noise to check real code size
  const stripped = stripNoise(code);
  const strippedSize = stripped.length;

  // Step 3: If stripped size fits, return original code as single chunk
  //         (was just comments/strings bloating it)
  if (strippedSize <= MAX_DIRECT_SIZE) {
    return {
      chunks: [{ code, startLine: 0, label: 'pass-through (noise-stripped fit)' }],
      stripped: true,
      chunked: false,
      originalSize,
      processedSize: strippedSize,
    };
  }

  // Step 4: Split into chunks at natural boundaries
  const chunks = splitIntoChunks(code, MAX_CHUNK_SIZE);

  return {
    chunks,
    stripped: true,
    chunked: true,
    originalSize,
    processedSize: chunks.reduce((sum, c) => sum + c.code.length, 0),
  };
}

// IDENTITY_SEAL: PART-4 | role=pre-filter-pipeline | inputs=code,filePath | outputs=PreFilterResult

// ============================================================
// PART 5 — Integration Helper
// ============================================================

function runWithPreFilter(
  code: string,
  filePath: string,
  analyzer: (chunk: string) => Array<{ line: number; message: string }>,
): Array<{ line: number; message: string }> {
  const result = preFilter(code, filePath);
  const allFindings: Array<{ line: number; message: string }> = [];

  for (const chunk of result.chunks) {
    const chunkFindings = analyzer(chunk.code);
    for (const f of chunkFindings) {
      allFindings.push({
        line: f.line + chunk.startLine,
        message: f.message,
      });
    }
  }

  // Per-file cap: max 80 findings
  const PER_FILE_CAP = 80;
  if (allFindings.length > PER_FILE_CAP) {
    return allFindings.slice(0, PER_FILE_CAP);
  }

  return allFindings;
}

// IDENTITY_SEAL: PART-5 | role=integration-helper | inputs=code,filePath,analyzer | outputs=findings[]

// ============================================================
// Exports
// ============================================================

module.exports = { preFilter, stripNoise, splitIntoChunks, runWithPreFilter };
