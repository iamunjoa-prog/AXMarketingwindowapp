import { useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { Settings, Folder, Circle } from 'lucide-react'

import { useCampaign } from '../store/useCampaign'

/** 상단 우측 설정. CLI 백엔드와 작업 디렉터리를 지정한다. */
export function SettingsBar() {
  const [open_, setOpen] = useState(false)
  const settings = useCampaign((s) => s.settings)
  const setSettings = useCampaign((s) => s.setSettings)
  const jiraReady = useCampaign((s) => s.jiraReady)

  const pickDir = async () => {
    const dir = await open({ directory: true, multiple: false })
    if (typeof dir === 'string') setSettings({ workspaceDir: dir })
  }

  return (
    <div className="settings">
      <span className={`dot ${settings.binaryPath ? 'dot-ok' : 'dot-off'}`} title="CLI 연결 상태">
        <Circle size={7} /> {settings.cliKind}
      </span>
      <span className={`dot ${jiraReady ? 'dot-ok' : 'dot-off'}`} title="Jira 세션 상태">
        <Circle size={7} /> Jira
      </span>

      <button className="icon-btn" onClick={() => setOpen((v) => !v)} title="설정">
        <Settings size={15} />
      </button>

      {open_ && (
        <div className="popover">
          <div className="field">
            <label>AI CLI</label>
            <select
              value={settings.cliKind}
              onChange={(e) => setSettings({ cliKind: e.target.value as 'claude' | 'codex' })}
            >
              <option value="claude">Claude Code</option>
              <option value="codex">Codex</option>
            </select>
          </div>

          <div className="field">
            <label>실행 파일 경로</label>
            <input
              type="text"
              value={settings.binaryPath}
              placeholder="자동 탐지됨"
              onChange={(e) => setSettings({ binaryPath: e.target.value })}
            />
          </div>

          <div className="field">
            <label>지식베이스 폴더</label>
            <div className="row-inline">
              <input
                type="text"
                value={settings.workspaceDir}
                placeholder="저장소 루트를 지정하세요"
                onChange={(e) => setSettings({ workspaceDir: e.target.value })}
              />
              <button className="icon-btn" onClick={() => void pickDir()}>
                <Folder size={14} />
              </button>
            </div>
          </div>

          <div className="field">
            <label>Jira 프로젝트 키</label>
            <input
              type="text"
              value={settings.jiraProjectKey}
              onChange={(e) => setSettings({ jiraProjectKey: e.target.value })}
            />
          </div>

          <div className="field">
            <label>프록시 URL</label>
            <input
              type="text"
              value={settings.proxyBaseUrl}
              placeholder="기본값 사용"
              onChange={(e) => setSettings({ proxyBaseUrl: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
