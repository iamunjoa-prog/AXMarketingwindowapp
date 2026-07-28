# AX 마케팅 자동화 — Knowledge Base

> **AI 에이전트 진입점.** 소스 코드를 탐색하기 전에 이 문서를 먼저 읽는다.

## 저장소 개요

**AX 마케팅 자동화**는 SK브로드밴드 B tv 마케팅 담당자가 프로모션 캠페인을
기획 → 검토 → 실행(Jira 일감 생성 + 시트 적재)까지 한 화면에서 끝낼 수 있게 하는
**Windows 데스크톱 애플리케이션**이다.

- **런타임**: Tauri 2 (Rust) + React 18 + TypeScript + Vite
- **AI 엔진**: 로컬에 설치된 `claude` (Claude Code CLI) 또는 `codex` (Codex CLI)를 자식 프로세스로 실행
- **배포**: GitHub Releases + Tauri Updater 자동 업데이트
- **지식 소스**: 이 `knowledge/` 디렉터리 (LLM 검색 최적화)

### 3단계 핵심 플로우

```
① 캠페인 정보 입력  →  ② 기획안 확인/편집  →  ③ 최종 출력
   (폼 + 자유 입력)      (AI 기획안 + 배너 시안)    (Jira + 구글시트 + 시안 PNG)
```

상세: [workflow/campaign-flow.md](workflow/campaign-flow.md)

### 이 앱이 대체하는 것

| 기존 | 현재 |
|---|---|
| Gemini Gem (기획 대화) | 로컬 Claude Code / Codex CLI |
| Chrome 확장프로그램 (JSON 중계·캡처·Jira 전송) | Tauri 네이티브 기능 |
| btvcuration.github.io/campaign 웹툴 (시안 편집) | 앱 내장 에디터 |

배경: [decisions/ADR-003-absorb-chrome-extension.md](decisions/ADR-003-absorb-chrome-extension.md)

---

## 권장 읽기 순서

### AI 에이전트가 기획안을 생성할 때
1. [workflow/campaign-flow.md](workflow/campaign-flow.md) — 전체 프로세스와 단계별 산출물
2. [domain/products.md](domain/products.md) — 어떤 상품 트랙인지 먼저 확정
3. [domain/campaign-playbook.md](domain/campaign-playbook.md) — 상품 × 목표별 검증된 조합
4. [placements/README.md](placements/README.md) — 노출 구좌 선택
5. [copywriting/principles.md](copywriting/principles.md) — 카피 작성
6. [api/campaign-assets-json.md](api/campaign-assets-json.md) — **최종 JSON 출력 스키마 (필수)**

### 개발자가 코드를 수정할 때
1. [architecture.md](architecture.md)
2. [conventions.md](conventions.md)
3. [coding-style.md](coding-style.md)
4. [deployment.md](deployment.md)

---

## 문서 색인

### 프로젝트 기반
| 문서 | 내용 | 검색 키워드 |
|---|---|---|
| [architecture.md](architecture.md) | 레이어 구조, Rust↔React 경계, 폴더 책임 | architecture, tauri, ipc, command, 폴더구조 |
| [conventions.md](conventions.md) | 네이밍, 커밋, 브랜치, 파일 배치 규칙 | convention, naming, commit, 규칙 |
| [coding-style.md](coding-style.md) | TypeScript/Rust 스타일, 에러 처리 패턴 | style, lint, error handling, 스타일 |
| [deployment.md](deployment.md) | 빌드, 서명, GitHub Release, 자동 업데이트 | build, release, updater, 배포, 서명 |
| [troubleshooting.md](troubleshooting.md) | 빌드 실패, CLI 미탐지, Jira 401 등 | error, 오류, 실패, troubleshoot |
| [glossary.md](glossary.md) | 도메인 약어 사전 (PPV, PPM, MASS, Capa 등) | glossary, 용어, 약어 |

