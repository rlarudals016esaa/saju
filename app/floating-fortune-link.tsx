import FortuneCharacterArt from "./fortune-character-art";

export default function FloatingFortuneLink() {
  return (
    <a
      className="floating-fortune-link"
      href="/daily-fortune"
      aria-label="오늘의 운세 페이지로 이동"
    >
      <FortuneCharacterArt />
      <span className="floating-fortune-copy">
        <strong>오늘의 운세</strong>
        <span>별빛 도사에게 물어보기</span>
      </span>
    </a>
  );
}
