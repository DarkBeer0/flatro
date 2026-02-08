// lib/i18n/dictionaries.ts

// Supported languages
export const locales = ['ru', 'pl', 'en', 'de', 'uk', 'cs'] as const
export type Locale = (typeof locales)[number]

export const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  pl: 'Polski',
  en: 'English',
  de: 'Deutsch',
  uk: 'Українська',
  cs: 'Čeština',
}

// Type for dictionary structure
export interface Dictionary {
  nav: {
    dashboard: string
    properties: string
    tenants: string
    payments: string
    contracts: string
    settings: string
    messages: string
  }
  common: {
    add: string
    edit: string
    delete: string
    save: string
    cancel: string
    back: string
    search: string
    filter: string
    all: string
    details: string
    actions: string
    loading: string
    noData: string
    yes: string
    no: string
    currency: string
    perMonth: string
    error: string
    yesterday: string
    backToDashboard: string
  }
  dashboard: {
    title: string
    welcome: string
    properties: string
    occupied: string
    vacant: string
    tenants: string
    activeTenants: string
    pendingPayments: string
    overdue: string
    monthlyIncome: string
    currentMonth: string
    quickActions: string
    addProperty: string
    addPropertyDesc: string
    addTenant: string
    addTenantDesc: string
    addPayment: string
    addPaymentDesc: string
    recentActivity: string
    noActivity: string
    noActivityDesc: string
  }
  properties: {
    title: string
    subtitle: string
    addNew: string
    total: string
    vacantCount: string
    rentedCount: string
    noProperties: string
    noPropertiesDesc: string
    area: string
    rooms: string
    floor: string
    rent: string
    noTenant: string
    status: { vacant: string; occupied: string; reserved: string }
  }
  tenants: {
    title: string
    subtitle: string
    addNew: string
    total: string
    active: string
    former: string
    activeTenants: string
    formerTenants: string
    noTenants: string
    noTenantsDesc: string
    noProperty: string
    status: { active: string; inactive: string }
  }
  payments: {
    title: string
    subtitle: string
    addNew: string
    received: string
    pending: string
    overdueAmount: string
    total: string
    noPayments: string
    noPaymentsDesc: string
    tenant: string
    property: string
    type: string
    period: string
    dueDate: string
    amount: string
    markAsPaid: string
    filters: { allStatuses: string; allTypes: string; allProperties: string }
    status: {
      pending: string
      pendingConfirmation: string
      paid: string
      overdue: string
      rejected: string
      cancelled: string
    }
    types: { rent: string; utilities: string; deposit: string; other: string }
  }
  contracts: {
    title: string
    subtitle: string
    addNew: string
    total: string
    activeCount: string
    expiringCount: string
    monthlyIncome: string
    expiringAlert: string
    expiringAlertDesc: string
    noContracts: string
    noContractsDesc: string
    expiresIn: string
    days: string
    payableBy: string
    indefinite: string
    status: { draft: string; active: string; expired: string; terminated: string }
    types: { standard: string; occasional: string; institutional: string }
  }
  settings: {
    title: string
    subtitle: string
    profile: string
    notifications: string
    billing: string
    security: string
    language: string
    profileData: string
    profileDataDesc: string
    name: string
    email: string
    phone: string
    company: string
    companyPlaceholder: string
    nip: string
    saveChanges: string
    saved: string
    logout: string
    languageDesc: string
    notificationsDesc: string
    emailPaymentReminders: string
    emailPaymentRemindersDesc: string
    emailContractExpiry: string
    emailContractExpiryDesc: string
    emailNewTenant: string
    emailNewTenantDesc: string
    securityDesc: string
    changePassword: string
    dangerZone: string
    deleteAccount: string
    deleteAccountDesc: string
  }
  forms: {
    required: string
    optional: string
    selectOption: string
    basicInfo: string
    propertyDetails: string
    financialInfo: string
    additionalInfo: string
    notes: string
  }
  messages: {
    title: string
    unread: string
    chatWithOwner: string
    chatWithTenants: string
    you: string
    clickToChat: string
    noChats: string
    noChatsDesc: string
    sendMessage: string
    typeMessage: string
  }
  tenant: {
    myHousing: string
    myPayments: string
    tickets: string
    noProperty: string
    noPropertyDesc: string
    welcomeTitle: string
    welcomeSubtitle: string
  }
  auth: {
    login: string
    register: string
    logout: string
    email: string
    password: string
    confirmPassword: string
    firstName: string
    lastName: string
    forgotPassword: string
    noAccount: string
    hasAccount: string
    termsAccept: string
    termsLink: string
    privacyLink: string
    continueWithGoogle: string
    orDivider: string
  }
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries.ru
}

