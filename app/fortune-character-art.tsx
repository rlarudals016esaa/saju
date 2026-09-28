export default function FortuneCharacterArt() {
  return (
    <span className="fortune-character-art" aria-hidden="true">
      <svg viewBox="0 0 160 150" role="presentation">
        <defs>
          <linearGradient id="fortune-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff7cd" />
            <stop offset="1" stopColor="#a9d6ff" />
          </linearGradient>
          <linearGradient id="fortune-hat" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7767d8" />
            <stop offset="1" stopColor="#283d86" />
          </linearGradient>
        </defs>
        <path d="M45 55 82 6l35 50Z" fill="url(#fortune-hat)" stroke="#e8e2ff" strokeWidth="3" />
        <path d="M28 58c22-12 83-12 106 0-11 11-94 12-106 0Z" fill="#334891" stroke="#e8e2ff" strokeWidth="3" />
        <circle cx="80" cy="91" r="45" fill="url(#fortune-body)" stroke="#f8fbff" strokeWidth="4" />
        <circle cx="63" cy="87" r="4" fill="#263658" />
        <circle cx="97" cy="87" r="4" fill="#263658" />
        <path d="M69 104c7 7 15 7 22 0" fill="none" stroke="#263658" strokeLinecap="round" strokeWidth="4" />
        <path d="m82 19 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#ffe98f" />
        <circle cx="31" cy="28" r="3" fill="#fff4af" />
        <circle cx="132" cy="35" r="4" fill="#d6f1ff" />
        <path d="m24 88 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm116-18 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#fff" />
      </svg>
    </span>
  );
}
