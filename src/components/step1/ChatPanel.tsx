import { useEffect, useRef, useState } from 'react'
import { Send, Square, Sparkles } from 'lucide-react'

import { useCampaign } from '../../store/useCampaign'
import { runAgent, cancelAgent } from '../../lib/agent'
import { buildPrompt } from '../../lib/prompt'

/** AI와의 대화창. 확정된 항목은 우측 패널에 즉시 반영된다. */
export function ChatPanel() {
  const [input, setInput] = useState('')
  const messages = useCampaign((s) => s.messages)
  const running = useCampaign((s) => s.running)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || running) return

    const store = useCampaign.getState()
    const userId = `u-${Date.now()}`
    const aiId = `a-${Date.now()}`

    store.pushMessage({ id: userId, role: 'user', text })
    store.pushMessage({ id: aiId, role: 'assistant', text: '', streaming: true })
    setInput('')

    const prompt = buildPrompt({
      meta: store.meta,
      plan: store.plan,
      messages: store.messages,
      userInput: text,
      phase: 'intake',
    })

    try {
      await runAgent(prompt, aiId)
    } catch (err) {
      useCampaign.getState().appendToMessage(aiId, `\n\n⚠️ 실행 실패: ${String(err)}`)
      useCampaign.getState().finishMessage(aiId)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 전송, Shift+Enter 줄바꿈
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className="chat">
      <div className="chat-log" ref={scrollRef}>
        {messages.length === 0 && <EmptyState onPick={setInput} />}

        {messages.map((m) => (
          <div key={m.id} className={`bubble bubble-${m.role}`}>
            <div className="bubble-role">{m.role === 'user' ? '나' : 'AI'}</div>
            <div className="bubble-text">
              {m.text}
              {m.streaming && <span className="caret" />}
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          placeholder="캠페인 조건을 입력하세요. 예) 8월 첫째주에 영화 PPV 할인쿠폰 프로모션 하려고 해"
        />
        {running ? (
          <button className="btn btn-stop" onClick={() => void cancelAgent()}>
            <Square size={14} /> 중지
          </button>
        ) : (
          <button className="btn btn-send" onClick={() => void send()} disabled={!input.trim()}>
            <Send size={14} /> 전송
          </button>
        )}
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  '8월 첫째주에 영화 PPV 할인쿠폰 프로모션 기획해줘',
  'B tv+ 신규 가입 늘리려는데 어떤 스킴이 좋을까?',
  '월정액 해지방어 캠페인, 타겟 20만 규모로 잡아줘',
]

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="empty">
      <Sparkles size={28} className="empty-icon" />
      <h2>캠페인 기획을 시작합니다</h2>
      <p>
        조건을 말씀해 주시면 지식베이스를 참고해 기획안을 제안합니다.
        <br />
        확정된 항목은 오른쪽 카드에 자동으로 채워집니다.
      </p>
      <div className="empty-chips">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chip" onClick={() => onPick(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