### 마케팅 도메인 (`domain/`)
| 문서 | 내용 | 검색 키워드 |
|---|---|---|
| [domain/overview.md](domain/overview.md) | B tv 마케팅 조직·캠페인 유형 개요 | 도메인, B tv, 마케팅 개요 |
| [domain/products.md](domain/products.md) | PPV / PPM / B tv+ 상품 트랙 정의와 적용 범위 | 상품, PPV, PPM, Btv+, 월정액, 단건 |
| [domain/targeting.md](domain/targeting.md) | 타겟 그룹, 모수, MASS vs TARGET | 타겟, 모수, MASS, TARGET, 세그먼트 |
| [domain/promotion-schemes.md](domain/promotion-schemes.md) | 쿠폰·할인·경품 스킴과 선택 규칙 | 쿠폰, 할인, 경품, 스킴, 혜택 |
| [domain/performance-benchmarks.md](domain/performance-benchmarks.md) | 스킴별 반응률, 월별 추이, CP별 교차분석 | 반응률, 실적, 벤치마크, 전환율 |
| [domain/compliance-darkpattern.md](domain/compliance-darkpattern.md) | 다크패턴 규제와 팝업월 대응 전략 | 다크패턴, 규제, 컴플라이언스, 정가전환 |
| [domain/campaign-playbook.md](domain/campaign-playbook.md) | 상품×목표별 배너·유저플로우 표준 조합 | 플레이북, 조합, 추천, 유저플로우 |

### 노출 구좌 (`placements/`)
| 문서 | 내용 | 검색 키워드 |
|---|---|---|
| [placements/README.md](placements/README.md) | 구좌 분류, 선택 의사결정 트리 | 구좌, 지면, 배너 선택 |
| [placements/banner-specs.md](placements/banner-specs.md) | 전 배너 규격표 (글자수, UI 버전, 타겟팅 가능 여부) | 규격, 글자수, sw_version, 스펙 |
| [placements/today-btv.md](placements/today-btv.md) | Today B tv MASS/TARGET | today, 투데이, 메인배너 |
| [placements/general-banner-2col.md](placements/general-banner-2col.md) | 2단 배너 | 2단, 이단, general banner |
| [placements/long-banner.md](placements/long-banner.md) | 롱배너 | 롱배너, long banner, 세로 |
| [placements/big-banner.md](placements/big-banner.md) | 빅배너 / 월정액 가입 빅배너 | 빅배너, big banner, GNB 최상단 |
| [placements/full-promo-banner.md](placements/full-promo-banner.md) | 풀프로모션(풀페이지) 배너 | 풀페이지, 풀프로모션, 전면 |
| [placements/synopsis-banner.md](placements/synopsis-banner.md) | 시놉시스 배너 | 시놉, synopsis, 상세화면 |
| [placements/strip-banner.md](placements/strip-banner.md) | 띠배너 | 띠배너, strip, 가로 |
| [placements/tv-popup.md](placements/tv-popup.md) | TV 팝업 | 팝업, popup, 개발 |
| [placements/live-channel-banners.md](placements/live-channel-banners.md) | 미니 EPG / 편성표 / WING UI 배너 | EPG, 편성표, WING, 실시간 |
| [placements/ohatcon.md](placements/ohatcon.md) | 오핫콘 (배너 에셋 아님) | 오핫콘, 오늘 핫한 콘텐츠 |

### 카피라이팅 (`copywriting/`)
| 문서 | 내용 | 검색 키워드 |
|---|---|---|
| [copywriting/principles.md](copywriting/principles.md) | 공통 문체 원칙, 옵션 A/B/C 구조 | 카피, 문체, 옵션, copywriting |
| [copywriting/movie-ppv.md](copywriting/movie-ppv.md) | 영화 PPV 작품 분석·카피 전용 규칙 | 영화, PPV, 작품, 인텔리전스 |
| [copywriting/genre-frames.md](copywriting/genre-frames.md) | 장르별 후킹 프레임 | 장르, 액션, 로맨스, 프레임 |
| [copywriting/verification-rules.md](copywriting/verification-rules.md) | 과장·사실 표현 검증, 스포일러 보호 | 검증, 과장, 금지어, 스포일러 |

### 워크플로우 (`workflow/`)
| 문서 | 내용 | 검색 키워드 |
|---|---|---|
| [workflow/campaign-flow.md](workflow/campaign-flow.md) | 3단계 프로세스 상세 정의 | 플로우, 프로세스, 단계, 3단계 |
| [workflow/userflow-design.md](workflow/userflow-design.md) | Userflow 설계 규칙, Mermaid 표기 | userflow, mermaid, 유저플로우 |
| [workflow/jira-integration.md](workflow/jira-integration.md) | Jira 일감 계층 생성 규칙 | jira, 일감, 이슈, BTVMKT |
| [workflow/sheets-logging.md](workflow/sheets-logging.md) | 구글시트 캠페인 DB 적재 규칙 | 시트, sheets, DB, 적재, 로그 |

