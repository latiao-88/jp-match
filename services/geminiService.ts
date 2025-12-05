import { GoogleGenAI } from "@google/genai";
import { VerbForm, JLPTLevel, Vocabulary, Sentence } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SAMPLE_RATE = 24000;

// Audio Cache and Context Singleton
const audioCache = new Map<string, AudioBuffer>();
let sharedAudioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
  }
  return sharedAudioContext;
};

const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const pcmToAudioBuffer = (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = SAMPLE_RATE,
  numChannels: number = 1
): AudioBuffer => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

// Internal function to fetch and decode audio, managing cache
const fetchAudioBuffer = async (text: string): Promise<AudioBuffer | null> => {
  if (!text) return null;

  // IMPORTANT FIX: Prioritize Kana in brackets for pronunciation
  // Old: [私](わたし) -> 私 (Risk of Chinese reading)
  // New: [私](わたし) -> わたし (Guaranteed Japanese reading)
  const cleanText = text.replace(/\[.*?\]\((.*?)\)/g, '$1');
  
  if (!cleanText.trim()) return null;

  // Return cached buffer if exists
  if (audioCache.has(cleanText)) {
    return audioCache.get(cleanText)!;
  }

  if (!apiKey) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ text: cleanText }] 
      }],
      config: {
        // Use string literal to avoid runtime enum issues
        responseModalities: ['AUDIO' as any], 
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    const base64Audio = part?.inlineData?.data;

    if (!base64Audio) {
      // Log warning but don't crash, let fallback handle it
      console.warn("Gemini TTS returned no audio data. Response text:", part?.text);
      return null;
    }

    const ctx = getAudioContext();
    const pcmData = decodeBase64(base64Audio);
    const audioBuffer = pcmToAudioBuffer(pcmData, ctx);
    
    // Store in cache
    audioCache.set(cleanText, audioBuffer);
    return audioBuffer;

  } catch (error) {
    console.warn("Gemini TTS Fetch Error (Falling back to browser):", error);
    return null;
  }
};

// Public function to preload audio in background
export const preloadSpeech = async (text: string): Promise<void> => {
  await fetchAudioBuffer(text);
};

// Public function to play audio (from cache or fetch)
export const generateSpeech = async (text: string): Promise<void> => {
  // Try to get buffer (checks cache internally)
  const buffer = await fetchAudioBuffer(text);
  
  // Re-calculate clean text to ensure fallback uses the same logic
  const cleanText = text.replace(/\[.*?\]\((.*?)\)/g, '$1');

  if (buffer) {
    const ctx = getAudioContext();
    // Resume context if suspended (browser requirement for user gesture)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  } else {
    // Fallback to Browser TTS if API failed or no Key
    console.log("Using Browser TTS Fallback for:", cleanText);
    const u = new SpeechSynthesisUtterance(cleanText);
    u.lang = 'ja-JP';
    u.rate = 1.0; 
    window.speechSynthesis.speak(u);
  }
};

const VERB_TOPICS = [
  "Cooking & Recipes (烹饪)",
  "Office Work (办公室工作)",
  "Travel & Hotels (旅行与住宿)",
  "Repairs & DIY (修理与制作)",
  "Emotions (情感)",
  "Social Interactions (社交)",
  "Shopping (购物)",
  "Housework (家务)",
  "Health (健康)",
  "Nature (自然)",
  "Technology (科技)",
  "Traffic (交通)",
  "Emergencies (紧急情况)",
  "Hobbies (爱好)"
];

const BANNED_VERBS = [
  "食べます", "飲みます", "行きます", "来ます", "見ます", "します", "寝ます", "起きます", "勉強します", "買います", "聞きます",
  "食べる", "飲む", "行く", "来る", "見る", "する", "寝る", "起きる", "勉強する", "買う", "聞く"
];

