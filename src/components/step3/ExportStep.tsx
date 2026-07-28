import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Camera, ExternalLink, LogIn, Rocket, CheckCircle2 } from 'lucide-react'
import html2canvas from 'html2canvas'

import { useCampaign } from '../../store/useCampaign'
import { buildJiraPayload, buildSheetRows } from '../../lib/export'

type Phase = 'idle' | 'capturing' | 'jira' | 'sheets' | 'done' | 'error'

/**
 * 3단계 — 최종 출력.
 *
 * 시안 캡처 → Jira 일감 계층 생성 → 구글시트 적재를 순서대로 실행한다.
 * 기존 Chrome 확장프로그램이 하던 일을 앱 안에서 그대로 수행한다.
 */
export function ExportStep() {
  const meta = useCampaign((s) => s.meta)
  const plan = useCampaign((s) => s.plan)
  const settings = useCampaign((s) => s.settings)
  const jiraReady = useCampaign((s) => s.jiraReady)

  const [phase, setPhase] = useState<Phase>('idle')
  const [log, setLog] = useState<string[]>([])
  const [parentKey, setParentKey] = useState('')

  const say = (line: string) => setLog((l) => [...l, line])

  /** 각 배너 시안 DOM을 PNG data URL로 캡처한다. */
  const captureAll = async (): Promise<Record<string, string>> => {
    const shots: Record<string, string> = {}
    for (const asset of plan.assets) {
      const el = document.querySelector<HTMLElement>(`[data-preview-id="${asset.id}"]`)
      if (!el) continue
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null })
      shots[asset.id] = canvas.toDataURL('image/png')
    }
    return shots
  }

  const run = async () => {
    setLog([])
    setParentKey('')

    try {
      setPhase('capturing')
      say('시안을 캡처하는 중...')
      const shots = await captureAll()
      say(`시안 ${Object.keys(shots).length}건 캡처 완료`)

      setPhase('jira')
      say('Jira 상위 일감을 생성하는 중...')
      const payload = buildJiraPayload(meta, plan, settings.jiraProjectKey)

      const parent = await invoke<{ key: string }>('jira_request', {
        args: { method: 'POST', path: '/rest/api/2/issue', body: { fields: payload.parentFields } },
      })
      setParentKey(parent.key)
      say(`상위 일감 생성 완료: ${parent.key}`)

      say('하위 일감을 일괄 생성하는 중...')
      const bulk = await invoke<{ issues: { key: string }[] }>('jira_request', {
        args: {
          method: 'POST',
          path: '/rest/api/2/issue/bulk',
          body: { issueUpdates: payload.childUpdates(parent.key) },
        },
      })
      const childKeys = (bulk.issues ?? []).map((i) => i.key)
      say(`하위 일감 ${childKeys.length}건 생성 완료`)

      // 시안 첨부
      for (let i = 0; i < plan.assets.length; i++) {
        const asset = plan.assets[i]
        const key = childKeys[i]
        const dataUrl = shots[asset.id]
        if (!key || !dataUrl) continue

        await invoke('jira_attach', {
          args: {
            issue_key: key,
            filename: `${asset.type}-preview.png`,
            mime: 'image/png',
            base64: dataUrl.split(',')[1],
          },
        })
        say(`시안 첨부: ${key}`)
      }

      setPhase('sheets')
      say('구글시트에 캠페인 로그를 적재하는 중...')
      const rows = buildSheetRows(meta, plan, parent.key, childKeys)
      await invoke('sheets_bulk_insert', {
        args: { base_url: settings.proxyBaseUrl || null, rows },
      })
      say(`시트 ${rows.length}행 적재 완료`)

      setPhase('done')
      say('모든 작업이 완료되었습니다.')
    } catch (err) {
      setPhase('error')
      say(`오류: ${String(err)}`)
    }
  }

  const busy = phase === 'capturing' || phase === 'jira' || phase === 'sheets'

  return (
    <div className="export">
      <div className="export-card">
        <h2>최종 출력</h2>
        <p className="export-sub">
          시안을 캡처하고 Jira 일감과 구글시트에 적재합니다.
        </p>

        <dl className="export-summary">
          <div>
            <dt>캠페인</dt>
            <dd>{meta.campaignName || '—'}</dd>
          </div>
          <div>
            <dt>기간</dt>
            <dd>
              {meta.startDate || '—'} ~ {meta.dueDate || '—'}
            </dd>
          </div>
          <div>
            <dt>타겟</dt>
            <dd>
              {meta.target}
              {meta.target === 'TARGET' && meta.targetSize
                ? ` · ${Number(meta.targetSize).toLocaleString()}명`
                : ''}
            </dd>
          </div>
          <div>
            <dt>배너</dt>
            <dd>{plan.assets.length}건</dd>
          </div>
        </dl>

        {!jiraReady && (
          <div className="notice">
            <LogIn size={15} />
            <div>
              <strong>Jira 로그인이 필요합니다</strong>
              <p>사내 Jira 창을 열어 로그인하면 일감 생성이 활성화됩니다.</p>
            </div>
            <button className="btn" onClick={() => void invoke('open_jira_login')}>
              로그인 창 열기
            </button>
          </div>
        )}

        <button className="btn btn-primary btn-lg" onClick={() => void run()} disabled={busy || !jiraReady}>
          {busy ? <Camera size={15} /> : <Rocket size={15} />}
          {busy ? '실행 중...' : '실행'}
        </button>

        {log.length > 0 && (
          <ul className="export-log">
            {log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}

        {phase === 'done' && parentKey && (
          <div className="export-done">
            <CheckCircle2 size={16} />
            <span>{parentKey}</span>
            <button
              className="btn"
              onClick={() =>
                void invoke('open_jira_login').then(() =>
                  window.open(`https://jira.skbroadband.com/browse/${parentKey}`, '_blank'),
                )
              }
            >
              Jira에서 보기 <ExternalLink size={13} />
            </button>
          </div>
        )}
      </div>

      {/* 캡처 대상. 화면 밖에 렌더링해 두어야 html2canvas가 잡을 수 있다. */}
      <div className="capture-stage" aria-hidden />
    </div>
  )
}
