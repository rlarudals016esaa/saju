# 사주 서비스 Starter

Agent와 함께 실제 제품 개발 과정을 연습하는 Starter 프로젝트입니다.

## 실행

```sh
npm install
npm run dev
```

실행 후 터미널에 표시된 주소를 브라우저에서 엽니다.

## Google 로그인과 결과 이력 설정

1. `.env.example`의 이름과 같은 설정값을 `.env`에 채웁니다. `GEMINI_API_KEY`는 비밀 인증값이므로 공개 파일이나 Git에 넣지 않습니다.
2. Supabase에서 Google 로그인 제공자를 연결하고, 앱의 `/auth/callback` 주소를 인증 후 돌아올 주소로 허용합니다. Google Cloud에는 Supabase가 안내하는 콜백 주소를 등록합니다.
3. 새 프로젝트라면 `supabase/migrations/20260923_create_saju_readings.sql`을 대상 프로젝트에 적용하기 전에 검토·백업합니다. 이미 테이블이 있는 프로젝트에는 중복 실행하지 않습니다.

2026-09-23 확인 시 현재 연결된 프로젝트에는 테이블이 있었고, 로그인한 계정의 결과 1건이 저장·조회됐습니다. 다른 계정의 결과가 보이지 않는지와 실제 데이터베이스 정책은 아직 확인해야 합니다.

## 주요 문서

- `docs/PRD.md`: 무엇을 왜 만들지 기록합니다.
- `docs/specs/`: 기능이 어떻게 동작해야 하는지 기록합니다.
- `docs/status.md`: 현재 어디까지 진행됐는지 기록합니다.
- `AGENTS.md`: Agent가 작업할 때 따르는 기본 원칙입니다.
- `tests/`: 자동화된 검증을 관리합니다.

## 폴더 구조

```text
├── app/                 화면과 페이지
├── lib/saju/            사주 계산 기능
├── docs/
│   ├── PRD.md           제품 목표와 범위
│   ├── status.md        Spec별 진행 상태
│   └── specs/           기능별 요구사항
├── tests/               자동 Test
├── .agents/skills/      반복 작업 Skill
└── AGENTS.md            Agent 작업 원칙
```

이 프로젝트의 AGENTS.md, PRD, Specs, Tests, Status, Skill과 작업 환경을 조합해 Agent가 안정적으로 작업할 수 있는 Harness를 만들어갑니다.

## 작업 흐름

1. 서비스를 실행하고 현재 기능을 직접 확인합니다.
2. Agent와 대화하며 `docs/PRD.md`에 대상 사용자, 해결할 문제와 제품 범위를 작성합니다.
3. 구현할 기능 하나를 정하고 `docs/specs/001-feature-name.md` 형식으로 Spec을 작성합니다.
4. `docs/status.md`에 해당 Spec을 `- [ ]`로 추가합니다.
5. Spec을 기준으로 구현하고 Test와 실제 화면에서 결과를 확인합니다.
6. 구현과 검증이 모두 끝나면 `docs/status.md`의 항목을 `- [x]`로 변경합니다.
7. 다음 기능도 같은 과정을 반복한 뒤 Vercel에 배포하고 배포 주소에서 다시 확인합니다.

한 번에 여러 기능을 구현하지 말고 Spec 하나씩 완료하세요.
