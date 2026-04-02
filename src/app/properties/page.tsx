'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'

const STORAGE_KEY = 'pcis_properties'
const URL_STORAGE_KEY = 'pcis_property_urls'

interface Property {
  id: string
  title: string
  price?: string
  bedrooms?: string
  bathrooms?: string
  area?: string
  size?: string
  location?: string
  type?: string
  description?: string
  imageUrl?: string
  sourceUrl?: string
  addedAt: string
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [backendProperties, setBackendProperties] = useState<any[]>([])
  const [urls, setUrls] = useState<string[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState('')
  const [scrapeSuccess, setScrapeSuccess] = useState('')
  const [showAddManual, setShowAddManual] = useState(false)
  const [filter, setFilter] = useState<'all' | 'scraped' | 'backend'>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  // Load from localStorage + backend on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setProperties(JSON.parse(stored))
      const storedUrls = localStorage.getItem(URL_STORAGE_KEY)
      if (storedUrls) setUrls(JSON.parse(storedUrls))
    } catch {}

    api.getProperties().then((d: any) => {
      setBackendProperties(Array.isArray(d) ? d : [])
    }).catch(() => {})
  }, [])

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(properties))
      localStorage.setItem(URL_STORAGE_KEY, JSON.stringify(urls))
    } catch {}
  }, [properties, urls])

  // Combined properties
  const backendMapped = backendProperties.map((p: any, i: number) => ({
    id: p.id || `backend-${i}`,
    title: p.name || p.title || p.propertyType || 'Property',
    price: p.priceRange || (p.priceMin ? `AED ${p.priceMin} - ${p.priceMax}` : undefined),
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    area: p.area,
    size: p.size,
    location: p.area || p.location,
    type: p.propertyType || p.type,
    description: p.description,
    sourceUrl: undefined,
    addedAt: p.createdAt || '',
  }))

  const allProperties = [...properties, ...backendMapped]
  const filtered = filter === 'scraped' ? properties : filter === 'backend' ? backendMapped : allProperties

  // ============================================================
  // SCRAPING
  // ============================================================
  async function handleScrape() {
    const url = urlInput.trim()
    if (!url) return
    if (!url.startsWith('http')) {
      setScrapeError('Please enter a full URL starting with https://')
      return
    }

    setScraping(true)
    setScrapeError('')
    setScrapeSuccess('')

    try {
      const scraped = await scrapeListings(url)

      if (scraped.length === 0) {
        setScrapeError('No properties found on this page. Try a listing page or agent profile URL, or add properties manually.')
        setScraping(false)
        return
      }

      // Deduplicate
      const existingTitles = new Set(properties.map(p => p.title.toLowerCase()))
      const newProps = scraped.filter(p => !existingTitles.has(p.title.toLowerCase()))

      if (newProps.length > 0) {
        setProperties(prev => [...newProps, ...prev])
        setScrapeSuccess(`Found ${newProps.length} new propert${newProps.length === 1 ? 'y' : 'ies'} — syncing to AI...`)

        // Sync each new property to the backend so the AI knows about them
        let synced = 0
        for (const prop of newProps) {
          try {
            await api.addProperty({
              title: prop.title,
              propertyType: prop.type,
              area: prop.location,
              bedrooms: prop.bedrooms,
              bathrooms: prop.bathrooms,
              size: prop.size,
              price: prop.price,
              description: prop.description,
              sourceUrl: prop.sourceUrl,
            })
            synced++
          } catch {}
        }
        setScrapeSuccess(`Found ${newProps.length} propert${newProps.length === 1 ? 'y' : 'ies'} — ${synced} synced to your AI`)
      } else {
        setScrapeSuccess('All properties from this page are already in your list.')
      }

      if (!urls.includes(url)) setUrls(prev => [url, ...prev])
      setUrlInput('')
    } catch (err: any) {
      setScrapeError(err.message || 'Failed to fetch page. The site may be blocking access.')
    }

    setScraping(false)
    setTimeout(() => setScrapeSuccess(''), 5000)
  }

  function removeProperty(id: string) {
    setProperties(prev => prev.filter(p => p.id !== id))
    // Sync delete to backend
    api.deleteProperty(id).catch(() => {})
  }

  function removeUrl(url: string) {
    // Get properties to delete from backend too
    const propsToRemove = properties.filter(p => p.sourceUrl === url)
    setUrls(prev => prev.filter(u => u !== url))
    setProperties(prev => prev.filter(p => p.sourceUrl !== url))
    // Sync deletes to backend
    for (const p of propsToRemove) {
      api.deleteProperty(p.id).catch(() => {})
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-sm text-pcis-text-secondary mt-1">
            {allProperties.length} propert{allProperties.length === 1 ? 'y' : 'ies'} your AI knows about
          </p>
        </div>
        {allProperties.length > 0 && (
          <div className="flex gap-2">
            {(['all', 'scraped', 'backend'] as const).map(f => {
              const count = f === 'all' ? allProperties.length : f === 'scraped' ? properties.length : backendProperties.length
              if (f !== 'all' && count === 0) return null
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    filter === f ? 'bg-pcis-gold/15 text-pcis-gold border-pcis-gold/30' : 'bg-black/20 text-pcis-text-muted border-pcis-border/50 hover:text-white'
                  }`}>
                  {f === 'all' ? `All (${count})` : f === 'scraped' ? `From URL (${count})` : `System (${count})`}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* URL Input */}
      <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[10px] font-bold tracking-[0.12em] text-pcis-text-muted">PROPERTY FINDER</h3>
            <p className="text-[10px] text-pcis-text-muted/60 mt-0.5">Paste your listing page, agent profile, or brokerage URL</p>
          </div>
          <button onClick={() => setShowAddManual(!showAddManual)}
            className="text-[10px] text-pcis-gold hover:text-pcis-gold/80 transition-colors">
            {showAddManual ? 'Close' : '+ Add manually'}
          </button>
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={urlInput}
            onChange={e => { setUrlInput(e.target.value); setScrapeError(''); setScrapeSuccess('') }}
            onKeyDown={e => e.key === 'Enter' && handleScrape()}
            placeholder="https://www.bayut.com/agent/your-profile or any property listing page..."
            className="flex-1 bg-black/30 border border-pcis-border rounded-lg px-4 py-2.5 text-sm text-pcis-text placeholder:text-pcis-text-muted/40 focus:border-pcis-gold/30 focus:outline-none transition-colors"
          />
          <button onClick={handleScrape} disabled={scraping || !urlInput.trim()}
            className={`px-5 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              scraping ? 'bg-pcis-gold/20 text-pcis-gold cursor-wait' :
              urlInput.trim() ? 'bg-pcis-gold text-black hover:bg-pcis-gold/90' :
              'bg-pcis-border/30 text-pcis-text-muted cursor-not-allowed'
            }`}>
            {scraping && (
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="20 10" />
              </svg>
            )}
            {scraping ? 'Scanning...' : 'Scan Listings'}
          </button>
        </div>

        {scrapeError && <p className="text-[11px] text-red-400 mt-2">{scrapeError}</p>}
        {scrapeSuccess && <p className="text-[11px] text-green-400 mt-2">{scrapeSuccess}</p>}

        {/* Saved URLs */}
        {urls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {urls.map(url => (
              <div key={url} className="flex items-center gap-1.5 bg-black/20 border border-pcis-border/30 rounded-md px-2.5 py-1.5 group">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="text-pcis-text-muted flex-shrink-0">
                  <path d="M6.5 9.5l3-3M7 11l-1.5 1.5a2.12 2.12 0 01-3-3L4 8m5-1l1.5-1.5a2.12 2.12 0 013 3L12 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="text-[9px] text-pcis-text-muted max-w-[200px] truncate">{url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                <button onClick={() => removeUrl(url)} className="text-pcis-text-muted/30 hover:text-red-400 transition-colors ml-1 opacity-0 group-hover:opacity-100">
                  <svg width="8" height="8" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Manual add */}
        {showAddManual && (
          <ManualAddForm onAdd={async (p) => {
            setProperties(prev => [p, ...prev])
            setShowAddManual(false)
            // Sync to backend
            try {
              await api.addProperty({
                title: p.title,
                propertyType: p.type,
                area: p.location,
                bedrooms: p.bedrooms,
                bathrooms: p.bathrooms,
                size: p.size,
                price: p.price,
                description: p.description,
              })
            } catch {}
          }} />
        )}
      </div>

      {/* Properties Grid */}
      {filtered.length === 0 ? (
        <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-12 text-center">
          <svg width="32" height="32" viewBox="0 0 16 16" fill="none" className="mx-auto mb-3 text-pcis-text-muted/30">
            <path d="M2 14V6l6-4 6 4v8H2z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 14v-4h4v4" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <p className="text-sm text-pcis-text-muted font-medium">No properties yet</p>
          <p className="text-xs text-pcis-text-muted/60 mt-1 max-w-sm mx-auto">
            Paste your Bayut, Property Finder, or brokerage listing URL above to automatically import your properties.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((p: any) => (
            <div key={p.id} className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg overflow-hidden hover:border-pcis-gold/15 transition-colors group">
              {/* Image */}
              {p.imageUrl ? (
                <div className="h-36 bg-pcis-border/10 overflow-hidden">
                  <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                </div>
              ) : (
                <div className="h-16 bg-gradient-to-br from-pcis-border/10 to-transparent flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-pcis-text-muted/15">
                    <path d="M2 14V6l6-4 6 4v8H2z" stroke="currentColor" strokeWidth="1" />
                    <path d="M6 14v-4h4v4" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>
              )}

              <div className="p-4">
                {/* Type badge + remove */}
                <div className="flex items-center justify-between mb-1.5">
                  {p.type ? (
                    <span className="text-[8px] font-bold tracking-wider px-1.5 py-0.5 rounded border bg-pcis-gold/10 text-pcis-gold border-pcis-gold/20">
                      {p.type.toUpperCase()}
                    </span>
                  ) : <span />}
                  {p.sourceUrl && (
                    <button onClick={() => removeProperty(p.id)}
                      className="opacity-0 group-hover:opacity-100 text-pcis-text-muted/30 hover:text-red-400 transition-all">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    </button>
                  )}
                </div>

                <h3 className="text-sm font-semibold leading-snug">{p.title}</h3>

                {(p.location || p.area) && (
                  <p className="text-[11px] text-pcis-text-muted mt-1">{p.location || p.area}</p>
                )}

                {p.price && (
                  <p className="text-sm text-pcis-gold font-semibold mt-2">{p.price}</p>
                )}

                {/* Details */}
                <div className="flex items-center gap-3 mt-2">
                  {p.bedrooms && (
                    <span className="flex items-center gap-1 text-[10px] text-pcis-text-secondary">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M2 10V6a2 2 0 012-2h8a2 2 0 012 2v4M1 10h14v3H1z" stroke="currentColor" strokeWidth="1"/></svg>
                      {p.bedrooms} bed
                    </span>
                  )}
                  {p.bathrooms && (
                    <span className="flex items-center gap-1 text-[10px] text-pcis-text-secondary">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8V3h2v5M1 8h14v2a3 3 0 01-3 3H4a3 3 0 01-3-3V8z" stroke="currentColor" strokeWidth="1"/></svg>
                      {p.bathrooms} bath
                    </span>
                  )}
                  {p.size && <span className="text-[10px] text-pcis-text-secondary">{p.size}</span>}
                </div>

                {p.description && (
                  <p className="text-[10px] text-pcis-text-muted mt-2 line-clamp-2 leading-relaxed">{p.description}</p>
                )}

                {p.sourceUrl && (
                  <div className="flex items-center justify-between mt-2">
                    <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">
                      <svg width="8" height="8" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-3M10 2h4v4M7 9l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      View original
                    </a>
                    <span className="text-[8px] text-green-400/60 flex items-center gap-1">
                      <svg width="6" height="6" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.4"/><path d="M5 8l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      AI synced
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ============================================================
// MANUAL ADD FORM
// ============================================================
function ManualAddForm({ onAdd }: { onAdd: (p: Property) => void }) {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [beds, setBeds] = useState('')
  const [baths, setBaths] = useState('')
  const [size, setSize] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState('')
  const [desc, setDesc] = useState('')

  function handleSubmit() {
    if (!title.trim()) return
    onAdd({
      id: `manual-${Date.now()}`,
      title: title.trim(),
      price: price.trim() || undefined,
      bedrooms: beds.trim() || undefined,
      bathrooms: baths.trim() || undefined,
      size: size.trim() || undefined,
      location: location.trim() || undefined,
      type: type.trim() || undefined,
      description: desc.trim() || undefined,
      addedAt: new Date().toISOString(),
    })
  }

  const ic = "bg-black/30 border border-pcis-border rounded-lg px-3 py-2 text-xs text-pcis-text placeholder:text-pcis-text-muted/40 focus:border-pcis-gold/30 focus:outline-none transition-colors"

  return (
    <div className="mt-4 pt-4 border-t border-pcis-border/50">
      <h4 className="text-[10px] font-bold tracking-[0.12em] text-pcis-text-muted mb-3">ADD PROPERTY MANUALLY</h4>
      <div className="grid grid-cols-4 gap-2">
        <input className={`${ic} col-span-2`} placeholder="Property title *" value={title} onChange={e => setTitle(e.target.value)} />
        <input className={ic} placeholder="Price (e.g. AED 2.5M)" value={price} onChange={e => setPrice(e.target.value)} />
        <input className={ic} placeholder="Type (Villa, Apt...)" value={type} onChange={e => setType(e.target.value)} />
        <input className={ic} placeholder="Bedrooms" value={beds} onChange={e => setBeds(e.target.value)} />
        <input className={ic} placeholder="Bathrooms" value={baths} onChange={e => setBaths(e.target.value)} />
        <input className={ic} placeholder="Size (e.g. 2,500 sqft)" value={size} onChange={e => setSize(e.target.value)} />
        <input className={ic} placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
      </div>
      <textarea className={`${ic} w-full mt-2 h-16 resize-none`} placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
      <button onClick={handleSubmit} disabled={!title.trim()}
        className={`mt-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
          title.trim() ? 'bg-pcis-gold text-black hover:bg-pcis-gold/90' : 'bg-pcis-border/30 text-pcis-text-muted cursor-not-allowed'
        }`}>
        Add Property
      </button>
    </div>
  )
}


// ============================================================
// SCRAPING ENGINE
// ============================================================

async function scrapeListings(url: string): Promise<Property[]> {
  const html = await fetchPage(url)
  if (!html) throw new Error('Could not fetch page. The site may block automated access — try a different URL or add properties manually.')

  const properties: Property[] = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Strategy 1: JSON-LD structured data (most reliable — Bayut, PF use this)
  const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]')
  jsonLdScripts.forEach(script => {
    try {
      const raw = JSON.parse(script.textContent || '')
      const items = Array.isArray(raw) ? raw : raw['@graph'] ? raw['@graph'] : [raw]
      items.forEach((item: any) => {
        const t = item['@type'] || ''
        if (['RealEstateListing', 'Product', 'Residence', 'Apartment', 'House', 'SingleFamilyResidence', 'ApartmentComplex'].includes(t)
          || (t === 'Product' && item.name && /bed|villa|apartment|penthouse|townhouse/i.test(item.name))) {
          properties.push(makeProperty(
            item.name || item.headline || 'Property',
            item.offers?.price || item.offers?.lowPrice || item.price,
            item.description?.slice(0, 250),
            item.image?.url || item.image?.[0] || (typeof item.image === 'string' ? item.image : undefined),
            item.address?.addressLocality || item.address?.streetAddress,
            item.numberOfRooms?.toString() || item.numberOfBedrooms?.toString(),
            item.numberOfBathroomsTotal?.toString(),
            item.floorSize?.value ? `${item.floorSize.value} ${item.floorSize.unitText || 'sqft'}` : undefined,
            t !== 'RealEstateListing' ? t.replace(/([A-Z])/g, ' $1').trim() : undefined,
            url,
          ))
        }
      })
    } catch {}
  })

  if (properties.length > 0) return properties

  // Strategy 2: OG meta tags (single listing page)
  const ogTitle = getMeta(doc, 'og:title')
  const ogDesc = getMeta(doc, 'og:description')
  const ogImage = getMeta(doc, 'og:image')

  if (ogTitle && /\d\s*(?:bed|br|bedroom)|villa|apartment|penthouse|townhouse|studio|duplex/i.test(ogTitle)) {
    const priceText = doc.querySelector('[class*="price" i], [data-testid*="price" i]')?.textContent?.trim()
    const bedMatch = ogTitle.match(/(\d+)\s*(?:bed|br|bedroom)/i)
    const bathMatch = ogTitle.match(/(\d+)\s*(?:bath)/i)
    const sizeMatch = (ogTitle + ' ' + (ogDesc || '')).match(/([\d,]+)\s*(?:sq\.?\s*ft|sqft|sq\s*m)/i)

    properties.push(makeProperty(
      ogTitle, priceText, ogDesc?.slice(0, 250), ogImage,
      undefined, bedMatch?.[1], bathMatch?.[1], sizeMatch?.[0],
      undefined, url,
    ))
    return properties
  }

  // Strategy 3: Common listing card selectors
  const selectors = [
    '[class*="listing-card" i]', '[class*="property-card" i]', '[class*="listing-item" i]',
    '[data-testid*="listing" i]', '[class*="PropertyCard" i]', '[class*="search-result" i]',
    'article[class*="listing" i]', '[class*="prop-card" i]', 'li[class*="listing" i]',
    '[class*="result-card" i]', '[class*="property_card" i]',
  ]

  let cards: Element[] = []
  for (const sel of selectors) {
    try {
      const found = doc.querySelectorAll(sel)
      if (found.length > 0) { cards = Array.from(found); break }
    } catch {}
  }

  if (cards.length > 0) {
    cards.forEach(card => {
      const titleEl = card.querySelector('h2, h3, h4, [class*="title" i], [class*="name" i]')?.textContent?.trim()
      if (!titleEl || titleEl.length < 5) return

      const priceEl = card.querySelector('[class*="price" i]')?.textContent?.trim()
      const imgEl = card.querySelector('img')?.getAttribute('src') || card.querySelector('img')?.getAttribute('data-src')
      const linkEl = card.querySelector('a')?.getAttribute('href')
      const locEl = card.querySelector('[class*="location" i], [class*="address" i]')?.textContent?.trim()
      const bedsEl = card.querySelector('[class*="bed" i]')?.textContent?.trim()
      const bathsEl = card.querySelector('[class*="bath" i]')?.textContent?.trim()
      const sizeEl = card.querySelector('[class*="size" i], [class*="sqft" i], [class*="area" i]')?.textContent?.trim()
      const typeEl = card.querySelector('[class*="type" i], [class*="category" i]')?.textContent?.trim()

      const bedMatch = (bedsEl || titleEl).match(/(\d+)\s*(?:bed|br)/i)
      const bathMatch = (bathsEl || titleEl).match(/(\d+)\s*(?:bath)/i)

      properties.push(makeProperty(
        titleEl, priceEl, undefined,
        imgEl && imgEl.startsWith('http') ? imgEl : undefined,
        locEl, bedMatch?.[1], bathMatch?.[1], sizeEl,
        typeEl && typeEl.length < 30 ? typeEl : undefined,
        linkEl ? resolveUrl(linkEl, url) : url,
      ))
    })
  }

  // Strategy 4: Last resort — page title + og
  if (properties.length === 0 && (ogTitle || doc.title)) {
    properties.push(makeProperty(
      ogTitle || doc.title, undefined, ogDesc?.slice(0, 250), ogImage,
      undefined, undefined, undefined, undefined, undefined, url,
    ))
  }

  return properties
}

function makeProperty(
  title: string, price?: string, desc?: string, img?: string,
  location?: string, beds?: string, baths?: string, size?: string,
  type?: string, sourceUrl?: string,
): Property {
  // Clean up price
  let cleanPrice = price
  if (price && /^\d+$/.test(price.replace(/,/g, ''))) {
    const num = parseInt(price.replace(/,/g, ''))
    cleanPrice = `AED ${num.toLocaleString()}`
  }

  return {
    id: `scraped-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title.slice(0, 150),
    price: cleanPrice || undefined,
    description: desc || undefined,
    imageUrl: img || undefined,
    location: location || undefined,
    bedrooms: beds || undefined,
    bathrooms: baths || undefined,
    size: size || undefined,
    type: type || undefined,
    sourceUrl,
    addedAt: new Date().toISOString(),
  }
}

function getMeta(doc: Document, property: string): string | undefined {
  return doc.querySelector(`meta[property="${property}"]`)?.getAttribute('content') || undefined
}

function resolveUrl(href: string, base: string): string {
  try { return new URL(href, base).href } catch { return href }
}

// Fetch with CORS proxy fallbacks
async function fetchPage(url: string): Promise<string | null> {
  const proxies = [
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ]

  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy(url), { signal: AbortSignal.timeout(12000) })
      if (res.ok) {
        const text = await res.text()
        if (text.length > 500) return text
      }
    } catch {}
  }

  // Backend fallback
  try {
    const res = await fetch(
      `https://pciscom-production.up.railway.app/api/tenant-001/scrape?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(15000) }
    )
    if (res.ok) {
      const data = await res.json()
      return data.html || data.content || null
    }
  } catch {}

  return null
}