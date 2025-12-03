import React, { useState } from 'react';
import { VerbForm, JLPTLevel, GameSettings } from '../types';

interface SelectionMenuProps {
  onStart: (settings: GameSettings) => void;
}

export const SelectionMenu: React.FC<SelectionMenuProps> = ({ onStart }) => {
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel>(JLPTLevel.N5);
  const [selectedVerbs, setSelectedVerbs] = useState<VerbForm[]>([]);

  const toggleVerb = (form: VerbForm) => {
    if (selectedVerbs.includes(form)) {
      setSelectedVerbs(selectedVerbs.filter(f => f !== form));
    } else {
      setSelectedVerbs([...selectedVerbs, form]);
    }
  };

  const handleStart = () => {
    onStart({
      level: selectedLevel,
      verbForms: selectedVerbs,
    });
  };

  const isVerbMode = selectedVerbs.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-300 max-w-2xl mx-auto">
      <h2 className="text-3xl font-black text-peppa-darkPink text-center mb-8">
        Minna Vocabulary Challenge
      </h2>

      {/* 1. Level Selection */}
      <div className="bg-peppa-sky/20 p-6 rounded-3xl border-4 border-peppa-sky relative">
        <div className="absolute -top-4 left-6 bg-peppa-sky text-white font-black px-4 py-1 rounded-full border-2 border-white shadow-sm">
          Step 1: Choose Level
        </div>
        <div className="flex justify-around mt-2">
          {Object.values(JLPTLevel).map(level => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`w-20 h-20 rounded-full font-black text-xl shadow-md transition-all transform hover:scale-110 flex items-center justify-center border-4 ${
                selectedLevel === level 
                  ? 'bg-peppa-blue border-white text-white scale-110 ring-4 ring-peppa-blue/30' 
                  : 'bg-white border-gray-200 text-gray-400'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Verb Classification (Optional) */}
      <div className="bg-peppa-green/20 p-6 rounded-3xl border-4 border-peppa-green relative">
        <div className="absolute -top-4 left-6 bg-peppa-green text-white font-black px-4 py-1 rounded-full border-2 border-white shadow-sm">
          Step 2: Verb Conjugation (Optional)
        </div>
        <p className="text-sm text-gray-500 font-bold mb-4 text-center">
          Select forms to practice specifically, or leave empty to practice general vocabulary.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
           {Object.values(VerbForm).map(form => (
              <button
                key={form}
                onClick={() => toggleVerb(form)}
                className={`text-sm px-3 py-2 rounded-xl font-bold border-b-4 transition-all text-left truncate ${
                  selectedVerbs.includes(form) 
                    ? 'bg-peppa-grass border-green-700 text-white translate-y-1 border-b-0 shadow-inner' 
                    : 'bg-white border-gray-200 text-gray-500 hover:border-peppa-grass'
                }`}
              >
                {selectedVerbs.includes(form) && '✓ '}
                {form.split('(')[0]}
              </button>
           ))}
        </div>
      </div>

      {/* Mode Indicator */}
      <div className="text-center p-4">
        <p className="text-lg font-bold text-peppa-darkPink">
          Mode: <span className="bg-white px-3 py-1 rounded-lg border-2 border-peppa-pink">
            {isVerbMode ? `Verb Practice (${selectedVerbs.length} forms)` : `General ${selectedLevel} Vocabulary`}
          </span>
        </p>
      </div>

      <div className="flex justify-center pt-4">
        <button 
          onClick={handleStart}
          className="bg-peppa-sun border-b-8 border-yellow-500 text-yellow-900 text-2xl font-black px-16 py-5 rounded-full shadow-xl hover:scale-105 active:scale-95 active:border-b-0 active:translate-y-2 transition-all w-full md:w-auto"
        >
           START GAME 🐷
        </button>
      </div>
    </div>
  );
};