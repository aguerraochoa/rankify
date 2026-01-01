interface RankedSong {
  title: string
  artist: string
  cover_art_url?: string
  album_title?: string
  musicbrainz_id?: string
  rank?: number
}

interface RankingData {
  name: string | null
  songs: RankedSong[]
  created_at: string
}

// Helper function to load an image
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

// Helper function to wrap text
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ')
  let line = ''
  let currentY = y

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY)
      line = words[n] + ' '
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, currentY)
  return currentY + lineHeight
}

export async function generateRankingImage(ranking: RankingData): Promise<void> {
  // Check if we're on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  
  // Canvas dimensions (receipt width)
  const width = 384
  const padding = 20
  const contentWidth = width - (padding * 2)
  
  // Create canvas
  const canvas = document.createElement('canvas')
  const scale = isMobile ? 1.5 : 2
  canvas.width = width * scale
  canvas.height = 2000 * scale // Start with large height, will trim later
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Scale context
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, 2000)

  // Start with padding at top - match the bottom spacing
  // Bottom has: 15px after URL + 20px padding = 35px total
  // Top should have similar visual spacing, accounting for text baseline
  let y = padding + 35 // Match bottom spacing (15px + 20px padding)

  // Header
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.font = 'bold 24px monospace'
  ctx.fillText('RANKIFY', width / 2, y)
  y += 30

  ctx.font = '12px monospace'
  ctx.fillStyle = '#666666'
  const subtitle = (ranking.name || 'MY RANKING').toUpperCase()
  ctx.fillText(subtitle, width / 2, y)
  y += 20

  // Date
  const date = new Date(ranking.created_at)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  ctx.font = '10px monospace'
  ctx.fillStyle = '#999999'
  ctx.fillText(formattedDate.toUpperCase(), width / 2, y)
  y += 20

  // Divider
  ctx.strokeStyle = '#000000'
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(padding, y)
  ctx.lineTo(width - padding, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 20

  // Songs list
  ctx.textAlign = 'left'
  ctx.font = '11px monospace'
  ctx.fillStyle = '#000000'

  for (let i = 0; i < ranking.songs.length; i++) {
    const song = ranking.songs[i]
    const rank = String(i + 1).padStart(2, '0')
    
    // Rank number
    ctx.font = 'bold 11px monospace'
    ctx.fillText(rank, padding, y)
    
    // Song info
    const songText = `${song.title.toUpperCase()} - ${song.artist.toUpperCase()}`
    ctx.font = '11px monospace'
    const textX = padding + 30
    const maxTextWidth = contentWidth - 30
    
    // Measure text and wrap if needed
    const metrics = ctx.measureText(songText)
    if (metrics.width > maxTextWidth) {
      y = wrapText(ctx, songText, textX, y, maxTextWidth, 14)
    } else {
      ctx.fillText(songText, textX, y)
      y += 14
    }
    
    y += 2 // Extra spacing
  }

  y += 10

  // Divider
  ctx.strokeStyle = '#000000'
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(padding, y)
  ctx.lineTo(width - padding, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 20

  // Footer
  ctx.textAlign = 'center'
  ctx.font = 'bold 10px monospace'
  ctx.fillStyle = '#000000'
  ctx.fillText('RANK YOUR MUSIC WITH PRECISION', width / 2, y)
  y += 15

  ctx.font = '10px monospace'
  ctx.fillStyle = '#999999'
  ctx.fillText('rankify-music.vercel.app', width / 2, y)
  // No extra space after URL - padding will be added in height calculation

  // Trim canvas to actual content height (add padding at bottom to match top)
  // Top: padding (20px) + 35px = 55px total
  // Bottom: padding (20px) + 35px = 55px total (matching top)
  const actualHeight = Math.ceil(y + padding + 35) // Match the top padding (padding + 35)
  const trimmedCanvas = document.createElement('canvas')
  trimmedCanvas.width = width * scale
  trimmedCanvas.height = actualHeight * scale
  const trimmedCtx = trimmedCanvas.getContext('2d')
  
  if (!trimmedCtx) {
    throw new Error('Failed to get trimmed canvas context')
  }

  trimmedCtx.drawImage(canvas, 0, 0, width * scale, actualHeight * scale, 0, 0, width * scale, actualHeight * scale)

  // Convert to blob
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    try {
      trimmedCanvas.toBlob(
        (blob) => {
          resolve(blob)
        },
        'image/png',
        0.95
      )
      // Timeout for blob conversion
      setTimeout(() => {
        reject(new Error('Blob conversion timed out'))
      }, 5000)
    } catch (error) {
      reject(error)
    }
  })

  if (!blob) {
    throw new Error('Failed to create image blob')
  }

  const fileName = `${(ranking.name || 'my_ranking').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ranking.png`
  const url = URL.createObjectURL(blob)

  // Strategy 1: Try Share API on mobile (best UX on iOS/Android)
  // Check if Share API supports files (not all browsers do)
  const shareSupported = navigator.share && navigator.canShare
  if (isMobile && shareSupported) {
    try {
      const file = new File([blob], fileName, {
        type: 'image/png',
      })
      
      // Check if we can share this file
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: ranking.name || 'My Ranking',
        })
        URL.revokeObjectURL(url)
        return // Successfully shared
      }
    } catch (shareError: any) {
      // If share is cancelled by user, that's fine - don't show error
      if (shareError.name === 'AbortError') {
        URL.revokeObjectURL(url)
        return // User cancelled, exit gracefully
      }
      // If share fails for other reasons, fall through to download
      console.warn('Share API failed, falling back to download:', shareError)
    }
  }

  // Strategy 2: Desktop - use download link (works reliably on desktop)
  if (!isMobile) {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'
    
    document.body.appendChild(link)
    
    // Small delay to ensure link is in DOM
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Trigger download (must be from user gesture, which it is)
    link.click()
    
    // Clean up after a delay
    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link)
      }
      URL.revokeObjectURL(url)
    }, 1000)
    return
  }

  // Strategy 3: Mobile - try download link, with fallback to opening in new window
  // iOS Safari often blocks downloads, so we need a fallback
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  
  document.body.appendChild(link)
  await new Promise(resolve => setTimeout(resolve, 50))
  link.click()
  
  // Also try opening in new window as backup (works when download is blocked)
  // This is especially useful for iOS Safari
  setTimeout(() => {
    try {
      const newWindow = window.open(url, '_blank')
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Popup blocked, try link approach
        const fallbackLink = document.createElement('a')
        fallbackLink.href = url
        fallbackLink.target = '_blank'
        fallbackLink.rel = 'noopener noreferrer'
        fallbackLink.style.display = 'none'
        document.body.appendChild(fallbackLink)
        fallbackLink.click()
        
        setTimeout(() => {
          if (fallbackLink.parentNode) {
            document.body.removeChild(fallbackLink)
          }
        }, 1000)
      }
    } catch (windowError) {
      console.warn('Fallback window open failed:', windowError)
    }
  }, 300) // Small delay to let download attempt first
  
  // Clean up
  setTimeout(() => {
    if (link.parentNode) {
      document.body.removeChild(link)
    }
    URL.revokeObjectURL(url)
  }, 2000) // Longer delay for mobile to ensure both methods have time
}

