import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";
import LoginPanel from "./login-panel";

export default async function Page() {
  let userId: string | null = null;
  let configurationError = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {
    configurationError = true;
  }
  if (userId) redirect("/reading");

  return (
    <main>
      <header className="page-header">
        <h1>
          <span>나를 이해하는</span> <span>사주 이야기</span>
        </h1>
        <p className="intro">
          나의 성향과 강점·약점을 살펴보고, 고민하는 분야의 조언을 읽어보세요.
        </p>
      </header>
      <LoginPanel configurationError={configurationError} />
    </main>
  );
}
