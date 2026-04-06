// ============================================================
// CS Quill 🦔 — cs config command
// ============================================================
// 설정 조회/변경. 키 관리, 구조, 레벨, 파일모드.
// + 설정값 검증 (validation)
// + 설정 diff 표시
// + 설정 export/import

const {
  loadGlobalConfig, saveGlobalConfig, addKey, removeKey,
  getGlobalConfigPath,
} = require('../core/config');
const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');
type CSConfig = import('../core/config').CSConfig;
type KeyConfig = import('../core/config').KeyConfig;

// ============================================================
// PART 1 — Config Validation
// ============================================================

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

const VALID_LANGUAGES = ['ko', 'en', 'ja', 'zh'] as const;
const VALID_LEVELS = ['easy', 'normal', 'pro'] as const;
const VALID_STRUCTURES = ['auto', 'on', 'off'] as const;
const VALID_FILE_MODES = ['safe', 'auto', 'yolo'] as const;
const VALID_PROVIDERS = ['anthropic', 'openai', 'google', 'groq', 'mistral', 'ollama', 'lm-studio'] as const;
const VALID_ROLES = ['generate', 'verify', 'judge'] as const;

function validateConfig(config: CSConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  // Language
  if (!VALID_LANGUAGES.includes(config.language as any)) {
    errors.push({ field: 'language', message: `유효하지 않은 언어: "${config.language}". 허용: ${VALID_LANGUAGES.join(', ')}`, severity: 'error' });
  }

  // Level
  if (!VALID_LEVELS.includes(config.level as any)) {
    errors.push({ field: 'level', message: `유효하지 않은 레벨: "${config.level}". 허용: ${VALID_LEVELS.join(', ')}`, severity: 'error' });
  }

  // Structure
  if (!VALID_STRUCTURES.includes(config.structure as any)) {
    errors.push({ field: 'structure', message: `유효하지 않은 구조: "${config.structure}". 허용: ${VALID_STRUCTURES.join(', ')}`, severity: 'error' });
  }

  // File mode
  if (!VALID_FILE_MODES.includes(config.fileMode as any)) {
    errors.push({ field: 'fileMode', message: `유효하지 않은 파일모드: "${config.fileMode}". 허용: ${VALID_FILE_MODES.join(', ')}`, severity: 'error' });
  }

  // Keys validation
  if (config.keys && Array.isArray(config.keys)) {
    for (const [i, key] of config.keys.entries()) {
      if (!key.id || typeof key.id !== 'string') {
        errors.push({ field: `keys[${i}].id`, message: `키 ID가 비어있거나 잘못됨`, severity: 'error' });
      }
      if (!VALID_PROVIDERS.includes(key.provider as any)) {
        errors.push({ field: `keys[${i}].provider`, message: `유효하지 않은 프로바이더: "${key.provider}"`, severity: 'error' });
      }
      if (!key.key || typeof key.key !== 'string' || key.key.length < 5) {
        errors.push({ field: `keys[${i}].key`, message: `API 키가 너무 짧거나 비어있음`, severity: 'error' });
      }
      if (!key.model || typeof key.model !== 'string') {
        errors.push({ field: `keys[${i}].model`, message: `모델 미지정`, severity: 'warning' });
      }
      if (!key.roles || !Array.isArray(key.roles) || key.roles.length === 0) {
        errors.push({ field: `keys[${i}].roles`, message: `역할이 지정되지 않음`, severity: 'warning' });
      } else {
        for (const role of key.roles) {
          if (!VALID_ROLES.includes(role as any)) {
            errors.push({ field: `keys[${i}].roles`, message: `알 수 없는 역할: "${role}"`, severity: 'warning' });
          }
        }
      }

      // Provider-specific key format validation
      if (key.provider === 'anthropic' && key.key && !/^sk-ant-/.test(key.key)) {
        errors.push({ field: `keys[${i}].key`, message: `Anthropic 키 형식 의심 (sk-ant-... 형식 확인)`, severity: 'warning' });
      }
      if (key.provider === 'openai' && key.key && !/^sk-/.test(key.key)) {
        errors.push({ field: `keys[${i}].key`, message: `OpenAI 키 형식 의심 (sk-... 형식 확인)`, severity: 'warning' });
      }
    }

    // Check for duplicate key IDs
    const keyIds = config.keys.map(k => k.id);
    const duplicates = keyIds.filter((id, idx) => keyIds.indexOf(id) !== idx);
    if (duplicates.length > 0) {
      errors.push({ field: 'keys', message: `중복 키 ID: ${[...new Set(duplicates)].join(', ')}`, severity: 'error' });
    }

    // Check role coverage
    const allRoles = new Set(config.keys.flatMap(k => k.roles));
    if (!allRoles.has('generate')) {
      errors.push({ field: 'keys', message: `'generate' 역할 키 없음 — 코드 생성 불가`, severity: 'warning' });
    }
  }

  return errors;
}

