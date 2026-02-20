// lib/pdf/fonts.ts
// Flatro — Shared font registration for @react-pdf/renderer
// Roboto supports full Latin Extended (Polish ąćęłńóśźż diacritics)
//
// SETUP: Download fonts to public/fonts/ by running:
//   mkdir -p public/fonts
//   curl -L -o public/fonts/Roboto-Regular.ttf "https://github.com/googlefonts/roboto-classic/raw/main/fonts/ttf/Roboto-Regular.ttf"
//   curl -L -o public/fonts/Roboto-Bold.ttf "https://github.com/googlefonts/roboto-classic/raw/main/fonts/ttf/Roboto-Bold.ttf"
//   curl -L -o public/fonts/Roboto-Italic.ttf "https://github.com/googlefonts/roboto-classic/raw/main/fonts/ttf/Roboto-Italic.ttf"
//
// Or on Windows (PowerShell):
//   New-Item -ItemType Directory -Force -Path public/fonts
//   Invoke-WebRequest -Uri "https://github.com/googlefonts/roboto-classic/raw/main/fonts/ttf/Roboto-Regular.ttf" -OutFile "public/fonts/Roboto-Regular.ttf"
//   Invoke-WebRequest -Uri "https://github.com/googlefonts/roboto-classic/raw/main/fonts/ttf/Roboto-Bold.ttf" -OutFile "public/fonts/Roboto-Bold.ttf"
//   Invoke-WebRequest -Uri "https://github.com/googlefonts/roboto-classic/raw/main/fonts/ttf/Roboto-Italic.ttf" -OutFile "public/fonts/Roboto-Italic.ttf"

import path from 'path'
import { Font } from '@react-pdf/renderer'

let fontsRegistered = false

export function registerFonts() {
  if (fontsRegistered) return
  fontsRegistered = true

  const fontsDir = path.join(process.cwd(), 'public', 'fonts')

  Font.register({
    family: 'Roboto',
    fonts: [
      {
        src: path.join(fontsDir, 'Roboto-Regular.ttf'),
        fontWeight: 'normal',
      },
      {
        src: path.join(fontsDir, 'Roboto-Bold.ttf'),
        fontWeight: 'bold',
      },
      {
        src: path.join(fontsDir, 'Roboto-Italic.ttf'),
        fontStyle: 'italic',
      },
    ],
  })

  // Disable hyphenation — prevents word-break issues in Polish
  Font.registerHyphenationCallback((word: string) => [word])
}