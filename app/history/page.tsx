import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import HistoryView from "./history-view";

export default async function HistoryPage() {
  let authenticated = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    authenticated = Boolean(user);
  } catch {
    // An unavailable session must not expose private results.
  }
  if (!authenticated) redirect("/");

  return (
    <main>
      <header className="page-header">
        <h1><span>나의 사주 이야기</span> <span>지난 해석</span></h1>
        <p className="intro">계정에 저장된 결과를 다시 살펴보세요.</p>
      </header>
      <HistoryView />
    </main>
  );
}
