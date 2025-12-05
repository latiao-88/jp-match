import React, { useState, useEffect } from 'react';
import { SelectionMenu } from '../components/SelectionMenu';
import { GameSettings, Sentence, VerbForm } from '../types';
import { generatePracticeContent, generateSpeech } from '../services/geminiService';
import { Furigana } from '../components/Furigana';
import { Volume2, Eye, EyeOff, ChevronRight, Check } from 'lucide-react';

export const Flashcards: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [step, setStep] = useState<'blind' | 'japanese' | 'meaning'>('blind');
  const [isLoading, setIsLoading] = useState(false);

  // MOCK fallback data (Chinese)
  const MOCK_SENTENCES: Sentence[] = [
    { id: 's1', japanese: '[私](わたし)はマイク・ミラーです。', meaning: '我是迈克・米勒。', lesson: 1 },
    { id: 's2', japanese: '[佐藤](さとう)さんは[学生](がくせい)じゃありません。', meaning: '佐藤先生不是学生。', lesson: 1 },
    { id: 's3', japanese: '[図書館](としょかん)で[勉強](べんきょう)しました。', meaning: '在图书馆学习了。', lesson: 6, verbForm: VerbForm.Masu },
    { id: 's4', japanese: '[窓](まど)を[開](あ)けてください。', meaning: '请打开窗户。', lesson: 14, verbForm: VerbForm.Te },
  ];

  const handleStart = async (settings: GameSettings) => {
    setIsPlaying(true);
    setIsLoading(true);
    
    // Default to empty array if lessons are undefined
    const lessons = settings.lessons || [];

    // Try to get AI generated content first
    const generated = await generatePracticeContent(lessons, settings.verbForms, 5);
    
    // Combine with mocks if AI fails or returns empty
    const pool = [...generated, ...MOCK_SENTENCES].filter(s => 
      lessons.length === 0 || lessons.includes(s.lesson) || lessons.includes(1) 
    );
    
    setSentences(pool);
    setIsLoading(false);
    playAudio(pool[0]?.japanese);
  };

  const playAudio = (text?: string) => {
    const target = text || sentences[currentIndex]?.japanese;
    if (target) generateSpeech(target);
  };

  const nextStep = () => {
    if (step === 'blind') setStep('japanese');
    else if (step === 'japanese') setStep('meaning');
    else {
      // Next card
      if (currentIndex < sentences.length - 1) {
        setCurrentIndex(c => c + 1);
        setStep('blind');
        // Auto play next audio after short delay
        setTimeout(() => playAudio(sentences[currentIndex + 1].japanese), 500);
      } else {
        // Finished
        alert("练习完成！(Practice Complete)");
        setIsPlaying(false);
        setCurrentIndex(0);
        setStep('blind');
      }
    }
  };

  if (!isPlaying) return <SelectionMenu onStart={handleStart} />;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
         <div className="text-4xl animate-bounce mb-4">🐷</div>
         <p className="font-bold text-peppa-pink">正在生成例句 (Asking AI)...</p>
      </div>
    );
  }

  if (sentences.length === 0) return <div>No content found. Try different settings.</div>;

  const currentSentence = sentences[currentIndex];

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <span className="bg-peppa-yellow px-3 py-1 rounded-full text-sm font-bold text-yellow-700 border border-yellow-400">
           第 {currentSentence.lesson} 课
        </span>
        <span className="font-bold text-gray-400">{currentIndex + 1} / {sentences.length}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative bg-white border-4 border-peppa-sky rounded-3xl p-8 shadow-sm">
        
        {/* Step 1: Blind Listening */}
        <button 
           onClick={() => playAudio()}
           className="mb-8 p-6 bg-peppa-blue rounded-full text-white shadow-lg hover:scale-110 transition-transform active:scale-95"
        >
          <Volume2 size={48} />
        </button>

        {/* Step 2: Show Japanese */}
        <div className={`transition-opacity duration-500 text-center mb-6 min-h-[4rem] ${step === 'blind' ? 'opacity-0 blur-sm select-none' : 'opacity-100'}`}>
           <Furigana text={currentSentence.japanese} size="lg" />
        </div>

        {/* Step 3: Show Meaning */}
        <div className={`transition-opacity duration-500 text-center text-xl font-bold text-gray-500 ${step !== 'meaning' ? 'opacity-0' : 'opacity-100'}`}>
           {currentSentence.meaning}
        </div>

      </div>

      {/* Controls */}
      <div className="mt-8 flex justify-center">
         <button 
           onClick={nextStep}
           className="w-full max-w-xs bg-peppa-green text-white text-xl font-bold py-4 rounded-2xl shadow-lg border-b-8 border-peppa-grass active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-2"
         >
            {step === 'blind' && <>显示日语 (Show JP) <Eye /></>}
            {step === 'japanese' && <>显示中文 (Show CN) <Eye /></>}
            {step === 'meaning' && <>下一句 (Next) <ChevronRight /></>}
         </button>
      </div>
    </div>
  );
};