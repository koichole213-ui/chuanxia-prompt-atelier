import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCombinations, joinPromptSegments, resultsToText, safeFilename } from '../src/core.js';

const modules = [
  { id: 'c1', category: 'character', name: '女1', positive: '1girl', negative: '' },
  { id: 'a1', category: 'artist', name: '画师1', positive: 'soft light', negative: 'muddy' },
  { id: 'a2', category: 'artist', name: '画师2', positive: 'ink line', negative: '' },
  { id: 'o1', category: 'outfit', name: '校服', positive: 'uniform', negative: '' },
  { id: 'o2', category: 'outfit', name: '礼服', positive: 'black dress', negative: 'uniform' },
];

test('多选分类会生成笛卡尔组合', () => {
  const results = buildCombinations(modules, {
    character: ['c1'], artist: ['a1', 'a2'], outfit: ['o1', 'o2'], expression: [], scene: [],
  });
  assert.equal(results.length, 4);
  assert.deepEqual(results.map((item) => item.name), [
    '画师1 × 女1 × 校服',
    '画师1 × 女1 × 礼服',
    '画师2 × 女1 × 校服',
    '画师2 × 女1 × 礼服',
  ]);
});

test('空分类会被跳过，原始提示词片段保持完整', () => {
  const [result] = buildCombinations(modules, {
    character: ['c1'], artist: ['a1'], outfit: [], expression: [], scene: [],
  });
  assert.equal(result.positive, 'soft light, 1girl');
  assert.equal(result.negative, 'muddy');
});

test('完全相同的片段只合并一次', () => {
  assert.equal(joinPromptSegments(['best quality', 'best quality', '{weighted, prompt},']), 'best quality, {weighted, prompt}');
});

test('导出文本包含正向和负向区块', () => {
  const text = resultsToText([{ name: '测试', positive: 'one', negative: 'two' }]);
  assert.match(text, /Positive:\none/);
  assert.match(text, /Negative:\ntwo/);
});

test('文件名会移除 Windows 非法字符', () => {
  assert.equal(safeFilename('女1 / 画师:02?'), '女1_-_画师-02-');
});
