/**
 * 3단계 산출물 변환.
 *
 * 기획안(CampaignPlan)을 Jira 이슈 필드와 구글시트 행으로 변환한다.
 * 필드 매핑 근거:
 *   - knowledge/workflow/jira-integration.md
 *   - knowledge/workflow/sheets-logging.md
 */

import type { CampaignAsset, CampaignMeta, CampaignPlan } from '../types/campaign'

const JIRA_BASE = 'https://jira.skbroadband.com'

/** 사내 Jira의 시작일/종료일 커스텀 필드. */
const START_DATE_FIELD = 'customfield_10134'
const FINISH_DATE_FIELD = 'customfield_10135'

const PARENT_ISSUE_TYPE = 'Task'
const CHILD_ISSUE_TYPE = 'Sub-Task'

/** TARGET 모수 분할 단위. 초과분은 캠페인명에 `_n` 접미사를 붙여 나눈다. */
const MAX_TARGET_SIZE = 800_000

/** Jira 라벨은 공백을 허용하지 않는다. */
const toLabel = (s: string) => (s ? s.replace(/\s+/g, '_') : '미지정')

export function buildJiraPayload(meta: CampaignMeta, plan: CampaignPlan, projectKey: string) {
  const labels = Array.from(new Set(plan.assets.flatMap((a) => (a.data.gnb ?? []).map(toLabel))))

  const parentFields: Record<string, unknown> = {
    project: { key: projectKey },
    summary: meta.campaignName,
    description: buildParentDescription(meta, plan),
    issuetype: { name: PARENT_ISSUE_TYPE },
    reporter: { name: meta.assignee },
    assignee: { name: meta.assignee },
    labels,
  }
  if (meta.startDate) parentFields[START_DATE_FIELD] = meta.startDate
  if (meta.dueDate) parentFields[FINISH_DATE_FIELD] = meta.dueDate

  const childUpdates = (parentKey: string) =>
    plan.assets.map((asset) => {
      const fields: Record<string, unknown> = {
        project: { key: projectKey },
        summary: `[${asset.type}] ${asset.name}`,
        description: buildChildDescription(asset),
        issuetype: { name: CHILD_ISSUE_TYPE },
        parent: { key: parentKey },
        reporter: { name: meta.assignee },
        assignee: { name: meta.assignee },
        labels: (asset.data.gnb ?? []).map(toLabel),
      }
      const start = asset.data.startDate || meta.startDate
      const due = asset.data.dueDate || meta.dueDate
      if (start) fields[START_DATE_FIELD] = start
      if (due) fields[FINISH_DATE_FIELD] = due

      return { fields }
    })

  return { parentFields, childUpdates }
}

function buildParentDescription(meta: CampaignMeta, plan: CampaignPlan): string {
  const lines = [
    `*대상 상품*: ${meta.product}`,
    `*캠페인 목표*: ${meta.goal}`,
    `*타겟*: ${meta.target}${meta.targetSize ? ` (${Number(meta.targetSize).toLocaleString()}명)` : ''}`,
    meta.targetCondition ? `*추출 조건*: ${meta.targetCondition}` : '',
    `*기간*: ${meta.startDate} ~ ${meta.dueDate}`,
    `*쿠폰*: ${meta.hasCoupon === 'Y' ? meta.couponBenefit || '지급' : '없음'}`,
    meta.prize ? `*경품*: ${meta.prize}` : '',
    '',
    plan.summary,
  ]

  if (plan.mermaidCode) {
    lines.push('', '{code:none}', plan.mermaidCode, '{code}')
  }

  return lines.filter(Boolean).join('\n')
}

