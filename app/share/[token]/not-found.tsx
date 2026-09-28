export default function SharedReadingNotFound() {
  return (
    <main>
      <header className="page-header">
        <h1><span>공유 결과를</span> <span>찾을 수 없어요</span></h1>
        <p className="intro">링크가 올바르지 않거나 공유한 결과가 삭제됐을 수 있습니다.</p>
      </header>
      <section className="input-card login-card">
        <a className="shared-home-link" href="/">내 사주 보러 가기</a>
        <p>본인의 사주를 보려면 Google 로그인이 필요합니다.</p>
      </section>
    </main>
  );
}
