# 아키텍처

## 이게 뭔가?

Tauri 2 (Rust) + React 19 (TypeScript) 데스크톱 앱의 레이어 구조와
Rust ↔ React 경계, 폴더별 책임.

## 왜 존재하나?

Rust와 프론트엔드 코드가 명령(command) 경계를 넘나들며 뒤섞이면
어느 쪽을 고쳐야 하는지 알기 어려워진다. 이 문서가 경계를 고정한다.

## 언제 쓰나?

새 기능을 추가하기 전에 "이건 Rust인가 React인가"를 판단할 때.

---

## 레이어 구조

```
┌─────────────────────────────────────────────┐
│ React (src/)                                 │
│  components/  — 화면. 상태를 직접 들고 있지 않음   │
│  store/       — zustand 전역 상태 (단일 소스)     │
│  lib/         — 프로토콜 파싱, 프롬프트 조립, 변환  │
│  types/       — 도메인 타입 (JSON 스키마와 1:1)   │
└───────────────────┬───────────────────────────┘
                    │ tauri invoke / event
┌───────────────────▼───────────────────────────┐
│ Rust (src-tauri/src/)                         │
│  cli.rs    — AI CLI 자식 프로세스 실행·스트리밍   │
│  jira.rs   — Jira 웹뷰 브리지 (세션 쿠키 인증)    │
│  proxy.rs  — Cloudflare Worker 프록시 클라이언트  │
└─────────────────────────────────────────────────┘
```

### 왜 Rust가 이렇게 얇은가

이 앱의 로직 대부분(카피 검증, 배너 스키마, 기획 규칙)은 **지식베이스와 AI 프롬프트**가
담당한다. Rust는 순수하게 **OS 경계 작업**(프로세스 실행, 네이티브 웹뷰, 파일시스템)만 한다.
비즈니스 로직을 Rust에 넣지 않는다 — 지식베이스 갱신만으로 기획 품질을 개선할 수 있어야 한다.

---

## 데이터 흐름

### 1단계 — 대화 → 상태 반영

```
사용자 입력
  → lib/prompt.ts (buildPrompt) — 슬래시 커맨드 + 현재 상태 + 이력을 조립
  → lib/agent.ts (runAgent) — invoke('run_agent')
  → Rust cli.rs — CLI 자식 프로세스 실행, stdout을 줄 단위로 이벤트 발행
  → lib/agent.ts 이벤트 리스너 — 청크를 lib/protocol.ts (parseStream) 로 파싱
  → store/useCampaign.ts — <<<AX:STATE>>> / <<<AX:PLAN>>> 블록을 즉시 병합
  → components/step1/CampaignInfoPanel.tsx — 스토어 구독, 자동 리렌더
```

**핵심 설계**: 파서가 스트림 중간에 블록을 뽑아내므로, AI가 한 문장 쓸 때마다
화면이 갱신될 수 있다. 이게 "대화 중 확정되면 바로 반영"의 구현 방식이다.
프로토콜 명세: [api/campaign-assets-json.md](api/campaign-assets-json.md)

### 2단계 — 편집 → 3단계 산출물

```
components/step2/AssetEditor.tsx — 사용자 편집 → store.updateAsset
components/step2/BannerPreview.tsx — data-preview-id를 가진 DOM (3단계 캡처 대상)
```

### 3단계 — 출력

```
components/step3/ExportStep.tsx
  → html2canvas로 시안 캡처
  → lib/export.ts (buildJiraPayload) — Jira 필드 매핑
  → invoke('jira_request') → Rust jira.rs → Jira 웹뷰로 작업 위임 → fetch(credentials:'include')
  → lib/export.ts (buildSheetRows) — 시트 행 매핑
  → invoke('sheets_bulk_insert') → Rust proxy.rs → Cloudflare Worker
```

---

## Jira 인증이 특이한 이유

사내 Jira는 SSO 세션 쿠키 인증이라 Rust에서 직접 HTTP 호출할 수 없다
(쿠키가 없다). 대신 **Jira 오리진에 로드된 별도 웹뷰 창**에서 로그인시키고,
그 웹뷰 안에서 fetch를 실행해 작업을 위임한다.

```
Rust jira.rs --(emit "jira://job")--> 웹뷰(초기화 스크립트) --(fetch, credentials:include)--> Jira
                                            │
Rust jira.rs <--(invoke jira_job_result)---┘
```

상세: [decisions/ADR-006-jira-auth-webview.md](decisions/ADR-006-jira-auth-webview.md),
[api/jira.md](api/jira.md)

---

## 폴더 책임

| 경로 | 책임 |
|---|---|
| `src-tauri/src/cli.rs` | CLI 탐지·실행·스트리밍·취소 |
| `src-tauri/src/jira.rs` | Jira 웹뷰 생성, 작업 위임/회신 브리지 |
| `src-tauri/src/proxy.rs` | Cloudflare Worker HTTP 클라이언트 |
| `src/types/campaign.ts` | 도메인 타입. JSON 스키마와 동기화 필수 |
| `src/lib/protocol.ts` | AI 출력 스트림 파서 |
| `src/lib/prompt.ts` | 슬래시 커맨드 프롬프트 조립 |
| `src/lib/export.ts` | 기획안 → Jira/시트 변환 |
| `src/store/useCampaign.ts` | 전역 상태 단일 소스 |
| `src/components/step1/` | 1단계 — 캠페인 정보 |
| `src/components/step2/` | 2단계 — 기획안 확인/편집 |
| `src/components/step3/` | 3단계 — 최종 출력 |
| `.claude/commands/ax-campaign.md` | 기획 로직의 실제 본체 (프롬프트) |
| `knowledge/` | 기획 판단의 근거 (AI가 커맨드 실행 중 참조) |

---

## 기여자 수정 가이드

- 배너 타입을 추가하면 **4곳을 함께 갱신**한다: `types/campaign.ts`(ASSET_TYPES),
  `components/step2/fieldSchema.ts`, `.claude/commands/ax-campaign.md`,
  `knowledge/placements/banner-specs.md`
- Rust에 새 명령을 추가하면 `lib.rs`의 `invoke_handler`와 해당 `capabilities/*.json`에 권한을 등록한다.
- 이 문서가 오래되면 신뢰할 수 없다. 레이어를 옮기는 리팩터링은 같은 커밋에서 갱신한다.

## TODO

- [ ] 상태 영속화(재시작 시 진행 중 캠페인 복구) 여부 결정
- [ ] 다중 캠페인 동시 진행 지원 여부