// IDENTITY_SEAL: PART-1 | role=config-validation | inputs=CSConfig | outputs=ValidationError[]

// ============================================================
// PART 2 — Config Diff Display
// ============================================================

interface ConfigDiff {
  field: string;
  oldValue: string;
  newValue: string;
}

function diffConfigs(oldConfig: CSConfig, newConfig: CSConfig): ConfigDiff[] {
  const diffs: ConfigDiff[] = [];

  const simpleFields: Array<keyof CSConfig> = ['language', 'level', 'structure', 'fileMode', 'framework'];
  for (const field of simpleFields) {
    const oldVal = String(oldConfig[field] ?? '');
    const newVal = String(newConfig[field] ?? '');
    if (oldVal !== newVal) {
      diffs.push({ field, oldValue: oldVal, newValue: newVal });
    }
  }

  // Keys diff
  const oldKeyIds = new Set((oldConfig.keys ?? []).map(k => k.id));
  const newKeyIds = new Set((newConfig.keys ?? []).map(k => k.id));

  for (const key of newConfig.keys ?? []) {
    if (!oldKeyIds.has(key.id)) {
      diffs.push({ field: `keys`, oldValue: '', newValue: `+${key.id} (${key.provider}/${key.model})` });
    }
  }
  for (const key of oldConfig.keys ?? []) {
    if (!newKeyIds.has(key.id)) {
      diffs.push({ field: `keys`, oldValue: `${key.id} (${key.provider}/${key.model})`, newValue: '-삭제됨' });
    }
  }

  // Check for changed keys (same ID, different config)
  for (const newKey of newConfig.keys ?? []) {
    const oldKey = (oldConfig.keys ?? []).find(k => k.id === newKey.id);
    if (!oldKey) continue;
    if (oldKey.model !== newKey.model) {
      diffs.push({ field: `keys[${newKey.id}].model`, oldValue: oldKey.model, newValue: newKey.model });
    }
    if (oldKey.provider !== newKey.provider) {
      diffs.push({ field: `keys[${newKey.id}].provider`, oldValue: oldKey.provider, newValue: newKey.provider });
    }
    const oldRoles = oldKey.roles.sort().join(',');
    const newRoles = newKey.roles.sort().join(',');
    if (oldRoles !== newRoles) {
      diffs.push({ field: `keys[${newKey.id}].roles`, oldValue: oldRoles, newValue: newRoles });
    }
  }

  return diffs;
}

function printDiff(diffs: ConfigDiff[]): void {
  if (diffs.length === 0) {
    console.log('  변경 사항 없음\n');
    return;
  }
  console.log(`  📋 변경 사항 (${diffs.length}건):\n`);
  for (const d of diffs) {
    if (d.oldValue && d.newValue) {
      console.log(`     ${d.field}: ${d.oldValue} → ${d.newValue}`);
    } else if (d.newValue) {
      console.log(`     ${d.field}: ${d.newValue}`);
    } else {
      console.log(`     ${d.field}: ${d.oldValue} (삭제)`);
    }
  }
  console.log('');
}

// IDENTITY_SEAL: PART-2 | role=config-diff | inputs=CSConfig,CSConfig | outputs=ConfigDiff[]

// ============================================================
// PART 3 — Config Export / Import
// ============================================================

interface ExportableConfig {
  _format: 'cs-quill-config';
  _version: '1.0';
  _exported: string;
  language: string;
  level: string;
  structure: string;
  fileMode: string;
  framework?: string;
  keys: Array<{
    id: string;
    provider: string;
    model: string;
    roles: string[];
    budget?: string;
    // key is intentionally excluded from export for security
  }>;
}

