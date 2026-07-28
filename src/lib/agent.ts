/**
 * CLI 에이전트 실행 래퍼.
 *
 * Rust의 `run_agent`를 호출하고 `agent://*` 이벤트를 구독해
 * 텍스트는 채팅창에, 구조화 블록은 스토어에 반영한다.
 */

import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

import { parseStream } from './protocol'
import { useCampaign } from '../store/useCampaign'
import type { CampaignMeta, CampaignPlan } from '../types/campaign'

interface ChunkEvent {
  session_id: string
  stream: 'stdout' | 'stderr'
  text: string
}

interface DoneEvent {
  session_id: string
  code: number | null
}

interface ErrorEvent {
  session_id: string
  message: string
}

export interface CliInfo {
  kind: 'claude' | 'codex'
  found: boolean
  path: string | null
}

export function detectCli(): Promise<CliInfo[]> {
  return invoke<CliInfo[]>('detect_cli')
}

/**
 * 프롬프트를 실행한다. 완료(또는 실패) 시 resolve된다.
 * 스트리밍 중 파싱된 블록은 즉시 스토어에 반영되므로 별도 처리가 필요 없다.
 */
export async function runAgent(prompt: string, messageId: string): Promise<void> {
  const store = useCampaign.getState()
  const { settings } = store
  const sessionId = `s-${Date.now()}`

  // 스트림이 청크 단위로 잘려 들어오므로 미완결 블록을 버퍼에 보관한다.
  let pending = ''
  const unlisteners: UnlistenFn[] = []

  const cleanup = () => {
    for (const un of unlisteners) un()
  }

  return new Promise<void>((resolve, reject) => {
    const handleChunk = (payload: ChunkEvent) => {
      if (payload.session_id !== sessionId) return

      if (payload.stream === 'stderr') {
        // CLI 진단 로그는 대화에 섞지 않고 콘솔로만 흘린다.
        console.warn('[agent stderr]', payload.text)
        return
      }

      const { text, blocks, pending: rest } = parseStream(pending + payload.text + '\n')
      pending = rest

      if (text) {
        useCampaign.getState().appendToMessage(messageId, text)
      }

      for (const block of blocks) {
        if (block.kind === 'state') {
          useCampaign.getState().applyStatePatch(block.data as Partial<CampaignMeta>)
        } else {
          useCampaign.getState().applyPlanPatch(block.data as Partial<CampaignPlan>)
        }
      }
    }

    Promise.all([
      listen<ChunkEvent>('agent://chunk', (e) => handleChunk(e.payload)),
      listen<DoneEvent>('agent://done', (e) => {
        if (e.payload.session_id !== sessionId) return
        // 남은 버퍼는 일반 텍스트로 흘려보낸다.
        if (pending) {
          useCampaign.getState().appendToMessage(messageId, pending)
          pending = ''
        }
        useCampaign.getState().finishMessage(messageId)
        useCampaign.getState().setRunning(false, null)
        cleanup()
        resolve()
      }),
      listen<ErrorEvent>('agent://error', (e) => {
        if (e.payload.session_id !== sessionId) return
        useCampaign.getState().finishMessage(messageId)
        useCampaign.getState().setRunning(false, null)
        cleanup()
        reject(new Error(e.payload.message))
      }),
    ])
      .then((uns) => {
        unlisteners.push(...uns)
        useCampaign.getState().setRunning(true, sessionId)

        return invoke('run_agent', {
          args: {
            session_id: sessionId,
            kind: settings.cliKind,
            binary_path: settings.binaryPath || null,
            prompt,
            cwd: settings.workspaceDir || null,
            extra_args: null,
          },
        })
      })
      .catch((err) => {
        useCampaign.getState().setRunning(false, null)
        cleanup()
        reject(err instanceof Error ? err : new Error(String(err)))
      })
  })
}

export async function cancelAgent(): Promise<void> {
  const { sessionId } = useCampaign.getState()
  if (!sessionId) return
  await invoke('cancel_agent', { sessionId })
  useCampaign.getState().setRunning(false, null)
}
