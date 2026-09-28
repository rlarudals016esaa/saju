"use client";

import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";

type DailyFortuneHandoff = {
  prepareBirthDate: (date: string) => void;
  takeBirthDate: () => string | null;
};

const HandoffContext = createContext<DailyFortuneHandoff | null>(null);

export function DailyFortuneHandoffProvider({ children }: { children: ReactNode }) {
  const pendingDate = useRef<string | null>(null);
  const prepareBirthDate = useCallback((date: string) => {
    pendingDate.current = date;
  }, []);
  const takeBirthDate = useCallback(() => {
    const date = pendingDate.current;
    pendingDate.current = null;
    return date;
  }, []);

  return (
    <HandoffContext.Provider value={{ prepareBirthDate, takeBirthDate }}>
      {children}
    </HandoffContext.Provider>
  );
}

export function useDailyFortuneHandoff(): DailyFortuneHandoff {
  const handoff = useContext(HandoffContext);
  if (!handoff) throw new Error("오늘의 운세 화면 연결을 확인하지 못했습니다.");
  return handoff;
}