function exportConfig(config: CSConfig, includeSensitive: boolean = false): ExportableConfig {
  const exported: ExportableConfig = {
    _format: 'cs-quill-config',
    _version: '1.0',
    _exported: new Date().toISOString(),
    language: config.language,
    level: config.level,
    structure: config.structure,
    fileMode: config.fileMode,
    framework: config.framework,
    keys: config.keys.map(k => ({
      id: k.id,
      provider: k.provider,
      model: k.model,
      roles: [...k.roles],
      budget: k.budget,
      ...(includeSensitive ? { key: k.key } : {}),
    })),
  };
  return exported;
}

function importConfig(data: any): { config: Partial<CSConfig>; warnings: string[] } {
  const warnings: string[] = [];

  if (data._format !== 'cs-quill-config') {
    warnings.push('파일 형식이 cs-quill-config가 아닙니다. 호환성 문제 가능.');
  }

  const result: Partial<CSConfig> = {};

  if (data.language && VALID_LANGUAGES.includes(data.language)) {
    result.language = data.language;
  } else if (data.language) {
    warnings.push(`언어 "${data.language}" 무시됨 (유효하지 않음)`);
  }

  if (data.level && VALID_LEVELS.includes(data.level)) {
    result.level = data.level;
  } else if (data.level) {
    warnings.push(`레벨 "${data.level}" 무시됨 (유효하지 않음)`);
  }

  if (data.structure && VALID_STRUCTURES.includes(data.structure)) {
    result.structure = data.structure;
  } else if (data.structure) {
    warnings.push(`구조 "${data.structure}" 무시됨 (유효하지 않음)`);
  }

  if (data.fileMode && VALID_FILE_MODES.includes(data.fileMode)) {
    result.fileMode = data.fileMode;
  } else if (data.fileMode) {
    warnings.push(`파일모드 "${data.fileMode}" 무시됨 (유효하지 않음)`);
  }

  if (data.framework) {
    result.framework = data.framework;
  }

  // Import keys — require API key to be manually re-entered
  if (Array.isArray(data.keys)) {
    result.keys = [];
    for (const k of data.keys) {
      if (!k.id || !k.provider) {
        warnings.push(`키 데이터 불완전 — 건너뜀`);
        continue;
      }
      result.keys.push({
        id: k.id,
        provider: k.provider,
        key: k.key || '', // empty if not included in export
        model: k.model ?? 'default',
        roles: Array.isArray(k.roles) ? k.roles : ['generate'],
        budget: k.budget,
      });
      if (!k.key) {
        warnings.push(`키 "${k.id}": API 키가 포함되지 않음 — cs config keys-add로 재입력 필요`);
      }
    }
  }

  return { config: result, warnings };
}

// IDENTITY_SEAL: PART-3 | role=config-export-import | inputs=CSConfig | outputs=ExportableConfig

// ============================================================
// PART 4 — Config Display Actions
// ============================================================

function showConfig(config: CSConfig): void {
  console.log('🦔 CS Quill — 현재 설정\n');
  console.log(`  언어:     ${config.language}`);
  console.log(`  레벨:     ${config.level}`);
  console.log(`  구조:     ${config.structure}`);
  console.log(`  파일모드: ${config.fileMode}`);
  console.log(`  프레임워크: ${config.framework ?? '미감지'}`);
  console.log(`  경로:     ${getGlobalConfigPath()}`);

  if (config.keys.length > 0) {
    console.log(`\n  🔑 키 (${config.keys.length}개):`);
    for (const key of config.keys) {
      const masked = key.key.slice(0, 8) + '***';
      console.log(`     ${key.id} (${key.provider}/${key.model}) → [${key.roles.join(', ')}] ${masked}`);
    }
  } else {
    console.log('\n  🔑 키 없음 — cs config keys add 로 추가');
  }

  // Run validation
  const errors = validateConfig(config);
  if (errors.length > 0) {
    console.log(`\n  ⚠️  검증 이슈 (${errors.length}건):`);
    for (const err of errors) {
      const icon = err.severity === 'error' ? '❌' : '⚠️';
      console.log(`     ${icon} ${err.field}: ${err.message}`);
    }
  } else {
    console.log('\n  ✅ 설정 검증 통과');
  }

  console.log('');
}

