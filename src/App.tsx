import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'

import { StepNav } from './components/StepNav'
import { SettingsBar } from './components/SettingsBar'
import { IntakeStep } from './components/step1/IntakeStep'
import { PlanStep } from './components/step2/PlanStep'
import { ExportStep } from './components/step3/ExportStep'
import { useCampaign } from './store/useCampaign'
import { detectCli } from './lib/agent'
import './App.css'

export default function App() {
  const step = useCampaign((s) => s.step)
  const setSettings = useCampaign((s) => s.setSettings)
  const setJiraReady = useCampaign((s) => s.setJiraReady)

  // 설치된 CLI를 탐지해 기본값을 잡는다.
  useEffect(() => {
    detectCli()
      .then((list) => {
        const preferred =
          list.find((c) => c.kind === 'claude' && c.found) ?? list.find((c) => c.found)
        if (preferred) {
          setSettings({ cliKind: preferred.kind, binaryPath: preferred.path ?? '' })
        }
      })
      .catch((err) => console.error('CLI 탐지 실패', err))
  }, [setSettings])

  // Jira 웹뷰 브리지 준비 신호.
  useEffect(() => {
    const un = listen('jira://ready', () => setJiraReady(true))
    return () => {
      un.then((f) => f())
    }
  }, [setJiraReady])

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">AX</span>
          <span className="brand-text">마케팅 자동화</span>
        </div>
        <StepNav />
        <SettingsBar />
      </header>

      <main className="app-body">
        {step === 1 && <IntakeStep />}
        {step === 2 && <PlanStep />}
        {step === 3 && <ExportStep />}
      </main>
    </div>
  )
}
