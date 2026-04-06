// ============================================================
// CS Quill — Scope-Based Rule Precedence (Policy Graph)
// ============================================================
// 모듈 → 워크스페이스 → 글로벌 3계층 DAG 기반 정책 해석.
// 상위 스코프가 하위를 shadow. 캐시 무효화 + 충돌 감지 + 멱등성.
//
// 사용: const { PolicyGraph, detectConflicts, loadPolicyFile } = require('./scope-policy');

const { readFileSync, existsSync } = require('fs');
const { join, dirname, resolve, sep } = require('path');
const { createHash } = require('crypto');

// ============================================================
// PART 1 — Types
// ============================================================

type PolicyScope = 'module' | 'workspace' | 'global';

interface PolicyRule {
  ruleId: string;
  scope: PolicyScope;
  action: 'enforce' | 'suppress' | 'override';
  value: any;
  source: string;  // file path or 'global'
  timestamp: number;
}

interface PolicyNode {
  scope: PolicyScope;
  rules: Map<string, PolicyRule>;
  children: PolicyNode[];
  parent?: PolicyNode;
}

interface PolicyConflict {
  ruleId: string;
  scopes: PolicyScope[];
  actions: string[];
  resolution: string;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=PolicyScope,PolicyRule,PolicyNode,PolicyConflict

// ============================================================
// PART 2 — Value Hashing (Idempotency)
// ============================================================

function hashRuleValue(rule: PolicyRule): string {
  const payload = `${rule.ruleId}|${rule.scope}|${rule.action}|${JSON.stringify(rule.value)}`;
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

// IDENTITY_SEAL: PART-2 | role=value-hash | inputs=PolicyRule | outputs=string

// ============================================================
// PART 3 — Policy Graph (DAG)
// ============================================================

const SCOPE_PRIORITY: Record<PolicyScope, number> = {
  global: 3,
  workspace: 2,
  module: 1,
};

class PolicyGraph {
  private global: PolicyNode;
  private workspaces: Map<string, PolicyNode>;
  private modules: Map<string, PolicyNode>;
  private hashIndex: Set<string>; // idempotency dedup

  constructor() {
    this.global = { scope: 'global', rules: new Map(), children: [] };
    this.workspaces = new Map();
    this.modules = new Map();
    this.hashIndex = new Set();
  }

  // ── Node Lookup / Creation ──

  private getOrCreateWorkspace(wsPath: string): PolicyNode {
    const normalized = wsPath.replace(/\\/g, '/');
    if (this.workspaces.has(normalized)) return this.workspaces.get(normalized)!;
    const node: PolicyNode = {
      scope: 'workspace',
      rules: new Map(),
      children: [],
      parent: this.global,
    };
    this.global.children.push(node);
    this.workspaces.set(normalized, node);
    return node;
  }

  private getOrCreateModule(modulePath: string, wsPath?: string): PolicyNode {
    const normalized = modulePath.replace(/\\/g, '/');
    if (this.modules.has(normalized)) return this.modules.get(normalized)!;
    const parent = wsPath
      ? this.getOrCreateWorkspace(wsPath)
      : this.global;
    const node: PolicyNode = {
      scope: 'module',
      rules: new Map(),
      children: [],
      parent,
    };
    parent.children.push(node);
    this.modules.set(normalized, node);
    return node;
  }

  // ── Scope Resolution for File Path ──

  private findModuleNode(filePath: string): PolicyNode | null {
    const normalized = filePath.replace(/\\/g, '/');
    // Exact match
    if (this.modules.has(normalized)) return this.modules.get(normalized)!;
    // Directory-based: check if file is inside a module dir
    for (const [modPath, node] of this.modules) {
      if (normalized.startsWith(modPath + '/')) return node;
    }
    return null;
  }

  private findWorkspaceNode(filePath: string): PolicyNode | null {
    const normalized = filePath.replace(/\\/g, '/');
    let bestMatch: PolicyNode | null = null;
    let bestLen = 0;
    for (const [wsPath, node] of this.workspaces) {
      if (normalized.startsWith(wsPath + '/') && wsPath.length > bestLen) {
        bestMatch = node;
        bestLen = wsPath.length;
      }
    }
    return bestMatch;
  }

  // ── Add Rule (with idempotency) ──

  addRule(rule: PolicyRule): boolean {
    const hash = hashRuleValue(rule);
    if (this.hashIndex.has(hash)) return false; // idempotent: no-op
    this.hashIndex.add(hash);

    let node: PolicyNode;
    if (rule.scope === 'global') {
      node = this.global;
    } else if (rule.scope === 'workspace') {
      node = this.getOrCreateWorkspace(rule.source);
    } else {
      // module scope: source is the module directory/file
      const wsNode = this.findWorkspaceNode(rule.source);
      node = this.getOrCreateModule(rule.source, wsNode ? this.getWorkspacePath(wsNode) : undefined);
    }

    node.rules.set(rule.ruleId, rule);
    return true;
  }

  private getWorkspacePath(node: PolicyNode): string | undefined {
    for (const [path, ws] of this.workspaces) {
      if (ws === node) return path;
    }
    return undefined;
  }

  // ── Resolve: walk DAG upward (global > workspace > module) ──

  resolve(ruleId: string, filePath: string): PolicyRule | null {
    // Global always wins (highest priority shadow)
    const globalRule = this.global.rules.get(ruleId);
    if (globalRule) return globalRule;

    // Workspace level
    const wsNode = this.findWorkspaceNode(filePath);
    if (wsNode) {
      const wsRule = wsNode.rules.get(ruleId);
      if (wsRule) return wsRule;
    }

    // Module level (lowest priority)
    const modNode = this.findModuleNode(filePath);
    if (modNode) {
      const modRule = modNode.rules.get(ruleId);
      if (modRule) return modRule;
    }

    return null;
  }

  // ── Effective Rules: merged for a file path ──

  getEffectiveRules(filePath: string): PolicyRule[] {
    const merged = new Map<string, PolicyRule>();

    // Module rules (lowest priority, added first)
    const modNode = this.findModuleNode(filePath);
    if (modNode) {
      for (const [id, rule] of modNode.rules) merged.set(id, rule);
    }

    // Workspace rules (override module)
    const wsNode = this.findWorkspaceNode(filePath);
    if (wsNode) {
      for (const [id, rule] of wsNode.rules) merged.set(id, rule);
    }

    // Global rules (override all)
    for (const [id, rule] of this.global.rules) merged.set(id, rule);

    return Array.from(merged.values());
  }

  // ── Cache Invalidation ──

  invalidateBelow(scope: PolicyScope): number {
    let count = 0;

    if (scope === 'global') {
      // Global updated → invalidate all workspace + module caches
      for (const [, ws] of this.workspaces) {
        count += ws.rules.size;
        for (const child of ws.children) {
          count += child.rules.size;
        }
      }
      for (const [, mod] of this.modules) {
        count += mod.rules.size;
      }
      // Re-index hashes after invalidation
      this.rebuildHashIndex();
    } else if (scope === 'workspace') {
      // Workspace updated → invalidate module caches below
      for (const [, ws] of this.workspaces) {
        for (const child of ws.children) {
          count += child.rules.size;
        }
      }
    }
    // module scope → nothing below to invalidate

    return count;
  }

  private rebuildHashIndex(): void {
    this.hashIndex.clear();
    const addHashes = (node: PolicyNode): void => {
      for (const [, rule] of node.rules) {
        this.hashIndex.add(hashRuleValue(rule));
      }
      for (const child of node.children) addHashes(child);
    };
    addHashes(this.global);
  }

  // ── Diagnostics ──

  getAllRules(): PolicyRule[] {
    const all: PolicyRule[] = [];
    const collect = (node: PolicyNode): void => {
      for (const [, rule] of node.rules) all.push(rule);
      for (const child of node.children) collect(child);
    };
    collect(this.global);
    return all;
  }

  getNodeCount(): { global: number; workspaces: number; modules: number } {
    return {
      global: this.global.rules.size,
      workspaces: this.workspaces.size,
      modules: this.modules.size,
    };
  }
}

// IDENTITY_SEAL: PART-3 | role=policy-graph | inputs=PolicyRule | outputs=resolve,getEffectiveRules,invalidateBelow

// ============================================================
// PART 4 — Conflict Detection
// ============================================================

function detectConflicts(rules: PolicyRule[]): PolicyConflict[] {
  // Group rules by ruleId
  const byId = new Map<string, PolicyRule[]>();
  for (const rule of rules) {
    const group = byId.get(rule.ruleId) ?? [];
    group.push(rule);
    byId.set(rule.ruleId, group);
  }

  const conflicts: PolicyConflict[] = [];
  for (const [ruleId, group] of byId) {
    if (group.length < 2) continue;

    // Check if there are different actions across scopes
    const scopeActions = new Map<PolicyScope, string>();
    for (const rule of group) {
      const existing = scopeActions.get(rule.scope);
      if (existing && existing !== rule.action) {
        // Same scope, different actions — intra-scope conflict
        conflicts.push({
          ruleId,
          scopes: [rule.scope],
          actions: [existing, rule.action],
          resolution: `Last-write wins within ${rule.scope} scope`,
        });
      }
      scopeActions.set(rule.scope, rule.action);
    }

    // Cross-scope conflicts
    const scopes = Array.from(scopeActions.keys());
    const actions = Array.from(scopeActions.values());
    const uniqueActions = new Set(actions);
    if (scopes.length > 1 && uniqueActions.size > 1) {
      // Determine which scope wins
      const winner = scopes.sort((a, b) => SCOPE_PRIORITY[b] - SCOPE_PRIORITY[a])[0];
      conflicts.push({
        ruleId,
        scopes,
        actions: scopes.map(s => `${s}:${scopeActions.get(s)}`),
        resolution: `${winner} scope takes precedence (action: ${scopeActions.get(winner)})`,
      });
    }
  }

  return conflicts;
}

// IDENTITY_SEAL: PART-4 | role=conflict-detection | inputs=PolicyRule[] | outputs=PolicyConflict[]

// ============================================================
// PART 5 — Policy File Loader
// ============================================================

interface PolicyFileEntry {
  ruleId: string;
  scope: PolicyScope;
  action: 'enforce' | 'suppress' | 'override';
  value?: any;
  source?: string;
}

interface PolicyFile {
  version: number;
  rules: PolicyFileEntry[];
}

function loadPolicyFile(rootPath: string): PolicyGraph {
  const graph = new PolicyGraph();
  const policyPath = join(rootPath, '.csquill-policy.json');

  if (!existsSync(policyPath)) return graph;

  try {
    const raw = readFileSync(policyPath, 'utf-8');
    const data: PolicyFile = JSON.parse(raw);

    if (!data.rules || !Array.isArray(data.rules)) return graph;

    for (const entry of data.rules) {
      if (!entry.ruleId || !entry.scope || !entry.action) continue;

      const rule: PolicyRule = {
        ruleId: entry.ruleId,
        scope: entry.scope,
        action: entry.action,
        value: entry.value ?? null,
        source: entry.source ?? (entry.scope === 'global' ? 'global' : rootPath),
        timestamp: Date.now(),
      };

      graph.addRule(rule);
    }
  } catch {
    // Malformed policy file — return empty graph
  }

  return graph;
}

// IDENTITY_SEAL: PART-5 | role=policy-loader | inputs=rootPath | outputs=PolicyGraph

// ============================================================
// Exports
// ============================================================

module.exports = {
  PolicyGraph,
  detectConflicts,
  loadPolicyFile,
  hashRuleValue,
  SCOPE_PRIORITY,
};
