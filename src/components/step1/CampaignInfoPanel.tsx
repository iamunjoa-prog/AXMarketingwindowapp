import { CheckCircle2, Circle, ArrowRight, AlertTriangle } from 'lucide-react'

import { useCampaign } from '../../store/useCampaign'
import { META_FIELDS, type CampaignMeta } from '../../types/campaign'
import { buildPrompt } from '../../lib/prompt'
import { runAgent } from '../../lib/agent'

/**
 * 대화 중 확정된 캠페인 정보가 실시간으로 채워지는 카드.
 * 사용자가 직접 수정할 수도 있으며, 수정값은 다음 프롬프트에 반영된다.
 */
export function CampaignInfoPanel() {
  const meta = useCampaign((s) => s.meta)
  const confirmed = useCampaign((s) => s.confirmed)
  const editMeta = useCampaign((s) => s.editMeta)
  const running = useCampaign((s) => s.running)

  const required = META_FIELDS.filter((f) => f.required)
  const filledRequired = required.filter((f) => isFilled(meta, f.key))
  const ready = filledRequired.length === required.length

  const generatePlan = async () => {
    const store = useCampaign.getState()
    const aiId = `a-${Date.now()}`
    store.pushMessage({ id: aiId, role: 'assistant', text: '', streaming: true })

    const prompt = buildPrompt({
      meta: store.meta,
      plan: store.plan,
      messages: store.messages,
      userInput: '위 정보로 기획안을 작성해 주세요.',
      phase: 'plan',
    })

    try {
      await runAgent(prompt, aiId)
      // 기획안이 실제로 생성된 경우에만 2단계로 넘어간다.
      if (useCampaign.getState().plan.assets.length > 0) {
        useCampaign.getState().setStep(2)
      }
    } catch (err) {
      useCampaign.getState().appendToMessage(aiId, `\n\n⚠️ 실행 실패: ${String(err)}`)
      useCampaign.getState().finishMessage(aiId)
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>캠페인 정보</h3>
        <span className="panel-count">
          {filledRequired.length}/{required.length} 필수
        </span>
      </div>

      <div className="panel-body">
        {META_FIELDS.map((field) => {
          const filled = isFilled(meta, field.key)
          const isConfirmed = confirmed.has(field.key)

          return (
            <div key={field.key} className={`field ${filled ? 'field-filled' : ''}`}>
              <label>
                {isConfirmed ? (
                  <CheckCircle2 size={13} className="ico-ok" />
                ) : (
                  <Circle size={13} className="ico-todo" />
                )}
                {field.label}
                {field.required && <span className="req">*</span>}
              </label>
              {renderInput(field.key, meta, editMeta)}
              {field.hint && !filled && <span className="hint">{field.hint}</span>}
            </div>
          )
        })}

        {meta.target === 'TARGET' && Number(meta.targetSize) > 800000 && (
          <p className="warn">
            <AlertTriangle size={13} /> 모수 80만 초과 — 시트 적재 시 자동 분할됩니다
          </p>
        )}
      </div>

      <div className="panel-foot">
        <button className="btn btn-primary" disabled={!ready || running} onClick={() => void generatePlan()}>
          기획안 생성 <ArrowRight size={14} />
        </button>
        {!ready && <p className="foot-hint">필수 항목이 모두 채워지면 활성화됩니다</p>}
      </div>
    </div>
  )
}

function isFilled(meta: CampaignMeta, key: keyof CampaignMeta): boolean {
  const value = meta[key]
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value)
}

function renderInput(
  key: keyof CampaignMeta,
  meta: CampaignMeta,
  edit: (patch: Partial<CampaignMeta>) => void,
) {
  if (key === 'target') {
    return (
      <select value={meta.target} onChange={(e) => edit({ target: e.target.value as 'MASS' | 'TARGET' })}>
        <option value="MASS">MASS (전고객)</option>
        <option value="TARGET">TARGET (조건 추출)</option>
      </select>
    )
  }

  if (key === 'hasCoupon') {
    return (
      <select value={meta.hasCoupon} onChange={(e) => edit({ hasCoupon: e.target.value as 'Y' | 'N' })}>
        <option value="N">없음</option>
        <option value="Y">지급</option>
      </select>
    )
  }

  if (key === 'startDate' || key === 'dueDate') {
    return <input type="date" value={meta[key]} onChange={(e) => edit({ [key]: e.target.value })} />
  }

  if (key === 'targetSize') {
    return (
      <input
        type="number"
        value={meta.targetSize}
        placeholder="0"
        onChange={(e) => edit({ targetSize: e.target.value })}
      />
    )
  }

  return (
    <input
      type="text"
      value={String(meta[key] ?? '')}
      onChange={(e) => edit({ [key]: e.target.value })}
    />
  )
}
