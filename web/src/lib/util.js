export const OUTCOMES = [
  { id: 'OUTPUT', label: 'Compiles' },
  { id: 'COMPILE_ERROR', label: 'Compile error' },
  { id: 'RUNTIME_ERROR', label: 'Runtime error' },
];
export const OUTCOME_LABEL = Object.fromEntries(OUTCOMES.map((o) => [o.id, o.label]));

export const KIND_LABEL = {
  code: 'what happens?', concept: 'concept', fill: 'fill the blank',
  order: 'put in order', trace: 'trace it', bug: 'find the bug', write: 'write code',
};

const TAXONOMY = [
  [/widen|autobox|boxing|unbox|wrapper/, 'Conversion & boxing'],
  [/precedence|associat|ternary|bitwise|shortcircuit|integer-division|unary|numeric-promotion|concat/, 'Operators & precedence'],
  [/switch-/, 'Switch semantics'],
  [/string|textblock|replace|split|indent|strip/, 'Strings'],
  [/array/, 'Arrays'],
  [/listof|setof|mapof|aslist|deque|hashset|treeset|hashmap|treemap|collection|iterator|sequenced|computeifabsent|computeifpresent|map-|setcopyof|chm-/, 'Collections'],
  [/reader|writer|files|path|serial|console|openoption|file-/, 'I/O & files'],
  [/lambda|methodref|optional|stream|gatherer|collector|grouping|tomap|filter|map-|parallel|reduce|intstream|maptoint|maptolong|maxby|minby|summariz|averaging|summing|joining|peek|sorted|distinct|takewhile|dropwhile|flatmap/, 'Streams & lambdas'],
  [/thread|virtual|interrupt|atomic|reentrantlock|lock|cyclicbarrier|executor|future|concurrenthashmap|concurrent|failfast|happens|volatile|synchronized|blocked|priority|cyclic/, 'Concurrency'],
  [/date|localdate|localtime|period|duration|zone|dst|instant|chronounit|dt-|truncate|month-enum|dayofweek/, 'Date & time'],
  [/module|compact|instance-main|service|automatic|add-exports|jmod|jdeps|document/, 'Modules'],
  [/locale|bundle|messageformat|numberformat|currency|compact-number/, 'Localization'],
  [/record|enum|override|overload|sealed|var|unnamed|instanceof|pattern|functional|interface|flexible|abstract|private|static-|superclass|gc|access/, 'OOP & types'],
  [/checked|try|twr|exception|multicatch|catch|finally|suppressed|optional-get|optional-of/, 'Exceptions'],
];

export function classify(d) {
  const t = (d.trap || '') + ' ' + (d.id || '');
  for (const [re, cat] of TAXONOMY) if (re.test(t)) return cat;
  return 'Other';
}

export const norm = (s) => (s ?? '').replace(/\r\n/g, '\n').replace(/\s+$/g, '').trim();
export const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const arraysEqual = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

export function outcomeOf(res) {
  if (!res.compiled) return 'COMPILE_ERROR';
  if (res.exitCode !== 0 && /Exception|Error/.test(res.stderr)) return 'RUNTIME_ERROR';
  if (res.stdout.trim() === '') return 'NO_OUTPUT';
  return 'OUTPUT';
}
export function exceptionName(stderr) {
  const m = (stderr || '').match(/([A-Za-z_$][\w$]*Exception|[A-Za-z_$][\w$]*Error)/);
  return m ? m[1] : '';
}
export function fmtUsd(v) { if (!v) return '$0.0000'; return v < 0.01 ? '$' + v.toFixed(5) : '$' + v.toFixed(4); }