export const generateVerbPractice = async (
  forms: VerbForm[],
  level: JLPTLevel,
  count: number = 7
): Promise<Vocabulary[]> => {
    if (!apiKey) return [];

    const randomTopic = VERB_TOPICS[Math.floor(Math.random() * VERB_TOPICS.length)];
    // Force higher complexity request
    const complexity = "Intermediate (N4/N3) - Use varied and distinct verbs";

    const prompt = `
    Generate ${count} distinct Japanese verbs conjugated in the following forms: ${forms.join(', ')}.
    Topic: ${randomTopic}.
    Complexity: ${complexity}.
    
    CRITICAL RULES:
    1. STRICTLY EXCLUDE these common words: ${BANNED_VERBS.join(', ')}.
    2. I want interesting verbs like: "repair (直す)", "invite (誘う)", "translate (翻訳する)", "break (折れる)", "lose (失くす)", "search (探す)", "decide (決める)", "convey (伝える)".
    3. Japanese text MUST use ruby format for Kanji ONLY. 
       - Correct: [食](た)べます
       - Incorrect: [食べます](たべます)
    4. If a specific form is requested (e.g., Te-form), the Japanese text MUST be in that form.
    5. Meaning must be in Simplified Chinese (简体中文).
    6. JSON Format ONLY.
    
    Schema:
    [
      { "id": "uuid", "kanji": "formatted_string_with_brackets", "kana": "full_reading_string", "meaning": "string", "form": "string" }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) return [];
        return JSON.parse(text) as Vocabulary[];
    } catch (e) {
        console.error("Verb Gen Error", e);
        return [];
    }
};

const VOCAB_TOPICS = [
  "Economics & Business (经济与商务)",
  "Health & Medicine (健康与医疗)", 
  "Traffic & Transport (交通与运输)",
  "Technology & Science (科技与科学)",
  "Nature & Environment (自然与环境)",
  "Politics & Society (政治与社会)",
  "Emotions & Personality (情感与性格)",
  "Abstract Concepts (抽象概念)",
  "Workplace (职场)",
  "Education (教育)",
  "Arts & Culture (艺术与文化)",
  "Law & Rules (法律与规则)"
];

export const generateVocabulary = async (
  level: JLPTLevel,
  count: number = 7
): Promise<Vocabulary[]> => {
    if (!apiKey) return [];

    const randomTopic = VOCAB_TOPICS[Math.floor(Math.random() * VOCAB_TOPICS.length)];

    const prompt = `
    Generate ${count} Japanese vocabulary words for JLPT Level ${level}.
    Topic: ${randomTopic} (To ensure variety).
    
    CRITICAL RULES:
    1. Avoid very common beginner words like "eat", "drink", "cat", "dog" if Level is N3 or higher.
    2. Japanese text MUST use ruby format for Kanji characters ONLY.
       - Correct: [学生](がくせい)
       - Correct: [勉](べん)[強](きょう)します
       - Incorrect: [学生](gakusei)
    3. Meaning must be in Simplified Chinese (简体中文).
    4. JSON Format ONLY.
    
    Schema:
    [
      { "id": "uuid", "kanji": "formatted_string_with_brackets", "kana": "full_reading_string", "meaning": "string", "level": "string" }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) return [];
        return JSON.parse(text) as Vocabulary[];
    } catch (e) {
        console.error("Vocab Gen Error", e);
        return [];
    }
};

export const generatePracticeContent = async (
  lessons: number[] | undefined,
  verbForms: VerbForm[],
  count: number = 5
): Promise<Sentence[]> => {
    if (!apiKey) return [];

    const lessonPrompt = lessons && lessons.length > 0 
      ? `Lessons ${lessons.join(', ')}` 
      : 'Beginner level (N5/N4)';

    const prompt = `
    Generate ${count} Japanese example sentences for Minna no Nihongo ${lessonPrompt}.
    Using verb forms: ${verbForms.length > 0 ? verbForms.join(', ') : 'any polite form'}.
    
    Requirements:
    1. Japanese text MUST use ruby format: [Kanji](Kana).
    2. Meaning must be in Simplified Chinese (简体中文).
    3. JSON Format ONLY.
    
    Schema:
    [
      { "id": "uuid", "japanese": "string", "meaning": "string", "lesson": number, "verbForm": "string" }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) return [];
        return JSON.parse(text) as Sentence[];
    } catch (e) {
        console.error("Sentence Gen Error", e);
        return [];
    }
};