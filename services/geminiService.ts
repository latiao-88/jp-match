import { VerbForm, JLPTLevel, Vocabulary, Sentence } from '../types';
import { N3_VOCAB_LIST, MOCK_N5_N4_MIX } from '../data/vocabData';
import { shuffleArray } from '../utils';

// ============================================================================
//  Configuration & State
// ============================================================================

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

const getApiKey = (): string => {
  // Use localStorage or import.meta.env (Vite standard)
  return localStorage.getItem('GEMINI_API_KEY') || (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
};

const SAMPLE_RATE = 24000;
const audioCache = new Map<string, AudioBuffer>();
let sharedAudioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new AudioContextClass({ sampleRate: SAMPLE_RATE });
  }
  return sharedAudioContext;
};

// ============================================================================
//  Helper: Raw Fetch to Gemini API
// ============================================================================

async function callGeminiApi(prompt: string, schema?: any): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const payload: any = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  if (schema) {
    payload.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: schema
    };
  } else {
    payload.generationConfig = {
      responseMimeType: "application/json"
    };
  }

  try {
    const response = await fetch(`${BASE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`Gemini API Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Request Failed:", error);
    return null;
  }
}

// ============================================================================
//  Audio / TTS
// ============================================================================

const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const pcmToAudioBuffer = (data: Uint8Array, ctx: AudioContext): AudioBuffer => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, SAMPLE_RATE);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
};

const fetchAudioBuffer = async (text: string): Promise<AudioBuffer | null> => {
  if (!text) return null;
  const cleanText = text.replace(/\[.*?\]\((.*?)\)/g, '$1').trim();
  if (!cleanText) return null;

  if (audioCache.has(cleanText)) return audioCache.get(cleanText)!;

  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const payload = {
      contents: [{ parts: [{ text: cleanText }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }
        }
      }
    };

    const response = await fetch(`${BASE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return null;

    const data = await response.json();
    const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) return null;

    const ctx = getAudioContext();
    const pcmData = decodeBase64(base64Audio);
    const audioBuffer = pcmToAudioBuffer(pcmData, ctx);
    
    audioCache.set(cleanText, audioBuffer);
    return audioBuffer;
  } catch (e) {
    console.error("TTS API Error:", e);
    return null;
  }
};

export const preloadSpeech = async (text: string): Promise<void> => {
  await fetchAudioBuffer(text);
};

export const generateSpeech = async (text: string): Promise<void> => {
  const cleanText = text.replace(/\[.*?\]\((.*?)\)/g, '$1').trim();
  if (!cleanText) return;

  // 1. Try Gemini TTS (Fetch)
  try {
    const buffer = await fetchAudioBuffer(text);
    if (buffer) {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      return;
    }
  } catch (e) {
    console.warn("Gemini TTS failed, fallback to browser");
  }

  // 2. Browser TTS Fallback
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleanText);
    u.lang = 'ja-JP';
    u.rate = 0.9; 
    window.speechSynthesis.speak(u);
  } catch (err) {
    console.error("Browser TTS Error", err);
  }
};

// ============================================================================
//  Content Generation (Verb / Vocab / Sentences)
// ============================================================================

const VERB_TOPICS = ["Daily Life", "Travel", "Work", "Feelings", "Nature"];
const BANNED_VERBS = ["食べます", "飲みます", "行きます", "来ます", "見ます", "します", "寝ます"];

export const generateVerbPractice = async (
  forms: VerbForm[],
  level: JLPTLevel,
  count: number = 7
): Promise<Vocabulary[]> => {
  // If no key, use fallback logic immediately
  if (!getApiKey()) {
    console.warn("No API Key, returning empty list to trigger UI prompt");
    return [];
  }

  const topic = VERB_TOPICS[Math.floor(Math.random() * VERB_TOPICS.length)];
  const prompt = `
    Generate ${count} unique Japanese verbs in these forms: ${forms.join(', ')}.
    Topic: ${topic}. Level: ${level}.
    Exclude: ${BANNED_VERBS.join(', ')}.
    Format: JSON Array.
    Schema: [{"id":"uuid","kanji":"[Kanji](Kana)","kana":"reading","meaning":"Chinese","form":"formName"}]
  `;

  const result = await callGeminiApi(prompt);
  return result || [];
};

export const generateVocabulary = async (
  level: JLPTLevel,
  count: number = 7
): Promise<Vocabulary[]> => {
  // If no key, use fallback local data
  if (!getApiKey()) {
    if (level === JLPTLevel.N3) return shuffleArray(N3_VOCAB_LIST).slice(0, count);
    return shuffleArray(MOCK_N5_N4_MIX).slice(0, count);
  }

  const prompt = `
    Generate ${count} Japanese words for ${level}.
    Format: JSON Array.
    Schema: [{"id":"uuid","kanji":"[Kanji](Kana)","kana":"reading","meaning":"Chinese","level":"${level}"}]
  `;

  const result = await callGeminiApi(prompt);
  
  // Fallback if API failed
  if (!result || result.length === 0) {
    if (level === JLPTLevel.N3) return shuffleArray(N3_VOCAB_LIST).slice(0, count);
    return shuffleArray(MOCK_N5_N4_MIX).slice(0, count);
  }
  
  return result;
};

export const generatePracticeContent = async (
  lessons: number[] | undefined,
  verbForms: VerbForm[],
  count: number = 5
): Promise<Sentence[]> => {
  if (!getApiKey()) return [];

  const prompt = `
    Generate ${count} Japanese sentences. Level: N4/N3.
    Verbs: ${verbForms.join(', ')}.
    Format: JSON Array.
    Schema: [{"id":"uuid","japanese":"[Kanji](Kana)...","meaning":"Chinese","lesson":0,"verbForm":"form"}]
  `;

  const result = await callGeminiApi(prompt);
  return result || [];
};
