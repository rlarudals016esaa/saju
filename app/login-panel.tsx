"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";

export default function LoginPanel({ configurationError }: { configurationError: boolean }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get("auth_error");
    if (authError) setError(authError === "cancelled"
      ? "Google 로그인이 취소됐습니다. 다시 시도할 수 있습니다."
      : "Google 로그인에 실패했습니다. 설정을 확인하고 다시 시도해 주세요.");
  }, []);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const { error: loginError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (loginError) throw loginError;
    } catch {
      setError("Google 로그인을 시작하지 못했습니다. 설정을 확인하고 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <section className="input-card login-card" aria-labelledby="login-title">
      <p className="result-label">나의 사주 이야기 시작하기</p>
      <h2 id="login-title">먼저 로그인해 주세요</h2>
      <p>로그인 후 생년월일과 출생시간을 입력하거나 시간 모름을 선택하고, 나만의 해석과 이전 결과를 볼 수 있습니다.</p>
      <button type="button" onClick={handleLogin} disabled={configurationError || loading}>
        {loading ? "Google 로그인 화면으로 이동 중…" : "Google로 로그인"}
      </button>
      {configurationError && <p className="error" role="alert">Supabase 연결 설정을 확인해 주세요.</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
