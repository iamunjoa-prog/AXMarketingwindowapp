import { useState } from 'react'
import { ArrowRight, RefreshCw, Trash2, Plus } from 'lucide-react'

import { useCampaign } from '../../store/useCampaign'
import { ASSET_LABELS, TARGETING_UNSUPPORTED, type AssetType } from '../../types/campaign'
import { AssetEditor } from './AssetEditor'
import { BannerPreview } from './BannerPreview'
import { buildPrompt } from '../../lib/prompt'
import { runAgent } from '../../lib/agent'

/**
 * 2단계 — 기획안 확인.
 *
 * 좌측에 배너 탭, 가운데 시안 미리보기, 우측에 카피/랜딩 편집 폼.
 * 편집한 값은 3단계 출력과 Jira/시트 적재에 그대로 사용된다.
 */
export function PlanStep() {
  const plan = useCampaign((s) => s.plan)
  const meta = useCampaign((s) => s.meta)
  const removeAsset = useCampaign((s) => s.removeAsset)
  const setStep = useCampaign((s) => s.setStep)
  const running = useCampaign((s) => s.running)

  const [activeId, setActiveId] = useState(plan.assets[0]?.id ?? '')
  const active = plan.assets.find((a) => a.id === activeId) ?? plan.assets[0]

  const revise = async () => {
    const store = useCampaign.getState()
    const aiId = `a-${Date.now()}`
    store.pushMessage({ id: aiId, role: 'assistant', text: '', streaming: true })
    const prompt = buildPrompt({
      meta: store.meta,
      plan: store.plan,
      messages: store.messages,
      userInput: '현재 기획안을 검토하고 개선안을 반영해 주세요.',
      phase: 'revise',
    })
    try {
      await runAgent(prompt, aiId)
    } catch (err) {
      useCampaign.getState().appendToMessage(aiId, `\n\n⚠️ 실행 실패: ${String(err)}`)
      useCampaign.getState().finishMessage(aiId)
    }
  }

  if (plan.assets.length === 0) {
    return (
      <div className="empty">
        <h2>아직 기획안이 없습니다</h2>
        <p>1단계에서 캠페인 정보를 확정한 뒤 기획안을 생성해 주세요.</p>
        <button className="btn" onClick={() => setStep(1)}>
          1단계로 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="plan">
      <aside className="plan-tabs">
        <div className="plan-tabs-head">
          <span>배너 {plan.assets.length}건</span>
          <button className="icon-btn" title="배너 추가 (준비 중)" disabled>
            <Plus size={14} />
          </button>
        </div>

        {plan.assets.map((asset) => {
          const invalid =
            meta.target === 'TARGET' && TARGETING_UNSUPPORTED.includes(asset.type as AssetType)

          return (
            <button
              key={asset.id}
              className={`plan-tab ${asset.id === active?.id ? 'is-active' : ''} ${invalid ? 'is-invalid' : ''}`}
              onClick={() => setActiveId(asset.id)}
            >
              <span className="plan-tab-type">{ASSET_LABELS[asset.type] ?? asset.type}</span>
              <span className="plan-tab-name">{asset.name}</span>
              {invalid && <span className="plan-tab-warn">타겟팅 불가 구좌</span>}
              <span
                className="icon-btn plan-tab-del"
                onClick={(e) => {
                  e.stopPropagation()
                  removeAsset(asset.id)
                }}
              >
                <Trash2 size={12} />
              </span>
            </button>
          )
        })}
      </aside>

      <section className="plan-preview">
        {plan.summary && <div className="plan-summary">{plan.summary}</div>}
        {active && <BannerPreview asset={active} />}
      </section>

      <aside className="plan-form">
        {active && <AssetEditor asset={active} />}
        <div className="plan-actions">
          <button className="btn" onClick={() => void revise()} disabled={running}>
            <RefreshCw size={14} /> AI 재검토
          </button>
          <button className="btn btn-primary" onClick={() => setStep(3)}>
            최종 출력 <ArrowRight size={14} />
          </button>
        </div>
      </aside>
    </div>
  )
}
