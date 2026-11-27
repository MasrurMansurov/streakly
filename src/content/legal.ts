import type { Locale } from "@/i18n"

export type LegalDoc = {
  title: string
  updated: string
  intro: string
  sections: { heading: string; paragraphs?: string[]; items?: string[] }[]
}

export const LEGAL_UPDATED = "2026-11-25"
export const CONTACT_URL = "https://github.com/MasrurMansurov/streakly/issues"

const privacy: Record<Locale, LegalDoc> = {
  en: {
    title: "Privacy Policy",
    updated: "Last updated",
    intro:
      "Streakly is a free habit tracker built and run by Masrur Mansurov as a personal project. This policy explains what data the app stores, why, who processes it and how you stay in control of it. We don't sell your data and we don't show ads.",
    sections: [
      {
        heading: "What we collect",
        items: [
          "Account: your email address and a securely hashed password, or your basic GitHub/Google profile (name, email, avatar) if you sign in with them.",
          "Profile: username, display name, bio, profile photo and whether your profile is public.",
          "Your activity: habits, check-ins, notes on check-ins and the people you follow.",
          "How you feel: the mood and energy ratings (1–5) you give a day. Only you see them; they are used to compare days with and without a habit.",
          "Pacts and challenges: who you invite, which habit you commit and your check-in days for it. Proof photos and notes you add to a pact check-in.",
          "Reminders: the time, time zone and language you choose, and the push subscription your browser creates when you turn reminders on.",
          "Usage statistics: anonymous page views and performance metrics (Vercel Web Analytics and Speed Insights). They use no cookies and don't identify you.",
        ],
      },
      {
        heading: "Why we use it",
        items: [
          "To run the service: sign you in, save your habits and show your stats and streaks.",
          "To send the reminders you asked for, and only on days with unfinished habits.",
          "To show your public profile to others — only if you made it public.",
          "To find bugs and keep the app fast.",
        ],
        paragraphs: ["The legal basis is the performance of our agreement with you (the Terms) and, for analytics, our legitimate interest in a working service."],
      },
      {
        heading: "What other people can see",
        paragraphs: [
          "By default your profile is private. If you make it public, anyone with the link can see your name, photo, bio, active habits, streaks, activity heatmap and earned achievements. Notes, archived habits and your email are never public.",
          "In a pact or a challenge, the other members see your name, photo and your check-in days for the one habit you committed — even if your profile is private. A proof photo or note is visible only to your pact partner, and only after they've checked in that day themselves.",
        ],
      },
      {
        heading: "Who processes your data",
        items: [
          "Supabase — database, sign-in and file storage, hosted in Frankfurt, Germany (EU).",
          "Vercel — hosting; server code runs in Frankfurt, pages are delivered through a global network.",
          "GitHub or Google — only if you choose to sign in with them.",
          "Your browser's push service (e.g. Google, Apple, Mozilla) — to deliver reminders.",
          "Anthropic (Claude) — only if you ask for the AI letter of the week: the names of habits that aren't private, that week's numbers and your average mood and energy (no notes, photos or email).",
        ],
        paragraphs: ["These providers process data on our behalf under their own data-protection terms."],
      },
      {
        heading: "Cookies and local storage",
        paragraphs: [
          "We only use what the app needs to work: a session cookie that keeps you signed in, a cookie that remembers your language and local storage for your light/dark theme. There are no advertising or tracking cookies.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "We keep your data while your account exists. When you delete your account, your profile, habits, check-ins, notes, mood and energy ratings, follows, reminders and photo are deleted immediately; copies may remain in hosting providers' backups for a short time before they are overwritten.",
          "Proof photos in pacts are kept for 30 days, and removed sooner when the pact ends.",
        ],
      },
      {
        heading: "Your rights and controls",
        items: [
          "Access and download: Settings → Your data → Export CSV.",
          "Correct: edit your profile and habits at any time.",
          "Delete: Settings → Your data → Delete account.",
          "Make your profile private or turn reminders off in Settings.",
          "Depending on where you live (e.g. GDPR in the EU) you may also object to processing or complain to your data-protection authority.",
        ],
      },
      {
        heading: "Children",
        paragraphs: ["Streakly is not intended for children under 16. If you believe a child has created an account, contact us and we'll delete it."],
      },
      {
        heading: "Changes and contact",
        paragraphs: [
          "If this policy changes, we'll update the date above; significant changes will be announced in the app. Questions or requests: open an issue in the project's GitHub repository (link below).",
        ],
      },
    ],
  },
  ru: {
    title: "Политика конфиденциальности",
    updated: "Обновлено",
    intro:
      "Streakly — бесплатный трекер привычек, личный проект Масрура Мансурова. Здесь описано, какие данные хранит приложение, зачем, кто их обрабатывает и как вы ими управляете. Мы не продаём данные и не показываем рекламу.",
    sections: [
      {
        heading: "Какие данные мы собираем",
        items: [
          "Аккаунт: email и надёжно захешированный пароль либо базовый профиль GitHub/Google (имя, email, аватар), если вы входите через них.",
          "Профиль: имя пользователя, отображаемое имя, описание, фото и настройка публичности.",
          "Ваша активность: привычки, отметки, заметки к отметкам и люди, на которых вы подписаны.",
          "Самочувствие: оценки настроения и энергии (1–5), которые вы ставите дню. Их видите только вы; они нужны, чтобы сравнить дни с привычкой и без неё.",
          "Пакты и челленджи: кого вы приглашаете, какую привычку выбрали и дни отметок по ней. Фото и заметки-доказательства, которые вы прикладываете к отметке в пакте.",
          "Напоминания: выбранные время, часовой пояс и язык, а также push-подписка, которую создаёт браузер при включении напоминаний.",
          "Статистика использования: анонимные просмотры страниц и показатели скорости (Vercel Web Analytics и Speed Insights). Они не используют cookie и не определяют вас лично.",
        ],
      },
      {
        heading: "Зачем мы их используем",
        items: [
          "Чтобы сервис работал: вход, сохранение привычек, статистика и серии.",
          "Чтобы присылать напоминания, которые вы включили, — и только в дни, когда остались невыполненные привычки.",
          "Чтобы показывать ваш публичный профиль другим — только если вы сделали его публичным.",
          "Чтобы находить ошибки и поддерживать скорость приложения.",
        ],
        paragraphs: ["Основание — исполнение соглашения с вами (Условий использования), а для аналитики — наш законный интерес в исправной работе сервиса."],
      },
      {
        heading: "Что видят другие",
        paragraphs: [
          "По умолчанию профиль закрыт. Если сделать его публичным, любой со ссылкой увидит имя, фото, описание, активные привычки, серии, карту активности и полученные достижения. Заметки, архивные привычки и email никогда не публикуются.",
          "В пакте или челлендже другие участники видят ваше имя, фото и дни отметок по одной выбранной привычке — даже если профиль закрыт. Фото или заметку-доказательство видит только партнёр по пакту, и только после того, как сам отметится в этот день.",
        ],
      },
      {
        heading: "Кто обрабатывает данные",
        items: [
          "Supabase — база данных, вход и хранение файлов; серверы во Франкфурте (Германия, ЕС).",
          "Vercel — хостинг; серверный код работает во Франкфурте, страницы доставляются через глобальную сеть.",
          "GitHub или Google — только если вы входите через них.",
          "Push-сервис вашего браузера (например, Google, Apple, Mozilla) — для доставки напоминаний.",
          "Anthropic (Claude) — только если вы попросите ИИ-письмо недели: названия неприватных привычек, цифры этой недели и средние оценки настроения и энергии (без заметок, фото и email).",
        ],
        paragraphs: ["Эти компании обрабатывают данные по нашему поручению в соответствии со своими условиями защиты данных."],
      },
      {
        heading: "Cookie и локальное хранилище",
        paragraphs: [
          "Мы используем только необходимое для работы: cookie сессии (чтобы вы оставались в аккаунте), cookie с выбранным языком и локальное хранилище для светлой/тёмной темы. Рекламных и отслеживающих cookie нет.",
        ],
      },
      {
        heading: "Сколько мы храним данные",
        paragraphs: [
          "Пока существует ваш аккаунт. При удалении аккаунта профиль, привычки, отметки, заметки, оценки самочувствия, подписки, напоминания и фото удаляются сразу; копии могут недолго оставаться в резервных копиях хостинг-провайдеров, пока не будут перезаписаны.",
          "Фото-доказательства в пактах хранятся 30 дней и удаляются раньше, если пакт завершён.",
        ],
      },
      {
        heading: "Ваши права и управление данными",
        items: [
          "Получить и скачать данные: Настройки → Ваши данные → Экспорт в CSV.",
          "Исправить: профиль и привычки можно изменить в любой момент.",
          "Удалить: Настройки → Ваши данные → Удалить аккаунт.",
          "Сделать профиль закрытым или выключить напоминания — в Настройках.",
          "В зависимости от вашей страны (например, GDPR в ЕС) вы также можете возразить против обработки или обратиться в орган по защите данных.",
        ],
      },
      {
        heading: "Дети",
        paragraphs: ["Streakly не предназначен для детей младше 16 лет. Если ребёнок создал аккаунт, напишите нам — мы его удалим."],
      },
      {
        heading: "Изменения и связь",
        paragraphs: [
          "При изменении политики мы обновим дату выше; о существенных изменениях сообщим в приложении. Вопросы и запросы — через issue в GitHub-репозитории проекта (ссылка ниже).",
        ],
      },
    ],
  },
}

