import { Check } from 'lucide-react'

import { useCampaign } from '../store/useCampaign'
import { STEPS, type StepId } from '../types/campaign'

/** 3단계 진행 표시. 이미 지난 단계로는 되돌아갈 수 있다. */
export function StepNav() {
  const step = useCampaign((s) => s.step)
  const setStep = useCampaign((s) => s.setStep)
  const hasPlan = useCampaign((s) => s.plan.assets.length > 0)

  const canEnter = (id: StepId) => {
    if (id === 1) return true
    if (id === 2) return hasPlan || step >= 2
    return hasPlan && step >= 2
  }

  return (
    <nav className="step-nav">
      {STEPS.map(({ id, label, desc }) => {
        const state = id < step ? 'done' : id === step ? 'active' : 'todo'
        const enabled = canEnter(id)

        return (
          <button
            key={id}
            className={`step-item step-${state}`}
            disabled={!enabled}
            onClick={() => enabled && setStep(id)}
            title={desc}
          >
            <span className="step-badge">{state === 'done' ? <Check size={13} /> : id}</span>
            <span className="step-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
