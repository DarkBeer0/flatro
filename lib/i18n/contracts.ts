// lib/i18n/contracts.ts
// Локализация модуля Contracts — Polish (основной язык)
// Подготовлено для будущей интеграции next-intl

export const contractsDict = {
  pl: {
    // Page titles
    title: 'Umowy',
    newContract: 'Nowa umowa',
    editContract: 'Edytuj umowę',
    contractDetails: 'Szczegóły umowy',
    createDescription: 'Utwórz nową umowę najmu',

    // Creation mode
    creationMode: {
      title: 'Sposób utworzenia',
      fromTemplate: 'Utwórz z szablonu',
      fromTemplateDesc: 'Wypełnij formularz i wygeneruj umowę',
      uploadPdf: 'Wgraj podpisaną umowę',
      uploadPdfDesc: 'Wgraj istniejący plik PDF/skan umowy',
    },

    // Contract types
    types: {
      STANDARD: 'Najem zwykły',
      OCCASIONAL: 'Najem okazjonalny',
      INSTITUTIONAL: 'Najem instytucjonalny',
    },
    typeDescriptions: {
      STANDARD: 'Standardowa umowa najmu lokalu mieszkalnego',
      OCCASIONAL: 'Wymaga aktu notarialnego i lokalu zastępczego',
      INSTITUTIONAL: 'Dla podmiotów prowadzących działalność gospodarczą',
    },

    // Statuses
    statuses: {
      DRAFT: 'Szkic',
      PENDING_SIGNATURE: 'Oczekuje na podpis',
      SIGNED: 'Podpisana',
      ACTIVE: 'Aktywna',
      EXPIRED: 'Wygasła',
      TERMINATED: 'Rozwiązana',
    },

    // Form sections
    sections: {
      contractType: 'Typ umowy',
      parties: 'Strony umowy',
      property: 'Nieruchomość',
      tenant: 'Najemca',
      duration: 'Okres obowiązywania',
      financial: 'Warunki finansowe',
      attachments: 'Wymagane załączniki',
      occasionalDocs: 'Dokumenty najmu okazjonalnego',
      notes: 'Dodatkowe ustalenia',
      substituteProperty: 'Lokal zastępczy',
    },

    // Form fields
    fields: {
      property: 'Nieruchomość',
      selectProperty: 'Wybierz nieruchomość',
      tenant: 'Najemca',
      selectTenant: 'Wybierz najemcę',
      addNewTenant: 'Dodaj nowego najemcę',
      startDate: 'Data rozpoczęcia',
      endDate: 'Data zakończenia',
      indefinite: 'Zostaw puste dla umowy na czas nieokreślony',

      // Financial
      rentAmount: 'Czynsz najmu (zł)',
      adminFee: 'Czynsz administracyjny (zł)',
      utilitiesAdvance: 'Zaliczka na media (zł)',
      totalMonthly: 'Łączna opłata miesięczna',
      depositAmount: 'Kaucja (zł)',
      depositHint: 'Zazwyczaj 1–2 miesięczne czynsze',
      paymentDay: 'Dzień płatności',
      dayOfMonth: 'dzień miesiąca',

      // Currency / scaling
      currency: 'Waluta',
      country: 'Kraj',

      // Notes
      notes: 'Notatki i uwagi',
      notesPlaceholder: 'Dodatkowe ustalenia, np. meble w cenie, miejsce parkingowe, zwierzęta dozwolone...',

      // Tenant fields
      pesel: 'PESEL',
      passportNumber: 'Numer paszportu',
      registrationAddress: 'Adres zameldowania',
      citizenship: 'Obywatelstwo',
      phone: 'Telefon',
      email: 'E-mail',

      // Occasional attachments
      aktNotarialny: 'Akt notarialny',
      aktNotarialnyDesc: 'Akt notarialny o poddaniu się egzekucji (wymagany)',
      substituteAddress: 'Adres lokalu zastępczego',
      substituteCity: 'Miasto',
      substitutePostalCode: 'Kod pocztowy',
      zgodaWlasciciela: 'Zgoda właściciela lokalu zastępczego',
      zgodaWlascicielaDesc: 'Oświadczenie właściciela o wyrażeniu zgody',
    },

    // Actions
    actions: {
      save: 'Zapisz umowę',
      saving: 'Zapisywanie...',
      cancel: 'Anuluj',
      back: 'Powrót do listy',
      uploadPdf: 'Wgraj PDF',
      downloadPdf: 'Pobierz PDF',
      generatePdf: 'Generuj PDF',
      changeStatus: 'Zmień status',
      delete: 'Usuń',
      addAttachment: 'Dodaj załącznik',
      viewAttachment: 'Zobacz',
      removeFile: 'Usuń plik',
      chooseFile: 'Wybierz plik',
      dragDrop: 'lub przeciągnij i upuść tutaj',
      maxFileSize: 'Maksymalny rozmiar: 10 MB',
    },

    // List / table
    table: {
      tenant: 'Najemca',
      property: 'Nieruchomość',
      type: 'Typ',
      period: 'Okres',
      rent: 'Czynsz',
      totalMonthly: 'Opłata miesięczna',
      status: 'Status',
      actions: 'Akcje',
      source: 'Źródło',
      pdfAttached: 'PDF załączony',
    },

    // Filters
    filters: {
      title: 'Filtr',
      allStatuses: 'Wszystkie statusy',
      allTypes: 'Wszystkie typy',
      reset: 'Resetuj',
    },

    // Empty state
    empty: {
      title: 'Brak umów',
      noResults: 'Brak umów spełniających kryteria',
      createFirst: 'Utwórz pierwszą umowę',
    },

    // Messages
    messages: {
      savedSuccess: 'Umowa została zapisana',
      uploadSuccess: 'Plik został wgrany',
      deleteConfirm: 'Czy na pewno chcesz usunąć tę umowę?',
      statusChanged: 'Status umowy został zmieniony',
      errorSaving: 'Błąd podczas zapisywania umowy',
      errorUploading: 'Błąd podczas wgrywania pliku',
      pdfSavedHint: 'Po zapisaniu możesz wygenerować PDF umowy',
      indefiniteLabel: 'na czas nieokreślony',
      paymentDue: 'płatne do',
    },

    // Detail page
    detail: {
      contractInfo: 'Informacje o umowie',
      tenantInfo: 'Dane najemcy',
      propertyInfo: 'Dane nieruchomości',
      financialInfo: 'Warunki finansowe',
      attachmentsList: 'Załączniki',
      noAttachments: 'Brak załączników',
      daysLeft: 'dni do końca umowy',
      perMonth: '/ mies.',
      deposit: 'Kaucja',
      paymentDueDay: 'Termin płatności',
    },
  },
} as const

export type ContractsLocale = keyof typeof contractsDict
export type ContractsTranslations = typeof contractsDict.pl

// Helper: получить словарь для текущей локали (по умолчанию pl)
export function getContractsT(locale: string = 'pl'): ContractsTranslations {
  return contractsDict[locale as ContractsLocale] || contractsDict.pl
}