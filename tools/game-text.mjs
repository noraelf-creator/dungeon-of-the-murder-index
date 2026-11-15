#!/usr/bin/env node
// ゲームの文字データを機械で収録する（pinned commit を git show で読む。checkout しない）。
//
//   node tools/game-text.mjs --commit fb478cf
//
// 出す物:
//   data/game-text.json                     作者用INDEXに載せる文字データ（場面ごと・出典つき）
//   tmp/game-text-coverage.json             機械検査（分母・抜いた理由・未解決）
//   <70>/text/game-text-coverage.json       同じ物の控え（70 配下）
//   <70>/text/text_report.json / .md        人が読む報告
//
// 決めたこと（変えない）:
//  - 読むのは pinned commit の src/ と assets/ だけ。dist は src の写しなので数えない。
//  - 日本語コメント・正規表現は「本文」にせず internal として件数だけ出す。
//  - 連結（'A'+x+'B'）は 1 つの式としてまとめ、式の所は {{...}} のまま出す（完成文と偽らない）。
//  - 同じ文でも出典が違えば消さない（別 item・別 id）。
//  - コード literal の中の HTML は、見える文字だけを text にし、生 HTML は sourceRaw に残す。
//  - 分母は「日本語を含む文字列ノード」。取りこぼしは理由つきで 1 件ずつ残す。

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const SCHEMA = 'dom-game-text-v1';
export const COVERAGE_SCHEMA = 'dom-game-text-coverage-v1';
export const DEFAULT_COMMIT = 'fb478cf374b53f7bf54b0ae2637f5182566350fd';
export const DEFAULT_GAME =
  process.env.M7_GAME ||
  'C:/00_【創作】一時フォルダ/100_【マダミス】ハーネス作成/mm7_wt_impl_20261115';
export const DEFAULT_TEXT_DIR =
  'C:/00_【創作】一時フォルダ/100_【マダミス】ハーネス作成/work_claude_opus_20261015/70_author_index_editor_20261115/text';

const JA = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff66-\uff9f]/;
export const JP_RE = JA;

const INDEX_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_KEYS = new Set([
  'loc', 'start', 'end', 'range', 'extra', 'tokens', 'comments', 'errors',
  'leadingComments', 'trailingComments', 'innerComments',
]);

// ---------------------------------------------------------------- parser

let PARSER = null;

function loadParser() {
  if (PARSER) return PARSER;
  const require_ = createRequire(import.meta.url);
  const tried = [];
  const candidates = [];
  if (process.env.M7_BABEL_PARSER) candidates.push(process.env.M7_BABEL_PARSER);
  candidates.push('@babel/parser');
  const stores = [
    'C:/Users/81806/AppData/Local/hermes/hermes-agent/node_modules/.pnpm',
  ];
  for (const store of stores) {
    try {
      for (const dir of fs.readdirSync(store)) {
        if (!dir.startsWith('@babel+parser@')) continue;
        candidates.push(path.join(store, dir, 'node_modules/@babel/parser/lib/index.js'));
      }
    } catch { /* 無い環境では次へ */ }
  }
  for (const cand of candidates) {
    try {
      const mod = require_(cand);
      const parse = mod.parse || (mod.default && mod.default.parse);
      if (!parse) continue;
      let version = 'unknown';
      try {
        const pkgPath = cand.endsWith('index.js')
          ? path.join(path.dirname(path.dirname(cand)), 'package.json')
          : require_.resolve(cand + '/package.json');
        version = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
      } catch { /* 版が取れなくても解析はできる */ }
      PARSER = { parse, version, resolvedFrom: cand };
      return PARSER;
    } catch (e) {
      tried.push(cand + ' :: ' + e.message.split('\n')[0]);
    }
  }
  throw new Error('@babel/parser が見つからない。M7_BABEL_PARSER で場所を指定する。\n' + tried.join('\n'));
}

export function parserInfo() {
  const p = loadParser();
  return { name: '@babel/parser', version: p.version, resolvedFrom: p.resolvedFrom };
}

export function parseJsSource(source, file = 'inline.js') {
  const parser = loadParser();
  let ast = null;
  const errors = [];
  try {
    ast = parser.parse(source, {
      sourceType: 'unambiguous',
      errorRecovery: true,
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
      allowHashBang: true,
      attachComment: true,
      ranges: false,
      sourceFilename: file,
    });
  } catch (e) {
    errors.push({ message: String(e.message || e), line: e.loc && e.loc.line });
    return { ast: null, errors, parserVersion: parser.version };
  }
  if (ast.errors && ast.errors.length) {
    for (const e of ast.errors) errors.push({ message: String(e.message || e), line: e.loc && e.loc.line });
  }
  return { ast, errors, parserVersion: parser.version };
}

// ---------------------------------------------------------------- escapes

// JS 文字列の「中身」の escape を戻す。raw は引用符を含まない本文。
export function decodeJsBody(body) {
  let out = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c !== '\\') { out += c; continue; }
    const n = body[++i];
    if (n === undefined) { out += '\\'; break; }
    switch (n) {
      case 'n': out += '\n'; break;
      case 't': out += '\t'; break;
      case 'r': out += '\r'; break;
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case 'v': out += '\v'; break;
      case '0': out += '\0'; break;
      case 'x': {
        const hex = body.slice(i + 1, i + 3);
        out += String.fromCharCode(parseInt(hex, 16));
        i += 2;
        break;
      }
      case 'u': {
        if (body[i + 1] === '{') {
          const close = body.indexOf('}', i + 2);
          out += String.fromCodePoint(parseInt(body.slice(i + 2, close), 16));
          i = close;
        } else {
          const hex = body.slice(i + 1, i + 5);
          out += String.fromCharCode(parseInt(hex, 16));
          i += 4;
        }
        break;
      }
      case '\r': if (body[i + 1] === '\n') i++; break; // 行継続
      case '\n': break;                                 // 行継続
      default: out += n; break;                         // \\ \' \" \` など
    }
  }
  return out;
}

export function decodeJsString(raw) {
  const q = raw[0];
  if (q !== '"' && q !== "'" && q !== '`') throw new Error('文字列リテラルではない: ' + raw.slice(0, 12));
  const end = raw.lastIndexOf(q);
  if (end <= 0) throw new Error('閉じ引用符が無い: ' + raw.slice(0, 12));
  return decodeJsBody(raw.slice(1, end));
}

// ---------------------------------------------------------------- AST utils

const JP_ONLY = (s) => JA.test(String(s || ''));

function loc(node) {
  if (!node || !node.loc) return { line: 0, col: 0, endLine: 0, endCol: 0 };
  return {
    line: node.loc.start.line,
    col: node.loc.start.column + 1,
    endLine: node.loc.end.line,
    endCol: node.loc.end.column + 1,
  };
}

function memberName(node) {
  if (!node) return '?';
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    const o = memberName(node.object);
    if (node.computed) return o + '[' + (node.property.type === 'StringLiteral' ? JSON.stringify(node.property.value) : '?') + ']';
    return o + '.' + memberName(node.property);
  }
  if (node.type === 'ThisExpression') return 'this';
  if (node.type === 'StringLiteral') return node.value;
  return node.type;
}

function keyName(node) {
  if (!node) return '?';
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'StringLiteral') return node.value;
  if (node.type === 'NumericLiteral') return String(node.value);
  return '?';
}

function walkAst(root, cb) {
  const seen = new Set();
  (function rec(node, parents) {
    if (!node || typeof node !== 'object' || typeof node.type !== 'string') return;
    if (seen.has(node)) return;
    seen.add(node);
    cb(node, parents);
    const next = parents.concat([node]);
    for (const k of Object.keys(node)) {
      if (SKIP_KEYS.has(k)) continue;
      const v = node[k];
      if (Array.isArray(v)) {
        for (const c of v) if (c && typeof c.type === 'string') rec(c, next);
      } else if (v && typeof v.type === 'string') {
        rec(v, next);
      }
    }
  })(root, []);
}

function joinPath(segs) {
  let out = '';
  for (const s of segs) {
    if (/^\[\d+\]$/.test(s)) out += s;
    else out += out ? '.' + s : s;
  }
  return out;
}

// そのノードの「読める住所」＝ 変数名／関数名 + オブジェクトキー + 配列添字
const MODULE_NAME = {
  'src/manuscript.js': 'M7Manuscript',
  'src/data.js': 'M7Data',
  'src/engine.js': 'M7Engine',
  'src/app.js': 'M7App',
  'src/board.js': 'M7Board',
  'src/roomplans.js': 'M7RoomPlans',
  'src/sfx.js': 'M7Sfx',
  'src/bgm.js': 'M7Bgm',
};

function sourcePathOf(node, parents, moduleName = '') {
  const segs = [];
  let named = false;
  let child = node;
  for (let i = parents.length - 1; i >= 0; i--) {
    const p = parents[i];
    if (p.type === 'ObjectProperty' && p.value === child) segs.unshift(keyName(p.key));
    else if (p.type === 'ArrayExpression') {
      const idx = p.elements.indexOf(child);
      if (idx >= 0) segs.unshift('[' + idx + ']');
    } else if (p.type === 'VariableDeclarator' && p.init === child && p.id.type === 'Identifier') {
      segs.unshift(p.id.name);
      named = true;
      break;
    } else if (p.type === 'AssignmentExpression' && p.right === child && p.left.type === 'Identifier') {
      segs.unshift(p.left.name);
      named = true;
      break;
    } else if (p.type === 'FunctionDeclaration' && p.id) {
      segs.unshift(p.id.name);
      named = true;
      break;
    }
    // ReturnStatement は住所にしない（関数の中の return は、外側の関数名・変数名を使う）。
    // UMD の factory が返すオブジェクトのように名前が無いときだけ moduleName を使う。
    child = p;
  }
  const local = joinPath(segs);
  if (named) return local || moduleName;
  if (!local) return moduleName;
  return moduleName ? moduleName + '.' + local : local;
}

function rootNameOf(parents) {
  for (let i = parents.length - 1; i >= 0; i--) {
    const p = parents[i];
    if (p.type === 'FunctionDeclaration' && p.id) return p.id.name;
    if (p.type === 'FunctionExpression' || p.type === 'ArrowFunctionExpression') {
      const pp = parents[i - 1];
      if (pp && pp.type === 'VariableDeclarator' && pp.id.type === 'Identifier') return pp.id.name;
      if (pp && pp.type === 'ObjectProperty') return keyName(pp.key);
      if (pp && pp.type === 'AssignmentExpression') return memberName(pp.left);
      return 'anonymous';
    }
    if (p.type === 'VariableDeclarator' && p.id.type === 'Identifier') return p.id.name;
  }
  return 'module';
}

