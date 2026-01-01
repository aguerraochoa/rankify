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

export async function generateRankingPDF(ranking: RankingData): Promise<void> {
  // Dynamically import html2canvas to avoid loading it until needed
  const html2canvas = (await import('html2canvas')).default

  // Create a temporary container for the receipt
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.width = '384px' // Receipt width (thermal printer width)
  container.style.backgroundColor = '#ffffff'
  container.style.fontFamily = 'monospace'
  container.style.padding = '20px'
  container.style.color = '#000000'
  container.style.lineHeight = '1.4'
  document.body.appendChild(container)

  // Header
  const header = document.createElement('div')
  header.style.textAlign = 'center'
  header.style.marginBottom = '16px'
  
  const title = document.createElement('div')
  title.textContent = 'RANKIFY'
  title.style.fontSize = '24px'
  title.style.fontWeight = 'bold'
  title.style.letterSpacing = '2px'
  title.style.marginBottom = '4px'
  header.appendChild(title)

  const subtitle = document.createElement('div')
  subtitle.textContent = ranking.name?.toUpperCase() || 'MY RANKING'
  subtitle.style.fontSize = '12px'
  subtitle.style.letterSpacing = '1px'
  subtitle.style.opacity = '0.8'
  header.appendChild(subtitle)

  container.appendChild(header)

  // Date
  const dateDiv = document.createElement('div')
  dateDiv.style.textAlign = 'center'
  dateDiv.style.fontSize = '10px'
  dateDiv.style.marginBottom = '12px'
  dateDiv.style.opacity = '0.7'
  const date = new Date(ranking.created_at)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  dateDiv.textContent = formattedDate.toUpperCase()
  container.appendChild(dateDiv)

  // Divider
  const divider1 = document.createElement('div')
  divider1.style.borderTop = '1px dashed #000'
  divider1.style.margin = '12px 0'
  container.appendChild(divider1)

  // Songs list - compact format
  const songsList = document.createElement('div')
  songsList.style.fontSize = '11px'
  
  ranking.songs.forEach((song, index) => {
    const songRow = document.createElement('div')
    songRow.style.marginBottom = '6px'
    songRow.style.display = 'flex'
    songRow.style.alignItems = 'flex-start'
    songRow.style.gap = '8px'

    // Rank number (left aligned, fixed width)
    const rank = document.createElement('span')
    rank.textContent = String(index + 1).padStart(2, '0')
    rank.style.fontWeight = 'bold'
    rank.style.minWidth = '20px'
    rank.style.flexShrink = '0'
    songRow.appendChild(rank)

    // Song info (flexible)
    const songInfo = document.createElement('span')
    songInfo.style.flex = '1'
    songInfo.style.textTransform = 'uppercase'
    
    const titleSpan = document.createElement('span')
    titleSpan.textContent = song.title
    titleSpan.style.fontWeight = 'bold'
    songInfo.appendChild(titleSpan)

    songInfo.appendChild(document.createTextNode(' - '))

    const artistSpan = document.createElement('span')
    artistSpan.textContent = song.artist
    songInfo.appendChild(artistSpan)

    songRow.appendChild(songInfo)
    songsList.appendChild(songRow)
  })

  container.appendChild(songsList)

  // Divider
  const divider2 = document.createElement('div')
  divider2.style.borderTop = '1px dashed #000'
  divider2.style.margin = '12px 0'
  container.appendChild(divider2)

  // Footer
  const footer = document.createElement('div')
  footer.style.textAlign = 'center'
  footer.style.fontSize = '10px'
  footer.style.marginTop = '16px'

  // Creative tagline
  const tagline = document.createElement('div')
  tagline.textContent = 'RANK YOUR MUSIC WITH PRECISION'
  tagline.style.fontWeight = 'bold'
  tagline.style.letterSpacing = '1px'
  tagline.style.marginBottom = '4px'
  footer.appendChild(tagline)

  // Website
  const website = document.createElement('div')
  website.textContent = 'rankify.app'
  website.style.opacity = '0.6'
  website.style.marginTop = '4px'
  website.style.letterSpacing = '1px'
  footer.appendChild(website)

  container.appendChild(footer)

  // Generate canvas
  try {
    const canvas = await html2canvas(container, {
      width: 384,
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
    })

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        const rankingTitle = ranking.name || 'my_ranking'
        link.download = `${rankingTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ranking.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    }, 'image/png')

    // Clean up
    setTimeout(() => {
      document.body.removeChild(container)
    }, 1000)
  } catch (error) {
    document.body.removeChild(container)
    throw error
  }
}
