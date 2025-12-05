import React, { useState } from 'react';
import { GameSettings, Vocabulary, JLPTLevel } from '../types';
import { SelectionMenu } from '../components/SelectionMenu';
import { Furigana } from '../components/Furigana';
import { shuffleArray } from '../utils';
import { generateVocabulary, generateVerbPractice, generateSpeech, preloadSpeech } from '../services/geminiService';
import { Volume2 } from 'lucide-react';
import { N3_VOCAB_LIST, MOCK_N5_N4_MIX } from '../data/vocabData';

interface CardItem {
  id: string;
  text: string;
  originalText: string; // Used for TTS
  type: 'jp' | 'cn';
  matchId: string;
  status: 'default' | 'selected' | 'matched' | 'error';
}

export const VocabGame: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leftCol, setLeftCol] = useState<CardItem[]>([]);
  const [rightCol, setRightCol] = useState<CardItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const prepareGame = async (settings: GameSettings) => {
    setLoading(true);
    let pool: Vocabulary[] = [];

    try {
      if (settings.verbForms.length > 0) {
        // Mode 2: Verb Classification (Always use AI for specific forms)
        pool = await generateVerbPractice(settings.verbForms, settings.level, 7);
      } else {
        // Mode 1: General Level
        // STRATEGY: 
        // If N3, prefer using the large built-in list to ensure variety and correctness immediately
        // but randomly fetch from AI 50% of the time to add "infinite" expansion.
        const useAI = Math.random() > 0.5;

        if (settings.level === JLPTLevel.N3 && !useAI) {
           pool = shuffleArray(N3_VOCAB_LIST).slice(0, 7);
        } else {
           pool = await generateVocabulary(settings.level, 7);
        }
      }
    } catch (e) {
      console.error("Fetch failed", e);
    }

    // Fallback if AI fails or returns empty
    if (!pool || pool.length < 7) {
      if (settings.level === JLPTLevel.N3) {
         pool = shuffleArray(N3_VOCAB_LIST).slice(0, 7);
      } else {
         pool = shuffleArray(MOCK_N5_N4_MIX).slice(0, 7);
      }
    }

    // Ensure we have exactly 7 or max available
    const gameVocab = pool.slice(0, 7);

    // Randomize Layout: True = JP Left, False = CN Left
    const jpOnLeft = Math.random() > 0.5;

    const itemsA: CardItem[] = gameVocab.map(v => ({
      id: `${v.id}-A`,
      // Direct use of v.kanji because it now contains the formatted markdown like [食](た)べます
      text: jpOnLeft ? v.kanji : v.meaning,
      // FIX: Use v.kana directly for TTS to ensure strict Japanese reading (avoid Kanji confusion)
      originalText: jpOnLeft ? v.kana : v.meaning, 
      type: jpOnLeft ? 'jp' : 'cn',
      matchId: v.id,
      status: 'default'
    }));

    const itemsB: CardItem[] = gameVocab.map(v => ({
      id: `${v.id}-B`,
      text: jpOnLeft ? v.meaning : v.kanji,
      originalText: jpOnLeft ? v.meaning : v.kana,
      type: jpOnLeft ? 'cn' : 'jp',
      matchId: v.id,
      status: 'default'
    }));

    setLeftCol(shuffleArray(itemsA));
    setRightCol(shuffleArray(itemsB));

    // --- PRELOAD AUDIO ---
    // Trigger background fetching for all Japanese words immediately
    // FIX: Use v.kana to match the key used in playAudio
    gameVocab.forEach(v => {
      preloadSpeech(v.kana).catch(e => console.warn("Background preload failed for", v.kana));
    });

    setIsPlaying(true);
    setLoading(false);
  };

  const playAudio = async (text: string, isJp: boolean) => {
    if (isJp && text) {
      try {
        await generateSpeech(text);
      } catch (error) {
        console.error("Failed to play audio:", error);
      }
    }
  };

  const handleCardClick = (clickedItem: CardItem) => {
    if (clickedItem.status === 'matched') return;

    // Play audio if Japanese
    if (clickedItem.type === 'jp') {
      playAudio(clickedItem.originalText, true);
    }

    // Deselect if clicking same card
    if (selectedId === clickedItem.id) {
      setSelectedId(null);
      updateStatus(clickedItem.id, 'default');
      return;
    }

    // If nothing selected, select this one
    if (!selectedId) {
      setSelectedId(clickedItem.id);
      updateStatus(clickedItem.id, 'selected');
      return;
    }

    // Something is already selected
    const allCards = [...leftCol, ...rightCol];
    const previousItem = allCards.find(i => i.id === selectedId);
    if (!previousItem) return;

    // Prevent clicking same column (Left-Left or Right-Right impossible in this UI logic if we split state, but good check)
    if (leftCol.some(i => i.id === clickedItem.id) && leftCol.some(i => i.id === previousItem.id)) {
       // Same column switch
       updateStatus(previousItem.id, 'default');
       setSelectedId(clickedItem.id);
       updateStatus(clickedItem.id, 'selected');
       return;
    }
    if (rightCol.some(i => i.id === clickedItem.id) && rightCol.some(i => i.id === previousItem.id)) {
        // Same column switch
        updateStatus(previousItem.id, 'default');
        setSelectedId(clickedItem.id);
        updateStatus(clickedItem.id, 'selected');
        return;
     }

    // Check Match
    if (previousItem.matchId === clickedItem.matchId) {
      updateStatus(previousItem.id, 'matched');
      updateStatus(clickedItem.id, 'matched');
      setSelectedId(null);
    } else {
      updateStatus(previousItem.id, 'error');
      updateStatus(clickedItem.id, 'error');
      setTimeout(() => {
        updateStatus(previousItem.id, 'default');
        updateStatus(clickedItem.id, 'default');
        setSelectedId(null);
      }, 800);
    }
  };

  const updateStatus = (id: string, status: CardItem['status']) => {
    setLeftCol(prev => prev.map(item => item.id === id ? { ...item, status } : item));
    setRightCol(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };

  if (loading) {
    return (
       <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
         <div className="text-5xl md:text-6xl animate-bounce mb-3 md:mb-4">🐷</div>
         <p className="text-lg md:text-xl font-bold text-peppa-pink">Creating Lesson...</p>
         <p className="text-xs md:text-sm text-peppa-blue">Finding advanced vocabulary...</p>
       </div>
    );
  }

  if (!isPlaying) {
    return <SelectionMenu onStart={prepareGame} />;
  }

  const matchesCount = leftCol.filter(i => i.status === 'matched').length;
  const allMatched = matchesCount === 7;

  return (
    <div className="flex flex-col items-center h-full w-full max-w-4xl mx-auto">
      <div className="w-full flex justify-between items-center mb-3 md:mb-6 px-2 md:px-4">
        <h2 className="text-lg md:text-2xl font-black text-peppa-blue">Minna Match</h2>
        <div className="text-base md:text-xl font-bold bg-white px-2 md:px-4 py-1 md:py-2 rounded-full border-2 border-peppa-pink shadow-sm">
          {matchesCount} / 7
        </div>
        <button onClick={() => setIsPlaying(false)} className="bg-gray-100 p-1.5 md:p-2 rounded-full hover:bg-gray-200 text-lg md:text-xl">
           ❌
        </button>
      </div>

      <div className="flex w-full gap-2 md:gap-4 lg:gap-12 flex-1 p-1 md:p-2 overflow-y-auto">
        {/* Left Column */}
        <div className="flex-1 space-y-3">
          {leftCol.map(item => (
            <Card key={item.id} item={item} onClick={() => handleCardClick(item)} />
          ))}
        </div>

        {/* Right Column */}
        <div className="flex-1 space-y-3">
           {rightCol.map(item => (
            <Card key={item.id} item={item} onClick={() => handleCardClick(item)} />
          ))}
        </div>
      </div>

      {allMatched && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 md:p-12 rounded-2xl md:rounded-[3rem] text-center animate-bounce-in border-4 md:border-8 border-peppa-pink shadow-2xl max-w-md mx-4">
             <div className="text-6xl md:text-8xl mb-4 md:mb-6">🎉</div>
             <h3 className="text-2xl md:text-4xl font-black text-peppa-darkPink mb-2 md:mb-4">Awesome!</h3>
             <p className="text-base md:text-lg text-gray-500 font-bold mb-6 md:mb-8">You mastered 7 pairs!</p>
             <button 
               onClick={() => setIsPlaying(false)} 
               className="bg-peppa-green text-white text-base md:text-xl font-black py-3 md:py-4 px-8 md:px-12 rounded-full shadow-lg border-b-4 md:border-b-8 border-peppa-grass hover:scale-105 active:scale-95 active:border-b-0 active:translate-y-2 transition-all"
             >
               Play Again
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Card: React.FC<{ item: CardItem, onClick: () => void }> = ({ item, onClick }) => {
  let baseStyle = "w-full min-h-[3.5rem] md:min-h-[4.5rem] p-1.5 md:p-2 rounded-xl md:rounded-2xl border-b-2 md:border-b-4 font-bold text-sm md:text-lg transition-all duration-200 flex items-center justify-center cursor-pointer shadow-sm relative overflow-hidden group";
  let statusStyle = "";

  switch (item.status) {
    case 'selected':
      statusStyle = "bg-peppa-blue border-blue-600 text-white scale-105 z-10 shadow-lg ring-4 ring-blue-200";
      break;
    case 'matched':
      statusStyle = "bg-peppa-green border-peppa-grass text-white opacity-0 pointer-events-none scale-0 transition-all duration-500";
      break;
    case 'error':
      statusStyle = "bg-peppa-red border-red-700 text-white animate-shake";
      break;
    default:
      statusStyle = "bg-white border-gray-200 text-slate-700 hover:bg-gray-50 hover:border-peppa-sky";
  }

  return (
    <button onClick={onClick} className={`${baseStyle} ${statusStyle}`}>
      {item.type === 'jp' ? (
        <div className="flex items-center gap-2">
            <Furigana text={item.text} size="md" />
            {/* Small icon to indicate audio is available */}
            {item.status === 'default' && (
              <Volume2 size={16} className="text-peppa-blue opacity-50 group-hover:opacity-100" />
            )}
        </div>
      ) : (
        <span>{item.text}</span>
      )}
    </button>
  );
};