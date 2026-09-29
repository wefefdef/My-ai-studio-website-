import React from 'react';
import { ChevronDown } from 'lucide-react';

export function LanguageButton() {
  return (
    <button className="language" type="button" aria-label="Select language">
      <span className="flag">UK</span>
      <span>En</span>
      <ChevronDown size={16} />
    </button>
  );
}
