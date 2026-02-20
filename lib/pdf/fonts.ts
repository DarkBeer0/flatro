// lib/pdf/fonts.ts
// Flatro — Shared font registration for @react-pdf/renderer
// Uses Google Fonts CDN — no local files needed
// Roboto supports full Latin Extended (Polish ąćęłńóśźż diacritics)

import { Font } from '@react-pdf/renderer'

let fontsRegistered = false

export function registerFonts() {
  if (fontsRegistered) return
  fontsRegistered = true

  Font.register({
    family: 'Roboto',
    fonts: [
      {
        src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
        fontWeight: 'normal',
      },
      {
        src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
        fontWeight: 'bold',
      },
      {
        src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf',
        fontStyle: 'italic',
      },
    ],
  })

  // Disable hyphenation — prevents word-break issues in Polish
  Font.registerHyphenationCallback((word: string) => [word])
}