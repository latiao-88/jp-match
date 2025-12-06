import { GoogleGenAI } from "@google/genai";
import { VerbForm, JLPTLevel, Vocabulary, Sentence } from '../types';

// Helper to get API Key from storage or env
const getApiKey = (): string => {
  return localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY || '';
};

// Initialize AI client dynamically to handle key changes
const getAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const SAMPLE_RATE = 24000;

// Audio Cache and Context Singleton
const audioCache = new Map<string, AudioBuffer>();
let sharedAudioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new AudioContextClass({ sampleRate: SAMPLE_RATE });
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

  // Clean text logic
  const cleanText = text.replace(/\[.*?\]\((.*?)\)/g, '$1').trim();
  if (!cleanText) return null;

  // Return cached buffer if exists
  if (audioCache.has(cleanText)) {
    return audioCache.get(cleanText)!;
  }

  const ai = getAIClient();
  if (!ai) {
    console.warn("No API Key available for TTS");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp", // Use flash-exp or stable model
      contents: [{ 
        parts: [{ text: cleanText }] 
      }],
      config: {
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
      return null;
    }

    const ctx = getAudioContext();
    const pcmData = decodeBase64(base64Audio);
    const audioBuffer = pcmToAudioBuffer(pcmData, ctx);
    
    // Store in cache
    audioCache.set(cleanText, audioBuffer);
    return audioBuffer;

  } catch (error) {
    console.warn("Gemini TTS Fetch Error:", error);
    return null;
  }
};

// Public function to preload audio in background
export const preloadSpeech = async (text: string): Promise<void> => {
  await fetchAudioBuffer(text);
};

// Public function to play audio (from cache or fetch)
export const generateSpeech = async (text: string): Promise<void> => {
  const cleanText = text.replace(/\[.*?\]\((.*?)\)/g, '$1').trim();
  if (!cleanText) return;

  // 1. Try Gemini TTS first
  try {
    const buffer = await fetchAudioBuffer(text);
    if (buffer) {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      return;
    }
  } catch (e) {
    console.warn("Gemini TTS failed, using fallback", e);
  }

  // 2. Fallback to Browser TTS
  console.log("Using Browser TTS Fallback for:", cleanText);
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleanText);
    u.lang = 'ja-JP';
    u.rate = 0.9; 
    window.speechSynthesis.speak(u);
  } catch (err) {
    console.error("Browser TTS failed", err);
  }
};

const VERB_TOPICS = [
  "Daily Life", "Cooking", "Travel", "Work", "Feelings", 
  "Socializing", "Health", "Nature", "Technology", "Emergency"
];

const BANNED_VERBS = [
  "食べます", "飲みます", "行きます", "来ます", "見ます", "します", "寝ます", "起きます", 
  "勉強します", "買います", "聞きます"
];

export const generateVerbPractice = async (
  forms: VerbForm[],
  level: JLPTLevel,
  count: number = 7
): Promise<Vocabulary[]> => {
    const ai = getAIClient();
    if (!ai) return [];

    const randomTopic = VERB_TOPICS[Math.floor(Math.random() * VERB_TOPICS.length)];
    const complexity = level === JLPTLevel.N5 ? "Beginner (N5)" : "Intermediate (N4/N3)";

    const prompt = `
    Generate ${count} distinct Japanese verbs conjugated in the following forms: ${forms.join(', ')}.
    Topic: ${randomTopic}.
    Level: ${complexity}.
    
    RULES:
    1. EXCLUDE these common verbs: ${BANNED_VERBS.join(', ')}.
    2. Japanese text MUST use ruby format: [Kanji](Kana). 
       Example: [食](た)べます
    3. If a specific form is requested, the word MUST be in that form.
    4. Meaning in Simplified Chinese.
    5. JSON Format ONLY.
    
    Schema:
    [
      { "id": "uuid", "kanji": "formatted_string", "kana": "reading", "meaning": "string", "form": "string" }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp", // Using faster model
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });
        const text = response.text();
        if (!text) return [];
        return JSON.parse(text) as Vocabulary[];
    } catch (e) {
        console.error("Verb Gen Error", e);
        return [];
    }
};

const VOCAB_TOPICS = [
  "Business", "Health", "Traffic", "Science", "Nature", "Society", "Emotions", "Culture", "Law"
];

export const generateVocabulary = async (
  level: JLPTLevel,
  count: number = 7
): Promise<Vocabulary[]> => {
    const ai = getAIClient();
    if (!ai) return [];

    const randomTopic = VOCAB_TOPICS[Math.floor(Math.random() * VOCAB_TOPICS.length)];

    const prompt = `
    Generate ${count} Japanese vocabulary words for JLPT Level ${level}.
    Topic: ${randomTopic}.
    
    RULES:
    1. Japanese text MUST use ruby format for Kanji: [漢字](かんじ).
    2. Meaning in Simplified Chinese.
    3. JSON Format ONLY.
    
    Schema:
    [
      { "id": "uuid", "kanji": "formatted_string", "kana": "reading", "meaning": "string", "level": "string" }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });
        const text = response.text();
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
    const ai = getAIClient();
    if (!ai) return [];

    const prompt = `
    Generate ${count} Japanese example sentences.
    Level: N4/N3.
    Verb Forms: ${verbForms.join(', ') || 'Any'}.
    
    Requirements:
    1. Use ruby format: [Kanji](Kana).
    2. Meaning in Simplified Chinese.
    3. JSON Format ONLY.
    
    Schema:
    [
      { "id": "uuid", "japanese": "string", "meaning": "string", "lesson": 0, "verbForm": "string" }
    ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });
        const text = response.text();
        if (!text) return [];
        return JSON.parse(text) as Sentence[];
    } catch (e) {
        console.error("Sentence Gen Error", e);
        return [];
    }
};
