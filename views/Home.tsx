import React from 'react';
import { VocabGame } from './VocabGame';

export const Home: React.FC = () => {
  // Since we only have one main game now, Home simply renders the VocabGame component
  // which handles its own "Menu" vs "Game" state.
  return <VocabGame />;
};