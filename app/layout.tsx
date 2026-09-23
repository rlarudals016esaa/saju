import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "나를 이해하는 사주 이야기",
  description: "성향과 강점·약점을 살펴보고 취업, 연애, 인간관계, 삶의 흐름을 돌아보는 사주 서비스",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <footer className="font-attribution">
          <div id="reading-footer-meta" />
          서체: 강원랜드 「하이원 원추리 제목체」 · 공공누리 제1유형 ·{" "}
          <a href="https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?menuNo=200195&amp;wrtSn=13373091" target="_blank" rel="noreferrer">
            공유마당에서 보기
          </a>
        </footer>
      </body>
    </html>
  );
}
