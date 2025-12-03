import React, { useState } from 'react';
import { SelectionMenu } from '../components/SelectionMenu';
import { GameSettings, Vocabulary, JLPTLevel } from '../types';
import { shuffleArray } from '../utils';

const MOCK_KANJI: Vocabulary[] = [
  { id: 'k1', kanji: '学校', kana: 'がっこう', meaning: '学校', level: JLPTLevel.N5, lesson: 1 },
  { id: 'k2', kanji: '電話', kana: 'でんわ', meaning: '电话', level: JLPTLevel.N5, lesson: 1 },
  { id: 'k3', kanji: '飛行機', kana: 'ひこうき', meaning: '飞机', level: JLPTLevel.N5, lesson: 5 },
  { id: 'k4', kanji: '旅行', kana: 'りょこう', meaning: '旅行', level: JLPTLevel.N5, lesson: 6 },
  { id: 'k5', kanji: '時間', kana: 'じかん', meaning: '时间', level: JLPTLevel.N5, lesson: 4 },
];

export const KanjiPractice: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [items, setItems] = useState<Vocabulary[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const start = (settings: GameSettings) => {
    // In real app, fetch based on settings
    setItems(shuffleArray(MOCK_KANJI));
    setIndex(0);
    setRevealed(false);
    setIsPlaying(true);
  };

  const next = (correct: boolean) => {
    if (index < items.length - 1) {
      setIndex(i => i + 1);
      setRevealed(false);
    } else {
      setIsPlaying(false);
      alert("练习结束！ (Practice Complete)");
    }
  };

  if (!isPlaying) return <SelectionMenu gameType="vocab" onStart={start} />;

  const current = items[index];

  return (
    <div className="flex flex-col items-center h-full max-w-lg mx-auto text-center">
      <h2 className="text-xl font-bold text-peppa-mud mb-6">汉字书写练习</h2>
      
      {/* Question Card */}
      <div className="bg-white border-4 border-peppa-pink rounded-3xl p-8 w-full shadow-lg mb-8">
         <p className="text-sm text-gray-400 font-bold mb-2">中文意思</p>
         <p className="text-2xl font-bold text-slate-700 mb-4">{current.meaning}</p>
         
         <div className="w-full h-1 bg-gray-100 my-4 rounded-full"></div>

         <p className="text-sm text-gray-400 font-bold mb-2">日语读音</p>
         <p className="text-3xl font-bold text-peppa-darkPink">{current.kana}</p>
      </div>

      {/* Answer Section */}
      {revealed ? (
         <div className="animate-in fade-in zoom-in duration-300 bg-peppa-green/10 border-4 border-peppa-green rounded-3xl p-6 w-full mb-8">
            <p className="text-6xl font-black text-slate-800">{current.kanji}</p>
         </div>
      ) : (
         <div className="w-full h-32 border-4 border-dashed border-gray-300 rounded-3xl flex items-center justify-center mb-8 text-gray-400 font-bold">
            请在纸上写出汉字...
         </div>
      )}

      <div className="w-full">
        {!revealed ? (
          <button 
            onClick={() => setRevealed(true)}
            className="w-full bg-peppa-blue text-white font-bold text-xl py-4 rounded-2xl shadow-md border-b-4 border-blue-600 active:border-b-0 active:translate-y-1"
          >
            显示答案 (Check)
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-4">
             <button onClick={() => next(false)} className="bg-peppa-red text-white font-bold py-4 rounded-2xl border-b-4 border-red-700 active:border-b-0 active:translate-y-1">
               写错了 ❌
             </button>
             <button onClick={() => next(true)} className="bg-peppa-green text-white font-bold py-4 rounded-2xl border-b-4 border-peppa-grass active:border-b-0 active:translate-y-1">
               写对了 ✅
             </button>
          </div>
        )}
      </div>
    </div>
  );
};