function roleOf(node, parents) {
  const p = parents[parents.length - 1];
  if (!p) return 'expr';
  switch (p.type) {
    case 'CallExpression': return 'call:' + memberName(p.callee);
    case 'NewExpression': return 'new:' + memberName(p.callee);
    case 'ObjectProperty':
      if (p.key === node) return 'key';
      return 'prop:' + keyName(p.key);
    case 'ArrayExpression': return 'array';
    case 'AssignmentExpression': return 'assign:' + memberName(p.left);
    case 'VariableDeclarator': return 'var:' + keyName(p.id);
    case 'BinaryExpression': return 'binary:' + p.operator;
    case 'LogicalExpression': return 'logic:' + p.operator;
    case 'ConditionalExpression': return 'cond';
    case 'IfStatement': return 'cond';
    case 'SwitchCase': return 'case';
    case 'ReturnStatement': return 'return';
    case 'ThrowStatement': return 'throw';
    case 'TemplateLiteral': return 'template-expr';
    default: return p.type;
  }
}

// 同じオブジェクトの speaker / 台詞配列の話者を機械的に取る
function speakerOf(node, parents) {
  const p = parents[parents.length - 1];
  if (p && p.type === 'ObjectProperty' && p.value === node) {
    const obj = parents[parents.length - 2];
    if (obj && obj.type === 'ObjectExpression') {
      for (const q of obj.properties) {
        if (q.type === 'ObjectProperty' && keyName(q.key) === 'speaker' && q.value.type === 'StringLiteral') {
          return q.value.value;
        }
      }
    }
  }
  if (p && p.type === 'ArrayExpression') {
    const idx = p.elements.indexOf(node);
    const gp = parents[parents.length - 2];
    if (idx === 1 && gp && gp.type === 'ObjectProperty' && ['say', 'shout'].includes(keyName(gp.key))) {
      const first = p.elements[0];
      if (first && first.type === 'StringLiteral') return first.value;
    }
  }
  return '';
}

// ---------------------------------------------------------------- markup

const ATTR_TEXT_NAMES = new Set([
  'title', 'alt', 'placeholder', 'aria-label', 'aria-description', 'aria-placeholder',
  'value', 'label', 'content',
]);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', hellip: '…', mdash: '—', ndash: '–' };

function decodeEntities(s) {
  return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body) => {
    if (body[0] === '#') {
      const hex = body[1] === 'x' || body[1] === 'X';
      const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, body) ? ENTITIES[body] : m;
  });
}

