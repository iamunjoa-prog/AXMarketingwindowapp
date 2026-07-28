import { useCampaign } from '../../store/useCampaign'
import { GNB_OPTIONS, type CampaignAsset } from '../../types/campaign'
import { FIELD_SCHEMA, type FieldDef } from './fieldSchema'

/**
 * 선택된 배너의 카피·랜딩·편성 정보를 편집한다.
 * 필드 구성은 배너 타입별 스키마(fieldSchema.ts)에서 가져온다.
 */
export function AssetEditor({ asset }: { asset: CampaignAsset }) {
  const updateAsset = useCampaign((s) => s.updateAsset)
  const fields = FIELD_SCHEMA[asset.type] ?? []

  const set = (key: string, value: unknown) => updateAsset(asset.id, { [key]: value })

  return (
    <div className="editor">
      <h3 className="editor-title">{asset.name}</h3>

      {fields.map((field) => (
        <Field key={field.key} field={field} value={asset.data[field.key]} onChange={set} />
      ))}

      <div className="field">
        <label>
          랜딩 <span className="req">*</span>
        </label>
        <input
          type="text"
          value={String(asset.data.landingValue ?? '')}
          placeholder="UI_PATH: /synopsis"
          onChange={(e) => set('landingValue', e.target.value)}
        />
      </div>

      <div className="field">
        <label>편성 GNB</label>
        <div className="gnb-grid">
          {GNB_OPTIONS.map((gnb) => {
            const selected = (asset.data.gnb ?? []).includes(gnb)
            return (
              <button
                key={gnb}
                className={`gnb-chip ${selected ? 'is-on' : ''}`}
                onClick={() => {
                  const current = asset.data.gnb ?? []
                  set('gnb', selected ? current.filter((g) => g !== gnb) : [...current, gnb])
                }}
              >
                {gnb}
              </button>
            )
          })}
        </div>
      </div>

      <div className="field">
        <label>메모</label>
        <textarea
          rows={2}
          value={String(asset.data.note ?? '')}
          onChange={(e) => set('note', e.target.value)}
        />
      </div>
    </div>
  )
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: unknown
  onChange: (key: string, value: unknown) => void
}) {
  const text = String(value ?? '')
  const over = field.maxLength !== undefined && text.length > field.maxLength

  return (
    <div className="field">
      <label>
        {field.label}
        {field.maxLength !== undefined && (
          <span className={`counter ${over ? 'is-over' : ''}`}>
            {text.length}/{field.maxLength}
          </span>
        )}
      </label>
      {field.multiline ? (
        <textarea rows={2} value={text} onChange={(e) => onChange(field.key, e.target.value)} />
      ) : (
        <input
          type="text"
          value={text}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      )}
      {over && <span className="warn-text">규격 초과 — 편성 시 잘릴 수 있습니다</span>}
    </div>
  )
}
