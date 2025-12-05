import { VerbForm, JLPTLevel, Vocabulary, Sentence } from '../types';
import { N3_VOCAB_LIST, MOCK_N5_N4_MIX } from '../data/vocabData';
import { shuffleArray } from '../utils';

// NOTE:
// 为了让 GitHub Pages 上的纯前端版本更加稳定可靠，
// 这里完全移除了对 Gemini API（@google/genai）的依赖，
// 所有单词和句子改为使用内置数据或本地构造。
// 这样即使没有 API key，也能在手机和浏览器上稳定运行。

// ========================
//  语音（仅浏览器 TTS）
// ========================

// 预加载目前不做任何事，只是保留函数签名，避免调用报错
export const preloadSpeech = async (_text: string): Promise<void> => {
  return;
};

// 使用浏览器自带的 speechSynthesis 播放日语
export const generateSpeech = async (text: string): Promise<void> => {
  const cleanText = text.replace(/\[.*?\]\((.*?)\)/g, '$1').trim();
  
  if (!cleanText) {
    console.warn("Empty text for speech generation");
    return;
  }

  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn("Browser TTS not available");
      return;
    }
    // 先取消之前的朗读，避免叠加
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleanText);
    u.lang = 'ja-JP';
    u.rate = 0.9;
    u.pitch = 1.0;
    u.volume = 1.0;
    window.speechSynthesis.speak(u);
  } catch (error) {
    console.error("Browser TTS error:", error);
  }
};

// ========================
//  词汇生成（本地数据）
// ========================

// 从内置 N3 列表中取出动词（id 以 n3_v 开头）
const LOCAL_VERBS: Vocabulary[] = N3_VOCAB_LIST.filter(v => v.id.startsWith('n3_v'));

export const generateVerbPractice = async (
  forms: VerbForm[],
  level: JLPTLevel,
  count: number = 7
): Promise<Vocabulary[]> => {
  // 这里不根据具体变形 form 做复杂变化，
  // 主要是保证用户选择“动词变形模式”时，出来的一定是“动词”
  // 而不是名词、形容词。
  let pool = LOCAL_VERBS;

  // 简单根据等级做一点点区分（目前只有 N3 详细词表）
  if (level === JLPTLevel.N5 || level === JLPTLevel.N4) {
    // 对于 N5/N4，先用 N5/N4 混合列表里的动词（简单过滤）
    const basicVerbs = MOCK_N5_N4_MIX.filter(v => /ます$|します$|きます$|ぎます$|みます$|います$/.test(v.kana));
    pool = basicVerbs.length > 0 ? basicVerbs : LOCAL_VERBS;
  }

  const shuffled = shuffleArray(pool);
  return shuffled.slice(0, count);
};

export const generateVocabulary = async (
  level: JLPTLevel,
  count: number = 7
): Promise<Vocabulary[]> => {
  let source: Vocabulary[];

  if (level === JLPTLevel.N3) {
    source = N3_VOCAB_LIST;
  } else {
    // N5 / N4 使用基础混合词表
    source = MOCK_N5_N4_MIX;
  }

  const shuffled = shuffleArray(source);
  return shuffled.slice(0, count);
};

// ========================
//  例句（简单本地 mock）
// ========================

const MOCK_SENTENCES: Sentence[] = [
  {
    id: 's1',
    japanese: '[毎朝](まいあさ)[早](はや)く[起](お)きます。',
    meaning: '每天早上很早起床。',
    lesson: 5,
    verbForm: 'ます形'
  },
  {
    id: 's2',
    japanese: '[昨日](きのう)[友達](ともだち)と[映画](えいが)を[見](み)ました。',
    meaning: '昨天和朋友一起看了电影。',
    lesson: 12,
    verbForm: 'た形'
  },
  {
    id: 's3',
    japanese: '[雨](あめ)が[降](ふ)ったら、[試合](しあい)は[中止](ちゅうし)になります。',
    meaning: '如果下雨，比赛就会中止。',
    lesson: 25,
    verbForm: 'ば形'
  }
];

export const generatePracticeContent = async (
  lessons: number[] | undefined,
  verbForms: VerbForm[],
  count: number = 5
): Promise<Sentence[]> => {
  // 简单从 MOCK_SENTENCES 里选，稍微根据 lesson 做一下过滤
  let pool = MOCK_SENTENCES;

  if (lessons && lessons.length > 0) {
    pool = MOCK_SENTENCES.filter(s => lessons.includes(s.lesson));
    if (pool.length === 0) {
      pool = MOCK_SENTENCES;
    }
  }

  const shuffled = shuffleArray(pool);
  return shuffled.slice(0, count);
};