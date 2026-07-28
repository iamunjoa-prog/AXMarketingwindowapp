/**
 * CLI 출력 스트림에서 구조화된 블록을 추출하는 파서.
 *
 * AI는 대화 도중 항목이 확정될 때마다 아래 마커로 감싼 JSON을 출력한다.
 * 앱은 이를 파싱해 기획 화면에 즉시 반영한다.
 *
 *   <<<AX:STATE>>>            확정된 캠페인 메타 (부분 patch, 여러 번 가능)
 *   { "product": "영화 PPV" }
 *   <<<AX:END>>>
 *
 *   <<<AX:PLAN>>>             기획안 전체 (summary / mermaidCode / assets)
 *   { ... }
 *   <<<AX:END>>>
 *
 * 마커 정의는 .claude/commands/marketing-plan.md 및
 * knowledge/api/campaign-assets-json.md와 동일하게 유지해야 한다.
 */

import type { CampaignMeta, CampaignPlan } from '../types/campaign'

const END = '<<<AX:END>>>'

export type Block =
  | { kind: 'state'; data: Partial<CampaignMeta> }
  | { kind: 'plan'; data: Partial<CampaignPlan> }

export interface ParseResult {
  /** 마커를 제거하고 사용자에게 보여줄 텍스트. */
  text: string
  blocks: Block[]
  /** 아직 닫히지 않은 블록. 다음 청크와 이어붙이기 위해 보관한다. */
  pending: string
}

const MARKERS: { start: string; kind: Block['kind'] }[] = [
  { start: '<<<AX:STATE>>>', kind: 'state' },
  { start: '<<<AX:PLAN>>>', kind: 'plan' },
]

/**
 * 누적 버퍼에서 완결된 블록을 모두 추출한다.
 * 스트리밍 중 블록이 잘릴 수 있으므로 미완결분은 `pending`으로 돌려준다.
 */
export function parseStream(buffer: string): ParseResult {
  let rest = buffer
  let text = ''
  const blocks: Block[] = []

  for (;;) {
    // 가장 앞에 등장하는 시작 마커를 찾는다.
    let best: { index: number; marker: (typeof MARKERS)[number] } | null = null
    for (const marker of MARKERS) {
      const index = rest.indexOf(marker.start)
      if (index !== -1 && (best === null || index < best.index)) {
        best = { index, marker }
      }
    }

    if (!best) {
      text += rest
      return { text, blocks, pending: '' }
    }

    text += rest.slice(0, best.index)
    const afterStart = rest.slice(best.index + best.marker.start.length)
    const endIndex = afterStart.indexOf(END)

    if (endIndex === -1) {
      // 블록이 아직 닫히지 않았다. 시작 마커부터 통째로 보류한다.
      return { text, blocks, pending: rest.slice(best.index) }
    }

    const raw = afterStart.slice(0, endIndex)
    const parsed = safeParse(raw)
    if (parsed !== null) {
      blocks.push({ kind: best.marker.kind, data: parsed } as Block)
    }

    rest = afterStart.slice(endIndex + END.length)
  }
}

/** 코드펜스나 앞뒤 잡텍스트가 섞여 있어도 JSON을 최대한 건져낸다. */
function safeParse(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```(?:json)?/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null

  try {
    const value = JSON.parse(cleaned.slice(start, end + 1))
    return typeof value === 'object' && value !== null ? value : null
  } catch {
    return null
  }
}
