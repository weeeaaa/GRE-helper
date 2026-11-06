import type {Note} from './types';

export function matchesView(note: Note, view: string) {
  if (view === '全部錯題') return true;
  if (view === 'Verbal') return note.section === 'Verbal';
  return note.section === 'Quan' && note.category === view;
}

export function questionList(notes: Note[], view: string, search: string) {
  const needle = search.trim().toLowerCase();
  return notes.filter(note => matchesView(note, view) &&
    (!needle || JSON.stringify(note).toLowerCase().includes(needle)));
}
