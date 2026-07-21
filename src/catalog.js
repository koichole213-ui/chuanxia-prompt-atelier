export const seedCatalog = {
  modules: [
    {
      id: 'character-female-1-base', category: 'character', name: '女1', version: '基础版',
      positive: '1girl, solo, long black hair, amber eyes, gentle features',
      negative: '', tags: ['主角', '长发'], notes: '示例角色词，可编辑或另建版本。', sample: true,
    },
    {
      id: 'character-female-1-short', category: 'character', name: '女1', version: '短发版',
      positive: '1girl, solo, short black hair, amber eyes, gentle features',
      negative: 'long hair', tags: ['主角', '短发'], notes: '同一角色的另一版外貌。', sample: true,
    },
    {
      id: 'artist-style-1', category: 'artist', name: '画师串1', version: '柔光线稿',
      positive: 'delicate lineart, soft cel shading, warm color palette, finely detailed eyes',
      negative: 'rough sketch, muddy colors', tags: ['柔和', '暖色'], notes: '示例风格串。替换为你收藏的真实画师串即可。', sample: true,
    },
    {
      id: 'artist-style-2', category: 'artist', name: '画师串2', version: '电影厚涂',
      positive: 'painterly anime illustration, cinematic lighting, rich shadows, textured brushwork',
      negative: 'flat lighting, oversaturated', tags: ['厚涂', '电影光'], notes: '示例风格串。原始括号和权重会按原文保留。', sample: true,
    },
    {
      id: 'outfit-school', category: 'outfit', name: '学院制服', version: '春季',
      positive: 'cream cardigan, white shirt, pleated navy skirt, ribbon tie',
      negative: '', tags: ['日常', '制服'], notes: '', sample: true,
    },
    {
      id: 'outfit-dress', category: 'outfit', name: '黑色礼服', version: '晚宴',
      positive: 'elegant black evening dress, subtle gold embroidery, silk gloves',
      negative: 'school uniform', tags: ['礼服', '正式'], notes: '', sample: true,
    },
    {
      id: 'outfit-pajamas', category: 'outfit', name: '居家睡衣', version: '柔软棉质',
      positive: 'cozy cotton pajamas, loose fit, tiny moon pattern',
      negative: 'formal wear', tags: ['居家', '睡衣'], notes: '', sample: true,
    },
    {
      id: 'expression-smile', category: 'expression', name: '轻轻微笑', version: '自然',
      positive: 'soft smile, relaxed shoulders, looking at viewer',
      negative: 'open mouth', tags: ['微笑'], notes: '', sample: true,
    },
    {
      id: 'expression-shy', category: 'expression', name: '害羞侧望', version: '自然',
      positive: 'shy expression, faint blush, looking aside',
      negative: '', tags: ['害羞'], notes: '', sample: true,
    },
    {
      id: 'scene-window', category: 'scene', name: '午后窗边', version: '半身镜头',
      positive: 'beside a sunlit window, quiet afternoon, medium shot, floating dust motes',
      negative: 'night', tags: ['室内', '暖光'], notes: '', sample: true,
    },
  ],
  recipes: [],
};

export const defaultSelections = {
  character: ['character-female-1-base'],
  artist: ['artist-style-1', 'artist-style-2'],
  outfit: ['outfit-school', 'outfit-dress'],
  expression: [],
  scene: [],
};
