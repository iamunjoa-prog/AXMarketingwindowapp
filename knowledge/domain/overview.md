# 마케팅 도메인 개요

## 이게 뭔가?

B tv 프로모션 마케팅이 무엇을 하는 일인지, 그리고 이 앱이 그 과정의 어디를 자동화하는지.

## 왜 존재하나?

도메인 문맥 없이 개별 문서만 읽으면 "왜 이런 제약이 있는지" 알 수 없다.
이 문서는 나머지 `domain/` 문서들을 묶는 지도 역할을 한다.

## 언제 쓰나?

프로젝트를 처음 접할 때. 이미 도메인을 안다면 건너뛰고 개별 문서로 간다.

---

## 캠페인이란

B tv 마케터는 특정 **상품**(영화 1편, 월정액 1종 등)을 **특정 고객**에게
**특정 기간** 동안 **특정 혜택**과 함께 노출해 **특정 행동**(구매/가입/시청)을 유도한다.

이 5가지가 캠페인의 최소 정의이며, 하나라도 미확정이면 기획을 시작할 수 없다.

| 축 | 문서 |
|---|---|
| 상품 | [products.md](products.md) |
| 고객 | [targeting.md](targeting.md) |
| 기간 | [promotion-schemes.md](promotion-schemes.md#진행-시기), [compliance-darkpattern.md](compliance-darkpattern.md) |
| 혜택 | [promotion-schemes.md](promotion-schemes.md) |
| 행동(목표) | [campaign-playbook.md](campaign-playbook.md) |

---

## 캠페인 목표 분류

| 목표 | 의미 | 주요 트랙 |
|---|---|---|
| **인지** | 콘텐츠·상품의 존재를 알림 | PPV, PPM |
| **구매 전환** | 단건 콘텐츠 결제 유도 | PPV |
| **신규 가입** | 월정액 최초 가입 유도 | PPM, B tv+ |
| **리텐션 / 해지방어** | 기존 가입자 유지 | PPM |
| **시청 유도** | 가입자의 실제 시청 증대 | PPM |

목표가 정해지면 [campaign-playbook.md](campaign-playbook.md)에서
검증된 배너·유저플로우 조합을 조회한다.

---

## 실행까지의 전체 그림

```
기획 (이 앱 ①②)
  ↓
Jira 일감 생성 (이 앱 ③)  →  디자인팀 시안 제작 → 편성팀 배너 등록
  ↓
구글시트 캠페인 DB 적재 (이 앱 ③)  →  성과 집계 → 벤치마크 축적
```

- 앱의 산출물은 **Jira 일감 + 시트 행 + 시안 PNG**다.
  실제 배너 이미지 제작과 편성은 사람이 한다.
- 시트에 쌓인 데이터가 [performance-benchmarks.md](performance-benchmarks.md)의
  원천이 된다. 적재 품질이 다음 기획의 품질을 결정한다.

상세: [workflow/campaign-flow.md](../workflow/campaign-flow.md)

---

## 이 도메인의 3대 제약

1. **규제** — 다크패턴 방지법이 월정액 할인 설계를 제약한다.
   → [compliance-darkpattern.md](compliance-darkpattern.md)
2. **구좌 규격** — 배너마다 글자수·UI 버전·타겟팅 가능 여부가 다르다.
   → [placements/banner-specs.md](../placements/banner-specs.md)
3. **사실성** — 확인되지 않은 작품 정보나 혜택 조건을 지어내면 안 된다.
   → [copywriting/verification-rules.md](../copywriting/verification-rules.md)

---

## 기여자 수정 가이드

- 이 문서는 **지도**다. 세부 지식을 여기 쓰지 말고 해당 문서로 링크한다.
- 새 캠페인 목표 유형이 생기면 목표 분류 표에 추가한다.

## TODO

- [ ] 조직 내 역할 분담 (기획/디자인/편성/개발) 상세
- [ ] 캠페인 승인 절차 및 리드타임
