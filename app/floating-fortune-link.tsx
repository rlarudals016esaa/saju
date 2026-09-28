import Image from "next/image";
import Link from "next/link";

export default function FloatingFortuneLink({ onActivate }: { onActivate?: () => void } = {}) {
  return (
    <Link
      className="floating-fortune-link"
      href="/daily-fortune"
      aria-label="오늘의 운세 페이지로 이동"
      onClick={onActivate}
    >
      <Image
        className="floating-fortune-character"
        src="/saju-fortune-character-hanbok-v01.png"
        alt=""
        width={1167}
        height={1348}
        sizes="(max-width: 520px) 112px, 180px"
        priority
      />
    </Link>
  );
}