### 외부 인터페이스 (`api/`)
| 문서 | 내용 | 검색 키워드 |
|---|---|---|
| [api/campaign-assets-json.md](api/campaign-assets-json.md) | **AI 최종 출력 JSON 스키마** | JSON, 스키마, CREATE_CAMPAIGN_ASSETS, 출력 |
| [api/jira.md](api/jira.md) | Jira REST API 사용 명세 | jira api, rest, customfield |
| [api/cloudflare-proxy.md](api/cloudflare-proxy.md) | btv-proxy Worker 엔드포인트 | proxy, worker, cloudflare, capa, config |

### 아키텍처 결정 기록 (`decisions/`)
| ADR | 결정 |
|---|---|
| [ADR-001](decisions/ADR-001-tauri-desktop-app.md) | Electron이 아닌 Tauri 2 채택 |
| [ADR-002](decisions/ADR-002-local-cli-over-gemini.md) | Gemini Gem 대신 로컬 CLI(Claude Code/Codex) 사용 |
| [ADR-003](decisions/ADR-003-absorb-chrome-extension.md) | Chrome 확장프로그램 기능을 앱에 흡수 |
| [ADR-004](decisions/ADR-004-github-releases-autoupdate.md) | GitHub Releases 기반 자동 업데이트 |
| [ADR-005](decisions/ADR-005-knowledge-base-structure.md) | 파일 분할형 knowledge/ 구조 |
| [ADR-006](decisions/ADR-006-jira-auth-webview.md) | Jira 인증에 앱 내 웹뷰 로그인 사용 |

---

## Important AI Agent Guidelines

- 소스 코드를 탐색하기 전에 **`knowledge/README.md`를 먼저 읽는다.**
- 새 기능을 구현할 때는 **관련 knowledge 문서를 먼저 확인**한다.
- 아키텍처나 컨벤션을 변경할 때는 **같은 커밋에서 해당 knowledge 문서를 갱신**한다.
- **문서 간 지식을 중복 기술하지 않는다.** 대신 상대 링크로 참조한다.
- 문서와 코드의 동기화를 유지한다.
- 이 저장소는 사람용 문서가 아니라 **검색 기반 AI 에이전트용**으로 최적화한다.

### 마케팅 기획 시 추가 준수 사항

- 사용자가 확정한 **상품명·기간·혜택·MASS/TARGET은 최우선 사실**이며, 어떤 문서도 이를 덮어쓰지 않는다.
- 지식 문서의 **과거 사례 수치·카피·금액을 현재 캠페인 값으로 복사하지 않는다.**
- 확인되지 않은 정보는 추측하지 않고 **사용자에게 필요한 항목만 한 번에 질문**한다.
- 최종 산출물은 반드시 [api/campaign-assets-json.md](api/campaign-assets-json.md) 스키마를 따른다.

---

## 원본 소스

`knowledge/_source/`에 구글 독스·시트에서 내보낸 원본 텍스트가 보관되어 있다.
문서 갱신 시 원본과 대조하되, **원본을 직접 참조하지 말고 정제된 문서를 사용**한다.

| 파일 | 원본 |
|---|---|
| `_source/doc1.txt` | 4.1. 마케팅 인사이트 (영화 PPV) |
| `_source/doc2.txt` | 고객 행동 심리 / 실적 데이터 / 규제 대응 |
| `_source/doc3.txt`, `doc5.txt` | B tv+ 프로모션 기획 추천 가이드 (동일 문서) |
| `_source/doc4.txt` | [INSIGHT][HOME_DISPLAY] B tv 핵심 전시 구좌 인사이트 |
| `_source/sheet1.csv` | 상품×목표별 프로모션 조합표 |
| `_source/sheet2.csv` | ⚠️ 저장소 미포함(gitignore). 실명·실행 로그가 담긴 라이브 시트라 정적 커밋하지 않는다. 앱이 [api/cloudflare-proxy.md](api/cloudflare-proxy.md) 프록시로 런타임에 직접 조회·적재한다 |
| `_source/sheet3.csv` | B tv 배너 규격 및 특성 |
