/**
 * 배너 타입별 편집 필드 정의.
 *
 * `maxLength`는 실제 B tv 편성 규격이며, 초과 시 편집기에서 경고를 띄운다.
 * 규격 원본: knowledge/placements/banner-specs.md
 * 규격이 바뀌면 이 파일과 해당 문서를 같은 커밋에서 갱신한다.
 */

import type { AssetType } from '../../types/campaign'

export interface FieldDef {
  key: string
  label: string
  maxLength?: number
  multiline?: boolean
  placeholder?: string
}

export const FIELD_SCHEMA: Partial<Record<AssetType, FieldDef[]>> = {
  // 로고 9자 / 텍스트 20자, 최대 3줄
  TODAY_BTV: [
    { key: 'topText', label: '상단 문구 (로고)', maxLength: 9 },
    { key: 'mainTitle', label: '메인 문구', maxLength: 20 },
    { key: 'subText', label: '서브 텍스트', maxLength: 20 },
    { key: 'buttonText', label: '버튼 텍스트', maxLength: 9 },
    { key: 'imageUrl', label: '이미지 URL' },
  ],

  // 좌 프리뷰 20자(최대 7줄) / 배너 8자(최대 3줄)
  GENERAL_BANNER: [
    { key: 'previewTitle', label: '프리뷰 타이틀', maxLength: 20 },
    { key: 'previewSub', label: '프리뷰 서브', maxLength: 20, multiline: true },
    { key: 'bannerCopy', label: '배너 카피', maxLength: 8 },
    { key: 'previewImg', label: '프리뷰 이미지 URL' },
    { key: 'bannerImg', label: '배너 이미지 URL' },
  ],

  // 배경: 로고 20자 / 메인 40자 / 서브 68자, 카드 3개 각 10자
  FULL_PROMO_BANNER: [
    { key: 'topLogo', label: '상단 로고', maxLength: 20 },
    { key: 'mainCopy', label: '메인 카피', maxLength: 40 },
    { key: 'subCopy', label: '서브 카피', maxLength: 68, multiline: true },
    { key: 'bgImg', label: '배경 이미지 URL' },
    { key: 'card1Title', label: '카드1 타이틀', maxLength: 10 },
    { key: 'card1Sub', label: '카드1 서브', maxLength: 10 },
    { key: 'card2Title', label: '카드2 타이틀', maxLength: 10 },
    { key: 'card2Sub', label: '카드2 서브', maxLength: 10 },
    { key: 'card3Title', label: '카드3 타이틀', maxLength: 10 },
    { key: 'card3Sub', label: '카드3 서브', maxLength: 10 },
  ],

  // 텍스트 19자, 최대 3줄(로고+2줄)
  BIG_BANNER: [
    { key: 'mainTitle', label: '메인 문구', maxLength: 19 },
    { key: 'subTitle', label: '서브 타이틀', maxLength: 19 },
    { key: 'desc', label: '상세 설명', multiline: true },
    { key: 'buttonText', label: '버튼 텍스트', maxLength: 9 },
    { key: 'imageUrl', label: '이미지 URL' },
    { key: 'logoImg', label: '로고 이미지 URL' },
  ],

  // 상단 17자 / 하단 12자
  LONG_BANNER: [
    { key: 'copy', label: '상단 카피', maxLength: 17 },
    { key: 'subTitle', label: '하단 카피', maxLength: 12 },
    { key: 'imageUrl', label: '이미지 URL' },
  ],

  // 최대 2줄 / 25자
  STRIP_BANNER: [
    { key: 'mainTitle', label: '메인 타이틀', maxLength: 25 },
    { key: 'subTitle', label: '서브 텍스트', maxLength: 25 },
    { key: 'imageUrl', label: '이미지 URL' },
  ],

  // 최대 2줄 / 8자
  SYNOPSIS_BANNER: [
    { key: 'mainTitle', label: '메인 타이틀', maxLength: 8 },
    { key: 'subTitle', label: '서브 타이틀', maxLength: 8 },
    { key: 'badgeText', label: '배지 텍스트', multiline: true },
    { key: 'imageUrl', label: '이미지 URL' },
  ],

  // 버튼 2~9자 (띄어쓰기 포함)
  PROMO_POPUP: [
    { key: 'buttonText', label: '버튼 텍스트', maxLength: 9 },
    { key: 'closeText', label: '닫기 텍스트', maxLength: 9 },
    { key: 'imageUrl', label: '이미지 URL (587×366 / UHD 1175×733)' },
  ],

  // 텍스트 5자
  MINI_EPG_BANNER: [
    { key: 'buttonText', label: '버튼 텍스트', maxLength: 5 },
    { key: 'imageUrl', label: '이미지 URL' },
  ],
}