function buildChildDescription(asset: CampaignAsset): string {
  return [
    `*배너 타입*: ${asset.type}`,
    `*편성 GNB*: ${(asset.data.gnb ?? []).join(', ') || '미지정'}`,
    `*랜딩*: ${asset.data.landingValue || '미지정'}`,
    '',
    `*카피*`,
    collectCopy(asset).join('\n') || '(없음)',
    asset.data.note ? `\n*메모*: ${asset.data.note}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** 배너 타입에 상관없이 카피성 필드를 모은다. 시트의 '주요 카피' 열에도 쓰인다. */
const COPY_KEYS = [
  'topText',
  'mainTitle',
  'copy',
  'bannerCopy',
  'previewTitle',
  'topLogo',
  'mainCopy',
  'subText',
  'subTitle',
  'subCopy',
  'previewSub',
  'buttonText',
  'badgeText',
]

function collectCopy(asset: CampaignAsset): string[] {
  return COPY_KEYS.map((key) => String(asset.data[key] ?? '').trim()).filter(Boolean)
}

/** 모수를 80만 단위로 분할한다. TARGET이 아니면 단일 청크. */
function chunkTargets(meta: CampaignMeta): number[] {
  const total = Number(meta.targetSize) || 0
  if (meta.target !== 'TARGET' || total <= MAX_TARGET_SIZE) return [total]

  const chunks: number[] = []
  let remaining = total
  while (remaining > 0) {
    chunks.push(Math.min(remaining, MAX_TARGET_SIZE))
    remaining -= MAX_TARGET_SIZE
  }
  return chunks
}

export function buildSheetRows(
  meta: CampaignMeta,
  plan: CampaignPlan,
  parentKey: string,
  childKeys: string[],
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []
  const chunks = chunkTargets(meta)
  const isTarget = meta.target === 'TARGET'
  const hasCoupon = meta.hasCoupon === 'Y' ? 'Y' : 'N'

  chunks.forEach((chunkSize, chunkIndex) => {
    const suffix = chunks.length > 1 ? `_${chunkIndex + 1}` : ''
    const campaignName = `${meta.campaignName}${suffix}`

    // 배너별 행
    plan.assets.forEach((asset, i) => {
      const imageUrl =
        String(asset.data.imageUrl ?? '') ||
        String(asset.data.bgImg ?? '') ||
        String(asset.data.bannerImg ?? '') ||
        String(asset.data.previewImg ?? '')

      rows.push({
        parentJira: `${JIRA_BASE}/browse/${parentKey}`,
        childJira: childKeys[i] ? `${JIRA_BASE}/browse/${childKeys[i]}` : '',
        campaignName,
        product: meta.product,
        targetType: meta.target,
        channel: (asset.data.gnb ?? []).join(', ') || '미지정',
        hasBanner: asset.type.includes('BANNER') || asset.type.includes('TODAY') ? 'Y' : 'N',
        taskType: asset.type,
        startDate: asset.data.startDate || meta.startDate,
        endDate: asset.data.dueDate || meta.dueDate,
        assignee: meta.assignee,
        // 배너 행의 모수는 0으로 고정한다. 마스터 행에서만 1회 계상해 중복 차감을 막는다.
        targetSize: 0,
        targetCondition: meta.targetCondition,
        notiChannel: '',
        mainCopy: collectCopy(asset).join(' / ') || '카피 없음',
        landingUrl: asset.data.landingValue ?? '',
        designLink: imageUrl,
        hasCoupon,
      })
    })

    // TARGET 마스터 행 — 실제 모수는 여기에만 기록한다.
    if (isTarget) {
      const bannerNames = plan.assets.map((a) => a.name).join(', ') || '배너 없음 (타겟 전용)'
      rows.push({
        parentJira: `${JIRA_BASE}/browse/${parentKey}`,
        childJira: childKeys[plan.assets.length]
          ? `${JIRA_BASE}/browse/${childKeys[plan.assets.length]}`
          : '',
        campaignName,
        product: meta.product,
        targetType: 'TARGET',
        channel: '기타',
        hasBanner: 'N',
        taskType: 'TARGET_OPERATION',
        startDate: meta.startDate,
        endDate: meta.dueDate,
        assignee: meta.assignee,
        targetSize: chunkSize,
        targetCondition: meta.targetCondition,
        notiChannel: '',
        mainCopy: `타겟팅 세팅 요청 (포함 배너: ${bannerNames})`,
        landingUrl: '',
        designLink: '',
        hasCoupon,
      })
    }
  })

  return rows
}
