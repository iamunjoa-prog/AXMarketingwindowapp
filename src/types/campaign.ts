/**
 * 캠페인 도메인 타입.
 *
 * 이 파일의 구조는 최종 산출물 JSON 스키마와 1:1로 대응한다.
 * 스키마 명세: knowledge/api/campaign-assets-json.md
 * 배너 타입별 필드: knowledge/placements/banner-specs.md
 */

/** 지원 배너(에셋) 타입. 오핫콘은 배너 에셋이 아니므로 포함하지 않는다. */
export const ASSET_TYPES = [
  'TODAY_BTV',
  'GENERAL_BANNER',
  'FULL_PROMO_BANNER',
  'BIG_BANNER',
  'LONG_BANNER',
  'STRIP_BANNER',
  'SYNOPSIS_BANNER',
  'PROMO_POPUP',
  'MINI_EPG_BANNER',
] as const

export type AssetType = (typeof ASSET_TYPES)[number]

export const ASSET_LABELS: Record<AssetType, string> = {
  TODAY_BTV: 'Today B tv',
  GENERAL_BANNER: '2단 배너',
  FULL_PROMO_BANNER: '풀프로모션 배너',
  BIG_BANNER: '빅배너',
  LONG_BANNER: '롱배너',
  STRIP_BANNER: '띠배너',
  SYNOPSIS_BANNER: '시놉시스 배너',
  PROMO_POPUP: 'TV 팝업',
  MINI_EPG_BANNER: '미니 EPG 배너',
}

/** 타겟팅이 불가능한 구좌. TARGET 캠페인에 넣으면 안 된다. */
export const TARGETING_UNSUPPORTED: AssetType[] = ['MINI_EPG_BANNER']

export const GNB_OPTIONS = [
  '홈',
  'Btv+',
  '영화시리즈',
  'TV 방송',
  '무료',
  '애니메이션',
  '해피시니어',
  '키즈',
  'OTT홈',
  '실시간 채널',
  '광고 홈',
  '콘텐츠',
  '이벤트',
  '기타',
] as const

export type TargetType = 'MASS' | 'TARGET'

/** 캠페인 메타 — 1단계에서 확정되는 값들. */
export interface CampaignMeta {
  campaignName: string
  /** 상품 트랙. knowledge/domain/products.md */
  product: string
  /** 캠페인 목표. knowledge/domain/overview.md */
  goal: string
  target: TargetType
  /** TARGET일 때의 모수(명). 80만 초과 시 청크 분할된다. */
  targetSize: string
  targetCondition: string
  startDate: string
  dueDate: string
  hasCoupon: 'Y' | 'N'
  couponBenefit: string
  /** 경품 내용. 없으면 빈 문자열. */
  prize: string
  /** Jira 상위 일감 담당자 ID. */
  assignee: string
  /** 자유 서술 요구사항. 프롬프트에 그대로 전달된다. */
  notes: string
}

export const EMPTY_META: CampaignMeta = {
  campaignName: '',
  product: '',
  goal: '',
  target: 'MASS',
  targetSize: '',
  targetCondition: '',
  startDate: '',
  dueDate: '',
  hasCoupon: 'N',
  couponBenefit: '',
  prize: '',
  assignee: '',
  notes: '',
}

/** 기획 화면에 표시할 필드 정의. 확정 여부 배지를 이 순서로 렌더링한다. */
export const META_FIELDS: {
  key: keyof CampaignMeta
  label: string
  required: boolean
  hint?: string
}[] = [
  { key: 'campaignName', label: '캠페인명', required: true },
  { key: 'product', label: '대상 상품', required: true, hint: 'PPV / PPM / B tv+' },
  { key: 'goal', label: '캠페인 목표', required: true, hint: '인지 / 구매전환 / 신규가입 / 리텐션 / 시청유도' },
  { key: 'target', label: '타겟 유형', required: true, hint: 'MASS 또는 TARGET' },
  { key: 'targetSize', label: '타겟 모수', required: false, hint: 'TARGET인 경우 필수' },
  { key: 'targetCondition', label: '타겟 추출 조건', required: false },
  { key: 'startDate', label: '시작일', required: true, hint: 'YYYY-MM-DD' },
  { key: 'dueDate', label: '종료일', required: true, hint: 'YYYY-MM-DD' },
  { key: 'hasCoupon', label: '쿠폰 지급', required: true },
  { key: 'couponBenefit', label: '쿠폰 혜택', required: false },
  { key: 'prize', label: '경품', required: false },
  { key: 'assignee', label: '담당자 Jira ID', required: true },
]

/** 배너 에셋 1건. `data`의 필드 구성은 type에 따라 다르다. */
export interface CampaignAsset {
  id: string
  type: AssetType
  name: string
  data: AssetData
}

export interface AssetData {
  gnb: string[]
  landingValue: string
  startDate?: string
  dueDate?: string
  note?: string
  /** 캡처된 시안 PNG (data URL). 3단계에서 채워진다. */
  previewImage?: string
  /** 배너 타입별 카피/이미지 필드. */
  [key: string]: unknown
}

/** AI가 제안한 기획안 전체. 2단계에서 검토·편집한다. */
export interface CampaignPlan {
  /** 기획 요약 (사람이 읽는 서술형). */
  summary: string
  /** 추천 근거. 사용자가 요청했을 때만 채워진다. */
  rationale: string
  /** Mermaid 유저플로우 코드. knowledge/workflow/userflow-design.md */
  mermaidCode: string
  assets: CampaignAsset[]
}

export const EMPTY_PLAN: CampaignPlan = {
  summary: '',
  rationale: '',
  mermaidCode: '',
  assets: [],
}

/** 3단계 진행 상태. */
export type StepId = 1 | 2 | 3

export const STEPS: { id: StepId; label: string; desc: string }[] = [
  { id: 1, label: '캠페인 정보', desc: '대화하며 조건을 확정합니다' },
  { id: 2, label: '기획안 확인', desc: '배너 구성과 카피를 검토합니다' },
  { id: 3, label: '최종 출력', desc: 'Jira 일감과 시트에 적재합니다' },
]
