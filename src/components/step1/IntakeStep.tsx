import { ChatPanel } from './ChatPanel'
import { CampaignInfoPanel } from './CampaignInfoPanel'

/**
 * 1단계 — 캠페인 정보.
 *
 * 좌측에서 AI와 대화하고, 항목이 확정될 때마다 우측 기획 카드가 실시간으로 채워진다.
 * 우측에서 직접 수정한 값도 다음 프롬프트에 그대로 반영된다.
 */
export function IntakeStep() {
  return (
    <div className="split">
      <section className="split-main">
        <ChatPanel />
      </section>
      <aside className="split-side">
        <CampaignInfoPanel />
      </aside>
    </div>
  )
}
