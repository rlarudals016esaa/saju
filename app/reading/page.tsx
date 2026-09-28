import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import SajuForm from "../saju-form";

export default async function ReadingPage() {
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {
    // An unavailable session must not expose the private input/result page.
  }
  if (!userId) redirect("/");

  return (
    <main>
      <header className="page-header">
        <h1><span>나를 이해하는</span> <span>사주 이야기</span></h1>
        <p className="intro">나의 성향과 강점·약점을 먼저 살펴보고, 고민하는 분야의 조언을 읽어보세요.</p>
      </header>
      <SajuForm userId={userId} />
    </main>
  );
}
