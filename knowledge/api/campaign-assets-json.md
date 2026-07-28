# 최종 출력 JSON 스키마 — CREATE_CAMPAIGN_ASSETS

## 이게 뭔가?

AI 에이전트가 기획안을 확정할 때 출력하는 **유일한 산출물 형식**.
앱은 이 형식만 파싱한다.

## 왜 존재하나?

AI 출력이 자유 산문이면 앱이 파싱할 수 없다. 스트리밍 중에도 안전하게
자를 수 있는 마커 프로토콜을 정의해 **대화 중 실시간 화면 반영**을 가능하게 한다.

## 언제 쓰나?

`.claude/commands/ax-campaign.md`를 수정할 때, 또는 앱의 파서
(`src/lib/protocol.ts`)나 타입(`src/types/campaign.ts`)을 수정할 때
**반드시 이 문서와 대조**한다. 세 곳은 항상 동기화되어야 한다.

---

## 마커 프로토콜

```
<<<AX:STATE>>>
{ ...부분 patch... }
<<<AX:END>>>

<<<AX:PLAN>>>
{ ...기획안 전체... }
<<<AX:END>>>
```

- `AX:STATE`는 캠페인 메타 필드가 확정될 때마다 **여러 번** 출력 가능하다.
- `AX:PLAN`은 기획안 완성 시 보통 **한 번** 출력한다. `revise` 단계에서 재출력될 수 있다.
- 마커 밖의 텍스트는 사용자에게 보이는 대화문이다.
- 블록 안은 **순수 JSON**. 주석·후행 쉼표 금지.

파서 구현: [architecture.md](../architecture.md#1단계--대화--상태-반영)

---

## AX:STATE 스키마

`CampaignMeta`의 부분 집합. 빈 문자열은 "미확정"으로 취급되어 기존 값을 덮어쓰지 않는다.

| 키 | 타입 | 설명 |
|---|---|---|
| `campaignName` | string | 캠페인명 |
| `product` | string | 상품 트랙. [domain/products.md](../domain/products.md) |
| `goal` | string | 캠페인 목표 |
| `target` | `"MASS"` \| `"TARGET"` | |
| `targetSize` | string(숫자) | TARGET일 때만 |
| `targetCondition` | string | 타겟 추출 조건 |
| `startDate` | string(`YYYY-MM-DD`) | |
| `dueDate` | string(`YYYY-MM-DD`) | |
| `hasCoupon` | `"Y"` \| `"N"` | |
| `couponBenefit` | string | |
| `prize` | string | |
| `assignee` | string | Jira 담당자 ID |
| `notes` | string | 자유 서술 |

## AX:PLAN 스키마

```ts
{
  summary: string        // 사람이 읽는 기획 요약
  rationale: string       // 선택 근거 (요청 시에만 상세히)
  mermaidCode: string     // Userflow. knowledge/workflow/userflow-design.md
  assets: CampaignAsset[]
}
```

### CampaignAsset

```ts
{
  type: AssetType         // 아래 enum 중 하나
  name: string            // 관리자용 표시명, 예: "메인 진입 배너"
  data: {
    gnb: string[]         // 편성 GNB. knowledge/domain(GNB_OPTIONS)
    landingValue: string  // "UI_PATH: /경로" 또는 "ACTION: /액션명"
    startDate?: string
    dueDate?: string
    note?: string
    [배너별 카피 필드]     // knowledge/placements/banner-specs.md
  }
}
```

### AssetType enum

```
TODAY_BTV | GENERAL_BANNER | FULL_PROMO_BANNER | BIG_BANNER |
LONG_BANNER | STRIP_BANNER | SYNOPSIS_BANNER | PROMO_POPUP | MINI_EPG_BANNER
```

> 🚨 **오핫콘은 이 enum에 없다.** 배너 에셋이 아니므로 `assets`에 절대 포함하지 않는다.
> → [placements/ohatcon.md](../placements/ohatcon.md)

---

## 예시

```json
<<<AX:STATE>>>
{ "product": "영화 PPV", "goal": "구매 전환", "hasCoupon": "Y" }
<<<AX:END>>>
```

```json
<<<AX:PLAN>>>
{
  "summary": "영화 신작 구매 전환 캠페인. Today B tv로 대규모 도달 후 시놉시스에서 쿠폰 혜택을 안내합니다.",
  "rationale": "",
  "mermaidCode": "graph LR\n  A[Today B tv] --> B[시놉시스] --> C[구매]",
  "assets": [
    {
      "type": "TODAY_BTV",
      "name": "메인 진입 배너",
      "data": {
        "topText": "이번주 신작",
        "mainTitle": "지금 극장에서 만난 그 영화",
        "subText": "쿠폰으로 더 저렴하게",
        "buttonText": "자세히 보기",
        "gnb": ["홈"],
        "landingValue": "UI_PATH: /synopsis"
      }
    },
    {
      "type": "SYNOPSIS_BANNER",
      "name": "구매 전환 배너",
      "data": {
        "mainTitle": "쿠폰받기",
        "subTitle": "~8.10까지",
        "gnb": ["콘텐츠"],
        "landingValue": "UI_PATH: /purchase"
      }
    }
  ]
}
<<<AX:END>>>
```

---

## 앱 내부 처리

1. `src/lib/protocol.ts`가 버퍼에서 완결된 블록을 추출 (미완결분은 다음 청크와 병합)
2. `AX:STATE` → `store.applyStatePatch` — 빈 값은 무시하고 병합
3. `AX:PLAN` → `store.applyPlanPatch` — `assets`는 `normalizeAssets`로 id 부여 및 정규화
4. 3단계에서 `src/lib/export.ts`가 이 구조를 Jira 필드와 시트 행으로 변환

---

## 기여자 수정 가이드

- 필드를 추가/제거하면 **세 곳을 동시에** 수정한다:
  1. 이 문서
  2. `src/types/campaign.ts`
  3. `.claude/commands/ax-campaign.md`의 출력 프로토콜 섹션
- 마커 문자열(`<<<AX:...>>>`) 자체를 바꾸면 `src/lib/protocol.ts`의 `MARKERS`도 갱신한다.

## TODO

- [ ] `rationale`을 언제 채우는지의 명확한 트리거 조건
- [ ] 다중 기획 옵션(A/B/C) 동시 제안 지원 여부
