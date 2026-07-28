import { ASSET_LABELS, type CampaignAsset } from '../../types/campaign'

/**
 * 배너 시안 미리보기.
 *
 * 3단계에서 이 DOM을 html2canvas로 캡처해 Jira 첨부 이미지로 사용하므로,
 * 루트에 `data-preview-id`를 유지해야 한다.
 *
 * 뼈대 단계에서는 타입별 레이아웃 골격만 제공한다.
 * 실제 B tv UI 템플릿 반영은 후속 작업.
 */
export function BannerPreview({ asset }: { asset: CampaignAsset }) {
  const d = asset.data
  const str = (key: string) => String(d[key] ?? '')

  return (
    <div className="preview-wrap">
      <div className="preview-label">{ASSET_LABELS[asset.type] ?? asset.type} 시안</div>

      <div className={`preview preview-${asset.type.toLowerCase()}`} data-preview-id={asset.id}>
        {asset.type === 'TODAY_BTV' && (
          <div className="pv-today" style={bg(str('imageUrl'))}>
            <div className="pv-stack">
              <span className="pv-logo">{str('topText')}</span>
              <h4>{str('mainTitle')}</h4>
              <p>{str('subText')}</p>
              {str('buttonText') && <span className="pv-btn">{str('buttonText')}</span>}
            </div>
          </div>
        )}

        {asset.type === 'GENERAL_BANNER' && (
          <div className="pv-2col">
            <div className="pv-2col-preview" style={bg(str('previewImg'))}>
              <h4>{str('previewTitle')}</h4>
              <p>{str('previewSub')}</p>
            </div>
            <div className="pv-2col-banner" style={bg(str('bannerImg'))}>
              <span>{str('bannerCopy')}</span>
            </div>
          </div>
        )}

        {asset.type === 'FULL_PROMO_BANNER' && (
          <div className="pv-full" style={bg(str('bgImg'))}>
            <span className="pv-logo">{str('topLogo')}</span>
            <h4>{str('mainCopy')}</h4>
            <p>{str('subCopy')}</p>
            <div className="pv-cards">
              {[1, 2, 3].map((n) => (
                <div key={n} className="pv-card">
                  <strong>{str(`card${n}Title`)}</strong>
                  <span>{str(`card${n}Sub`)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {asset.type === 'BIG_BANNER' && (
          <div className="pv-big">
            <div className="pv-stack">
              <h4>{str('mainTitle')}</h4>
              <p>{str('subTitle')}</p>
              <small>{str('desc')}</small>
              {str('buttonText') && <span className="pv-btn">{str('buttonText')}</span>}
            </div>
            <div className="pv-big-img" style={bg(str('imageUrl'))} />
          </div>
        )}

        {asset.type === 'LONG_BANNER' && (
          <div className="pv-long" style={bg(str('imageUrl'))}>
            <h4>{str('copy')}</h4>
            <p>{str('subTitle')}</p>
          </div>
        )}

        {asset.type === 'STRIP_BANNER' && (
          <div className="pv-strip" style={bg(str('imageUrl'))}>
            <h4>{str('mainTitle')}</h4>
            <p>{str('subTitle')}</p>
          </div>
        )}

        {asset.type === 'SYNOPSIS_BANNER' && (
          <div className="pv-synopsis" style={bg(str('imageUrl'))}>
            <div className="pv-stack">
              <h4>{str('mainTitle')}</h4>
              <p>{str('subTitle')}</p>
            </div>
            {str('badgeText') && <span className="pv-badge">{str('badgeText')}</span>}
          </div>
        )}

        {asset.type === 'PROMO_POPUP' && (
          <div className="pv-popup">
            <div className="pv-popup-img" style={bg(str('imageUrl'))} />
            <div className="pv-popup-btns">
              <span className="pv-btn">{str('buttonText')}</span>
              <span className="pv-btn pv-btn-ghost">{str('closeText')}</span>
            </div>
          </div>
        )}

        {asset.type === 'MINI_EPG_BANNER' && (
          <div className="pv-epg" style={bg(str('imageUrl'))}>
            <span className="pv-btn">{str('buttonText')}</span>
          </div>
        )}
      </div>

      <div className="preview-meta">
        <span>{(d.gnb ?? []).join(', ') || 'GNB 미지정'}</span>
        <span>{String(d.landingValue ?? '') || '랜딩 미지정'}</span>
      </div>
    </div>
  )
}

function bg(url: string): React.CSSProperties {
  return url ? { backgroundImage: `url(${url})` } : {}
}
