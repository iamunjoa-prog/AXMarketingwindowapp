/**
 * 앱 전역 상태.
 *
 * 대화(1단계)에서 확정된 값이 즉시 기획 화면에 반영되도록,
 * CLI 스트림 파서가 내보낸 블록을 그대로 이 스토어에 병합한다.
 */

import { create } from 'zustand'
import {
  EMPTY_META,
  EMPTY_PLAN,
  type CampaignAsset,
  type CampaignMeta,
  type CampaignPlan,
  type StepId,
} from '../types/campaign'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  /** 스트리밍이 끝나지 않은 메시지. */
  streaming?: boolean
}

export interface Settings {
  cliKind: 'claude' | 'codex'
  binaryPath: string
  /** 지식베이스가 있는 저장소 루트. CLI의 작업 디렉터리로 쓰인다. */
  workspaceDir: string
  proxyBaseUrl: string
  jiraProjectKey: string
}

export const DEFAULT_SETTINGS: Settings = {
  cliKind: 'claude',
  binaryPath: '',
  workspaceDir: '',
  proxyBaseUrl: '',
  jiraProjectKey: 'BTVMKT',
}

interface CampaignState {
  step: StepId
  meta: CampaignMeta
  /** 대화를 통해 확정된 필드 키. 기획 화면의 확정 배지에 쓰인다. */
  confirmed: Set<keyof CampaignMeta>
  plan: CampaignPlan
  messages: ChatMessage[]
  running: boolean
  sessionId: string | null
  settings: Settings
  jiraReady: boolean

  setStep: (step: StepId) => void
  /** 사용자가 폼에서 직접 수정한 경우. 확정 표시도 함께 켠다. */
  editMeta: (patch: Partial<CampaignMeta>) => void
  /** AI 스트림이 보낸 확정 patch를 병합한다. */
  applyStatePatch: (patch: Partial<CampaignMeta>) => void
  applyPlanPatch: (patch: Partial<CampaignPlan>) => void
  updateAsset: (id: string, patch: Partial<CampaignAsset['data']>) => void
  removeAsset: (id: string) => void
  addAsset: (asset: CampaignAsset) => void

  pushMessage: (msg: ChatMessage) => void
  appendToMessage: (id: string, text: string) => void
  finishMessage: (id: string) => void

  setRunning: (running: boolean, sessionId?: string | null) => void
  setSettings: (patch: Partial<Settings>) => void
  setJiraReady: (ready: boolean) => void
  reset: () => void
}

export const useCampaign = create<CampaignState>((set) => ({
  step: 1,
  meta: { ...EMPTY_META },
  confirmed: new Set(),
  plan: { ...EMPTY_PLAN },
  messages: [],
  running: false,
  sessionId: null,
  settings: { ...DEFAULT_SETTINGS },
  jiraReady: false,

  setStep: (step) => set({ step }),

  editMeta: (patch) =>
    set((s) => ({
      meta: { ...s.meta, ...patch },
      confirmed: mergeConfirmed(s.confirmed, patch),
    })),

  applyStatePatch: (patch) =>
    set((s) => {
      // 빈 문자열은 "미확정"으로 취급해 기존 값을 덮어쓰지 않는다.
      const clean = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== '' && v !== null && v !== undefined),
      ) as Partial<CampaignMeta>

      return {
        meta: { ...s.meta, ...clean },
        confirmed: mergeConfirmed(s.confirmed, clean),
      }
    }),

  applyPlanPatch: (patch) =>
    set((s) => ({
      plan: {
        ...s.plan,
        ...patch,
        assets: patch.assets ? normalizeAssets(patch.assets) : s.plan.assets,
      },
    })),

  updateAsset: (id, patch) =>
    set((s) => ({
      plan: {
        ...s.plan,
        assets: s.plan.assets.map((a) =>
          a.id === id ? { ...a, data: { ...a.data, ...patch } } : a,
        ),
      },
    })),

  removeAsset: (id) =>
    set((s) => ({
      plan: { ...s.plan, assets: s.plan.assets.filter((a) => a.id !== id) },
    })),

  addAsset: (asset) =>
    set((s) => ({ plan: { ...s.plan, assets: [...s.plan.assets, asset] } })),

  pushMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  appendToMessage: (id, text) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, text: m.text + text } : m)),
    })),

  finishMessage: (id) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, streaming: false } : m)),
    })),

  setRunning: (running, sessionId) =>
    set((s) => ({ running, sessionId: sessionId !== undefined ? sessionId : s.sessionId })),

  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  setJiraReady: (jiraReady) => set({ jiraReady }),

  reset: () =>
    set({
      step: 1,
      meta: { ...EMPTY_META },
      confirmed: new Set(),
      plan: { ...EMPTY_PLAN },
      messages: [],
      running: false,
      sessionId: null,
    }),
}))

function mergeConfirmed(
  current: Set<keyof CampaignMeta>,
  patch: Partial<CampaignMeta>,
): Set<keyof CampaignMeta> {
  const next = new Set(current)
  for (const key of Object.keys(patch) as (keyof CampaignMeta)[]) {
    next.add(key)
  }
  return next
}

/** AI가 id를 주지 않을 수 있으므로 안정적인 식별자를 부여한다. */
function normalizeAssets(assets: CampaignAsset[]): CampaignAsset[] {
  const stamp = Date.now()
  return assets.map((asset, index) => ({
    ...asset,
    id: asset.id || `asset-${index}-${stamp}`,
    data: {
      ...asset.data,
      landingValue: asset.data?.landingValue ?? '',
      gnb: Array.isArray(asset.data?.gnb)
        ? asset.data.gnb
        : asset.data?.gnb
          ? [String(asset.data.gnb)]
          : [],
    },
  }))
}
