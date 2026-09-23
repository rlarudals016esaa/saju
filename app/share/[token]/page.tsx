import { notFound } from "next/navigation";
import { parseSharedReading, UUID_PATTERN } from "../../../lib/saju/shared-reading";
import { createClient } from "../../../lib/supabase/server";
import SharedResultView from "../../shared-result-view";

export default async function SharedReadingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID_PATTERN.test(token)) notFound();

  let result = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_saju_reading_share", { p_token: token });
    if (!error) result = parseSharedReading(Array.isArray(data) ? data[0] : null);
  } catch {
    // Missing and unavailable shares use the same public response.
  }
  if (!result) notFound();

  return (
    <main>
      <header className="page-header shared-header">
        <p className="share-eyebrow">친구가 보낸 결과예요</p>
        <h1><span>나를 이해하는</span> <span>사주 이야기</span></h1>
        <p className="intro">공유받은 사주 해석을 천천히 살펴보세요.</p>
      </header>
      <section className="input-card shared-reading-card">
        <SharedResultView result={result} />
        <div className="shared-cta">
          <p>나의 성향과 고민에 맞는 해석도 확인해 보세요.</p>
          <a href="/">내 사주 보러 가기</a>
          <small>본인의 사주를 보려면 Google 로그인이 필요합니다.</small>
        </div>
      </section>
    </main>
  );
}