function parseTagAttrs(rawAttrs) {
  const out = [];
  const re = /([^\s"'<>/=]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = re.exec(rawAttrs))) {
    const name = m[1].toLowerCase();
    const value = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '';
    out.push({ name, raw: value, text: decodeEntities(value), rel: m.index });
  }
  return out;
}

function textNodesOfHtml(html) {
  const out = [];
  const re = />([^<]+)</g;
  let m;
  while ((m = re.exec(String(html)))) {
    const text = decodeEntities(m[1]).replace(/\s+/g, ' ').trim();
    if (text) out.push(text);
  }
  return out;
}

function allTextAttrsOfHtml(html) {
  const out = [];
  const re = /<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let m;
  while ((m = re.exec(String(html)))) {
    for (const a of parseTagAttrs(m[2])) {
      if (!ATTR_TEXT_NAMES.has(a.name)) continue;
      if (a.text.trim() === '') continue;
      out.push({ name: a.name, text: a.text });
    }
  }
  return out;
}

function visibleTextOfHtml(html) {
  return decodeEntities(String(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function firstTagOfHtml(html) {
  const m = /<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/.exec(String(html));
  if (!m) return { tag: '', attrs: {} };
  const attrs = {};
  for (const a of parseTagAttrs(m[2])) attrs[a.name] = a.text;
  return { tag: m[1].toLowerCase(), attrs };
}

// ---------------------------------------------------------------- JS extraction

function isShortEnglishUi(text, ctx) {
  if (!/^[\x20-\x7E]+$/.test(text)) return false;
  if (text.trim().length === 0 || text.length > 60) return false;
  if (ctx.attr) return true;
  const key = (ctx.propKey || '').toLowerCase();
  if (['title', 'label', 'text', 'name', 'alt', 'placeholder', 'aria-label', 'ariaLabel',
    'msg', 'message', 'toast', 'note', 'desc', 'description', 'heading', 'caption',
    'hint', 'value', 'tooltip'].includes(key)) return true;
  if (/^[A-Z]{2,6}$/.test(text)) return true;                       // HP / MP / OK / HO
  if (/\s/.test(text) && /^[A-Za-z0-9][A-Za-z0-9 .,!?'"()\/:+&%#@-]*$/.test(text)
      && text.trim().split(/\s+/).length >= 2
      && /[A-Z]/.test(text)) return true;                            // Start Game / DUNGEON OF THE MURDER
  return false;
}

export const SKIP_MEANINGS = {
  empty_string: '空文字（画面に出る文字ではない）',
  whitespace_only: '空白だけ',
  asset_path_or_url: '画像・音・URL などのパス（文字ではなくファイル名）',
  source_path: '原稿やフォルダのパス（source.root など。画面の文ではない）',
  css_color: '色の値（#rrggbb）',
  code_identifier: 'コードの識別子・キー名（英数字だけ。画面の文ではない）',
  code_token: 'コードのトークン（CSS クラス・id・ドット区切りのキーなど）',
  css_class: 'CSS のクラス名（小文字とハイフンだけ。ボタンの見た目の指定など）',
  non_japanese_literal: '日本語を含まない文字列で、短い英語UIの条件にも合わない',
  long_non_japanese: '日本語を含まない長い文字列（SVG・CSS・コード片など）',
  not_display_text: '日本語を含むが、表示用の文として扱えない（該当は要確認）',
  build_artifact_duplicate: 'dist の写し（src を数えるので二重計上しない）',
  author_tool: '作者用の確認盤（プレイ画面ではない）',
  build_script: 'build 用のスクリプト（ゲームの画面に出ない）',
  not_runtime_text: 'runtime の文字データを持たないファイル',
  private_not_read: 'private（読まない）',
};

function classifySkip(text, ctx) {
  if (text === '') return 'empty_string';
  if (/^\s+$/.test(text)) return 'whitespace_only';
  if (JA.test(text) && (/[\\/]/.test(text) || /^[A-Za-z]:/.test(text))) return 'source_path';
  if (/^(\/|\.{1,2}\/|assets\/|https?:\/\/|data:|blob:)/i.test(text)) return 'asset_path_or_url';
  if (/\.(webp|png|jpe?g|gif|svg|mp3|ogg|wav|m4a|woff2?|ttf|otf|json|css|js|mjs|html?|mp4|webm)$/i.test(text)) return 'asset_path_or_url';
  if (/^#[0-9a-fA-F]{3,8}$/.test(text)) return 'css_color';
  if (/^[a-z][a-z0-9]*(?:[-_ ][a-z0-9]+)+$/.test(text)) return 'css_class';
  if (/^[a-zA-Z_$][\w$]*$/.test(text)) return 'code_identifier';
  if (/^[A-Za-z0-9_.\-/:$#@%+*=,!?&()[\]<>|~^]+$/.test(text) && !/\s/.test(text)) return 'code_token';
  if (!JA.test(text)) return text.length > 120 ? 'long_non_japanese' : 'non_japanese_literal';
  return 'not_display_text';
}

export function extractJsSource({ file, content, container = '' }) {
  const moduleName = MODULE_NAME[file] || '';
  const parsed = parseJsSource(content, file);
  const items = [];
  const skipped = [];
  const internal = { comments: 0, commentChars: 0, jpRegex: 0, commentSamplePreviews: [] };
  const escapeCheck = { checked: 0, mismatch: [] };
  const stats = {
    literalNodes: 0, jsStringLiterals: 0, jsTemplateElements: 0, jpUnits: 0,
    fragments: 0, dynamicGroups: 0, concatParentLiterals: 0,
    concatParentLiteralsAll: 0, templateLiterals: 0, markupLiterals: 0,
    unaccounted: 0, parseErrors: parsed.errors,
  };

  if (!parsed.ast) {
    return { items, skipped, internal, escapeCheck, stats, literalIndex: [] };
  }

  // comments（internal）
  for (const c of parsed.ast.comments || []) {
    if (JA.test(c.value)) {
      internal.comments++;
      internal.commentChars += c.value.length;
      if (internal.commentSamplePreviews.length < 3) internal.commentSamplePreviews.push(c.value.trim().slice(0, 80));
    }
  }

  const nodes = [];
  const parentOf = new Map();
  walkAst(parsed.ast, (node, parents) => {
    nodes.push(node);
    parentOf.set(node, parents[parents.length - 1] || null);
    if (node.type === 'RegExpLiteral' && JA.test(node.pattern || '')) internal.jpRegex++;
    if (node.type === 'TemplateLiteral') stats.templateLiterals++;
    if (node.type === 'StringLiteral') {
      stats.literalNodes++;
      stats.jsStringLiterals++;
      if (JA.test(node.value)) stats.jpUnits++;
      const p = parentOf.get(node);
      if (p && p.type === 'BinaryExpression' && p.operator === '+') {
        stats.concatParentLiteralsAll++;
        if (JA.test(node.value)) stats.concatParentLiterals++;
      }
    } else if (node.type === 'TemplateElement') {
      stats.literalNodes++;
      stats.jsTemplateElements++;
      if (JA.test((node.value && node.value.cooked) || '')) stats.jpUnits++;
    }
  });

  const literalNodes = nodes.filter((n) => n.type === 'StringLiteral' || n.type === 'TemplateElement');
  const literalId = (n) => `${file}:${n.loc ? n.loc.start.line : 0}:${n.loc ? n.loc.start.column + 1 : 0}`;

  const consumed = new Set();      // 式グループが text に取り込んだ literal
  const ownedBy = new Map();       // literal -> item id（二重取り込みの検査）
  const groupItems = [];

  const fragOf = (n, kind) => {
    let text, raw, jsKind;
    if (n.type === 'StringLiteral') {
      raw = content.slice(n.start, n.end);
      text = n.value;
      jsKind = 'string';
      const decoded = decodeJsString(raw);
      escapeCheck.checked++;
      if (decoded !== text) {
        escapeCheck.mismatch.push({ id: literalId(n), rawPreview: raw.slice(0, 120), decoded, value: text });
      }
    } else {
      raw = n.value && typeof n.value.raw === 'string' ? n.value.raw : content.slice(n.start, n.end);
      text = n.value && typeof n.value.cooked === 'string' ? n.value.cooked : decodeJsBody(raw);
      jsKind = 'template';
      escapeCheck.checked++;
      const decoded = decodeJsBody(raw);
      if (decoded !== text) {
        escapeCheck.mismatch.push({ id: literalId(n), rawPreview: raw.slice(0, 120), decoded, value: text });
      }
    }
    return { id: literalId(n), text, raw, loc: loc(n), jsKind, role: '', kind };
  };

  // 連結の根を集める（親も + なら根ではない）
  const plusRoots = [];
  const templateRoots = [];
  for (const n of nodes) {
    if (n.type === 'BinaryExpression' && n.operator === '+') {
      const p = parentOf.get(n);
      if (p && p.type === 'BinaryExpression' && p.operator === '+') continue;
      plusRoots.push(n);
    } else if (n.type === 'TemplateLiteral') {
      templateRoots.push(n);
    }
  }

  function renderNode(n, frags, parts, depth) {
    if (!n || depth > 40) { parts.push('{{?}}'); return true; }
    if (n.type === 'StringLiteral') {
      const f = fragOf(n, 'string');
      frags.push(f);
      parts.push(f.text);
      return false;
    }
    if (n.type === 'TemplateLiteral') {
      const r = renderTemplate(n, frags, depth + 1);
      parts.push(r.text);
      return r.dynamic;
    }
    if (n.type === 'BinaryExpression' && n.operator === '+') {
      let dyn = false;
      dyn = renderNode(n.left, frags, parts, depth + 1) || dyn;
      dyn = renderNode(n.right, frags, parts, depth + 1) || dyn;
      return dyn;
    }
    if (n.type === 'ParenthesizedExpression') return renderNode(n.expression, frags, parts, depth + 1);
    if (n.type === 'NumericLiteral') { parts.push('{{' + String(n.value) + '}}'); return true; }
    parts.push('{{' + content.slice(n.start, n.end) + '}}');
    return true;
  }

  function renderTemplate(n, frags, depth) {
    const parts = [];
    let dyn = false;
    const quasis = n.quasis || [];
    const exprs = n.expressions || [];
    for (let i = 0; i < quasis.length; i++) {
      const q = quasis[i];
      const cooked = q.value && typeof q.value.cooked === 'string' ? q.value.cooked : '';
      if (cooked !== '') {
        const f = fragOf(q, 'template');
        frags.push(f);
        parts.push(cooked);
      } else {
        // 空の quasi は分母に入るが fragment にはしない（skip で追跡）
        skipped.push({
          id: literalId(q), text: '', reason: 'empty_string', loc: loc(q),
          role: roleOf(q, []), sourcePath: '', container,
        });
        consumed.add(literalId(q));
      }
      if (i < exprs.length) {
        parts.push('{{' + content.slice(exprs[i].start, exprs[i].end) + '}}');
        dyn = true;
      }
    }
    return { text: parts.join(''), dynamic: dyn };
  }

  const makeItem = ({ raw, text, sourcePath, role, rootName, frags, textKind, dynamic, markup, node, extra = {} }) => {
    const id = `${file}#${sourcePath || rootName || 'expr'}@${node.loc ? node.loc.start.line : 0}:${node.loc ? node.loc.start.column + 1 : 0}`;
    // 連結・テンプレートの結果に HTML が混ざる場合（例: '<div ...>'+esc(x)+'</div>'）は、
    // 見える文字だけを text にし、生 HTML は sourceRaw / markup.html に残す。
    let derived = [];
    if ((textKind === 'concat' || textKind === 'template') && /<[a-zA-Z][\w:-]*(\s[^>]*)?>/.test(text)) {
      const attrsAll = allTextAttrsOfHtml(text);
      const visible = visibleTextOfHtml(text);
      const first = firstTagOfHtml(text);
      const shown = visible || (attrsAll[0] ? attrsAll[0].text : '');
      if (shown) {
        derived = attrsAll
      .map((a, k) => ({ name: a.name, text: a.text, k }))
      .filter((a) => a.text !== shown)
      .filter((a) => !/^['"]|\(?\+['"]|['"]\s*\+/.test(a.text));
        markup = { tag: first.tag, attrs: first.attrs, attrTexts: attrsAll, visibleText: visible, html: text };
        text = shown;
        textKind = 'concat_markup';
      }
    }
    const base = {
      id,
      scene: '',
      subscene: '',
      file,
      kind: '',
      speaker: speakerOf(node, buildParents.get(node) || []),
      text,
      category: '',
      variant: '',
      sourcePath,
      rootName,
      role,
      loc: loc(node),
      static: !dynamic,
      dynamic: !!dynamic,
      textKind,
      template: dynamic ? raw : '',
      sourceRaw: raw,
      fragments: frags,
      ...(markup ? { markup } : {}),
      ...(container ? { container } : {}),
      ...extra,
    };
    for (const f of frags) {
      f.sourcePath = sourcePath;
      f.role = role;
      const prev = ownedBy.get(f.id);
      if (prev) throw new Error(`同じ文字列を2つの item が持っている: ${f.id} (${prev} / ${id})`);
      ownedBy.set(f.id, id);
    }
    groupItems.push(base);
    // 連結・テンプレートの markup は、placeholder の中の > で文が割れるので text 行を作らない
    const textNodes = markup && textKind === 'markup' ? textNodesOfHtml(markup.html) : [];
    const seenText = new Set([text]);
    for (let k = 0; k < textNodes.length; k++) {
      const t = textNodes[k];
      if (seenText.has(t)) continue;
      seenText.add(t);
      groupItems.push({
        id: `${id}#text:${k}`, scene: '', subscene: '', file, kind: '', speaker: '', text: t,
        category: '', variant: '', sourcePath: sourcePath + '@text', rootName,
        role: 'markup:text', loc: loc(node), static: true, dynamic: false,
        textKind: 'markup_text', template: '', sourceRaw: raw, fragments: [],
        markup: { tag: markup ? markup.tag : '', parent: id }, derivedFrom: id,
        ...(container ? { container } : {}),
      });
    }
    for (const a of derived) {
      const aid = `${id}#attr:${a.name}:${a.k}`;
      groupItems.push({
        id: aid, scene: '', subscene: '', file, kind: '', speaker: '', text: a.text,
        category: '', variant: '', sourcePath: sourcePath + '@' + a.name, rootName,
        role: 'attr:' + a.name, loc: loc(node), static: true, dynamic: false,
        textKind: 'markup_attr', template: '', sourceRaw: raw, fragments: [],
        markup: { tag: markup ? markup.tag : '', attr: a.name, parent: id }, derivedFrom: id,
        ...(container ? { container } : {}),
      });
    }
    return base;
  };

  // parents を引くための逆引き（speakerOf 用）
  const buildParents = new Map();
  walkAst(parsed.ast, (node, parents) => buildParents.set(node, parents));

  for (const root of plusRoots) {
    const frags = [];
    const parts = [];
    const dynamic = renderNode(root, frags, parts, 0);
    for (const f of frags) consumed.add(f.id);
    const text = parts.join('');
    const role = roleOf(root, buildParents.get(root) || []);
    const sourcePath = sourcePathOf(root, buildParents.get(root) || [], moduleName);
    const rootName = rootNameOf(buildParents.get(root) || []);
    if (!JA.test(text) && !frags.some((f) => JA.test(f.text)) && !isShortEnglishUi(text, { propKey: (role.split(':')[1] || '') })) {
      for (const f of frags) { skipped.push({ id: f.id, text: f.text, reason: classifySkip(f.text, {}), loc: f.loc, role, sourcePath, container }); ownedBy.set(f.id, 'skip'); }
      continue;
    }
    stats.dynamicGroups++;
    makeItem({
      raw: content.slice(root.start, root.end), text, sourcePath, role, rootName,
      frags, textKind: 'concat', dynamic, node: root,
    });
  }

  for (const root of templateRoots) {
    // 連結の operand として取り込まれたテンプレートは二重に扱わない
    if (plusRoots.some((pr) => root.start >= pr.start && root.end <= pr.end)) continue;
    const frags = [];
    const r = renderTemplate(root, frags, 0);
    for (const f of frags) consumed.add(f.id);
    const text = r.text;
    const role = roleOf(root, buildParents.get(root) || []);
    const sourcePath = sourcePathOf(root, buildParents.get(root) || [], moduleName);
    const rootName = rootNameOf(buildParents.get(root) || []);
    if (!JA.test(text) && !frags.some((f) => JA.test(f.text))) {
      for (const f of frags) skipped.push({ id: f.id, text: f.text, reason: classifySkip(f.text, {}), loc: f.loc, role, sourcePath, container });
      continue;
    }
    if (r.dynamic) stats.dynamicGroups++;
    makeItem({
      raw: content.slice(root.start, root.end), text, sourcePath, role, rootName,
      frags, textKind: 'template', dynamic: r.dynamic, node: root,
    });
  }

  // 単独の literal
  for (const n of literalNodes) {
    if (consumed.has(literalId(n))) continue;
    if (n.type === 'TemplateElement' && !(n.value && typeof n.value.cooked === 'string')) continue;

    const f = fragOf(n, n.type === 'StringLiteral' ? 'string' : 'template');
    if (ownedBy.has(f.id)) continue; // 空 quasi など
    const parents = buildParents.get(n) || [];
    const role = roleOf(n, parents);
    const sourcePath = sourcePathOf(n, parents, moduleName);
    const rootName = rootNameOf(parents);
    const propKey = role.startsWith('prop:') ? role.slice(5) : '';
    const attrValue = role === 'prop:title';
    let text = f.text;
    let attrName = '';
    let textKind = 'static';
    const attrFrag = /^\s*([a-zA-Z-]+)\s*=\s*"([^"]*)"\s*$/.exec(f.text);
    if (attrFrag && role.startsWith('call:') && JA.test(attrFrag[2])) {
      // btn('…','act','title="…"') のように、HTML の属性を文字列で渡している物
      attrName = attrFrag[1].toLowerCase();
      text = attrFrag[2];
      textKind = 'attr_fragment';
    }
    const markupLike = /<[a-zA-Z][\w:-]*(\s[^>]*)?>/.test(text) && /<\/?[a-zA-Z][\w:-]*>/.test(text);

    if (f.text === '' || /^\s+$/.test(f.text)) {
      skipped.push({ id: f.id, text: f.text, reason: classifySkip(f.text, {}), loc: f.loc, role, sourcePath, container });
      ownedBy.set(f.id, 'skip');
      continue;
    }

    if (markupLike) {
      stats.markupLiterals++;
      const tag = firstTagOfHtml(text);
      const attrs = tag.attrs;
      const visible = visibleTextOfHtml(text);
      const attrTexts = allTextAttrsOfHtml(text);
      const markup = { tag: tag.tag, attrs, attrTexts, visibleText: visible, html: text };
      const shown = visible || (markup.attrTexts[0] ? markup.attrTexts[0].text : '');
      if (shown === '') {
        skipped.push({ id: f.id, text: f.text, reason: 'long_non_japanese', loc: f.loc, role, sourcePath, container });
        ownedBy.set(f.id, 'skip');
        continue;
      }
      const it = makeItem({
        raw: f.raw, text: shown, sourcePath, role, rootName, frags: [f],
        textKind: 'markup', dynamic: false, markup, node: n,
      });
      // 属性の文字は別の行としても出す（見える文字の行は makeItem が作る。fragment は親が持つ）
      for (let k = 0; k < markup.attrTexts.length; k++) {
        const a = markup.attrTexts[k];
        if (a.text === shown) continue;
        if (/^['"]|\(?\+['"]|['"]\s*\+/.test(a.text)) continue;
        const aid = `${it.id}#attr:${a.name}:${k}`;
        groupItems.push({
          id: aid, scene: '', subscene: '', file, kind: '', speaker: '', text: a.text,
          category: '', variant: '', sourcePath: sourcePath + '@' + a.name,
          rootName, role: 'attr:' + a.name, loc: loc(n), static: true, dynamic: false,
          textKind: 'markup_attr', template: '', sourceRaw: f.raw, fragments: [],
          markup: { tag: tag.tag, attr: a.name, parent: it.id }, derivedFrom: it.id,
          ...(container ? { container } : {}),
        });
      }
      continue;
    }

    const include = JA.test(f.text) || isShortEnglishUi(f.text, { attr: attrValue ? 'title' : '', propKey });
    if (!include) {
      skipped.push({ id: f.id, text: f.text, reason: classifySkip(f.text, {}), loc: f.loc, role, sourcePath, container });
      ownedBy.set(f.id, 'skip');
      continue;
    }
    const extra = {};
    if (role === 'key') {
      extra.isKey = true;
      // T('key', {今: ...}) の「今」は画面の文ではなく、差し込みの名前
      const call = parents.slice().reverse().find((q) => q.type === 'CallExpression');
      if (call && /(^|\.)T$/.test(memberName(call.callee))) extra.placeholder = true;
    }
    if (attrName) extra.attr = attrName;
    makeItem({
      raw: f.raw, text, sourcePath, role, rootName, frags: [f],
      textKind, dynamic: false, node: n, extra,
    });
  }

  for (const it of groupItems) items.push(it);
  for (const s of skipped) {
    if (!s.sourcePath) {
      // 空 quasi などの住所を補う
      s.sourcePath = '';
    }
  }
  stats.fragments = items.reduce((n, i) => n + i.fragments.length, 0);
  stats.unaccounted = stats.literalNodes - stats.fragments - skipped.length;
  return { items, skipped, internal, escapeCheck, stats, literalIndex: literalNodes.map((n) => literalId(n)) };
}

// ---------------------------------------------------------------- HTML extraction

function lineIndex(content) {
  const starts = [0];
  for (let i = 0; i < content.length; i++) if (content[i] === '\n') starts.push(i + 1);
  return (offset) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    return { line: lo + 1, col: offset - starts[lo] + 1 };
  };
}

export function extractHtmlSource({ file, content }) {
  const items = [];
  const skipped = [];
  const parts = []; // 属性・text の単位（分母）
  const inlineStats = { script: 0, jsLiteralNodes: 0, jsStringLiterals: 0, jsTemplateLiterals: 0, jpLiterals: 0, fragments: 0, dynamicGroups: 0, concatParentLiterals: 0, templateLiterals: 0, markupLiterals: 0, errors: [] };
  const inlineInternal = { comments: 0, commentChars: 0, jpRegex: 0, commentSamplePreviews: [] };
  const escapeCheck = { checked: 0, mismatch: [] };
  const where = lineIndex(content);
  let idx = 0;
  let scriptN = 0;
  let styleN = 0;
  let htmlUnits = 0;
  let jpUnits = 0;
  let cssUnits = 0;
  let openTag = '';

  const pushUnit = (kind, raw, text, offset, extra = {}) => {
    htmlUnits++;
    const isJp = JA.test(text);
    if (isJp) jpUnits++;
    if (isJp || (kind === 'attr' && isShortEnglishUi(text, { attr: extra.attr || '' }))) {
      const at = where(offset);
      const id = `${file}#${kind}@${at.line}:${at.col}${extra.attr ? '#' + extra.attr : ''}${extra.n != null ? '#' + extra.n : ''}`;
      items.push({
        id, scene: '', subscene: '', file, kind: kind === 'attr' ? 'attr:' + (extra.attr || '') : kind,
        speaker: '', text, category: '', variant: '', sourcePath: '',
        rootName: 'html', role: kind === 'attr' ? 'attr:' + extra.attr : kind,
        loc: { line: at.line, col: at.col, endLine: at.line, endCol: at.col },
        static: true, dynamic: false, textKind: kind, template: '', sourceRaw: raw, fragments: [],
        ...(extra.attr ? { attr: extra.attr } : {}),
        ...extra.extra,
      });
    } else {
      const at = where(offset);
      skipped.push({
        id: `${file}#${kind}@${at.line}:${at.col}`, text,
        reason: classifySkip(text, {}), loc: { line: at.line, col: at.col, endLine: at.line, endCol: at.col },
        role: kind, sourcePath: '',
      });
    }
  };

  while (idx < content.length) {
    const lt = content.indexOf('<', idx);
    if (lt < 0) {
      const raw = content.slice(idx);
      const text = decodeEntities(raw).replace(/\s+/g, ' ').trim();
      if (text) pushUnit(openTag === 'title' ? 'title' : 'text', raw.trim(), text, idx);
      break;
    }
    if (lt > idx) {
      const raw = content.slice(idx, lt);
      const text = decodeEntities(raw).replace(/\s+/g, ' ').trim();
      if (text) pushUnit(openTag === 'title' ? 'title' : 'text', raw.trim(), text, idx);
    }
    if (content.startsWith('<!--', lt)) {
      const end = content.indexOf('-->', lt);
      idx = end < 0 ? content.length : end + 3;
      continue;
    }
    if (content.startsWith('<!', lt) || content.startsWith('<?', lt)) {
      const end = content.indexOf('>', lt);
      idx = end < 0 ? content.length : end + 1;
      continue;
    }
    const m = /^<\/?([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/.exec(content.slice(lt));
    if (!m) { idx = lt + 1; continue; }
    const tagName = m[1].toLowerCase();
    const closing = content.startsWith('</', lt);
    openTag = closing ? '' : tagName;
    const rawTag = m[0];
    const attrs = parseTagAttrs(m[2]);
    const attrsAt = lt + Math.max(0, rawTag.indexOf(m[2]));
    idx = lt + rawTag.length;

    for (const a of attrs) {
      if (!ATTR_TEXT_NAMES.has(a.name)) continue;
      if (a.text.trim() === '') continue;
      pushUnit('attr', a.raw, a.text, attrsAt + (a.rel || 0), { attr: a.name });
    }

    if (!closing && (tagName === 'script' || tagName === 'style')) {
      const lower = content.toLowerCase();
      const close = lower.indexOf('</' + tagName, idx);
      const body = content.slice(idx, close < 0 ? content.length : close);
      const bodyOffset = idx;
      idx = close < 0 ? content.length : content.indexOf('>', close) + 1;
      if (body.trim() !== '') {
        if (tagName === 'script') {
          scriptN++;
          const r = extractJsSource({ file, content: body, container: `script#${scriptN}` });
          // 位置を行に戻す（body 内 → 元ファイル）
          for (const it of r.items) {
            const at = where(bodyOffset + offsetOfLineCol(body, it.loc.line, it.loc.col));
            it.loc = { ...it.loc, line: at.line, col: at.col };
            it.container = `script#${scriptN}`;
            items.push(it);
          }
          for (const s of r.skipped) {
            const at = where(bodyOffset + offsetOfLineCol(body, s.loc.line, s.loc.col));
            skipped.push({ ...s, container: `script#${scriptN}`, loc: { ...s.loc, line: at.line, col: at.col } });
          }
          inlineStats.script++;
          inlineStats.jsLiteralNodes += r.stats ? r.stats.literalNodes : 0;
          inlineStats.jsStringLiterals += r.stats ? r.stats.jsStringLiterals : 0;
          inlineStats.jsTemplateLiterals += r.stats ? r.stats.jsTemplateElements : 0;
          inlineStats.jpLiterals += r.stats ? r.stats.jpUnits : 0;
          inlineStats.jsTemplateLiterals += r.stats ? r.stats.templateLiterals : 0;
          inlineStats.fragments += r.stats ? r.stats.fragments : 0;
          inlineStats.dynamicGroups += r.stats ? r.stats.dynamicGroups : 0;
          inlineStats.concatParentLiterals += r.stats ? r.stats.concatParentLiterals : 0;
          inlineStats.templateLiterals += r.stats ? r.stats.templateLiterals : 0;
          inlineStats.markupLiterals += r.stats ? r.stats.markupLiterals : 0;
          if (r.stats && r.stats.parseErrors) inlineStats.errors.push(...r.stats.parseErrors);
          inlineInternal.comments += r.internal.comments;
          inlineInternal.commentChars += r.internal.commentChars;
          inlineInternal.jpRegex += r.internal.jpRegex;
          escapeCheck.checked += r.escapeCheck.checked;
          escapeCheck.mismatch.push(...r.escapeCheck.mismatch);
        } else {
          styleN++;
          const r = extractCssSource({ file: `${file}#style#${styleN}`, content: body });
          cssUnits += r.stats.literalNodes;
          inlineStats.jpLiterals += r.stats.jpUnits;
          for (const it of r.items) {
            const at = where(bodyOffset + offsetOfLineCol(body, it.loc.line, it.loc.col));
            it.loc = { ...it.loc, line: at.line, col: at.col };
            it.container = `style#${styleN}`;
            items.push(it);
          }
          for (const s of r.skipped) {
            const at = where(bodyOffset + offsetOfLineCol(body, s.loc.line, s.loc.col));
            skipped.push({ ...s, container: `style#${styleN}`, loc: { ...s.loc, line: at.line, col: at.col } });
          }
        }
      }
    }
  }

  const stats = {
    literalNodes: htmlUnits + inlineStats.jsLiteralNodes + cssUnits,
    jsStringLiterals: inlineStats.jsStringLiterals,
    jsTemplateElements: inlineStats.jsTemplateLiterals,
    fragments: 0,
    dynamicGroups: inlineStats.dynamicGroups,
    concatParentLiterals: inlineStats.concatParentLiterals,
    templateLiterals: inlineStats.templateLiterals,
    markupLiterals: inlineStats.markupLiterals,
    scriptBlocks: scriptN, styleBlocks: styleN,
    jsLiteralNodes: inlineStats.jsLiteralNodes,
    htmlUnits, jpUnits: jpUnits + inlineStats.jpLiterals, cssUnits,
    unaccounted: 0,
    parseErrors: inlineStats.errors,
  };
  // HTML の text/属性・CSS の content は fragment という概念が無いので、item 1 = 単位 1 として数える
  stats.fragments = items.reduce((n, i) => n + i.fragments.length, 0)
    + items.filter((i) => i.fragments.length === 0 && !i.derivedFrom).length;
  stats.unaccounted = stats.literalNodes - stats.fragments - skipped.length;
  return { items, skipped, internal: inlineInternal, escapeCheck, stats };
}

function offsetOfLineCol(text, line, col) {
  let cur = 1, i = 0;
  while (cur < line && i < text.length) {
    if (text[i] === '\n') cur++;
    i++;
  }
  return i + Math.max(0, col - 1);
}

// ---------------------------------------------------------------- CSS extraction

export function extractCssSource({ file, content }) {
  const items = [];
  const skipped = [];
  const where = lineIndex(content);
  const re = /content\s*:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
  let m;
  let seen = 0;
  while ((m = re.exec(content))) {
    seen++;
    const rawWithQuotes = m[1];
    const raw = rawWithQuotes.slice(1, -1);
    const text = decodeCssString(raw);
    const at = where(m.index + m[0].indexOf(rawWithQuotes));
    if (JA.test(text) || isShortEnglishUi(text, { propKey: 'content' })) {
      items.push({
        id: `${file}#content@${at.line}:${at.col}`, scene: '', subscene: '', file,
        kind: 'content', speaker: '', text, category: '', variant: '', sourcePath: '',
        rootName: 'css', role: 'css:content', loc: { ...at, endLine: at.line, endCol: at.col },
        static: true, dynamic: false, textKind: 'css_content', template: '',
        sourceRaw: raw, fragments: [],
      });
    } else {
      skipped.push({ id: `${file}#content@${at.line}:${at.col}`, text, reason: classifySkip(text, {}), loc: { ...at, endLine: at.line, endCol: at.col }, role: 'css:content', sourcePath: '' });
    }
  }
  const units = seen; // 分母は「文字列を持つ content 宣言」だけ（var() や counter() は文字ではない）
  const stats = {
    literalNodes: units, jpUnits: items.filter((i) => JA.test(i.text)).length + skipped.filter((s) => JA.test(s.text)).length,
    fragments: items.length, dynamicGroups: 0,
    concatParentLiterals: 0, templateLiterals: 0, markupLiterals: 0,
    cssContentDecls: seen, unaccounted: units - items.length - skipped.length, parseErrors: [],
  };
  return { items, skipped, internal: { comments: 0, commentChars: 0, jpRegex: 0, commentSamplePreviews: [] }, escapeCheck: { checked: 0, mismatch: [] }, stats };
}

function decodeCssString(raw) {
  return raw.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/\\(.)/g, '$1');
}



// ---------------------------------------------------------------- scenes

export const SCENES = {
  viola: { title: 'ヴィオラの説明（画面の案内）', required: true, page: 'g-viola', desc: 'ヴィオラが画面の使い方を説明する台詞（原稿 guide の12節）と、案内の小文' },
  charsel: { title: '最初のキャラ選択', required: true, page: 'g-charsel', desc: 'キャラ選択の紹介・ロール・参加した日・席の状態（原稿 screenText「キャラ選択の紹介」と data.js）' },
  intro: { title: 'はじめに', required: true, page: 'g-intro', desc: '「はじめに」（プレイヤー配布 00_はじめに）と、その読み方の案内' },
  start: { title: 'ゲーム開始', required: true, page: 'g-start', desc: '準備・「はじめる」・部屋コード・オープニングの読み合わせ（R00）' },
  ho: { title: 'HO・追加HO', page: 'g-ho', desc: '事前HOと追加HOの本文' },
  reading: { title: '読み合わせ', page: 'g-reading', desc: '読み合わせ原本 R01〜R24 の台詞と地の文' },
  card: { title: 'カード・部屋・品', page: 'g-card', desc: 'カード本文・部屋公開文・品・GMメモ' },
  rule: { title: 'ルールと資料', page: 'g-rule', desc: 'ルール・資料・チュートリアル・掛け声' },
  screen: { title: '画面の小さな文', page: 'g-screen', desc: '原稿「画面の小さな文」の節（練習・密談・フェイズの一言など）' },
  ui: { title: '画面のその他の文言', page: 'g-ui', desc: 'app.js のボタン・ラベル・案内・ツールチップ' },
  data: { title: 'データの文言', page: 'g-data', desc: 'data.js のデータ文言（部屋・品・目標・画面の小文）' },
  engine: { title: '段の名・知らせ・エラー', page: 'g-engine', desc: 'engine.js の段の名・知らせ・assert のエラー文' },
  board: { title: '見取り図・間取り', page: 'g-board', desc: 'board.js / roomplans.js の見取り図ラベル' },
  lines_lspre: { title: '分断LSの前置き（P3/P6/P9）', page: 'g-lines-lspre', desc: '分断ライブセレクションの前置きの台詞・地の文・画面' },
  lines_final: { title: '最終戦の演出の台詞', page: 'g-lines-final', desc: '最終戦の演出（final_v12）の台詞・掛け声' },
  html: { title: 'HTMLの題と属性', page: 'g-html', desc: 'HTML の題・属性・CSS の content の見える文字' },
  asset: { title: '素材名（画面の文ではない）', page: 'g-asset', desc: 'sfx.js / bgm.js の素材名（プレイ画面の文ではない）' },
  other: { title: 'その他', page: 'g-other', desc: '場面の規則に当てはまらなかった行（0 件が正常）' },
};

const msPath = (p) => String(p || '').startsWith('M7Manuscript.');

function rule(id, scene, subscene, test) {
  return { id, scene, subscene, test };
}

// 場面は「出所の住所」だけで決める（文面を見て推測しない）
export const SCENE_RULES = [
  rule('viola/guide', 'viola', 'guide', (it) => it.file === 'src/manuscript.js' && /^M7Manuscript\.guide(\.|$)/.test(it.sourcePath)),
  rule('viola/guide-screenText', 'viola', 'guide-screenText', (it) => it.file === 'src/manuscript.js' && /^M7Manuscript\.screenText\.画面の案内(\.|\[|$)/.test(it.sourcePath)),
  rule('viola/app', 'viola', 'ui', (it) => it.file === 'src/app.js' && /viola/i.test(it.rootName || '') && !/violaGoal/i.test(it.rootName || '')),
  rule('start/app-lobby', 'start', 'ui', (it) => it.file === 'src/app.js' && /^(lobbyHead|renderLobby|renderLobbyOnline|gmxSetup|startParty|gmStart|titleScreen|readyHO)/i.test(it.rootName || '')),
  rule('charsel/app', 'charsel', 'ui', (it) => it.file === 'src/app.js' && /^(charSelect|CHARSEL|csSeats|csBg|csAlt|csPose|pcPublic)/i.test(it.rootName || '')),
  rule('charsel/app-paths', 'charsel', 'ui', (it) => it.file === 'src/app.js' && /^(CHARSEL_T|LB_TAB_HEAD|csSeats|csAlt|csPose)(\.|\[|$)/.test(it.sourcePath)),
  rule('charsel/data', 'charsel', 'data', (it) => it.file === 'src/data.js' && /^characters(\.|\[|$)/.test(it.sourcePath)),
  rule('charsel/text-keys', 'charsel', 'data', (it) => it.file === 'src/data.js' && /^TEXT_KEYS\.charsel\./.test(it.sourcePath)),
  rule('charsel/screenText', 'charsel', 'manuscript', (it) => it.file === 'src/manuscript.js' && /^M7Manuscript\.screenText\.キャラ選択の紹介(\.|$)/.test(it.sourcePath)),
  rule('intro/documents', 'intro', 'manuscript', (it) => it.file === 'src/manuscript.js' && /^M7Manuscript\.documents\.intro(\.|$)/.test(it.sourcePath)),
  rule('intro/app', 'intro', 'ui', (it) => it.file === 'src/app.js' && /firstIntro|firstHelp|lbDoc/i.test(it.rootName || '')),
  rule('intro/app-tab', 'intro', 'ui', (it) => it.file === 'src/app.js' && /^LB_TAB_HEAD\.intro$/.test(it.sourcePath)),
  rule('start/readings-r00', 'start', 'opening', (it) => it.file === 'src/manuscript.js' && /^M7Manuscript\.readings\.R00(\.|$)/.test(it.sourcePath)),
  rule('start/app', 'start', 'ui', (it) => it.file === 'src/app.js' && /startParty|gmStart|titleScreen|readyHO/i.test(it.rootName || '')),
  rule('start/app-paths', 'start', 'ui', (it) => it.file === 'src/app.js' && /^(TODO\.setup|lbStart)/.test(it.sourcePath)),
  rule('screenText', 'screen', 'manuscript', (it) => it.file === 'src/manuscript.js' && /^M7Manuscript\.screenText(\.|$)/.test(it.sourcePath)),
  rule('ho', 'ho', 'manuscript', (it) => it.file === 'src/manuscript.js' && /^M7Manuscript\.(ho|addHO)(\.|$)/.test(it.sourcePath)),
  rule('reading', 'reading', 'manuscript', (it) => it.file === 'src/manuscript.js' && /^M7Manuscript\.readings(\.|$)/.test(it.sourcePath)),
  rule('card', 'card', 'manuscript', (it) => it.file === 'src/manuscript.js' && /^M7Manuscript\.(cards|places|rooms|items|itemNotes|cardNotes|roomLS|encounterQuiz|craft)(\.|$)/.test(it.sourcePath)),
  rule('rule', 'rule', 'manuscript', (it) => it.file === 'src/manuscript.js' && /^M7Manuscript\.(documents|rules|lsTutorial|finalCalls|huddleScenes|disgord|thanksScene|importKnownIssues|importWarnings|source)(\.|$)/.test(it.sourcePath)),
  rule('lines-lspre', 'lines_lspre', 'asset', (it) => /^assets\/ls_pre\//.test(it.file)),
  rule('lines-final', 'lines_final', 'asset', (it) => it.file === 'assets/final_v12/lines.js'),
  rule('ui/app', 'ui', 'ui', (it) => it.file === 'src/app.js'),
  rule('data', 'data', 'data', (it) => it.file === 'src/data.js'),
  rule('engine', 'engine', 'engine', (it) => it.file === 'src/engine.js'),
  rule('board', 'board', 'board', (it) => it.file === 'src/board.js' || it.file === 'src/roomplans.js'),
  rule('asset', 'asset', 'asset', (it) => it.file === 'src/sfx.js' || it.file === 'src/bgm.js'),
  rule('html', 'html', 'html', (it) => /\.html$/.test(it.file)),
  rule('css', 'html', 'css', (it) => /\.css$/.test(it.file)),
  rule('manuscript-other', 'rule', 'manuscript', (it) => msPath(it.sourcePath)),
];

export function assignScene(item) {
  for (const r of SCENE_RULES) {
    try {
      if (r.test(item)) return { scene: r.scene, subscene: r.subscene, rule: r.id };
    } catch { /* 壊れた item でも止めない */ }
  }
  return { scene: 'other', subscene: '', rule: 'fallback' };
}

// ---------------------------------------------------------------- category / kind

const MS_VARIANT = [
  [/^M7Manuscript\.guide/, '画面の案内（ヴィオラ・ゲーム用）', 'manuscript_pl'],
  [/^M7Manuscript\.documents\.intro/, 'プレイヤー配布/00_はじめに', 'manuscript_pl'],
  [/^M7Manuscript\.documents\./, 'プレイヤー配布の資料', 'manuscript_pl'],
  [/^M7Manuscript\.screenText/, '画面の小さな文（ゲーム用）', 'manuscript_pl'],
  [/^M7Manuscript\.cards/, 'カード本文（配布）', 'manuscript_pl'],
  [/^M7Manuscript\.cardNotes/, 'カード原本のGMメモ', 'manuscript_gm'],
  [/^M7Manuscript\.itemNotes/, '品のGMメモ', 'manuscript_gm'],
  [/^M7Manuscript\.places/, '部屋公開文', 'manuscript_pl'],
  [/^M7Manuscript\.rooms/, '部屋（原稿）', 'manuscript_pl'],
  [/^M7Manuscript\.ho/, 'HO原本', 'manuscript_pl'],
  [/^M7Manuscript\.addHO/, '追加HO', 'manuscript_pl'],
  [/^M7Manuscript\.readings/, '読み合わせ原本（GM）', 'manuscript_gm'],
  [/^M7Manuscript\.items/, '品の一覧', 'manuscript_pl'],
  [/^M7Manuscript\.rules/, 'ルール', 'manuscript_pl'],
  [/^M7Manuscript\.import/, '取込の注意（生成物）', 'manuscript_gm'],
  [/^M7Manuscript\.source/, '原稿の出所（生成物）', 'manuscript_gm'],
];

function categoryOf(it) {
  if (it.container && it.container.startsWith('script')) return 'ui_literal';
  if (/^assets\/(ls_pre|final_v12)\//.test(it.file)) return 'lines_literal';
  if (it.container && it.container.startsWith('style')) return 'html_attr';
  if (it.file === 'src/manuscript.js') {
    for (const [re, , cat] of MS_VARIANT) if (re.test(it.sourcePath)) return cat;
    return 'manuscript_pl';
  }
  if (it.file === 'src/app.js') return 'ui_literal';
  if (it.file === 'src/data.js') return 'data_literal';
  if (it.file === 'src/engine.js') return 'engine_literal';
  if (it.file === 'src/board.js' || it.file === 'src/roomplans.js') return 'ui_literal';
  if (it.file === 'src/sfx.js' || it.file === 'src/bgm.js') return 'asset_name';
  if (/\.html$/.test(it.file)) return 'html_attr';
  if (/\.css$/.test(it.file)) return 'html_attr';
  if (/^assets\//.test(it.file)) return 'asset_text';
  return 'ui_literal';
}

function variantOf(it) {
  if (it.file === 'src/manuscript.js') {
    for (const [re, label] of MS_VARIANT) if (re.test(it.sourcePath)) return label;
    return '原稿（生成物）';
  }
  if (it.file === 'assets/ls_pre/P3/lines_p3pre.js') return '分断LS P3 の台詞';
  if (it.file === 'assets/ls_pre/P6/lines_p6pre.js') return '分断LS P6 の台詞';
  if (it.file === 'assets/ls_pre/P9/lines_p9pre.js') return '分断LS P9 の台詞';
  if (it.file === 'assets/final_v12/lines.js') return '最終戦の演出の台詞';
  if (it.file === 'src/data.js' && /^legacy(\.|\[|$)/.test(it.sourcePath)) return 'Ver3.2の予備本文（原稿取込前の代わり）';
  if (it.container) return it.container;
  return '';
}

function kindOf(it) {
  if (it.markup && (it.textKind === 'markup' || it.textKind === 'concat_markup')) return 'markup';
  if (it.textKind === 'markup_attr') return 'attr';
  if (it.textKind === 'markup_text') return 'text';
  if (it.textKind === 'attr_fragment') return 'attr';
  if (it.textKind === 'css_content') return 'content';
  if (it.placeholder) return 'placeholder';
  if (it.isKey) return 'key';
  if (/\.html$/.test(it.file) && !it.container) {
    if (it.textKind === 'title') return 'title';
    if (it.textKind === 'attr') return 'attr';
    return 'text';
  }
  if (it.container && it.container.startsWith('script')) {
    // インラインJS は下の JS 規則へ
  }
  if (it.role === 'throw' || /^call:assert/.test(it.role)) return 'error';
  if (/^call:console\./.test(it.role)) return 'log';
  if (/^call:(alert|confirm|prompt)/.test(it.role)) return 'toast';
  if (/^call:(btn|button)/.test(it.role)) return 'button';
  if (/^attr:/.test(it.role)) return 'attr';

  const p = it.sourcePath || '';
  if (/\.speaker$/.test(p)) return 'speaker';
  if (/^M7Manuscript\.readings\.[^.]+\.title$/.test(p)) return 'title';
  if (it.file === 'src/manuscript.js') {
    if (/^M7Manuscript\.guide\./.test(p)) return it.speaker ? 'line' : 'note';
    if (/^M7Manuscript\.cards\./.test(p)) return 'card';
    if (/^M7Manuscript\.(ho|addHO)\./.test(p)) return 'ho';
    if (/^M7Manuscript\.places\.|^M7Manuscript\.rooms\./.test(p)) return 'room';
    if (/^M7Manuscript\.readings\./.test(p)) return it.speaker ? 'line' : 'narration';
    if (/^M7Manuscript\.cardNotes\.|^M7Manuscript\.itemNotes\./.test(p)) return 'gm_note';
    if (/^M7Manuscript\.documents\./.test(p)) return 'doc';
    if (/^M7Manuscript\.rules\./.test(p)) return 'rule';
    if (/^M7Manuscript\.screenText\./.test(p)) return 'screen';
    if (/^M7Manuscript\.finalCalls\./.test(p)) return 'call';
    if (/^M7Manuscript\.lsTutorial\./.test(p)) return 'tutorial';
    if (/^M7Manuscript\.disgord\./.test(p)) return 'disgord';
    if (/^M7Manuscript\.roomLS\./.test(p)) return 'room_ls';
    if (/^M7Manuscript\.appendix|^M7Manuscript\.craft\./.test(p)) return 'craft';
  }
  if (/^LINES\./.test(p) || /\.say\[/.test(p) || /\.shout\[/.test(p)) return 'line';
  if (/\.narr\b/.test(p)) return 'narration';
  if (/\.lsq\b/.test(p)) return 'question';
  if (/\.opts\[/.test(p)) return 'option';
  if (/\.cond\b/.test(p)) return 'condition';
  if (/\.CALL\d*\b/.test(p)) return 'call';
  if (/\.se\b/.test(p)) return 'se';
  if (it.file === 'src/engine.js') return 'engine';
  if (it.file === 'src/board.js' || it.file === 'src/roomplans.js') return 'board';
  if (it.file === 'src/sfx.js' || it.file === 'src/bgm.js') return 'asset';
  if (/\.(title|label|name)$/.test(p)) return 'label';
  return 'label';
}

// ---------------------------------------------------------------- sources

export function listGameTextSources(gameDir, commit) {
  const raw = execFileSync('git', ['-C', gameDir, 'ls-tree', '-r', '-l', commit], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  const out = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const m = /^(\d+)\s+(\w+)\s+([0-9a-f]+)\s+([\d-]+)\t(.*)$/.exec(line);
    if (!m) continue;
    const [, , type, , size, p] = m;
    if (type !== 'blob') continue;
    const decision = decidePath(p);
    if (!decision.scan) continue;
    out.push({ path: p, bytes: Number(size) || 0, ...decision });
  }
  return out;
}

function decidePath(p) {
  // 枚挙の対象は「文字を持ち得るファイル」＝ script / HTML / CSS だけ。
  // 画像・音・JSON は文字データではないので、枚挙そのものに入れない（report に注記）。
  if (!/^(src|assets|dist|scripts)\//.test(p)) return { include: false, scan: false, role: 'outside_runtime', reason: 'not_runtime_text' };
  if (!/\.(js|mjs|html|css)$/i.test(p)) return { include: false, scan: false, role: 'not_text_bearing', reason: 'not_runtime_text' };
  if (p.startsWith('private/')) return { include: false, scan: true, role: 'private', reason: 'private_not_read' };
  if (p.startsWith('dist/')) return { include: false, scan: true, role: 'build_artifact', reason: 'build_artifact' };
  if (p.startsWith('scripts/')) return { include: false, scan: true, role: 'build_script', reason: 'build_script' };
  if (/^src\/review-/.test(p) || p === 'src/review.html' || p === 'src/review.css') {
    return { include: false, scan: true, role: 'author_tool', reason: 'author_tool' };
  }
  if (/^assets\//.test(p)) return { include: true, scan: true, role: 'runtime_asset', reason: '' };
  if (/^src\//.test(p)) return { include: true, scan: true, role: p.endsWith('.css') ? 'runtime_style' : 'runtime_source', reason: '' };
  return { include: false, scan: true, role: 'other', reason: 'not_runtime_text' };
}

function gitShow(gameDir, commit, p) {
  return execFileSync('git', ['-C', gameDir, 'show', `${commit}:${p}`], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
}

function gitResolve(gameDir, commit) {
  try {
    return execFileSync('git', ['-C', gameDir, 'rev-parse', commit], { encoding: 'utf8' }).trim();
  } catch {
    return commit;
  }
}

// ---------------------------------------------------------------- build

const SKIP_ORDER = [
  'empty_string', 'whitespace_only', 'source_path', 'asset_path_or_url', 'css_color',
  'code_identifier', 'code_token', 'non_japanese_literal', 'long_non_japanese', 'not_display_text',
];

export function buildGameText({ commit = DEFAULT_COMMIT, generatedAt = new Date().toISOString(), gameDir = DEFAULT_GAME, files = null } = {}) {
  const resolved = files ? commit : gitResolve(gameDir, commit);
  let entries;
  const sources = new Map();
  if (files) {
    entries = files.map((f) => ({
      path: f.path, bytes: Buffer.byteLength(f.content, 'utf8'),
      include: f.decision ? !!f.decision.include : true,
      role: (f.decision && f.decision.role) || 'runtime_source',
      reason: (f.decision && f.decision.reason) || '',
    }));
    for (const f of files) sources.set(f.path, f.content);
  } else {
    entries = listGameTextSources(gameDir, resolved);
    for (const e of entries) {
      if (!e.include) continue;
      sources.set(e.path, gitShow(gameDir, resolved, e.path));
    }
  }

  const allItems = [];
  const covFiles = [];
  const totals = { literalNodes: 0, fragments: 0, skipped: 0, items: 0, dynamic: 0, static: 0 };
  const escapeTotal = { checked: 0, mismatch: [] };
  const skipReasons = {};
  const parseErrors = [];

  for (const e of entries) {
    if (!e.include) {
      covFiles.push({
        path: e.path, decision: 'exclude', role: e.role, reason: e.reason, bytes: e.bytes,
        units: { jsLiterals: 0, jsStringLiterals: 0, jsTemplateElements: 0, jpLiterals: 0, templateLiterals: 0, concatParentLiterals: 0, dynamicGroups: 0, htmlUnits: 0, cssContentDecls: 0 },
        items: 0, fragments: 0, skipped: [], skippedByReason: {}, internal: { comments: 0, commentChars: 0, jpRegex: 0 },
      });
      continue;
    }
    const content = sources.get(e.path);
    let r;
    if (/\.html$/i.test(e.path)) r = extractHtmlSource({ file: e.path, content });
    else if (/\.css$/i.test(e.path)) r = extractCssSource({ file: e.path, content });
    else r = extractJsSource({ file: e.path, content });

    const st = r.stats;
    const jsString = st.jsStringLiterals || 0;

    const byReason = {};
    for (const s of r.skipped) byReason[s.reason] = (byReason[s.reason] || 0) + 1;

    covFiles.push({
      path: e.path, decision: 'include', role: e.role, reason: '', bytes: e.bytes,
      units: {
        jsLiterals: st.jsLiteralNodes != null ? st.jsLiteralNodes : st.literalNodes,
        jsStringLiterals: jsString,
        jsTemplateElements: st.jsTemplateElements || 0,
        jpLiterals: st.jpUnits || 0,
        templateLiterals: st.templateLiterals || 0,
        concatParentLiterals: st.concatParentLiterals || 0,
        dynamicGroups: st.dynamicGroups || 0,
        markupLiterals: st.markupLiterals || 0,
        htmlUnits: st.htmlUnits || 0,
        cssContentDecls: st.cssContentDecls || 0,
        nonJpItems: r.items.filter((i) => !JA.test(i.text)).length,
      },
      items: r.items.length,
      fragments: st.fragments,
      skipped: r.skipped,
      skippedByReason: byReason,
      internal: r.internal,
      escape: r.escapeCheck,
      parseErrors: st.parseErrors || [],
      dynamicGroups: st.dynamicGroups || 0,
      literalNodes: st.literalNodes,
      unaccounted: st.unaccounted,
    });

    totals.literalNodes += st.literalNodes;
    totals.fragments += st.fragments;
    totals.skipped += r.skipped.length;
    for (const s of r.skipped) skipReasons[s.reason] = (skipReasons[s.reason] || 0) + 1;
    escapeTotal.checked += r.escapeCheck.checked;
    escapeTotal.mismatch.push(...r.escapeCheck.mismatch);
    if (st.parseErrors && st.parseErrors.length) parseErrors.push({ file: e.path, errors: st.parseErrors });

    for (const it of r.items) {
      it.category = categoryOf(it);
      it.variant = variantOf(it);
      const sc = assignScene(it);
      it.scene = sc.scene;
      it.subscene = sc.subscene;
      it.sceneRule = sc.rule;
      it.kind = kindOf(it);
      if (!it.speaker) it.speaker = speakerOfKind(it);
      it.gmFlag = it.category === 'manuscript_gm';
      // 未使用の空フィールドは落とす（JSON を小さく保つ）
      if (!it.template) delete it.template;
      if (!it.container) delete it.container;
      if (!it.markup) delete it.markup;
      if (!it.attr) delete it.attr;
      allItems.push(it);
    }
  }

  // 並び: 場面 → ファイル → 行
  const sceneOrder = Object.keys(SCENES);
  const rank = (s) => (sceneOrder.indexOf(s) < 0 ? sceneOrder.length : sceneOrder.indexOf(s));
  allItems.sort((a, b) => rank(a.scene) - rank(b.scene)
    || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0)
    || a.loc.line - b.loc.line || a.loc.col - b.loc.col);

  const byScene = {};
  for (const it of allItems) byScene[it.scene] = (byScene[it.scene] || 0) + 1;

  const scenes = sceneOrder.filter((s) => s !== 'other' || (byScene[s] || 0) > 0).map((id) => {
    const list = allItems.filter((i) => i.scene === id);
    const filesSet = new Set(list.map((i) => i.file));
    const picks = [];
    const preferKinds = ['line', 'label', 'button', 'text', 'card', 'markup', 'narration'];
    for (const k of preferKinds) {
      for (const it of list) {
        if (picks.length >= 5) break;
        if (it.kind !== k || picks.some((p) => p.id === it.id)) continue;
        if (!it.text.trim()) continue;
        picks.push({ id: it.id, kind: it.kind, speaker: it.speaker, text: it.text, file: it.file, loc: it.loc });
      }
      if (picks.length >= 5) break;
    }
    return {
      id,
      title: SCENES[id].title,
      desc: SCENES[id].desc || '',
      page: SCENES[id].page,
      required: !!SCENES[id].required,
      count: list.length,
      static: list.filter((i) => !i.dynamic).length,
      dynamic: list.filter((i) => i.dynamic).length,
      files: [...filesSet].map((f) => ({ file: f, count: list.filter((i) => i.file === f).length })),
      samples: picks,
    };
  });
  const unknownItems = allItems.filter((i) => !SCENES[i.scene]);
  const indexOf = new Map(allItems.map((it, i) => [it.id, i]));
  const views = [];
  for (const s of scenes) {
    const list = allItems.filter((i) => i.scene === s.id);
    if (!list.length) continue;
    views.push({ id: `scene:${s.id}`, scene: s.id, from: indexOf.get(list[0].id), to: indexOf.get(list[list.length - 1].id) + 1, count: list.length });
  }
  const filesWithItems = [...new Set(allItems.map((i) => i.file))];
  for (const f of filesWithItems) {
    // 並びは場面が先なので、同じファイルの行は飛び飛びになる。連続する範囲（segments）で持つ。
    const idxs = [];
    for (let i = 0; i < allItems.length; i++) if (allItems[i].file === f) idxs.push(i);
    const segments = [];
    let start = null, prev = null;
    for (const i of idxs) {
      if (start === null) { start = i; prev = i; }
      else if (i === prev + 1) prev = i;
      else { segments.push({ from: start, to: prev + 1 }); start = i; prev = i; }
    }
    if (start !== null) segments.push({ from: start, to: prev + 1 });
    views.push({ id: `file:${f}`, file: f, segments, count: idxs.length, from: segments[0].from, to: segments[segments.length - 1].to });
  }
  // 場面 × ファイルの組み合わせ（1画面1ファイルで読めるように）
  for (const s of scenes) {
    for (const f of s.files) {
      const list = allItems.filter((i) => i.scene === s.id && i.file === f.file);
      if (!list.length) continue;
      views.push({ id: `scene-file:${s.id}:${f.file}`, scene: s.id, file: f.file, from: indexOf.get(list[0].id), to: indexOf.get(list[list.length - 1].id) + 1, count: list.length });
    }
  }

  const data = {
    schema: SCHEMA,
    commit: resolved,
    commitShort: String(resolved).slice(0, 7),
    generatedAt,
    source: {
      game: gameDir,
      branch: 'impl-20261115',
      readVia: 'git show <commit>:<path>（checkout/build しない）',
      forbidden: ['impl-txt 46368f5', 'impl-eng fa7bd46', 'author69 worktree'],
    },
    parser: parserInfo(),
    counts: {
      items: allItems.length,
      static: allItems.filter((i) => !i.dynamic).length,
      dynamic: allItems.filter((i) => i.dynamic).length,
      fragments: allItems.reduce((n, i) => n + i.fragments.length, 0),
      byScene,
      byKind: countBy(allItems, 'kind'),
      byCategory: countBy(allItems, 'category'),
    },
    scenes,
    views,
    sceneRules: SCENE_RULES.map((r) => ({ id: r.id, scene: r.scene, subscene: r.subscene, count: allItems.filter((i) => i.sceneRule === r.id).length })),
    categories: {
      manuscript_pl: '原稿のプレイヤー配布（カード・HO・はじめに・画面の案内など）',
      manuscript_gm: '原稿のGM資料（GMメモ・読み合わせ原本）',
      ui_literal: '手書きの画面文言（app.js / board.js / roomplans.js、HTML内のJS）',
      data_literal: '手書きのデータ文言（data.js）',
      engine_literal: 'エンジンの段の名・知らせ・エラー（engine.js）',
      lines_literal: '分断LS・最終戦の台詞ファイル（assets/ls_pre, assets/final_v12）',
      html_attr: 'HTML の題・属性・CSS の content',
      asset_name: '素材名（sfx.js / bgm.js。画面の文ではない）',
    },
    kinds: {
      line: '台詞', narration: '地の文・場面の説明', speaker: '話者の欄', note: '見出し・注記',
      label: '画面のラベル', button: 'ボタン', card: 'カード', ho: 'HO', room: '部屋',
      doc: '資料', screen: '画面の小文', rule: 'ルール', markup: 'HTML markup の見える文字',
      attr: 'HTML の属性の文字', key: 'データのキー（画面に出るとは限らない）',
      placeholder: '差し込みの名前（T() の変数）', question: '問い', option: '選択肢',
      condition: '条件の注記', engine: '段の名・知らせ', error: 'エラー・assert',
      log: 'ログ', asset: '素材名', content: 'CSS の content', title: '題', text: 'HTML の文字',
    },
    files: covFiles.filter((f) => f.decision === 'include').map((f) => ({
      file: f.path, role: f.role, bytes: f.bytes, items: f.items, jpLiterals: f.units.jpLiterals,
    })),
    items: allItems,
    notes: [
      'text は出典そのまま（JS の escape は decoded）。動的式は {{...}} のまま出し、完成文と偽らない。',
      'static=false の行は、実ゲームでは式の値で変わる。fragments の合計を完成文として数えないこと。',
      '同じ文でも出典（file / sourcePath / loc）が違えば別 item。dedup していない。',
      'markup は見える文字だけを text にし、生 HTML は sourceRaw・markup.html に残す（生レンダリングしない）。',
      '原稿由来（manuscript.js）は生成物。正本は 05_完成版 の md。ここでは「実装に入っている文」を出す。',
      'asset（sfx/bgm の名前）は画面の文ではない。分母（9272）には入れず、別場面に分けた。',
    ],
  };

  const denominatorFiles = ['src/manuscript.js', 'src/app.js', 'src/data.js', 'src/engine.js', 'src/board.js', 'src/roomplans.js', 'src/index.html'];
  const coreMeasured = denominatorFiles.reduce((n, p) => {
    const f = covFiles.find((x) => x.path === p);
    return n + (f ? f.units.jpLiterals : 0);
  }, 0);
  const additional = covFiles.filter((f) => f.decision === 'include' && !denominatorFiles.includes(f.path));

  const coverage = {
    schema: COVERAGE_SCHEMA,
    commit: resolved,
    commitShort: String(resolved).slice(0, 7),
    generatedAt,
    parser: parserInfo(),
    jpRegex: '/[\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uff66-\\uff9f]/',
    denominator: {
      core: {
        files: denominatorFiles,
        expected: 9272,
        expectedFrom: 'intake/TEXT_SCREEN_INTAKE §5（app1635+data1999+engine638+board74+roomplans92+manuscript4833+html1）',
        measured: coreMeasured,
        match: coreMeasured === 9272,
      },
      additional: {
        files: additional.map((f) => ({ file: f.path, jpLiterals: f.units.jpLiterals })),
        measured: additional.reduce((n, f) => n + f.units.jpLiterals, 0),
      },
      all: {
        measured: covFiles.filter((f) => f.decision === 'include').reduce((n, f) => n + f.units.jpLiterals, 0),
        nodes: totals.literalNodes,
        note: 'JP は core + additional。nodes は収録対象ファイルの文字列ノード全体（JP + 短い英語UI + コード片）。除外した物は files[].skipped に理由つきで全部ある。',
      },
    },
    totals: {
      literalNodes: totals.literalNodes,
      fragments: totals.fragments,
      skipped: totals.skipped,
      items: allItems.length,
      dynamic: allItems.filter((i) => i.dynamic).length,
      static: allItems.filter((i) => !i.dynamic).length,
      unaccounted: covFiles.filter((f) => f.decision === 'include').reduce((n, f) => n + (f.unaccounted || 0), 0),
    },
    unknownScenes: unknownItems.length,
    escapeCheck: escapeTotal,
    parseErrors,
    skipReasons: Object.fromEntries(
      [...new Set([...SKIP_ORDER, ...Object.keys(skipReasons)])]
        .filter((r) => skipReasons[r] || SKIP_MEANINGS[r])
        .map((r) => [r, { count: skipReasons[r] || 0, meaning: SKIP_MEANINGS[r] || '（意味未定義）' }])
    ),
    files: covFiles,
    scenes: scenes.map((s) => ({ id: s.id, count: s.count, static: s.static, dynamic: s.dynamic, required: s.required, files: s.files })),
    checks: {
      coreDenominatorMatch: coreMeasured === 9272,
      unaccountedZero: covFiles.filter((f) => f.decision === 'include').every((f) => (f.unaccounted || 0) === 0),
      unknownScenesZero: unknownItems.length === 0,
      escapeMismatchZero: escapeTotal.mismatch.length === 0,
      requiredScenes: Object.entries(SCENES).filter(([, v]) => v.required).map(([k]) => ({ scene: k, count: byScene[k] || 0 })),
      appConcatParentLiterals: (covFiles.find((f) => f.path === 'src/app.js') || { units: {} }).units.concatParentLiterals,
      templateLiterals: (covFiles.find((f) => f.path === 'src/app.js') || { units: {} }).units.templateLiterals,
    },
  };

  return { data, coverage, sources };
}

function speakerOfKind(it) {
  return it.speaker || '';
}

function countBy(list, key) {
  const out = {};
  for (const it of list) out[it[key]] = (out[it[key]] || 0) + 1;
  return out;
}

// ---------------------------------------------------------------- report

export function renderReport({ data, coverage }) {
  const lines = [];
  const L = (s = '') => lines.push(s);
  L('# ゲーム文字データの収録と機械検査');
  L();
  L(`- commit: \`${data.commit}\`（${data.commitShort}）`);
  L(`- 作った日時: ${data.generatedAt}`);
  L(`- 読み方: ${data.source.readVia}`);
  L(`- parser: ${data.parser.name} ${data.parser.version}`);
  L(`- 収録した行: **${data.counts.items}**（静的 ${data.counts.static} / 動的 ${data.counts.dynamic}、literal 断片 ${data.counts.fragments}）`);
  L(`- 分母（intake の7ファイル・日本語を含む文字列）: **${coverage.denominator.core.measured} / ${coverage.denominator.core.expected}**（一致: ${coverage.denominator.core.match ? 'はい' : 'いいえ'}）`);
  L(`- 取りこぼし（fragment にも skip にも入っていないノード）: **${coverage.totals.unaccounted}**`);
  L(`- 場面が決まらない行: **${coverage.unknownScenes}**`);
  L(`- JS escape の照合: ${coverage.escapeCheck.checked} 件、不一致 ${coverage.escapeCheck.mismatch.length} 件`);
  L();
  L('## 場面（親が g-<scene> を登録する一覧）');
  L();
  L('| scene | 題 | 説明 | 行 | 静的 | 動的 | 必須 | ファイル |');
  L('|---|---|---|---:|---:|---:|:--:|---|');
  for (const s of data.scenes) {
    L(`| \`${s.id}\` | ${s.title} | ${s.desc} | ${s.count} | ${s.static} | ${s.dynamic} | ${s.required ? '●' : ''} | ${s.files.map((f) => f.file + '(' + f.count + ')').join('<br>')} |`);
  }
  L();
  L('### 必須4場面の代表（先頭 3 件ずつ）');
  for (const s of data.scenes.filter((x) => x.required)) {
    L();
    L(`**${s.id} — ${s.title}**（${s.count} 行）`);
    for (const sm of s.samples.slice(0, 3)) {
      L(`- \`${sm.kind}\`${sm.speaker ? '／' + sm.speaker : ''}「${String(sm.text).replace(/\n/g, '⏎')}」  <small>${sm.file}:${sm.loc.line}</small>`);
    }
  }
  L();
  L('## ファイル別（収録 / 分母 / 抜いた理由）');
  L();
  L('| ファイル | 収録 | 分母(JP) | 断片 | 抜いた | 主な理由 |');
  L('|---|---:|---:|---:|---:|---|');
  for (const f of coverage.files.filter((x) => x.decision === 'include')) {
    const reasons = Object.entries(f.skippedByReason).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([r, n]) => `${r}:${n}`).join(', ');
    L(`| \`${f.path}\` | ${f.items} | ${f.units.jpLiterals} | ${f.fragments} | ${f.skipped.length} | ${reasons || '—'} |`);
  }
  L();
  L('## 読んだが数えないファイル（理由つき）');
  L();
  L('| ファイル | 区分 | 理由 |');
  L('|---|---|---|');
  for (const f of coverage.files.filter((x) => x.decision === 'exclude')) {
    L(`| \`${f.path}\` | ${f.role} | ${f.reason} |`);
  }
  L();
  L('## 抜いた文字の理由（全体）');
  L();
  L('| 理由 | 件数 | 意味 |');
  L('|---|---:|---|');
  for (const [r, v] of Object.entries(coverage.skipReasons)) {
    L(`| \`${r}\` | ${v.count} | ${v.meaning} |`);
  }
  L();
  L('## intake（TEXT_SCREEN_INTAKE）との差');
  L();
  L('| 項目 | intake | 実測 | 判定 |');
  L('|---|---:|---:|:--:|');
  L(`| 分母（7ファイルの日本語文字列） | 9272 | ${coverage.denominator.core.measured} | ${coverage.denominator.core.match ? '一致' : '不一致'} |`);
  L(`| app.js の連結の親が + の日本語リテラル | 531 | ${coverage.checks.appConcatParentLiterals} | ${coverage.checks.appConcatParentLiterals === 531 ? '一致' : '不一致'} |`);
  L(`| app.js のテンプレートリテラル | 2 | ${coverage.checks.templateLiterals} | 実測は 0（\` はコメント内だけ。intake の 2 は再現しない） |`);
  L('| 収録元のファイル数 | 12（intake の表） | git ls-tree で src/ と assets/ の js/html/css を全部枚挙 | 増えた分は理由つきで coverage に記載 |');
  L();
  L('intake の 12 ファイルには入っていないが実ゲームで文字を持つ物を足した: `assets/ls_pre/P{3,6,9}/lines_*.js`、`assets/final_v12/lines.js`、`assets/ls_pre/*/index.html`、`assets/final_v12/show.html`、`assets/ls_pre/embed.js`、CSS の `content:`。');
  L('intake が「コメント・dist・review-* を除く」とした方針はそのまま。dist は src と同一なので数えない（coverage に exclude として残す）。');
  L();
  L('## 検査の結果');
  L();
  for (const [k, v] of Object.entries(coverage.checks)) {
    if (typeof v === 'object') L(`- ${k}: \`${JSON.stringify(v)}\``);
    else L(`- ${k}: **${v}**`);
  }
  if (coverage.parseErrors.length) {
    L();
    L('### 解析の注意');
    for (const p of coverage.parseErrors) L(`- ${p.file}: ${p.errors.map((e) => e.message).join(' / ')}`);
  }
  L();
  L('## 数え方の注意（作者に誤解させないため）');
  for (const n of data.notes) L(`- ${n}`);
  L('- 分母は「文字列ノードの数」で、文の数ではない。連結は複数の断片から1つの式にまとめた。');
  L('- 画面に出るかどうかは出所で決めた（app.js / data.js / manuscript.js など）。見た目の推測はしていない。');
  L('- sfx.js / bgm.js の名前は素材名で、プレイ画面の文ではない（場面 asset に別枠）。');
  L('- 画像・音・JSON（assets/ の素材）は文字を持たないので、枚挙の対象に入れていない。');
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------- CLI

function parseArgs(argv) {
  const args = { commit: DEFAULT_COMMIT, game: DEFAULT_GAME, out: 'data/game-text.json', coverage: 'tmp/game-text-coverage.json', textDir: DEFAULT_TEXT_DIR };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--commit') args.commit = argv[++i];
    else if (a === '--game') args.game = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--coverage') args.coverage = argv[++i];
    else if (a === '--textdir') args.textDir = argv[++i];
    else if (a === '--no-textdir') args.textDir = '';
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error('知らない引数: ' + a);
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log('node tools/game-text.mjs --commit fb478cf [--game <path>] [--out data/game-text.json] [--coverage tmp/game-text-coverage.json] [--textdir <70/text>]');
    return 0;
  }
  const { data, coverage } = buildGameText({ commit: args.commit, gameDir: args.game });
  const write = (p, obj) => {
    const abs = path.isAbsolute(p) ? p : path.join(INDEX_ROOT, p);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, JSON.stringify(obj, null, 1) + '\n', 'utf8');
    return abs;
  };
  const outAbs = write(args.out, data);
  const covAbs = write(args.coverage, coverage);
  let textFiles = [];
  if (args.textDir) {
    fs.mkdirSync(args.textDir, { recursive: true });
    const cov2 = path.join(args.textDir, 'game-text-coverage.json');
    fs.writeFileSync(cov2, JSON.stringify(coverage, null, 1) + '\n', 'utf8');
    const repJson = path.join(args.textDir, 'text_report.json');
    fs.writeFileSync(repJson, JSON.stringify({ data: { commit: data.commit, generatedAt: data.generatedAt, counts: data.counts, scenes: data.scenes }, coverage }, null, 1) + '\n', 'utf8');
    const repMd = path.join(args.textDir, 'text_report.md');
    fs.writeFileSync(repMd, renderReport({ data, coverage }), 'utf8');
    textFiles = [cov2, repJson, repMd];
  }
  console.log(JSON.stringify({
    commit: data.commitShort,
    items: data.counts.items,
    static: data.counts.static,
    dynamic: data.counts.dynamic,
    scenes: data.counts.byScene,
    denominator: coverage.denominator.core,
    unaccounted: coverage.totals.unaccounted,
    unknownScenes: coverage.unknownScenes,
    escapeMismatch: coverage.escapeCheck.mismatch.length,
    files: { out: outAbs, coverage: covAbs, text: textFiles },
  }, null, 1));
  return coverage.checks.coreDenominatorMatch && coverage.totals.unaccounted === 0 && coverage.unknownScenes === 0 ? 0 : 1;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  try {
    process.exit(main());
  } catch (e) {
    console.error(e && e.stack ? e.stack : e);
    process.exit(2);
  }
}

