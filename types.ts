export enum VerbForm {
  Dictionary = '辞書形 (Dictionary)',
  Masu = 'ます形 (Masu)',
  Te = 'て形 (Te)',
  Ta = 'た形 (Ta)',
  Nai = 'ない形 (Nai)',
  Imperative = '命令形 (Imperative)',
  Volitional = '意志形 (Volitional)',
  Ba = 'ば形 (Ba)',
  Potential = '可能形 (Potential)',
  Passive = '被動形 (Passive)',
  Causative = '使役形 (Causative)',
  CausativePassive = '使役被動 (Causative-Passive)',
  Prohibitive = '禁止形 (Prohibitive)'
}

export enum JLPTLevel {
  N5 = 'N5',
  N4 = 'N4',
  N3 = 'N3'
}

export interface Vocabulary {
  id: string;
  kanji: string;
  kana: string; 
  meaning: string;
  level?: string;
  form?: string;
  lesson?: number;
}

export interface Sentence {
  id: string;
  japanese: string;
  meaning: string;
  lesson: number;
  verbForm?: string;
}

export interface GameSettings {
  level: JLPTLevel;
  verbForms: VerbForm[]; // If empty, use Level mode. If not empty, use Verb Form mode.
  lessons?: number[];
}