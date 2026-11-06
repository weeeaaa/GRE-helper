import type {Block, Note} from './types';

/** Project old notes and imported tables into the editor's table + original blocks. */
export function withQuanLayout(note: Note): Note {
  if (note.section !== 'Quan') return note;
  const blocks = [...note.blocks];
  const index = blocks.findIndex(block => {
    if (block.type !== 'table' || block.rows.length !== 2) return false;
    const [labels, values] = block.rows;
    return labels.length === values.length &&
      ['算式|錯因', '算式|觀念|錯因'].includes(labels.join('|'));
  });
  const old = index < 0 ? undefined : blocks.splice(index, 1)[0];
  const cells = old?.type === 'table' ? old.rows[1] : [];
  const formula = cells[0] ?? '';
  const concept = cells.length === 3 ? cells[1] : '';
  const reason = cells[cells.length - 1] || note.reason;
  if (note.reason && reason !== note.reason) blocks.push({type:'text', text:'原錯因：'+note.reason});
  const careless = note.category === '粗心';
  if (careless && concept) blocks.unshift({type:'text', text:'原觀念：'+concept});
  const table: Block = {type:'table', rows: careless
    ? [['算式','錯因'], [formula,reason]]
    : [['算式','觀念','錯因'], [formula,concept,reason]]};
  return {...note, reason, blocks:[table,...blocks]};
}
