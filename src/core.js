export const CATEGORY_ORDER = ['artist', 'character', 'outfit', 'expression', 'scene'];

export const CATEGORY_META = {
  character: { label: '角色', short: '角', color: 'clay' },
  artist: { label: '画师 / 风格', short: '画', color: 'gold' },
  outfit: { label: '服装', short: '衣', color: 'rose' },
  expression: { label: '表情 / 动作', short: '情', color: 'moss' },
  scene: { label: '场景 / 镜头', short: '景', color: 'blue' },
};

export function createId(prefix = 'item') {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

export function joinPromptSegments(segments) {
  const seen = new Set();
  return segments
    .map((segment) => String(segment || '').trim().replace(/^,|,$/g, '').trim())
    .filter(Boolean)
    .filter((segment) => {
      if (seen.has(segment)) return false;
      seen.add(segment);
      return true;
    })
    .join(', ');
}

export function buildCombinations(modules, selections) {
  const byId = new Map(modules.map((item) => [item.id, item]));
  const lanes = CATEGORY_ORDER.map((category) => {
    const selected = (selections[category] || []).map((id) => byId.get(id)).filter(Boolean);
    return selected.length ? selected : [null];
  });

  const product = lanes.reduce(
    (rows, lane) => rows.flatMap((row) => lane.map((item) => [...row, item])),
    [[]],
  );

  return product
    .map((items) => items.filter(Boolean))
    .filter((items) => items.length)
    .map((items, index) => ({
      id: `combo-${index + 1}`,
      name: items.map((item) => item.name).join(' × '),
      itemIds: items.map((item) => item.id),
      positive: joinPromptSegments(items.map((item) => item.positive)),
      negative: joinPromptSegments(items.map((item) => item.negative)),
    }));
}

export function selectionCount(selections) {
  return Object.values(selections).reduce((total, values) => total + values.length, 0);
}

export function safeFilename(value) {
  return String(value || '未命名')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 100);
}

export function resultsToText(results) {
  return results
    .map((result, index) => [
      `# ${String(index + 1).padStart(2, '0')} ${result.name}`,
      '',
      'Positive:',
      result.positive || '（空）',
      '',
      'Negative:',
      result.negative || '（空）',
    ].join('\n'))
    .join('\n\n---\n\n');
}

export function resultsToJson(results, recipeName = '未命名方案') {
  return JSON.stringify({
    format: 'chuanxia-combinations',
    version: 1,
    recipeName,
    exportedAt: new Date().toISOString(),
    combinations: results,
  }, null, 2);
}
