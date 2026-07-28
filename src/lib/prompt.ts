/**
 * CLI에 전달할 프롬프트를 조립한다.
 *
 * 앱은 항상 슬래시 커맨드를 진입점으로 사용한다. 커맨드 본문이
 * 지식베이스 읽기 순서와 출력 마커 규약을 담고 있으므로, 앱은
 * 현재 상태와 사용자 발화만 얹으면 된다.
 *
 * 커맨드 정의: .claude/commands/ax-campaign.md
 */

import type { CampaignMeta, CampaignPlan } from '../types/campaign'
import type { ChatMessage } from '../store/useCampaign'

/** 앱이 기본으로 사용하는 슬래시 커맨드. */
export const DEFAULT_COMMAND = '/ax-campaign'

export interface PromptContext {
  meta: CampaignMeta
  plan: CampaignPlan
  messages: ChatMessage[]
  userInput: string
  /** 2단계에서 기획안 재생성을 요청하는 경우. */
  phase: 'intake' | 'plan' | 'revise'
}

/** 대화 이력을 CLI가 이해할 수 있는 평문으로 직렬화한다. */
function renderHistory(messages: ChatMessage[]): string {
  const recent = messages.filter((m) => m.role !== 'system').slice(-12)
  if (recent.length === 0) return '(없음)'

  return recent
    .map((m) => `${m.role === 'user' ? '매니저' : 'AI'}: ${m.text.trim()}`)
    .filter((line) => line.length > 5)
    .join('\n')
}

/** 아직 확정되지 않은 필수 항목을 CLI에 명시해 질문을 유도한다. */
function missingRequired(meta: CampaignMeta): string[] {
  const missing: string[] = []
  if (!meta.campaignName) missing.push('campaignName')
  if (!meta.product) missing.push('product')
  if (!meta.goal) missing.push('goal')
  if (!meta.startDate) missing.push('startDate')
  if (!meta.dueDate) missing.push('dueDate')
  if (!meta.assignee) missing.push('assignee')
  if (meta.target === 'TARGET' && !meta.targetSize) missing.push('targetSize')
  return missing
}

export function buildPrompt(ctx: PromptContext): string {
  const { meta, plan, messages, userInput, phase } = ctx

  const sections = [
    `${DEFAULT_COMMAND} ${phase}`,
    '',
    '## 현재 확정된 캠페인 정보',
    '```json',
    JSON.stringify(meta, null, 2),
    '```',
    '',
    `## 아직 확정되지 않은 필수 항목`,
    missingRequired(meta).join(', ') || '(없음 — 기획안 작성 단계로 진행 가능)',
    '',
    '## 대화 이력',
    renderHistory(messages),
    '',
    '## 매니저의 이번 발화',
    userInput.trim() || '(없음)',
  ]

  if (phase !== 'intake' && plan.assets.length > 0) {
    sections.push(
      '',
      '## 현재 기획안 (매니저가 편집했을 수 있음)',
      '```json',
      JSON.stringify({ summary: plan.summary, assets: plan.assets }, null, 2),
      '```',
    )
  }

  return sections.join('\n')
}
