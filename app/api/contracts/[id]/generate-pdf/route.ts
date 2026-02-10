// app/api/contracts/[id]/generate-pdf/route.ts
// Generates a proper Polish rental contract (HTML for print-to-PDF)
// Supports: STANDARD, OCCASIONAL, INSTITUTIONAL
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

function fDate(d: Date | string | null): string {
  if (!d) return '..................'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })
}

function fMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł'
}

function fMoneyWords(amount: number): string {
  const zl = Math.floor(amount)
  const gr = Math.round((amount - zl) * 100)
  const words = numberToPolish(zl)
  const zlForm = pluralZloty(zl)
  if (gr > 0) {
    const grWords = numberToPolish(gr)
    const grForm = gr === 1 ? 'grosz' : (gr >= 2 && gr <= 4) || (gr % 10 >= 2 && gr % 10 <= 4 && (gr % 100 < 12 || gr % 100 > 14)) ? 'grosze' : 'groszy'
    return `${zl},${gr.toString().padStart(2, '0')} zł (słownie: ${words} ${zlForm} i ${grWords} ${grForm})`
  }
  return `${zl},00 zł (słownie: ${words} ${zlForm})`
}

function numberToPolish(n: number): string {
  if (n === 0) return 'zero'

  const ones = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć']
  const teens = ['dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście']
  const tens = ['', 'dziesięć', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt']
  const hundreds = ['', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 'sześćset', 'siedemset', 'osiemset', 'dziewięćset']

  const parts: string[] = []

  if (n >= 1000) {
    const th = Math.floor(n / 1000)
    if (th === 1) {
      parts.push('tysiąc')
    } else if (th >= 2 && th <= 4) {
      parts.push(numberToPolish(th) + ' tysiące')
    } else if (th >= 5 && th <= 21) {
      parts.push(numberToPolish(th) + ' tysięcy')
    } else {
      const thLastTwo = th % 100
      const thLastOne = th % 10
      if (thLastTwo >= 12 && thLastTwo <= 14) {
        parts.push(numberToPolish(th) + ' tysięcy')
      } else if (thLastOne >= 2 && thLastOne <= 4) {
        parts.push(numberToPolish(th) + ' tysiące')
      } else {
        parts.push(numberToPolish(th) + ' tysięcy')
      }
    }
    n = n % 1000
  }

  if (n >= 100) {
    parts.push(hundreds[Math.floor(n / 100)])
    n = n % 100
  }

  if (n >= 20) {
    parts.push(tens[Math.floor(n / 10)])
    n = n % 10
  }

  if (n >= 10) {
    parts.push(teens[n - 10])
    n = 0
  }

  if (n >= 1) {
    parts.push(ones[n])
  }

  return parts.join(' ')
}

function pluralZloty(n: number): string {
  if (n === 1) return 'złoty'
  const lastTwo = n % 100
  const lastOne = n % 10
  if (lastTwo >= 12 && lastTwo <= 14) return 'złotych'
  if (lastOne >= 2 && lastOne <= 4) return 'złote'
  return 'złotych'
}

function generateHtml(c: any, owner: any, clauses: Record<string, boolean> = {}, residents: Array<{ firstName: string; lastName: string; pesel: string }> = []): string {
  const total = (c.rentAmount || 0) + (c.adminFee || 0) + (c.utilitiesAdvance || 0)
  const today = new Date()
  const cityDate = `${owner.city || c.property?.city || '..................'}, dnia ${fDate(today)}`

  const ownerName = [owner.firstName, owner.lastName].filter(Boolean).join(' ') || '..................'
  const ownerAddress = [owner.address, owner.postalCode, owner.city].filter(Boolean).join(', ') || '..................'
  const ownerPesel = owner.nationalId || '..................'
  const ownerIdType = owner.nationalIdType || 'PESEL'

  const tenantName = [c.tenant?.firstName, c.tenant?.lastName].filter(Boolean).join(' ') || '..................'
  const tenantAddress = c.tenant?.registrationAddress || '..................'
  const tenantPesel = c.tenant?.nationalId || c.tenant?.pesel || '..................'
  const tenantIdType = c.tenant?.nationalIdType || 'PESEL'
  const tenantCitizenship = c.tenant?.citizenship || 'polskie'

  const propAddress = [c.property?.address, c.property?.postalCode, c.property?.city].filter(Boolean).join(', ') || '..................'
  const propArea = c.property?.area ? `${c.property.area} m²` : '..................'
  const propRooms = c.property?.rooms || '..................'

  const noticePeriod = c.noticePeriod || 1
  const bankInfo = owner.iban ? `${owner.bankName ? owner.bankName + ': ' : ''}${owner.iban}` : '..................'

  // Choose title by type
  const titles: Record<string, string> = {
    STANDARD: 'UMOWA NAJMU LOKALU MIESZKALNEGO',
    OCCASIONAL: 'UMOWA NAJMU OKAZJONALNEGO LOKALU MIESZKALNEGO',
    INSTITUTIONAL: 'UMOWA NAJMU INSTYTUCJONALNEGO LOKALU MIESZKALNEGO',
  }
  const title = titles[c.type] || titles.STANDARD

  // Build paragraphs
  let paragraphs = ''
  let pNum = 1

  // §1 STRONY UMOWY
  paragraphs += `
  <div class="p">
    <div class="p-title">§${pNum}. Strony umowy</div>
    <div class="p-body">
      <p>Umowa zawarta w dniu <strong>${fDate(today)}</strong> w ${owner.city || c.property?.city || '..................'} pomiędzy:</p>
      <div class="party">
        <p><strong>1. Wynajmujący:</strong></p>
        <p>${ownerName}, zamieszkały/a: ${ownerAddress}</p>
        <p>${ownerIdType}: ${ownerPesel}${owner.phone ? `, tel.: ${owner.phone}` : ''}${owner.email ? `, e-mail: ${owner.email}` : ''}</p>
      </div>
      <div class="party">
        <p><strong>2. Najemca:</strong></p>
        <p>${tenantName}${tenantCitizenship !== 'polskie' ? `, obywatelstwo: ${tenantCitizenship}` : ''}</p>
        <p>zamieszkały/a: ${tenantAddress}</p>
        <p>${tenantIdType}: ${tenantPesel}${c.tenant?.phone ? `, tel.: ${c.tenant.phone}` : ''}${c.tenant?.email ? `, e-mail: ${c.tenant.email}` : ''}</p>
      </div>
      <p>zwanymi dalej odpowiednio „Wynajmującym" i „Najemcą", łącznie „Stronami".</p>
    </div>
  </div>`
  pNum++

  // §2 PRZEDMIOT NAJMU
  paragraphs += `
  <div class="p">
    <div class="p-title">§${pNum}. Przedmiot najmu</div>
    <div class="p-body">
      <p>1. Wynajmujący oświadcza, że jest właścicielem/współwłaścicielem lokalu mieszkalnego położonego pod adresem: <strong>${propAddress}</strong>.</p>
      <p>2. Lokal składa się z <strong>${propRooms}</strong> ${typeof propRooms === 'number' ? (propRooms === 1 ? 'pokoju' : propRooms < 5 ? 'pokoi' : 'pokoi') : 'pokoi'} o łącznej powierzchni użytkowej <strong>${propArea}</strong>.</p>
      <p>3. Wynajmujący oddaje Najemcy lokal do używania w celach mieszkalnych, a Najemca lokal ten przyjmuje.</p>
      <p>4. Stan techniczny lokalu oraz wykaz wyposażenia zostaną określone w protokole zdawczo-odbiorczym, stanowiącym załącznik nr 1 do niniejszej umowy.</p>
    </div>
  </div>`
  pNum++

  // §3 OKRES OBOWIĄZYWANIA
  paragraphs += `
  <div class="p">
    <div class="p-title">§${pNum}. Okres obowiązywania</div>
    <div class="p-body">
      <p>1. Umowa zostaje zawarta ${c.endDate
        ? `na czas określony od dnia <strong>${fDate(c.startDate)}</strong> do dnia <strong>${fDate(c.endDate)}</strong>.`
        : `na czas nieokreślony, począwszy od dnia <strong>${fDate(c.startDate)}</strong>.`
      }</p>
      <p>2. ${c.endDate
        ? 'Po upływie okresu obowiązywania umowa wygasa, chyba że Strony postanowią o jej przedłużeniu w formie pisemnej.'
        : `Każda ze Stron może wypowiedzieć umowę z zachowaniem <strong>${noticePeriod}-miesięcznego</strong> okresu wypowiedzenia, ze skutkiem na koniec miesiąca kalendarzowego.`
      }</p>
      <p>3. Wypowiedzenie umowy wymaga formy pisemnej pod rygorem nieważności.</p>
    </div>
  </div>`
  pNum++

  // §4 CZYNSZ I OPŁATY
  paragraphs += `
  <div class="p">
    <div class="p-title">§${pNum}. Czynsz i opłaty</div>
    <div class="p-body">
      <p>1. Najemca zobowiązuje się płacić Wynajmującemu miesięczny czynsz najmu w wysokości <strong>${fMoneyWords(c.rentAmount || 0)}</strong>.</p>
      ${c.adminFee > 0 ? `<p>2. Ponadto Najemca zobowiązuje się do ponoszenia opłat z tytułu czynszu administracyjnego w wysokości <strong>${fMoney(c.adminFee)}</strong> miesięcznie.</p>` : ''}
      ${c.utilitiesAdvance > 0 ? `<p>${c.adminFee > 0 ? '3' : '2'}. Najemca zobowiązuje się do ponoszenia zaliczek na poczet mediów (energia elektryczna, woda, gaz, ogrzewanie) w wysokości <strong>${fMoney(c.utilitiesAdvance)}</strong> miesięcznie. Rozliczenie zaliczek nastąpi na podstawie faktycznych zużyć.</p>` : ''}
      <p>${(c.adminFee > 0 ? 3 : 2) + (c.utilitiesAdvance > 0 ? 1 : 0)}. Łączna miesięczna opłata wynosi <strong>${fMoneyWords(total)}</strong>.</p>
      <p>${(c.adminFee > 0 ? 3 : 2) + (c.utilitiesAdvance > 0 ? 1 : 0) + 1}. Czynsz i opłaty płatne są z góry do <strong>${c.paymentDay || 10}. dnia</strong> każdego miesiąca kalendarzowego na rachunek bankowy Wynajmującego: <strong>${bankInfo}</strong>.</p>
    </div>
  </div>`
  pNum++

  // §5 KAUCJA
  if (c.depositAmount) {
    paragraphs += `
    <div class="p">
      <div class="p-title">§${pNum}. Kaucja zabezpieczająca</div>
      <div class="p-body">
        <p>1. Najemca wpłaca Wynajmującemu kaucję zabezpieczającą w wysokości <strong>${fMoneyWords(c.depositAmount)}</strong>.</p>
        <p>2. Kaucja podlega zwrotowi w ciągu 30 dni od dnia opróżnienia lokalu, po potrąceniu ewentualnych należności Wynajmującego z tytułu niezapłaconego czynszu, opłat lub szkód w lokalu wykraczających poza normalne zużycie.</p>
        <p>3. Kaucja nie podlega oprocentowaniu.</p>
      </div>
    </div>`
    pNum++
  }

  // §X LOKAL ZASTĘPCZY (only for OCCASIONAL)
  if (c.type === 'OCCASIONAL') {
    paragraphs += `
    <div class="p">
      <div class="p-title">§${pNum}. Oświadczenia Najemcy (najem okazjonalny)</div>
      <div class="p-body">
        <p>1. Najemca oświadcza, że w przypadku ustania stosunku najmu zobowiązuje się opuścić lokal i przenieść się do lokalu zastępczego pod adresem: <strong>${[c.substituteAddress, c.substitutePostalCode, c.substituteCity].filter(Boolean).join(', ') || '..................'}</strong>.</p>
        <p>2. Do niniejszej umowy Najemca załącza:</p>
        <p class="indent">a) oświadczenie w formie aktu notarialnego, w którym poddaje się egzekucji i zobowiązuje do opróżnienia i wydania lokalu w terminie wskazanym w żądaniu, o którym mowa w art. 19d ust. 2 ustawy z dnia 21 czerwca 2001 r. o ochronie praw lokatorów;</p>
        <p class="indent">b) wskazanie lokalu, w którym będzie mógł zamieszkać w przypadku opróżnienia lokalu;</p>
        <p class="indent">c) oświadczenie właściciela lokalu zastępczego o wyrażeniu zgody na zamieszkanie Najemcy.</p>
        <p>3. W razie utraty możliwości zamieszkania w lokalu zastępczym, Najemca jest obowiązany w terminie 21 dni wskazać inny lokal oraz przedstawić oświadczenie jego właściciela.</p>
      </div>
    </div>`
    pNum++
  }

  // §X OBOWIĄZKI WYNAJMUJĄCEGO
  paragraphs += `
  <div class="p">
    <div class="p-title">§${pNum}. Obowiązki Wynajmującego</div>
    <div class="p-body">
      <p>1. Wynajmujący zobowiązuje się wydać lokal Najemcy w stanie przydatnym do umówionego użytku.</p>
      <p>2. Wynajmujący zobowiązuje się do utrzymywania lokalu w stanie przydatnym do umówionego użytku przez cały czas trwania najmu, w szczególności do dokonywania napraw budynku i instalacji, które nie obciążają Najemcy.</p>
      <p>3. Wynajmujący ma prawo do kontroli stanu lokalu po uprzednim uzgodnieniu terminu z Najemcą, nie częściej niż raz w miesiącu.</p>
    </div>
  </div>`
  pNum++

  // §X OBOWIĄZKI NAJEMCY
  paragraphs += `
  <div class="p">
    <div class="p-title">§${pNum}. Obowiązki Najemcy</div>
    <div class="p-body">
      <p>1. Najemca zobowiązuje się używać lokalu wyłącznie w celach mieszkalnych i utrzymywać go w należytym stanie technicznym i higieniczno-sanitarnym.</p>
      <p>2. Najemca zobowiązuje się do dokonywania na własny koszt bieżących napraw i konserwacji lokalu, w tym: malowanie ścian, naprawa podłóg, okien, drzwi, urządzeń sanitarnych i kuchennych.</p>
      <p>3. Najemca nie może dokonywać zmian naruszających substancję lokalu ani przeróbek bez pisemnej zgody Wynajmującego.</p>
      <p>4. Najemca nie może podnajmować lokalu ani oddawać go do bezpłatnego używania osobom trzecim bez pisemnej zgody Wynajmującego.</p>
      <p>5. Najemca zobowiązuje się do przestrzegania regulaminu porządku domowego oraz do niezakłócania korzystania z innych lokali w budynku.</p>
    </div>
  </div>`
  pNum++

  // §X WYPOWIEDZENIE
  paragraphs += `
  <div class="p">
    <div class="p-title">§${pNum}. Rozwiązanie umowy</div>
    <div class="p-body">
      <p>1. Wynajmujący może wypowiedzieć umowę ze skutkiem natychmiastowym, jeżeli Najemca:</p>
      <p class="indent">a) używa lokalu w sposób sprzeczny z umową lub niezgodnie z jego przeznaczeniem;</p>
      <p class="indent">b) zaniedbuje obowiązki, dopuszczając do powstania szkód;</p>
      <p class="indent">c) zalega z zapłatą czynszu lub opłat za co najmniej dwa pełne okresy płatności, pomimo wyznaczenia dodatkowego miesięcznego terminu do zapłaty.</p>
      ${!c.endDate ? `<p>2. Każda ze Stron może wypowiedzieć umowę z zachowaniem ${noticePeriod}-miesięcznego okresu wypowiedzenia, ze skutkiem na koniec miesiąca kalendarzowego.</p>` : ''}
      <p>${!c.endDate ? '3' : '2'}. Po zakończeniu umowy Najemca zobowiązuje się do zwrotu lokalu w stanie niepogorszonym ponad normalne zużycie, co zostanie potwierdzone protokołem zdawczo-odbiorczym.</p>
    </div>
  </div>`
  pNum++

  // §X ZASADY KORZYSTANIA Z LOKALU (generated from clauses)
  const clauseItems: string[] = []
  if (clauses.noPets) clauseItems.push('Najemca zobowiązuje się nie trzymać w lokalu zwierząt domowych bez pisemnej zgody Wynajmującego.')
  if (clauses.noSmoking) clauseItems.push('W lokalu obowiązuje całkowity zakaz palenia tytoniu, e-papierosów oraz innych substancji.')
  if (clauses.quietHours) clauseItems.push('Najemca zobowiązuje się do przestrzegania ciszy nocnej w godzinach 22:00–6:00.')
  if (clauses.noChanges) clauseItems.push('Najemca nie może dokonywać żadnych zmian w wystroju lokalu (malowanie ścian, wiercenie otworów itp.) bez pisemnej zgody Wynajmującego.')
  if (clauses.insurance) clauseItems.push('Najemca zobowiązuje się do posiadania ubezpieczenia OC najemcy przez cały okres obowiązywania umowy.')
  if (clauses.maxPersons) {
    const validResidents = residents.filter(r => r.firstName || r.lastName)
    if (validResidents.length > 0) {
      const residentList = validResidents.map(r => {
        const name = [r.firstName, r.lastName].filter(Boolean).join(' ')
        return r.pesel ? `${name} (${r.pesel})` : name
      }).join('; ')
      clauseItems.push(`W lokalu oprócz Najemcy mogą zamieszkiwać wyłącznie następujące osoby: ${residentList}. Zamieszkanie innych osób wymaga pisemnej zgody Wynajmującego.`)
    } else {
      clauseItems.push('W lokalu mogą zamieszkiwać wyłącznie osoby wskazane w umowie. Zamieszkanie dodatkowych osób wymaga pisemnej zgody Wynajmującego.')
    }
  }
  if (clauses.noBusinessUse) clauseItems.push('Lokal może być wykorzystywany wyłącznie na cele mieszkalne. Prowadzenie działalności gospodarczej w lokalu jest zabronione.')
  if (clauses.cleaningOnExit) clauseItems.push('Najemca zobowiązuje się do oddania lokalu w stanie czystym i wysprzątanym w dniu zakończenia umowy.')
  if (clauses.keyReturn) clauseItems.push('Najemca zobowiązuje się do zwrotu wszystkich kompletów kluczy w dniu opuszczenia lokalu. W przypadku zagubienia kluczy, koszt wymiany zamków ponosi Najemca.')
  if (clauses.parkingIncluded) clauseItems.push('W ramach umowy Najemca otrzymuje prawo do korzystania z wyznaczonego miejsca parkingowego.')
  if (clauses.furnished) clauseItems.push('Lokal jest wynajmowany wraz z wyposażeniem (meblami i sprzętem AGD/RTV), których wykaz stanowi część protokołu zdawczo-odbiorczego. Najemca odpowiada za stan wyposażenia.')

  if (clauseItems.length > 0) {
    paragraphs += `
    <div class="p">
      <div class="p-title">§${pNum}. Zasady korzystania z lokalu</div>
      <div class="p-body">
        ${clauseItems.map((item, i) => `<p>${i + 1}. ${item}</p>`).join('\n        ')}
      </div>
    </div>`
    pNum++
  }

  // §X DODATKOWE USTALENIA
  if (c.notes || c.additionalTerms) {
    paragraphs += `
    <div class="p">
      <div class="p-title">§${pNum}. Szczególne postanowienia</div>
      <div class="p-body">
        ${c.additionalTerms ? `<div class="terms">${c.additionalTerms.replace(/\n/g, '<br>')}</div>` : ''}
        ${c.notes ? `<div class="terms">${c.notes.replace(/\n/g, '<br>')}</div>` : ''}
      </div>
    </div>`
    pNum++
  }

  // §X POSTANOWIENIA KOŃCOWE
  paragraphs += `
  <div class="p">
    <div class="p-title">§${pNum}. Postanowienia końcowe</div>
    <div class="p-body">
      <p>1. W sprawach nieuregulowanych niniejszą umową mają zastosowanie przepisy Kodeksu cywilnego oraz ustawy z dnia 21 czerwca 2001 r. o ochronie praw lokatorów, mieszkaniowym zasobie gminy i o zmianie Kodeksu cywilnego.</p>
      <p>2. Wszelkie zmiany niniejszej umowy wymagają formy pisemnej pod rygorem nieważności.</p>
      <p>3. Wszelkie spory wynikające z niniejszej umowy będą rozstrzygane przez sąd właściwy dla miejsca położenia lokalu.</p>
      <p>4. Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze Stron.</p>
      ${c.type === 'OCCASIONAL' ? '<p>5. Załączniki do umowy: 1) protokół zdawczo-odbiorczy, 2) akt notarialny, 3) oświadczenie o lokalu zastępczym, 4) zgoda właściciela lokalu zastępczego.</p>' : '<p>5. Załączniki do umowy: 1) protokół zdawczo-odbiorczy.</p>'}
    </div>
  </div>`

  // Missing data warnings
  const warnings: string[] = []
  if (!owner.firstName && !owner.lastName) warnings.push('Dane Wynajmującego (imię, nazwisko)')
  if (!owner.address) warnings.push('Adres Wynajmującego')
  if (!owner.nationalId) warnings.push(`${ownerIdType} Wynajmującego`)
  if (!c.tenant?.firstName) warnings.push('Dane Najemcy')
  if (!c.tenant?.nationalId && !c.tenant?.pesel) warnings.push(`${tenantIdType} Najemcy`)
  if (!owner.iban) warnings.push('Numer rachunku bankowego')

  const warningBlock = warnings.length > 0
    ? `<div class="warning-box">
        <strong>⚠ Brakujące dane — uzupełnij przed drukiem:</strong>
        <ul>${warnings.map(w => `<li>${w}</li>`).join('')}</ul>
        <p>Uzupełnij dane w: Ustawienia → Profil (dane właściciela) i Najemcy → Edytuj (dane najemcy).</p>
      </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page { margin: 25mm 20mm; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', 'DejaVu Serif', Georgia, serif; font-size: 11pt; line-height: 1.5; color: #000; padding: 0; }
    @media screen { body { padding: 30px 40px; max-width: 800px; margin: auto; } }
    h1 { font-size: 14pt; text-align: center; margin: 0 0 5px; letter-spacing: 1px; }
    .city-date { text-align: right; margin-bottom: 20px; font-size: 10pt; }
    .p { margin-bottom: 14px; page-break-inside: avoid; }
    .p-title { font-weight: bold; font-size: 11pt; margin-bottom: 6px; text-align: center; }
    .p-body p { margin-bottom: 4px; text-align: justify; }
    .party { margin: 8px 0 8px 20px; }
    .indent { margin-left: 20px; }
    .terms { white-space: pre-wrap; margin: 4px 0; }
    .sig-block { display: flex; justify-content: space-between; margin-top: 60px; page-break-inside: avoid; }
    .sig-box { width: 45%; text-align: center; }
    .sig-line { border-top: 1px solid #000; margin-top: 70px; padding-top: 5px; }
    .sig-label { font-size: 9pt; color: #555; }
    .footer { margin-top: 30px; text-align: center; font-size: 8pt; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
    .warning-box { background: #fff3cd; border: 1px solid #ffc107; padding: 10px 14px; margin-bottom: 16px; font-size: 9pt; border-radius: 4px; }
    .warning-box ul { margin: 4px 0 4px 16px; }
    .warning-box li { margin: 2px 0; }
    @media print {
      .warning-box { display: none; }
      .no-print { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  ${warningBlock}

  <div class="city-date">${cityDate}</div>
  <h1>${title}</h1>
  <p style="text-align:center; font-size:10pt; margin-bottom:20px; color:#555;">
    ${c.type === 'OCCASIONAL' ? '(art. 19a ustawy z dnia 21 czerwca 2001 r. o ochronie praw lokatorów)' : c.type === 'INSTITUTIONAL' ? '(art. 19f ustawy z dnia 21 czerwca 2001 r. o ochronie praw lokatorów)' : '(art. 659–692 Kodeksu cywilnego)'}
  </p>

  ${paragraphs}

  <div class="sig-block">
    <div class="sig-box">
      <div class="sig-line">
        <strong>Wynajmujący</strong><br>
        <span class="sig-label">${ownerName}</span>
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-line">
        <strong>Najemca</strong><br>
        <span class="sig-label">${tenantName}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    Dokument wygenerowany przez system Flatro • ${fDate(today)}
  </div>

  <script class="no-print">
    window.onload = function() { setTimeout(function() { window.print(); }, 600); }
  </script>
</body>
</html>`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Read clauses and residents from request body
    let clauses: Record<string, boolean> = {}
    let residents: Array<{ firstName: string; lastName: string; pesel: string }> = []
    try {
      const body = await request.json()
      clauses = body.clauses || {}
      residents = body.residents || []
    } catch {
      // No body or invalid JSON — proceed without clauses
    }

    const contract = await prisma.contract.findFirst({
      where: { id, property: { userId: user.id } },
      include: {
        tenant: {
          select: {
            firstName: true, lastName: true, email: true, phone: true,
            nationalId: true, nationalIdType: true, pesel: true,
            citizenship: true, registrationAddress: true,
          },
        },
        property: {
          select: {
            name: true, address: true, city: true, postalCode: true,
            area: true, rooms: true, floor: true,
            user: {
              select: {
                firstName: true, lastName: true, email: true, phone: true,
                address: true, city: true, postalCode: true,
                nationalId: true, nationalIdType: true,
                iban: true, bankName: true, accountHolder: true,
              },
            },
          },
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const owner = contract.property.user || {}
    const html = generateHtml(contract, owner, clauses, residents)

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="umowa-${id.slice(0, 8)}.html"`,
      },
    })
  } catch (error) {
    console.error('Error generating contract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}