const terms: Record<Locale, LegalDoc> = {
  en: {
    title: "Terms of Use",
    updated: "Last updated",
    intro:
      "These terms apply when you use Streakly. By creating an account you agree to them. In short: it's a free personal project, use it fairly, your data is yours.",
    sections: [
      {
        heading: "The service",
        paragraphs: [
          "Streakly is provided free of charge by Masrur Mansurov. Features may change, and the service may be paused or discontinued; if it is shut down we'll give reasonable notice so you can export your data.",
        ],
      },
      {
        heading: "Your account",
        items: [
          "You must be at least 16 years old.",
          "Keep your password safe — you're responsible for activity in your account.",
          "One person per account; don't impersonate others or pick misleading usernames.",
        ],
      },
      {
        heading: "Your content",
        paragraphs: [
          "Habits, notes, your profile and photo stay yours. You give us only the permission needed to store and display them as the app works — including on your public profile if you enable it. You can export or delete everything at any time.",
        ],
      },
      {
        heading: "Acceptable use",
        items: [
          "No illegal, hateful or harassing content in usernames, bios, photos or habit names.",
          "Don't try to access other people's data, break security or overload the service.",
          "Don't use automated tools to create accounts or scrape profiles.",
        ],
        paragraphs: ["We may remove content or suspend accounts that break these rules."],
      },
      {
        heading: "Source code and brand",
        paragraphs: [
          "The app's source code is open under the MIT License. The Streakly name and logo identify this service; please don't present a copy as the official Streakly.",
        ],
      },
      {
        heading: "No warranty, limited liability",
        paragraphs: [
          "The service is provided \"as is\" without warranties of any kind. To the extent permitted by law, we're not liable for lost data, missed reminders or indirect damages. Streakly is a motivation tool, not medical or psychological advice.",
        ],
      },
      {
        heading: "Ending your use",
        paragraphs: ["You can stop at any time by deleting your account in Settings."],
      },
      {
        heading: "Changes and contact",
        paragraphs: [
          "We may update these terms; the date above shows the latest version, and significant changes will be announced in the app. Questions: open an issue in the project's GitHub repository (link below).",
        ],
      },
    ],
  },
  ru: {
    title: "Условия использования",
    updated: "Обновлено",
    intro:
      "Эти условия действуют, когда вы пользуетесь Streakly. Создавая аккаунт, вы их принимаете. Коротко: это бесплатный личный проект, пользуйтесь честно, ваши данные принадлежат вам.",
    sections: [
      {
        heading: "Сервис",
        paragraphs: [
          "Streakly предоставляется бесплатно Масруром Мансуровым. Функции могут меняться, работа сервиса может быть приостановлена или прекращена; о закрытии мы заранее предупредим, чтобы вы успели выгрузить данные.",
        ],
      },
      {
        heading: "Ваш аккаунт",
        items: [
          "Вам должно быть не меньше 16 лет.",
          "Берегите пароль — вы отвечаете за действия в своём аккаунте.",
          "Один аккаунт — один человек; не выдавайте себя за других и не выбирайте вводящие в заблуждение имена.",
        ],
      },
      {
        heading: "Ваш контент",
        paragraphs: [
          "Привычки, заметки, профиль и фото остаются вашими. Вы даёте нам только разрешение, необходимое для их хранения и показа в приложении — в том числе в публичном профиле, если вы его включили. Вы можете выгрузить или удалить всё в любой момент.",
        ],
      },
      {
        heading: "Допустимое использование",
        items: [
          "Никакого незаконного, оскорбительного или травлящего контента в именах, описаниях, фото и названиях привычек.",
          "Не пытайтесь получить доступ к чужим данным, обойти защиту или перегрузить сервис.",
          "Не используйте автоматические средства для создания аккаунтов или сбора профилей.",
        ],
        paragraphs: ["Мы можем удалить контент или заблокировать аккаунт за нарушение этих правил."],
      },
      {
        heading: "Исходный код и бренд",
        paragraphs: [
          "Исходный код приложения открыт по лицензии MIT. Название и логотип Streakly обозначают этот сервис; пожалуйста, не выдавайте копию за официальный Streakly.",
        ],
      },
      {
        heading: "Без гарантий, ограничение ответственности",
        paragraphs: [
          "Сервис предоставляется «как есть», без каких-либо гарантий. В пределах, допустимых законом, мы не отвечаем за потерю данных, пропущенные напоминания и косвенный ущерб. Streakly — инструмент мотивации, а не медицинская или психологическая консультация.",
        ],
      },
      {
        heading: "Прекращение использования",
        paragraphs: ["Вы можете перестать пользоваться сервисом в любой момент, удалив аккаунт в Настройках."],
      },
      {
        heading: "Изменения и связь",
        paragraphs: [
          "Мы можем обновлять условия; дата выше показывает актуальную версию, о существенных изменениях сообщим в приложении. Вопросы — через issue в GitHub-репозитории проекта (ссылка ниже).",
        ],
      },
    ],
  },
}

export const LEGAL = { privacy, terms }
export type LegalKind = keyof typeof LEGAL
