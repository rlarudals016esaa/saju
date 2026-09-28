import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DailyFortuneHandoffProvider } from "./daily-fortune-handoff";
import "./globals.css";

const title = "나를 이해하는 사주 이야기";
const description = "성향과 강점·약점을 살펴보고 취업, 연애, 인간관계, 삶의 흐름을 돌아보는 사주 서비스";
const previewImage = "/saju-link-preview-2026-09-23-v01.png";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
  || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
  || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: {
    type: "website",
    title,
    description,
    images: [{ url: previewImage, width: 1730, height: 909, alt: "별과 달이 뜬 밤하늘 위의 나를 이해하는 사주 이야기" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [previewImage],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <DailyFortuneHandoffProvider>{children}</DailyFortuneHandoffProvider>
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
