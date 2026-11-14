import type {Block, Note} from './types';

/** Project old notes and imported tables into the editor's table + original blocks. */
export function isQuanCorrectionTable(block: Block): block is Extract<Block,{type:'table'}> {
  return block.type==='table' && block.rows.length===2 &&
    block.rows[0].length===block.rows[1].length &&
    ['算式|錯因','算式|觀念|錯因'].includes(block.rows[0].join('|'));
}
export function withQuanLayout(note: Note, showEmpty = false): Note {
  if (note.section !== 'Quan') return note;
  const blocks = [...note.blocks];
  const index = blocks.findIndex(isQuanCorrectionTable);
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
  const populated=table.rows[1].some(value=>value.trim());
  return {...note, reason, blocks:populated||showEmpty?[table,...blocks]:blocks};
}
