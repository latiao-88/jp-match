import React from 'react';
import { parseFurigana } from '../utils';

interface FuriganaProps {
  text: string;
  className?: string;
  hideKanji?: boolean; // For listening exercises (show nothing or placeholders)
  hideFurigana?: boolean; // For advanced reading
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Furigana: React.FC<FuriganaProps> = ({ 
  text, 
  className = '', 
  hideKanji = false,
  hideFurigana = false,
  size = 'md' 
}) => {
  const parts = parseFurigana(text);

  const textSize = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-5xl'
  }[size];

  if (hideKanji) {
    return <span className={`text-gray-300 ${textSize} ${className}`}>???</span>;
  }

  return (
    <div className={`inline-flex flex-wrap items-end gap-1 ${className}`}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index} className={`${textSize} leading-loose`}>{part.content}</span>;
        } else {
          return (
            <ruby key={index} className={`mx-0.5 ${textSize} leading-loose group`}>
              {part.kanji}
              {!hideFurigana && (
                <rt className="text-peppa-darkPink font-medium select-none group-hover:text-peppa-red transition-colors">
                  {part.kana}
                </rt>
              )}
            </ruby>
          );
        }
      })}
    </div>
  );
};
