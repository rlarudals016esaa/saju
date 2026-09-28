import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import DailyFortuneView from "./daily-fortune-view";

export default async function DailyFortunePage() {
  let authenticated = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    authenticated = Boolean(user);
  } catch {
    // An unavailable session must not expose private fortunes.
  }
  if (!authenticated) redirect("/");

  return (
    <main>
      <header className="page-header">
        <h1><span>오늘을 살펴보는</span> <span>나의 사주 이야기</span></h1>
        <p className="intro">매일 아침 준비된 운세를 가볍게 읽고 오늘의 작은 행동을 정해보세요.</p>
      </header>
      <DailyFortuneView />
    </main>
  );
}