function showHelp(): void {
  console.log('🦔 CS Quill — config 명령어\n');
  console.log('  cs config show          현재 설정 조회');
  console.log('  cs config validate      설정 검증');
  console.log('  cs config keys          키 목록');
  console.log('  cs config keys add      키 추가 (대화형)');
  console.log('  cs config keys remove   키 삭제');
  console.log('  cs config structure     코드 구조 (auto/on/off)');
  console.log('  cs config level         경험 수준 (easy/normal/pro)');
  console.log('  cs config filemode      파일 모드 (safe/auto/yolo)');
  console.log('  cs config language      언어 (ko/en/ja/zh)');
  console.log('  cs config export        설정 내보내기 (.cs-config.json)');
  console.log('  cs config import <file> 설정 가져오기');
  console.log('  cs config diff <file>   설정 파일과 현재 설정 비교');
  console.log('');
}

// IDENTITY_SEAL: PART-4 | role=config-actions | inputs=CSConfig | outputs=console

// ============================================================
// PART 5 — Config Runner
// ============================================================

export async function runConfig(action: string, extraArg?: string): Promise<void> {
  const config = loadGlobalConfig();

  switch (action) {
    case 'show':
    case undefined:
      showConfig(config);
      break;

    case 'validate': {
      console.log('🦔 CS Quill — 설정 검증\n');
      const errors = validateConfig(config);
      if (errors.length === 0) {
        console.log('  ✅ 모든 설정값 유효\n');
      } else {
        const errCount = errors.filter(e => e.severity === 'error').length;
        const warnCount = errors.filter(e => e.severity === 'warning').length;
        console.log(`  검증 결과: ❌ ${errCount}건 오류, ⚠️ ${warnCount}건 경고\n`);
        for (const err of errors) {
          const icon = err.severity === 'error' ? '❌' : '⚠️';
          console.log(`  ${icon} ${err.field}: ${err.message}`);
        }
        console.log('');
      }
      break;
    }

    case 'keys': {
      if (config.keys.length === 0) {
        console.log('  🔑 등록된 키 없음\n');
      } else {
        console.log(`  🔑 등록된 키 (${config.keys.length}개)\n`);
        for (const [i, key] of config.keys.entries()) {
          console.log(`  [${i + 1}] ${key.id}`);
          console.log(`      ${key.provider} / ${key.model}`);
          console.log(`      역할: [${key.roles.join(', ')}]`);
          if (key.budget) console.log(`      예산: ${key.budget}`);
          console.log('');
        }
      }
      break;
    }

    case 'keys-add': {
      const { createInterface } = require('readline');
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const prompt = (q: string, def?: string): Promise<string> => new Promise(r => {
        rl.question(`  ${q}${def ? ` [${def}]` : ''}: `, (a: string) => r(a.trim() || def || ''));
      });

      const provider = await prompt('Provider (anthropic/openai/google/groq/ollama)', 'anthropic');

      // Validate provider
      if (!VALID_PROVIDERS.includes(provider as any)) {
        console.log(`  ⚠️  알 수 없는 프로바이더: "${provider}". 계속합니다만 호환성 확인 필요.`);
      }

      const key = await prompt('API Key');
      const model = await prompt('Model', provider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-5.4-mini');
      const roles = await prompt('Roles (comma-separated)', 'generate,verify');
      const budget = await prompt('Budget (optional)', '');
      rl.close();

      if (!key) { console.log('  ⚠️  키가 비어있습니다.'); break; }

      // Validate key format
      if (provider === 'anthropic' && !/^sk-ant-/.test(key)) {
        console.log('  ⚠️  Anthropic 키 형식 의심 (sk-ant-... 형식 확인)');
      }
      if (provider === 'openai' && !/^sk-/.test(key)) {
        console.log('  ⚠️  OpenAI 키 형식 의심 (sk-... 형식 확인)');
      }

      // Validate roles
      const parsedRoles = roles.split(',').map((r: string) => r.trim());
      for (const role of parsedRoles) {
        if (!VALID_ROLES.includes(role as any)) {
          console.log(`  ⚠️  알 수 없는 역할: "${role}"`);
        }
      }

      const oldConfig = JSON.parse(JSON.stringify(config)); // deep clone for diff
      addKey(config, {
        id: `${provider}-${config.keys.length + 1}`,
        provider: provider as never,
        key, model,
        roles: parsedRoles,
        budget: budget || undefined,
      });
      saveGlobalConfig(config);

      // Show diff
      const diffs = diffConfigs(oldConfig, config);
      printDiff(diffs);
      console.log(`  ✅ 키 추가됨: ${provider} → [${roles}]`);
      break;
    }

    case 'keys-remove': {
      if (config.keys.length === 0) { console.log('  ⚠️  삭제할 키 없음'); break; }
      for (const [i, k] of config.keys.entries()) {
        console.log(`  [${i + 1}] ${k.id} (${k.provider})`);
      }
      const { createInterface: createRL } = require('readline');
      const rl2 = createRL({ input: process.stdin, output: process.stdout });
      const idx = await new Promise<string>(r => rl2.question('  삭제할 번호: ', (a: string) => { rl2.close(); r(a.trim()); }));
      const num = parseInt(idx, 10) - 1;
      if (num >= 0 && num < config.keys.length) {
        const oldConfig = JSON.parse(JSON.stringify(config));
        const removed = config.keys[num];
        removeKey(config, removed.id);
        saveGlobalConfig(config);
        const diffs = diffConfigs(oldConfig, config);
        printDiff(diffs);
        console.log(`  🗑️  ${removed.id} 삭제됨`);
      } else {
        console.log('  ⚠️  잘못된 번호');
      }
      break;
    }

    case 'structure': {
      const oldConfig = JSON.parse(JSON.stringify(config));
      const validValues = ['auto', 'on', 'off'] as const;
      if (extraArg && validValues.includes(extraArg as any)) {
        config.structure = extraArg as CSConfig['structure'];
      } else {
        const next = config.structure === 'auto' ? 'on' : config.structure === 'on' ? 'off' : 'auto';
        config.structure = next;
      }
      saveGlobalConfig(config);
      const diffs = diffConfigs(oldConfig, config);
      printDiff(diffs);
      console.log(`  구조: ${config.structure} ✅`);
      break;
    }

    case 'level': {
      const oldConfig = JSON.parse(JSON.stringify(config));
      const validLevels = ['easy', 'normal', 'pro'] as const;
      if (extraArg && validLevels.includes(extraArg as any)) {
        config.level = extraArg as CSConfig['level'];
      } else {
        const next = config.level === 'easy' ? 'normal' : config.level === 'normal' ? 'pro' : 'easy';
        config.level = next;
      }
      saveGlobalConfig(config);
      const diffs = diffConfigs(oldConfig, config);
      printDiff(diffs);
      const icons: Record<string, string> = { easy: '🟢', normal: '🟡', pro: '🔴' };
      console.log(`  레벨: ${icons[config.level]} ${config.level} ✅`);
      break;
    }

    case 'filemode': {
      const oldConfig = JSON.parse(JSON.stringify(config));
      const validModes = ['safe', 'auto', 'yolo'] as const;
      if (extraArg && validModes.includes(extraArg as any)) {
        config.fileMode = extraArg as CSConfig['fileMode'];
      } else {
        const next = config.fileMode === 'safe' ? 'auto' : config.fileMode === 'auto' ? 'yolo' : 'safe';
        config.fileMode = next;
      }
      saveGlobalConfig(config);
      const diffs = diffConfigs(oldConfig, config);
      printDiff(diffs);
      const icons: Record<string, string> = { safe: '🔒', auto: '🔓', yolo: '⚡' };
      console.log(`  파일모드: ${icons[config.fileMode]} ${config.fileMode} ✅`);
      break;
    }

    case 'language': {
      const oldConfig = JSON.parse(JSON.stringify(config));
      if (extraArg && VALID_LANGUAGES.includes(extraArg as any)) {
        config.language = extraArg as CSConfig['language'];
      } else {
        const langs: CSConfig['language'][] = ['ko', 'en', 'ja', 'zh'];
        const idx = langs.indexOf(config.language);
        config.language = langs[(idx + 1) % langs.length];
      }
      saveGlobalConfig(config);
      const diffs = diffConfigs(oldConfig, config);
      printDiff(diffs);
      console.log(`  언어: ${config.language} ✅`);
      break;
    }

    case 'export': {
      const exportPath = extraArg || join(process.cwd(), '.cs-config.json');
      const exported = exportConfig(config, false);
      writeFileSync(exportPath, JSON.stringify(exported, null, 2), 'utf-8');
      console.log(`  📤 설정 내보내기 완료: ${exportPath}`);
      console.log('  (API 키는 보안상 제외됨)\n');
      break;
    }

    case 'import': {
      if (!extraArg) {
        console.log('  사용법: cs config import <파일경로>');
        console.log('  예: cs config import .cs-config.json\n');
        break;
      }
      const importPath = extraArg;
      if (!existsSync(importPath)) {
        console.log(`  ❌ 파일을 찾을 수 없음: ${importPath}\n`);
        break;
      }
      try {
        const data = JSON.parse(readFileSync(importPath, 'utf-8'));
        const { config: imported, warnings } = importConfig(data);

        if (warnings.length > 0) {
          console.log('  ⚠️  가져오기 경고:');
          for (const w of warnings) {
            console.log(`     - ${w}`);
          }
          console.log('');
        }

        // Show diff before applying
        const oldConfig = JSON.parse(JSON.stringify(config));
        const merged = { ...config, ...imported };
        if (imported.keys) merged.keys = imported.keys;

        const diffs = diffConfigs(oldConfig, merged as CSConfig);
        if (diffs.length > 0) {
          printDiff(diffs);

          // Apply
          Object.assign(config, imported);
          if (imported.keys) config.keys = imported.keys;

          // Validate before saving
          const errors = validateConfig(config);
          const criticalErrors = errors.filter(e => e.severity === 'error');
          if (criticalErrors.length > 0) {
            console.log('  ⚠️  가져온 설정에 오류 있음:');
            for (const err of criticalErrors) {
              console.log(`     ❌ ${err.field}: ${err.message}`);
            }
            console.log('  설정이 저장되었으나 문제 수정 필요.\n');
          }

          saveGlobalConfig(config);
          console.log(`  📥 설정 가져오기 완료: ${importPath}\n`);
        } else {
          console.log('  변경 사항 없음 — 현재 설정과 동일\n');
        }
      } catch (e: any) {
        console.log(`  ❌ 파일 파싱 실패: ${e.message}\n`);
      }
      break;
    }

    case 'diff': {
      if (!extraArg) {
        console.log('  사용법: cs config diff <파일경로>');
        console.log('  예: cs config diff .cs-config.json\n');
        break;
      }
      if (!existsSync(extraArg)) {
        console.log(`  ❌ 파일을 찾을 수 없음: ${extraArg}\n`);
        break;
      }
      try {
        const otherData = JSON.parse(readFileSync(extraArg, 'utf-8'));
        const { config: otherConfig } = importConfig(otherData);
        const merged = { ...loadGlobalConfig(), ...otherConfig } as CSConfig;
        if (otherConfig.keys) merged.keys = otherConfig.keys as KeyConfig[];

        console.log(`🦔 CS Quill — 설정 비교: 현재 ↔ ${extraArg}\n`);
        const diffs = diffConfigs(config, merged);
        if (diffs.length === 0) {
          console.log('  설정이 동일합니다.\n');
        } else {
          printDiff(diffs);
        }
      } catch (e: any) {
        console.log(`  ❌ 파일 파싱 실패: ${e.message}\n`);
      }
      break;
    }

    case 'ai-profile': {
      const { printAIProfileSummary } = require('../core/ai-config');
      console.log(printAIProfileSummary());
      break;
    }

    case 'recommend': {
      if (config.keys.length === 0) {
        console.log('  ⚠️  키가 없어 추천 불가. cs config keys-add 먼저.');
        break;
      }
      const { recommendSecondKey, getSingleKeyStrategy } = require('../core/ai-config');
      const firstKey = config.keys[0];
      console.log(`\n  현재: ${firstKey.provider}/${firstKey.model}\n`);

      if (config.keys.length === 1) {
        const rec = recommendSecondKey(firstKey.provider);
        console.log(`  💡 크로스모델 추천: ${rec.provider}/${rec.model}`);
        console.log(`     이유: ${rec.reason}\n`);
      }

      const strategy = getSingleKeyStrategy(firstKey.provider, firstKey.model);
      console.log('  태스크별 전략:');
      for (const [task, raw] of Object.entries(strategy)) {
        const s = raw as { temperature?: number; tip?: string };
        const tip = s.tip ? ` — ${s.tip}` : '';
        console.log(`    ${task.padEnd(12)} temp:${s.temperature ?? ''}${tip}`);
      }
      console.log('');
      break;
    }

    default:
      showHelp();
  }
}

// Export for testing
export { validateConfig, diffConfigs, exportConfig, importConfig };

// IDENTITY_SEAL: PART-5 | role=config-runner | inputs=action | outputs=console