// DICTIONARIES
export const dictionaries: Record<Locale, Dictionary> = {
  // RUSSIAN
  ru: {
    nav: {
      dashboard: 'Главная',
      properties: 'Недвижимость',
      tenants: 'Арендаторы',
      payments: 'Платежи',
      contracts: 'Договоры',
      settings: 'Настройки',
      messages: 'Сообщения',
    },
    common: {
      add: 'Добавить',
      edit: 'Редактировать',
      delete: 'Удалить',
      save: 'Сохранить',
      cancel: 'Отмена',
      back: 'Назад',
      search: 'Поиск',
      filter: 'Фильтр',
      all: 'Все',
      details: 'Подробнее',
      actions: 'Действия',
      loading: 'Загрузка...',
      noData: 'Нет данных',
      yes: 'Да',
      no: 'Нет',
      currency: 'zł',
      perMonth: '/ месяц',
      error: 'Ошибка',
      yesterday: 'Вчера',
      backToDashboard: 'Вернуться на главную',
    },
    dashboard: {
      title: 'Главная',
      welcome: 'Добро пожаловать в Flatro! Управляйте своей недвижимостью.',
      properties: 'Недвижимость',
      occupied: 'занято',
      vacant: 'свободно',
      tenants: 'Арендаторы',
      activeTenants: 'Активных арендаторов',
      pendingPayments: 'Ожидающие платежи',
      overdue: 'просроченных',
      monthlyIncome: 'Месячный доход',
      currentMonth: 'Текущий месяц',
      quickActions: 'Быстрые действия',
      addProperty: 'Добавить недвижимость',
      addPropertyDesc: 'Добавить новую квартиру или дом',
      addTenant: 'Добавить арендатора',
      addTenantDesc: 'Зарегистрировать нового арендатора',
      addPayment: 'Добавить платёж',
      addPaymentDesc: 'Зарегистрировать полученный платёж',
      recentActivity: 'Последние действия',
      noActivity: 'Нет активности',
      noActivityDesc: 'Добавьте первую недвижимость, чтобы начать',
    },
    properties: {
      title: 'Недвижимость',
      subtitle: 'Управление вашей недвижимостью',
      addNew: 'Добавить недвижимость',
      total: 'Всего',
      vacantCount: 'Свободных',
      rentedCount: 'Сданных',
      noProperties: 'Нет недвижимости',
      noPropertiesDesc: 'Добавьте первую недвижимость для начала управления',
      area: 'Площадь',
      rooms: 'Комнаты',
      floor: 'Этаж',
      rent: 'Аренда',
      noTenant: 'Нет арендатора',
      status: { vacant: 'Свободно', occupied: 'Сдано', reserved: 'Забронировано' },
    },
    tenants: {
      title: 'Арендаторы',
      subtitle: 'Управление арендаторами вашей недвижимости',
      addNew: 'Добавить арендатора',
      total: 'Всего',
      active: 'Активных',
      former: 'Бывших',
      activeTenants: 'Активные арендаторы',
      formerTenants: 'Бывшие арендаторы',
      noTenants: 'Нет арендаторов',
      noTenantsDesc: 'Добавьте первого арендатора для начала управления',
      noProperty: 'Не привязан к недвижимости',
      status: { active: 'Активный', inactive: 'Неактивный' },
    },
    payments: {
      title: 'Платежи',
      subtitle: 'Отслеживание платежей от арендаторов',
      addNew: 'Добавить платёж',
      received: 'Получено',
      pending: 'Ожидается',
      overdueAmount: 'Просрочено',
      total: 'Всего',
      noPayments: 'Нет платежей',
      noPaymentsDesc: 'Добавьте первый платёж для начала отслеживания',
      tenant: 'Арендатор',
      property: 'Недвижимость',
      type: 'Тип',
      period: 'Период',
      dueDate: 'Срок',
      amount: 'Сумма',
      markAsPaid: 'Отметить как оплаченный',
      filters: { allStatuses: 'Все статусы', allTypes: 'Все типы', allProperties: 'Вся недвижимость' },
      status: {
        pending: 'Ожидает',
        pendingConfirmation: 'На подтверждении',
        paid: 'Оплачено',
        overdue: 'Просрочено',
        rejected: 'Отклонено',
        cancelled: 'Отменено',
      },
      types: { rent: 'Аренда', utilities: 'Коммунальные', deposit: 'Залог', other: 'Другое' },
    },
    contracts: {
      title: 'Договоры',
      subtitle: 'Управление договорами аренды',
      addNew: 'Новый договор',
      total: 'Всего',
      activeCount: 'Активных',
      expiringCount: 'Истекающих',
      monthlyIncome: 'Месячный доход',
      expiringAlert: 'Истекающие договоры',
      expiringAlertDesc: 'договоров истекают в течение 30 дней.',
      noContracts: 'Нет договоров',
      noContractsDesc: 'Создайте первый договор аренды',
      expiresIn: 'Истекает через',
      days: 'дней',
      payableBy: 'оплата до',
      indefinite: 'бессрочно',
      status: { draft: 'Черновик', active: 'Активный', expired: 'Истёк', terminated: 'Расторгнут' },
      types: { standard: 'Стандартная аренда', occasional: 'Случайная аренда', institutional: 'Институциональная' },
    },
    settings: {
      title: 'Настройки',
      subtitle: 'Управление вашим аккаунтом и предпочтениями',
      profile: 'Профиль',
      notifications: 'Уведомления',
      billing: 'Подписка',
      security: 'Безопасность',
      language: 'Язык',
      profileData: 'Данные профиля',
      profileDataDesc: 'Обновите ваши личные данные',
      name: 'Имя и фамилия',
      email: 'Email',
      phone: 'Телефон',
      company: 'Название компании',
      companyPlaceholder: 'Для счетов',
      nip: 'NIP',
      saveChanges: 'Сохранить изменения',
      saved: 'Сохранено',
      logout: 'Выйти',
      languageDesc: 'Выберите язык интерфейса',
      notificationsDesc: 'Настройте уведомления по email',
      emailPaymentReminders: 'Напоминания о платежах',
      emailPaymentRemindersDesc: 'Получайте уведомления о предстоящих и просроченных платежах',
      emailContractExpiry: 'Истекающие договоры',
      emailContractExpiryDesc: 'Получайте уведомления об истекающих договорах',
      emailNewTenant: 'Новые арендаторы',
      emailNewTenantDesc: 'Получайте уведомления о добавлении новых арендаторов',
      securityDesc: 'Управление паролем и безопасностью аккаунта',
      changePassword: 'Изменить пароль',
      dangerZone: 'Опасная зона',
      deleteAccount: 'Удалить аккаунт',
      deleteAccountDesc: 'Удаление аккаунта необратимо. Все данные будут потеряны.',
    },
    forms: {
      required: 'Обязательно',
      optional: 'Опционально',
      selectOption: 'Выберите...',
      basicInfo: 'Основная информация',
      propertyDetails: 'Детали недвижимости',
      financialInfo: 'Финансовая информация',
      additionalInfo: 'Дополнительная информация',
      notes: 'Примечания',
    },
    messages: {
      title: 'Сообщения',
      unread: 'непрочитанных',
      chatWithOwner: 'Общение с владельцем квартиры',
      chatWithTenants: 'Общение с арендаторами',
      you: 'Вы',
      clickToChat: 'Нажмите, чтобы открыть чат',
      noChats: 'Нет чатов',
      noChatsDesc: 'Чаты появятся, когда арендаторы зарегистрируются',
      sendMessage: 'Отправить',
      typeMessage: 'Введите сообщение...',
    },
    tenant: {
      myHousing: 'Моё жильё',
      myPayments: 'Мои платежи',
      tickets: 'Заявки',
      noProperty: 'Нет привязанной квартиры',
      noPropertyDesc: 'Попросите владельца отправить вам приглашение',
      welcomeTitle: 'Добро пожаловать!',
      welcomeSubtitle: 'Ваш личный кабинет жильца',
    },
    auth: {
      login: 'Войти',
      register: 'Зарегистрироваться',
      logout: 'Выйти',
      email: 'Email',
      password: 'Пароль',
      confirmPassword: 'Подтвердите пароль',
      firstName: 'Имя',
      lastName: 'Фамилия',
      forgotPassword: 'Забыли пароль?',
      noAccount: 'Нет аккаунта?',
      hasAccount: 'Уже есть аккаунт?',
      termsAccept: 'Я принимаю',
      termsLink: 'Пользовательское соглашение',
      privacyLink: 'Политику конфиденциальности',
      continueWithGoogle: 'Продолжить с Google',
      orDivider: 'или',
    },
  },

  // POLISH
  pl: {
    nav: {
      dashboard: 'Główna',
      properties: 'Nieruchomości',
      tenants: 'Najemcy',
      payments: 'Płatności',
      contracts: 'Umowy',
      settings: 'Ustawienia',
      messages: 'Wiadomości',
    },
    common: {
      add: 'Dodaj',
      edit: 'Edytuj',
      delete: 'Usuń',
      save: 'Zapisz',
      cancel: 'Anuluj',
      back: 'Wstecz',
      search: 'Szukaj',
      filter: 'Filtruj',
      all: 'Wszystkie',
      details: 'Szczegóły',
      actions: 'Akcje',
      loading: 'Ładowanie...',
      noData: 'Brak danych',
      yes: 'Tak',
      no: 'Nie',
      currency: 'zł',
      perMonth: '/ miesiąc',
      error: 'Błąd',
      yesterday: 'Wczoraj',
      backToDashboard: 'Powrót do strony głównej',
    },
    dashboard: {
      title: 'Główna',
      welcome: 'Witaj w Flatro! Zarządzaj swoimi nieruchomościami.',
      properties: 'Nieruchomości',
      occupied: 'wynajęte',
      vacant: 'wolne',
      tenants: 'Najemcy',
      activeTenants: 'Aktywnych najemców',
      pendingPayments: 'Oczekujące płatności',
      overdue: 'zaległych',
      monthlyIncome: 'Miesięczny przychód',
      currentMonth: 'Bieżący miesiąc',
      quickActions: 'Szybkie akcje',
      addProperty: 'Dodaj nieruchomość',
      addPropertyDesc: 'Dodaj nowe mieszkanie lub dom',
      addTenant: 'Dodaj najemcę',
      addTenantDesc: 'Zarejestruj nowego najemcę',
      addPayment: 'Dodaj płatność',
      addPaymentDesc: 'Zarejestruj otrzymaną płatność',
      recentActivity: 'Ostatnia aktywność',
      noActivity: 'Brak aktywności',
      noActivityDesc: 'Dodaj pierwszą nieruchomość, aby rozpocząć',
    },
    properties: {
      title: 'Nieruchomości',
      subtitle: 'Zarządzaj swoimi nieruchomościami',
      addNew: 'Dodaj nieruchomość',
      total: 'Wszystkich',
      vacantCount: 'Wolnych',
      rentedCount: 'Wynajętych',
      noProperties: 'Brak nieruchomości',
      noPropertiesDesc: 'Dodaj pierwszą nieruchomość, aby rozpocząć zarządzanie',
      area: 'Powierzchnia',
      rooms: 'Pokoje',
      floor: 'Piętro',
      rent: 'Czynsz',
      noTenant: 'Brak najemcy',
      status: { vacant: 'Wolne', occupied: 'Wynajęte', reserved: 'Zarezerwowane' },
    },
    tenants: {
      title: 'Najemcy',
      subtitle: 'Zarządzaj najemcami swoich nieruchomości',
      addNew: 'Dodaj najemcę',
      total: 'Wszystkich',
      active: 'Aktywnych',
      former: 'Byłych',
      activeTenants: 'Aktywni najemcy',
      formerTenants: 'Byli najemcy',
      noTenants: 'Brak najemców',
      noTenantsDesc: 'Dodaj pierwszego najemcę, aby rozpocząć zarządzanie',
      noProperty: 'Nieprzypisana nieruchomość',
      status: { active: 'Aktywny', inactive: 'Nieaktywny' },
    },
    payments: {
      title: 'Płatności',
      subtitle: 'Śledź płatności od najemców',
      addNew: 'Dodaj płatność',
      received: 'Otrzymane',
      pending: 'Oczekujące',
      overdueAmount: 'Zaległe',
      total: 'Wszystkich',
      noPayments: 'Brak płatności',
      noPaymentsDesc: 'Dodaj pierwszą płatność, aby rozpocząć śledzenie',
      tenant: 'Najemca',
      property: 'Nieruchomość',
      type: 'Typ',
      period: 'Okres',
      dueDate: 'Termin',
      amount: 'Kwota',
      markAsPaid: 'Oznacz jako zapłacone',
      filters: { allStatuses: 'Wszystkie statusy', allTypes: 'Wszystkie typy', allProperties: 'Wszystkie nieruchomości' },
      status: {
        pending: 'Oczekuje',
        pendingConfirmation: 'W trakcie potwierdzania',
        paid: 'Zapłacono',
        overdue: 'Zaległa',
        rejected: 'Odrzucona',
        cancelled: 'Anulowana',
      },
      types: { rent: 'Czynsz', utilities: 'Media', deposit: 'Kaucja', other: 'Inne' },
    },
    contracts: {
      title: 'Umowy',
      subtitle: 'Zarządzaj umowami najmu',
      addNew: 'Nowa umowa',
      total: 'Wszystkich',
      activeCount: 'Aktywnych',
      expiringCount: 'Wygasających',
      monthlyIncome: 'Miesięczny przychód',
      expiringAlert: 'Umowy wygasające wkrótce',
      expiringAlertDesc: 'umowy wygasają w ciągu 30 dni.',
      noContracts: 'Brak umów',
      noContractsDesc: 'Utwórz pierwszą umowę najmu',
      expiresIn: 'Wygasa za',
      days: 'dni',
      payableBy: 'płatne do',
      indefinite: 'bezterminowo',
      status: { draft: 'Szkic', active: 'Aktywna', expired: 'Wygasła', terminated: 'Rozwiązana' },
      types: { standard: 'Zwykły najem', occasional: 'Najem okazjonalny', institutional: 'Najem instytucjonalny' },
    },
    settings: {
      title: 'Ustawienia',
      subtitle: 'Zarządzaj swoim kontem i preferencjami',
      profile: 'Profil',
      notifications: 'Powiadomienia',
      billing: 'Subskrypcja',
      security: 'Bezpieczeństwo',
      language: 'Język',
      profileData: 'Dane profilowe',
      profileDataDesc: 'Zaktualizuj swoje dane osobowe',
      name: 'Imię i nazwisko',
      email: 'Email',
      phone: 'Telefon',
      company: 'Nazwa firmy',
      companyPlaceholder: 'Dla faktur',
      nip: 'NIP',
      saveChanges: 'Zapisz zmiany',
      saved: 'Zapisano',
      logout: 'Wyloguj',
      languageDesc: 'Wybierz język interfejsu',
      notificationsDesc: 'Skonfiguruj powiadomienia email',
      emailPaymentReminders: 'Przypomnienia o płatnościach',
      emailPaymentRemindersDesc: 'Otrzymuj powiadomienia o zbliżających się i zaległych płatnościach',
      emailContractExpiry: 'Wygasające umowy',
      emailContractExpiryDesc: 'Otrzymuj powiadomienia o wygasających umowach',
      emailNewTenant: 'Nowi najemcy',
      emailNewTenantDesc: 'Otrzymuj powiadomienia o dodaniu nowych najemców',
      securityDesc: 'Zarządzanie hasłem i bezpieczeństwem konta',
      changePassword: 'Zmień hasło',
      dangerZone: 'Strefa niebezpieczna',
      deleteAccount: 'Usuń konto',
      deleteAccountDesc: 'Usunięcie konta jest nieodwracalne. Wszystkie dane zostaną utracone.',
    },
    forms: {
      required: 'Wymagane',
      optional: 'Opcjonalne',
      selectOption: 'Wybierz...',
      basicInfo: 'Podstawowe informacje',
      propertyDetails: 'Szczegóły nieruchomości',
      financialInfo: 'Informacje finansowe',
      additionalInfo: 'Dodatkowe informacje',
      notes: 'Notatki',
    },
    messages: {
      title: 'Wiadomości',
      unread: 'nieprzeczytanych',
      chatWithOwner: 'Rozmowa z właścicielem mieszkania',
      chatWithTenants: 'Rozmowy z najemcami',
      you: 'Ty',
      clickToChat: 'Kliknij, aby otworzyć czat',
      noChats: 'Brak czatów',
      noChatsDesc: 'Czaty pojawią się, gdy najemcy się zarejestrują',
      sendMessage: 'Wyślij',
      typeMessage: 'Wpisz wiadomość...',
    },
    tenant: {
      myHousing: 'Moje mieszkanie',
      myPayments: 'Moje płatności',
      tickets: 'Zgłoszenia',
      noProperty: 'Brak przypisanego mieszkania',
      noPropertyDesc: 'Poproś właściciela o wysłanie zaproszenia',
      welcomeTitle: 'Witaj!',
      welcomeSubtitle: 'Twój panel najemcy',
    },
    auth: {
      login: 'Zaloguj się',
      register: 'Zarejestruj się',
      logout: 'Wyloguj',
      email: 'Email',
      password: 'Hasło',
      confirmPassword: 'Potwierdź hasło',
      firstName: 'Imię',
      lastName: 'Nazwisko',
      forgotPassword: 'Zapomniałeś hasła?',
      noAccount: 'Nie masz konta?',
      hasAccount: 'Masz już konto?',
      termsAccept: 'Akceptuję',
      termsLink: 'Regulamin',
      privacyLink: 'Politykę prywatności',
      continueWithGoogle: 'Kontynuuj z Google',
      orDivider: 'lub',
    },
  },

  // ENGLISH
  en: {
    nav: {
      dashboard: 'Dashboard',
      properties: 'Properties',
      tenants: 'Tenants',
      payments: 'Payments',
      contracts: 'Contracts',
      settings: 'Settings',
      messages: 'Messages',
    },
    common: {
      add: 'Add',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      back: 'Back',
      search: 'Search',
      filter: 'Filter',
      all: 'All',
      details: 'Details',
      actions: 'Actions',
      loading: 'Loading...',
      noData: 'No data',
      yes: 'Yes',
      no: 'No',
      currency: 'zł',
      perMonth: '/ month',
      error: 'Error',
      yesterday: 'Yesterday',
      backToDashboard: 'Back to dashboard',
    },
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome to Flatro! Manage your properties.',
      properties: 'Properties',
      occupied: 'occupied',
      vacant: 'vacant',
      tenants: 'Tenants',
      activeTenants: 'Active tenants',
      pendingPayments: 'Pending payments',
      overdue: 'overdue',
      monthlyIncome: 'Monthly income',
      currentMonth: 'Current month',
      quickActions: 'Quick actions',
      addProperty: 'Add property',
      addPropertyDesc: 'Add a new apartment or house',
      addTenant: 'Add tenant',
      addTenantDesc: 'Register a new tenant',
      addPayment: 'Add payment',
      addPaymentDesc: 'Register received payment',
      recentActivity: 'Recent activity',
      noActivity: 'No activity',
      noActivityDesc: 'Add your first property to get started',
    },
    properties: {
      title: 'Properties',
      subtitle: 'Manage your properties',
      addNew: 'Add property',
      total: 'Total',
      vacantCount: 'Vacant',
      rentedCount: 'Rented',
      noProperties: 'No properties',
      noPropertiesDesc: 'Add your first property to start managing',
      area: 'Area',
      rooms: 'Rooms',
      floor: 'Floor',
      rent: 'Rent',
      noTenant: 'No tenant',
      status: { vacant: 'Vacant', occupied: 'Occupied', reserved: 'Reserved' },
    },
    tenants: {
      title: 'Tenants',
      subtitle: 'Manage your property tenants',
      addNew: 'Add tenant',
      total: 'Total',
      active: 'Active',
      former: 'Former',
      activeTenants: 'Active tenants',
      formerTenants: 'Former tenants',
      noTenants: 'No tenants',
      noTenantsDesc: 'Add your first tenant to start managing',
      noProperty: 'Not assigned to property',
      status: { active: 'Active', inactive: 'Inactive' },
    },
    payments: {
      title: 'Payments',
      subtitle: 'Track payments from tenants',
      addNew: 'Add payment',
      received: 'Received',
      pending: 'Pending',
      overdueAmount: 'Overdue',
      total: 'Total',
      noPayments: 'No payments',
      noPaymentsDesc: 'Add your first payment to start tracking',
      tenant: 'Tenant',
      property: 'Property',
      type: 'Type',
      period: 'Period',
      dueDate: 'Due date',
      amount: 'Amount',
      markAsPaid: 'Mark as paid',
      filters: { allStatuses: 'All statuses', allTypes: 'All types', allProperties: 'All properties' },
      status: {
        pending: 'Pending',
        pendingConfirmation: 'Pending confirmation',
        paid: 'Paid',
        overdue: 'Overdue',
        rejected: 'Rejected',
        cancelled: 'Cancelled',
      },
      types: { rent: 'Rent', utilities: 'Utilities', deposit: 'Deposit', other: 'Other' },
    },
    contracts: {
      title: 'Contracts',
      subtitle: 'Manage rental contracts',
      addNew: 'New contract',
      total: 'Total',
      activeCount: 'Active',
      expiringCount: 'Expiring',
      monthlyIncome: 'Monthly income',
      expiringAlert: 'Expiring contracts',
      expiringAlertDesc: 'contracts expire within 30 days.',
      noContracts: 'No contracts',
      noContractsDesc: 'Create your first rental contract',
      expiresIn: 'Expires in',
      days: 'days',
      payableBy: 'payable by',
      indefinite: 'indefinite',
      status: { draft: 'Draft', active: 'Active', expired: 'Expired', terminated: 'Terminated' },
      types: { standard: 'Standard rental', occasional: 'Occasional rental', institutional: 'Institutional rental' },
    },
    settings: {
      title: 'Settings',
      subtitle: 'Manage your account and preferences',
      profile: 'Profile',
      notifications: 'Notifications',
      billing: 'Billing',
      security: 'Security',
      language: 'Language',
      profileData: 'Profile data',
      profileDataDesc: 'Update your personal information',
      name: 'Full name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company name',
      companyPlaceholder: 'For invoices',
      nip: 'Tax ID',
      saveChanges: 'Save changes',
      saved: 'Saved',
      logout: 'Log out',
      languageDesc: 'Choose interface language',
      notificationsDesc: 'Configure email notifications',
      emailPaymentReminders: 'Payment reminders',
      emailPaymentRemindersDesc: 'Receive notifications about upcoming and overdue payments',
      emailContractExpiry: 'Expiring contracts',
      emailContractExpiryDesc: 'Receive notifications about expiring contracts',
      emailNewTenant: 'New tenants',
      emailNewTenantDesc: 'Receive notifications about new tenants',
      securityDesc: 'Manage password and account security',
      changePassword: 'Change password',
      dangerZone: 'Danger zone',
      deleteAccount: 'Delete account',
      deleteAccountDesc: 'Account deletion is irreversible. All data will be lost.',
    },
    forms: {
      required: 'Required',
      optional: 'Optional',
      selectOption: 'Select...',
      basicInfo: 'Basic information',
      propertyDetails: 'Property details',
      financialInfo: 'Financial information',
      additionalInfo: 'Additional information',
      notes: 'Notes',
    },
    messages: {
      title: 'Messages',
      unread: 'unread',
      chatWithOwner: 'Chat with property owner',
      chatWithTenants: 'Chat with tenants',
      you: 'You',
      clickToChat: 'Click to open chat',
      noChats: 'No chats',
      noChatsDesc: 'Chats will appear when tenants register',
      sendMessage: 'Send',
      typeMessage: 'Type a message...',
    },
    tenant: {
      myHousing: 'My housing',
      myPayments: 'My payments',
      tickets: 'Tickets',
      noProperty: 'No assigned property',
      noPropertyDesc: 'Ask the owner to send you an invitation',
      welcomeTitle: 'Welcome!',
      welcomeSubtitle: 'Your tenant dashboard',
    },
    auth: {
      login: 'Log in',
      register: 'Register',
      logout: 'Log out',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm password',
      firstName: 'First name',
      lastName: 'Last name',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      termsAccept: 'I accept the',
      termsLink: 'Terms of Service',
      privacyLink: 'Privacy Policy',
      continueWithGoogle: 'Continue with Google',
      orDivider: 'or',
    },
  },

  // GERMAN
  de: {
    nav: {
      dashboard: 'Übersicht',
      properties: 'Immobilien',
      tenants: 'Mieter',
      payments: 'Zahlungen',
      contracts: 'Verträge',
      settings: 'Einstellungen',
      messages: 'Nachrichten',
    },
    common: {
      add: 'Hinzufügen',
      edit: 'Bearbeiten',
      delete: 'Löschen',
      save: 'Speichern',
      cancel: 'Abbrechen',
      back: 'Zurück',
      search: 'Suchen',
      filter: 'Filter',
      all: 'Alle',
      details: 'Details',
      actions: 'Aktionen',
      loading: 'Laden...',
      noData: 'Keine Daten',
      yes: 'Ja',
      no: 'Nein',
      currency: '€',
      perMonth: '/ Monat',
      error: 'Fehler',
      yesterday: 'Gestern',
      backToDashboard: 'Zurück zur Übersicht',
    },
    dashboard: {
      title: 'Übersicht',
      welcome: 'Willkommen bei Flatro! Verwalten Sie Ihre Immobilien.',
      properties: 'Immobilien',
      occupied: 'vermietet',
      vacant: 'frei',
      tenants: 'Mieter',
      activeTenants: 'Aktive Mieter',
      pendingPayments: 'Ausstehende Zahlungen',
      overdue: 'überfällig',
      monthlyIncome: 'Monatliches Einkommen',
      currentMonth: 'Aktueller Monat',
      quickActions: 'Schnellaktionen',
      addProperty: 'Immobilie hinzufügen',
      addPropertyDesc: 'Eine neue Wohnung oder ein Haus hinzufügen',
      addTenant: 'Mieter hinzufügen',
      addTenantDesc: 'Einen neuen Mieter registrieren',
      addPayment: 'Zahlung hinzufügen',
      addPaymentDesc: 'Erhaltene Zahlung registrieren',
      recentActivity: 'Letzte Aktivität',
      noActivity: 'Keine Aktivität',
      noActivityDesc: 'Fügen Sie Ihre erste Immobilie hinzu, um zu beginnen',
    },
    properties: {
      title: 'Immobilien',
      subtitle: 'Verwalten Sie Ihre Immobilien',
      addNew: 'Immobilie hinzufügen',
      total: 'Gesamt',
      vacantCount: 'Frei',
      rentedCount: 'Vermietet',
      noProperties: 'Keine Immobilien',
      noPropertiesDesc: 'Fügen Sie Ihre erste Immobilie hinzu, um mit der Verwaltung zu beginnen',
      area: 'Fläche',
      rooms: 'Zimmer',
      floor: 'Etage',
      rent: 'Miete',
      noTenant: 'Kein Mieter',
      status: { vacant: 'Frei', occupied: 'Vermietet', reserved: 'Reserviert' },
    },
    tenants: {
      title: 'Mieter',
      subtitle: 'Verwalten Sie die Mieter Ihrer Immobilien',
      addNew: 'Mieter hinzufügen',
      total: 'Gesamt',
      active: 'Aktiv',
      former: 'Ehemalig',
      activeTenants: 'Aktive Mieter',
      formerTenants: 'Ehemalige Mieter',
      noTenants: 'Keine Mieter',
      noTenantsDesc: 'Fügen Sie Ihren ersten Mieter hinzu, um mit der Verwaltung zu beginnen',
      noProperty: 'Nicht zugewiesen',
      status: { active: 'Aktiv', inactive: 'Inaktiv' },
    },
    payments: {
      title: 'Zahlungen',
      subtitle: 'Verfolgen Sie Zahlungen von Mietern',
      addNew: 'Zahlung hinzufügen',
      received: 'Erhalten',
      pending: 'Ausstehend',
      overdueAmount: 'Überfällig',
      total: 'Gesamt',
      noPayments: 'Keine Zahlungen',
      noPaymentsDesc: 'Fügen Sie Ihre erste Zahlung hinzu, um mit der Verfolgung zu beginnen',
      tenant: 'Mieter',
      property: 'Immobilie',
      type: 'Typ',
      period: 'Zeitraum',
      dueDate: 'Fälligkeitsdatum',
      amount: 'Betrag',
      markAsPaid: 'Als bezahlt markieren',
      filters: { allStatuses: 'Alle Status', allTypes: 'Alle Typen', allProperties: 'Alle Immobilien' },
      status: {
        pending: 'Ausstehend',
        pendingConfirmation: 'Bestätigung ausstehend',
        paid: 'Bezahlt',
        overdue: 'Überfällig',
        rejected: 'Abgelehnt',
        cancelled: 'Storniert',
      },
      types: { rent: 'Miete', utilities: 'Nebenkosten', deposit: 'Kaution', other: 'Sonstiges' },
    },
    contracts: {
      title: 'Verträge',
      subtitle: 'Mietverträge verwalten',
      addNew: 'Neuer Vertrag',
      total: 'Gesamt',
      activeCount: 'Aktiv',
      expiringCount: 'Auslaufend',
      monthlyIncome: 'Monatliches Einkommen',
      expiringAlert: 'Auslaufende Verträge',
      expiringAlertDesc: 'Verträge laufen innerhalb von 30 Tagen aus.',
      noContracts: 'Keine Verträge',
      noContractsDesc: 'Erstellen Sie Ihren ersten Mietvertrag',
      expiresIn: 'Läuft aus in',
      days: 'Tagen',
      payableBy: 'zahlbar bis',
      indefinite: 'unbefristet',
      status: { draft: 'Entwurf', active: 'Aktiv', expired: 'Abgelaufen', terminated: 'Gekündigt' },
      types: { standard: 'Standardmiete', occasional: 'Gelegenheitsmiete', institutional: 'Institutionelle Miete' },
    },
    settings: {
      title: 'Einstellungen',
      subtitle: 'Verwalten Sie Ihr Konto und Ihre Präferenzen',
      profile: 'Profil',
      notifications: 'Benachrichtigungen',
      billing: 'Abrechnung',
      security: 'Sicherheit',
      language: 'Sprache',
      profileData: 'Profildaten',
      profileDataDesc: 'Aktualisieren Sie Ihre persönlichen Daten',
      name: 'Vollständiger Name',
      email: 'E-Mail',
      phone: 'Telefon',
      company: 'Firmenname',
      companyPlaceholder: 'Für Rechnungen',
      nip: 'Steuer-ID',
      saveChanges: 'Änderungen speichern',
      saved: 'Gespeichert',
      logout: 'Abmelden',
      languageDesc: 'Wählen Sie die Sprache der Benutzeroberfläche',
      notificationsDesc: 'Konfigurieren Sie E-Mail-Benachrichtigungen',
      emailPaymentReminders: 'Zahlungserinnerungen',
      emailPaymentRemindersDesc: 'Erhalten Sie Benachrichtigungen über anstehende und überfällige Zahlungen',
      emailContractExpiry: 'Auslaufende Verträge',
      emailContractExpiryDesc: 'Erhalten Sie Benachrichtigungen über auslaufende Verträge',
      emailNewTenant: 'Neue Mieter',
      emailNewTenantDesc: 'Erhalten Sie Benachrichtigungen über neue Mieter',
      securityDesc: 'Passwort und Kontosicherheit verwalten',
      changePassword: 'Passwort ändern',
      dangerZone: 'Gefahrenzone',
      deleteAccount: 'Konto löschen',
      deleteAccountDesc: 'Das Löschen des Kontos ist unwiderruflich. Alle Daten gehen verloren.',
    },
    forms: {
      required: 'Erforderlich',
      optional: 'Optional',
      selectOption: 'Auswählen...',
      basicInfo: 'Grundinformationen',
      propertyDetails: 'Immobiliendetails',
      financialInfo: 'Finanzinformationen',
      additionalInfo: 'Zusätzliche Informationen',
      notes: 'Notizen',
    },
    messages: {
      title: 'Nachrichten',
      unread: 'ungelesen',
      chatWithOwner: 'Chat mit dem Eigentümer',
      chatWithTenants: 'Chat mit Mietern',
      you: 'Sie',
      clickToChat: 'Klicken Sie, um den Chat zu öffnen',
      noChats: 'Keine Chats',
      noChatsDesc: 'Chats erscheinen, wenn Mieter sich registrieren',
      sendMessage: 'Senden',
      typeMessage: 'Nachricht eingeben...',
    },
    tenant: {
      myHousing: 'Meine Wohnung',
      myPayments: 'Meine Zahlungen',
      tickets: 'Anfragen',
      noProperty: 'Keine zugewiesene Immobilie',
      noPropertyDesc: 'Bitten Sie den Eigentümer, Ihnen eine Einladung zu senden',
      welcomeTitle: 'Willkommen!',
      welcomeSubtitle: 'Ihr Mieter-Dashboard',
    },
    auth: {
      login: 'Anmelden',
      register: 'Registrieren',
      logout: 'Abmelden',
      email: 'E-Mail',
      password: 'Passwort',
      confirmPassword: 'Passwort bestätigen',
      firstName: 'Vorname',
      lastName: 'Nachname',
      forgotPassword: 'Passwort vergessen?',
      noAccount: 'Noch kein Konto?',
      hasAccount: 'Bereits ein Konto?',
      termsAccept: 'Ich akzeptiere die',
      termsLink: 'Nutzungsbedingungen',
      privacyLink: 'Datenschutzrichtlinie',
      continueWithGoogle: 'Mit Google fortfahren',
      orDivider: 'oder',
    },
  },

  // UKRAINIAN
  uk: {
    nav: {
      dashboard: 'Головна',
      properties: 'Нерухомість',
      tenants: 'Орендарі',
      payments: 'Платежі',
      contracts: 'Договори',
      settings: 'Налаштування',
      messages: 'Повідомлення',
    },
    common: {
      add: 'Додати',
      edit: 'Редагувати',
      delete: 'Видалити',
      save: 'Зберегти',
      cancel: 'Скасувати',
      back: 'Назад',
      search: 'Пошук',
      filter: 'Фільтр',
      all: 'Всі',
      details: 'Детальніше',
      actions: 'Дії',
      loading: 'Завантаження...',
      noData: 'Немає даних',
      yes: 'Так',
      no: 'Ні',
      currency: 'zł',
      perMonth: '/ місяць',
      error: 'Помилка',
      yesterday: 'Вчора',
      backToDashboard: 'Повернутися на головну',
    },
    dashboard: {
      title: 'Головна',
      welcome: 'Ласкаво просимо до Flatro! Керуйте своєю нерухомістю.',
      properties: 'Нерухомість',
      occupied: 'зайнято',
      vacant: 'вільно',
      tenants: 'Орендарі',
      activeTenants: 'Активних орендарів',
      pendingPayments: 'Очікувані платежі',
      overdue: 'прострочених',
      monthlyIncome: 'Місячний дохід',
      currentMonth: 'Поточний місяць',
      quickActions: 'Швидкі дії',
      addProperty: 'Додати нерухомість',
      addPropertyDesc: 'Додати нову квартиру або будинок',
      addTenant: 'Додати орендаря',
      addTenantDesc: 'Зареєструвати нового орендаря',
      addPayment: 'Додати платіж',
      addPaymentDesc: 'Зареєструвати отриманий платіж',
      recentActivity: 'Останні дії',
      noActivity: 'Немає активності',
      noActivityDesc: 'Додайте першу нерухомість, щоб почати',
    },
    properties: {
      title: 'Нерухомість',
      subtitle: 'Керування вашою нерухомістю',
      addNew: 'Додати нерухомість',
      total: 'Всього',
      vacantCount: 'Вільних',
      rentedCount: 'Зданих',
      noProperties: 'Немає нерухомості',
      noPropertiesDesc: 'Додайте першу нерухомість для початку керування',
      area: 'Площа',
      rooms: 'Кімнати',
      floor: 'Поверх',
      rent: 'Оренда',
      noTenant: 'Немає орендаря',
      status: { vacant: 'Вільно', occupied: 'Здано', reserved: 'Заброньовано' },
    },
    tenants: {
      title: 'Орендарі',
      subtitle: 'Керування орендарями вашої нерухомості',
      addNew: 'Додати орендаря',
      total: 'Всього',
      active: 'Активних',
      former: 'Колишніх',
      activeTenants: 'Активні орендарі',
      formerTenants: 'Колишні орендарі',
      noTenants: 'Немає орендарів',
      noTenantsDesc: 'Додайте першого орендаря для початку керування',
      noProperty: 'Не привязаний до нерухомості',
      status: { active: 'Активний', inactive: 'Неактивний' },
    },
    payments: {
      title: 'Платежі',
      subtitle: 'Відстеження платежів від орендарів',
      addNew: 'Додати платіж',
      received: 'Отримано',
      pending: 'Очікується',
      overdueAmount: 'Прострочено',
      total: 'Всього',
      noPayments: 'Немає платежів',
      noPaymentsDesc: 'Додайте перший платіж для початку відстеження',
      tenant: 'Орендар',
      property: 'Нерухомість',
      type: 'Тип',
      period: 'Період',
      dueDate: 'Термін',
      amount: 'Сума',
      markAsPaid: 'Позначити як сплачений',
      filters: { allStatuses: 'Всі статуси', allTypes: 'Всі типи', allProperties: 'Вся нерухомість' },
      status: {
        pending: 'Очікує',
        pendingConfirmation: 'Очікує підтвердження',
        paid: 'Сплачено',
        overdue: 'Прострочено',
        rejected: 'Відхилено',
        cancelled: 'Скасовано',
      },
      types: { rent: 'Оренда', utilities: 'Комунальні', deposit: 'Застава', other: 'Інше' },
    },
    contracts: {
      title: 'Договори',
      subtitle: 'Керування договорами оренди',
      addNew: 'Новий договір',
      total: 'Всього',
      activeCount: 'Активних',
      expiringCount: 'Закінчуються',
      monthlyIncome: 'Місячний дохід',
      expiringAlert: 'Договори, що закінчуються',
      expiringAlertDesc: 'договорів закінчуються протягом 30 днів.',
      noContracts: 'Немає договорів',
      noContractsDesc: 'Створіть перший договір оренди',
      expiresIn: 'Закінчується через',
      days: 'днів',
      payableBy: 'оплата до',
      indefinite: 'безстроково',
      status: { draft: 'Чернетка', active: 'Активний', expired: 'Закінчився', terminated: 'Розірваний' },
      types: { standard: 'Стандартна оренда', occasional: 'Випадкова оренда', institutional: 'Інституційна' },
    },
    settings: {
      title: 'Налаштування',
      subtitle: 'Керування вашим акаунтом та уподобаннями',
      profile: 'Профіль',
      notifications: 'Сповіщення',
      billing: 'Підписка',
      security: 'Безпека',
      language: 'Мова',
      profileData: 'Дані профілю',
      profileDataDesc: 'Оновіть ваші особисті дані',
      name: "Ім'я та прізвище",
      email: 'Email',
      phone: 'Телефон',
      company: 'Назва компанії',
      companyPlaceholder: 'Для рахунків',
      nip: 'ІПН',
      saveChanges: 'Зберегти зміни',
      saved: 'Збережено',
      logout: 'Вийти',
      languageDesc: 'Виберіть мову інтерфейсу',
      notificationsDesc: 'Налаштуйте сповіщення по email',
      emailPaymentReminders: 'Нагадування про платежі',
      emailPaymentRemindersDesc: 'Отримуйте сповіщення про майбутні та прострочені платежі',
      emailContractExpiry: 'Договори, що закінчуються',
      emailContractExpiryDesc: 'Отримуйте сповіщення про договори, що закінчуються',
      emailNewTenant: 'Нові орендарі',
      emailNewTenantDesc: 'Отримуйте сповіщення про додавання нових орендарів',
      securityDesc: 'Керування паролем та безпекою акаунту',
      changePassword: 'Змінити пароль',
      dangerZone: 'Небезпечна зона',
      deleteAccount: 'Видалити акаунт',
      deleteAccountDesc: 'Видалення акаунту незворотнє. Всі дані будуть втрачені.',
    },
    forms: {
      required: "Обов'язково",
      optional: 'Опціонально',
      selectOption: 'Виберіть...',
      basicInfo: 'Основна інформація',
      propertyDetails: 'Деталі нерухомості',
      financialInfo: 'Фінансова інформація',
      additionalInfo: 'Додаткова інформація',
      notes: 'Примітки',
    },
    messages: {
      title: 'Повідомлення',
      unread: 'непрочитаних',
      chatWithOwner: 'Спілкування з власником квартири',
      chatWithTenants: 'Спілкування з орендарями',
      you: 'Ви',
      clickToChat: 'Натисніть, щоб відкрити чат',
      noChats: 'Немає чатів',
      noChatsDesc: 'Чати з\'являться, коли орендарі зареєструються',
      sendMessage: 'Надіслати',
      typeMessage: 'Введіть повідомлення...',
    },
    tenant: {
      myHousing: 'Моє житло',
      myPayments: 'Мої платежі',
      tickets: 'Заявки',
      noProperty: 'Немає прив\'язаної квартири',
      noPropertyDesc: 'Попросіть власника надіслати вам запрошення',
      welcomeTitle: 'Ласкаво просимо!',
      welcomeSubtitle: 'Ваш особистий кабінет орендаря',
    },
    auth: {
      login: 'Увійти',
      register: 'Зареєструватися',
      logout: 'Вийти',
      email: 'Email',
      password: 'Пароль',
      confirmPassword: 'Підтвердіть пароль',
      firstName: "Ім'я",
      lastName: 'Прізвище',
      forgotPassword: 'Забули пароль?',
      noAccount: 'Немає акаунту?',
      hasAccount: 'Вже є акаунт?',
      termsAccept: 'Я приймаю',
      termsLink: 'Угоду користувача',
      privacyLink: 'Політику конфіденційності',
      continueWithGoogle: 'Продовжити з Google',
      orDivider: 'або',
    },
  },

  // CZECH
  cs: {
    nav: {
      dashboard: 'Přehled',
      properties: 'Nemovitosti',
      tenants: 'Nájemníci',
      payments: 'Platby',
      contracts: 'Smlouvy',
      settings: 'Nastavení',
      messages: 'Zprávy',
    },
    common: {
      add: 'Přidat',
      edit: 'Upravit',
      delete: 'Smazat',
      save: 'Uložit',
      cancel: 'Zrušit',
      back: 'Zpět',
      search: 'Hledat',
      filter: 'Filtr',
      all: 'Vše',
      details: 'Detaily',
      actions: 'Akce',
      loading: 'Načítání...',
      noData: 'Žádná data',
      yes: 'Ano',
      no: 'Ne',
      currency: 'Kč',
      perMonth: '/ měsíc',
      error: 'Chyba',
      yesterday: 'Včera',
      backToDashboard: 'Zpět na přehled',
    },
    dashboard: {
      title: 'Přehled',
      welcome: 'Vítejte ve Flatro! Spravujte své nemovitosti.',
      properties: 'Nemovitosti',
      occupied: 'obsazeno',
      vacant: 'volné',
      tenants: 'Nájemníci',
      activeTenants: 'Aktivních nájemníků',
      pendingPayments: 'Čekající platby',
      overdue: 'po splatnosti',
      monthlyIncome: 'Měsíční příjem',
      currentMonth: 'Aktuální měsíc',
      quickActions: 'Rychlé akce',
      addProperty: 'Přidat nemovitost',
      addPropertyDesc: 'Přidat nový byt nebo dům',
      addTenant: 'Přidat nájemníka',
      addTenantDesc: 'Zaregistrovat nového nájemníka',
      addPayment: 'Přidat platbu',
      addPaymentDesc: 'Zaregistrovat přijatou platbu',
      recentActivity: 'Poslední aktivita',
      noActivity: 'Žádná aktivita',
      noActivityDesc: 'Přidejte první nemovitost pro začátek',
    },
    properties: {
      title: 'Nemovitosti',
      subtitle: 'Správa vašich nemovitostí',
      addNew: 'Přidat nemovitost',
      total: 'Celkem',
      vacantCount: 'Volných',
      rentedCount: 'Pronajatých',
      noProperties: 'Žádné nemovitosti',
      noPropertiesDesc: 'Přidejte první nemovitost pro začátek správy',
      area: 'Plocha',
      rooms: 'Pokoje',
      floor: 'Patro',
      rent: 'Nájem',
      noTenant: 'Žádný nájemník',
      status: { vacant: 'Volné', occupied: 'Obsazeno', reserved: 'Rezervováno' },
    },
    tenants: {
      title: 'Nájemníci',
      subtitle: 'Správa nájemníků vašich nemovitostí',
      addNew: 'Přidat nájemníka',
      total: 'Celkem',
      active: 'Aktivních',
      former: 'Bývalých',
      activeTenants: 'Aktivní nájemníci',
      formerTenants: 'Bývalí nájemníci',
      noTenants: 'Žádní nájemníci',
      noTenantsDesc: 'Přidejte prvního nájemníka pro začátek správy',
      noProperty: 'Nepřiřazená nemovitost',
      status: { active: 'Aktivní', inactive: 'Neaktivní' },
    },
    payments: {
      title: 'Platby',
      subtitle: 'Sledování plateb od nájemníků',
      addNew: 'Přidat platbu',
      received: 'Přijato',
      pending: 'Čekající',
      overdueAmount: 'Po splatnosti',
      total: 'Celkem',
      noPayments: 'Žádné platby',
      noPaymentsDesc: 'Přidejte první platbu pro začátek sledování',
      tenant: 'Nájemník',
      property: 'Nemovitost',
      type: 'Typ',
      period: 'Období',
      dueDate: 'Splatnost',
      amount: 'Částka',
      markAsPaid: 'Označit jako zaplacené',
      filters: { allStatuses: 'Všechny stavy', allTypes: 'Všechny typy', allProperties: 'Všechny nemovitosti' },
      status: {
        pending: 'Čeká',
        pendingConfirmation: 'Čeká na potvrzení',
        paid: 'Zaplaceno',
        overdue: 'Po splatnosti',
        rejected: 'Zamítnuto',
        cancelled: 'Zrušeno',
      },
      types: { rent: 'Nájem', utilities: 'Služby', deposit: 'Kauce', other: 'Ostatní' },
    },
    contracts: {
      title: 'Smlouvy',
      subtitle: 'Správa nájemních smluv',
      addNew: 'Nová smlouva',
      total: 'Celkem',
      activeCount: 'Aktivních',
      expiringCount: 'Končících',
      monthlyIncome: 'Měsíční příjem',
      expiringAlert: 'Končící smlouvy',
      expiringAlertDesc: 'smluv končí do 30 dnů.',
      noContracts: 'Žádné smlouvy',
      noContractsDesc: 'Vytvořte první nájemní smlouvu',
      expiresIn: 'Končí za',
      days: 'dní',
      payableBy: 'splatné do',
      indefinite: 'na dobu neurčitou',
      status: { draft: 'Návrh', active: 'Aktivní', expired: 'Ukončena', terminated: 'Vypovězena' },
      types: { standard: 'Standardní nájem', occasional: 'Příležitostný nájem', institutional: 'Institucionální nájem' },
    },
    settings: {
      title: 'Nastavení',
      subtitle: 'Správa vašeho účtu a preferencí',
      profile: 'Profil',
      notifications: 'Oznámení',
      billing: 'Předplatné',
      security: 'Zabezpečení',
      language: 'Jazyk',
      profileData: 'Údaje profilu',
      profileDataDesc: 'Aktualizujte své osobní údaje',
      name: 'Jméno a příjmení',
      email: 'Email',
      phone: 'Telefon',
      company: 'Název společnosti',
      companyPlaceholder: 'Pro faktury',
      nip: 'DIČ',
      saveChanges: 'Uložit změny',
      saved: 'Uloženo',
      logout: 'Odhlásit',
      languageDesc: 'Vyberte jazyk rozhraní',
      notificationsDesc: 'Nastavte emailová oznámení',
      emailPaymentReminders: 'Připomínky plateb',
      emailPaymentRemindersDesc: 'Dostávejte oznámení o blížících se a zpožděných platbách',
      emailContractExpiry: 'Končící smlouvy',
      emailContractExpiryDesc: 'Dostávejte oznámení o končících smlouvách',
      emailNewTenant: 'Noví nájemníci',
      emailNewTenantDesc: 'Dostávejte oznámení o nových nájemnících',
      securityDesc: 'Správa hesla a zabezpečení účtu',
      changePassword: 'Změnit heslo',
      dangerZone: 'Nebezpečná zóna',
      deleteAccount: 'Smazat účet',
      deleteAccountDesc: 'Smazání účtu je nevratné. Všechna data budou ztracena.',
    },
    forms: {
      required: 'Povinné',
      optional: 'Volitelné',
      selectOption: 'Vyberte...',
      basicInfo: 'Základní informace',
      propertyDetails: 'Detaily nemovitosti',
      financialInfo: 'Finanční informace',
      additionalInfo: 'Další informace',
      notes: 'Poznámky',
    },
    messages: {
      title: 'Zprávy',
      unread: 'nepřečtených',
      chatWithOwner: 'Chat s majitelem bytu',
      chatWithTenants: 'Chat s nájemníky',
      you: 'Vy',
      clickToChat: 'Klikněte pro otevření chatu',
      noChats: 'Žádné chaty',
      noChatsDesc: 'Chaty se zobrazí, jakmile se nájemníci zaregistrují',
      sendMessage: 'Odeslat',
      typeMessage: 'Napište zprávu...',
    },
    tenant: {
      myHousing: 'Moje bydlení',
      myPayments: 'Moje platby',
      tickets: 'Požadavky',
      noProperty: 'Žádná přiřazená nemovitost',
      noPropertyDesc: 'Požádejte majitele o zaslání pozvánky',
      welcomeTitle: 'Vítejte!',
      welcomeSubtitle: 'Váš panel nájemníka',
    },
    auth: {
      login: 'Přihlásit',
      register: 'Registrovat',
      logout: 'Odhlásit',
      email: 'Email',
      password: 'Heslo',
      confirmPassword: 'Potvrďte heslo',
      firstName: 'Jméno',
      lastName: 'Příjmení',
      forgotPassword: 'Zapomněli jste heslo?',
      noAccount: 'Nemáte účet?',
      hasAccount: 'Již máte účet?',
      termsAccept: 'Přijímám',
      termsLink: 'Podmínky používání',
      privacyLink: 'Zásady ochrany osobních údajů',
      continueWithGoogle: 'Pokračovat s Google',
      orDivider: 'nebo',
    },
  },
}
