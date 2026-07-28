# 상품 트랙 (Product Tracks)

## 이게 뭔가?

B tv 프로모션이 다루는 상품 분류. **모든 기획의 첫 분기점**이며, 트랙에 따라
적용되는 인사이트 문서·카피 규칙·구좌 조합이 전부 달라진다.

## 왜 존재하나?

트랙별로 고객 구매 심리와 규제 리스크가 완전히 다르기 때문이다.
단건 구매(PPV)는 "이 작품을 볼까 말까"의 문제고, 월정액(PPM)은
"매달 돈을 낼까 말까"의 문제다. 같은 카피 공식을 쓰면 둘 다 실패한다.

## 언제 쓰나?

캠페인 정보 입력 단계([workflow/campaign-flow.md](../workflow/campaign-flow.md) ①)에서
가장 먼저 확정한다. 확정 전에는 구좌 추천도 카피 작성도 시작하지 않는다.

---

## 트랙 정의

### PPV — 단건 구매 (Pay Per View)

| 항목 | 값 |
|---|---|
| 정의 | 콘텐츠 1편 단위 구매 (영화, 방송 다시보기 등) |
| 하위 구분 | `MOVIE_PPV`(영화), 시리즈, 예능, 키즈 |
| 핵심 목표 | 구매 전환 (인지 → 시놉시스 진입 → 결제) |
| 대표 혜택 | 할인쿠폰 선발급, 쿠폰 다운로드, 구매자 경품 |
| 전용 카피 규칙 | [copywriting/movie-ppv.md](../copywriting/movie-ppv.md) — **영화에만 적용** |

> ⚠️ `MOVIE_PPV` 전용 인사이트는 시리즈·예능·키즈·PPM·B tv+에 적용하지 않는다.

### PPM — 월정액 (Pay Per Month)

| 항목 | 값 |
|---|---|
| 정의 | 월 단위 구독 상품 (지상파3사, CJ ENM, JTBC, MBN, TV조선 등) |
| 핵심 목표 | 신규 가입 / 리텐션(해지방어) / 시청 유도 |
| 대표 혜택 | 첫달 100% 무료, 12개월 50% 할인, 다개월 정액 할인 |
| 규제 영향 | **다크패턴 규제 직접 적용** → [domain/compliance-darkpattern.md](compliance-darkpattern.md) |

### B tv+ — 자체 OTT 결합 상품

| 항목 | 값 |
|---|---|
| 정의 | B tv 자체 OTT 번들 월정액 |
| 핵심 목표 | 신규 가입 확보, 파일럿 테스트 |
| 전용 룰셋 | [domain/promotion-schemes.md](promotion-schemes.md) B tv+ 섹션 |
| 타겟 그룹 | PPM 유료 / PPM 무료 / PPV+FOD+실시간 → [domain/targeting.md](targeting.md) |

---

## 트랙별 적용 문서 매트릭스

| 트랙 | 구좌 판단 | 카피 규칙 | 스킴 선택 |
|---|---|---|---|
| MOVIE_PPV | [placements/README.md](../placements/README.md) | [copywriting/movie-ppv.md](../copywriting/movie-ppv.md) | [campaign-playbook.md](campaign-playbook.md) PPV 섹션 |
| PPV (그 외) | [placements/README.md](../placements/README.md) | [copywriting/principles.md](../copywriting/principles.md) | [campaign-playbook.md](campaign-playbook.md) PPV 섹션 |
| PPM | [placements/README.md](../placements/README.md) | [copywriting/principles.md](../copywriting/principles.md) | [promotion-schemes.md](promotion-schemes.md) |
| B tv+ | [placements/README.md](../placements/README.md) | [copywriting/principles.md](../copywriting/principles.md) | [promotion-schemes.md](promotion-schemes.md) B tv+ 룰 |

---

## 기여자 수정 가이드

- 새 상품 트랙이 생기면 이 문서에 행을 추가하고, 매트릭스에 적용 문서를 명시한다.
- 트랙별 세부 룰이 3개 이상 쌓이면 별도 파일로 분리하고 여기서는 링크만 남긴다.
- 상품명 자체(예: "CJ ENM 월정액")는 여기 하드코딩하지 않는다. 캠페인마다 달라진다.

## TODO

- [ ] 시리즈/예능/키즈 PPV 전용 카피 인사이트 문서 (현재 영화만 존재)
- [ ] B tv+ 상품 구성(포함 채널·가격)의 최신 스냅샷
