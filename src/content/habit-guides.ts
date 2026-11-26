import type { Locale } from "@/i18n"
import type { TemplateKey } from "@/lib/templates"

/**
 * Habit guide pages (/templates/<slug>) — hand-written, one per starter
 * template. Practical, no medical promises: needs differ from person to person.
 */
export type HabitGuide = {
  title: string
  metaTitle: string
  metaDescription: string
  intro: string
  frequency: string
  cues: string[]
  mini: string
  steps: string[]
  pitfalls: { t: string; d: string }[]
}

export const GUIDE_SLUGS: Record<TemplateKey, string> = {
  water: "drink-water",
  read: "read-every-day",
  walk: "daily-walk",
  workout: "workout",
  meditate: "meditation",
  sleep: "sleep-schedule",
  language: "learn-a-language",
  journal: "journaling",
}

export const slugToKey = (slug: string) => (Object.entries(GUIDE_SLUGS).find(([, s]) => s === slug)?.[0] ?? null) as TemplateKey | null

export const GUIDES: Record<TemplateKey, Record<Locale, HabitGuide>> = {
  water: {
    en: {
      title: "Drink water habit",
      metaTitle: "Drink Water Habit Tracker — Free Template & Tips",
      metaDescription: "Build a drink-water habit that lasts: if-then cues, a mini version for busy days, steps and common mistakes. Track it free in Streakly.",
      intro: "Drinking enough water is one of the easiest habits to start and one of the easiest to forget. The trick is not willpower but a fixed moment and a bottle you can see. How much is enough differs from person to person — the goal here is consistency, not a magic number.",
      frequency: "Every day",
      cues: ["When I sit down at my desk, I fill my bottle", "After each meal, I drink a glass of water", "When I make coffee, I drink a glass of water first"],
      mini: "One glass of water — on a busy day it still counts and keeps the streak.",
      steps: ["A glass right after waking up", "A full bottle on the desk by noon", "A glass with dinner"],
      pitfalls: [
        { t: "No visible cue", d: "A bottle in the bag is forgotten; a bottle on the desk is a reminder." },
        { t: "Chasing a number", d: "Counting exact millilitres turns a simple habit into a chore — start with a few glasses at fixed moments." },
      ],
    },
    ru: {
      title: "Привычка пить воду",
      metaTitle: "Трекер привычки пить воду — бесплатный шаблон и советы",
      metaDescription: "Как выработать привычку пить воду: планы «если — то», мини-версия для загруженных дней, шаги и частые ошибки. Отслеживайте бесплатно в Streakly.",
      intro: "Пить достаточно воды — одна из самых простых привычек, и её же проще всего забыть. Помогает не сила воли, а фиксированный момент и бутылка на виду. Сколько воды нужно — у всех по-разному; цель здесь регулярность, а не волшебная цифра.",
      frequency: "Каждый день",
      cues: ["Когда сажусь за рабочий стол — наполняю бутылку", "После каждого приёма пищи — стакан воды", "Когда варю кофе — сначала выпиваю стакан воды"],
      mini: "Один стакан воды — в загруженный день он тоже засчитывается и сохраняет серию.",
      steps: ["Стакан сразу после пробуждения", "Полная бутылка на столе к обеду", "Стакан за ужином"],
      pitfalls: [
        { t: "Нет видимой подсказки", d: "Бутылку в сумке забывают, бутылка на столе сама напоминает." },
        { t: "Погоня за цифрой", d: "Подсчёт миллилитров превращает простую привычку в обязанность — начните с нескольких стаканов в фиксированные моменты." },
      ],
    },
  },
  read: {
    en: {
      title: "Read every day habit",
      metaTitle: "Reading Habit Tracker — Read Every Day, Free Template",
      metaDescription: "Build a daily reading habit: start with 10 pages, a 1-page mini version, if-then cues and steps. Track your reading streak free in Streakly.",
      intro: "Reading every day adds up faster than it seems: ten pages a day is a dozen books a year. What stops most people is not time but friction — the book is in another room, the phone is closer. Make the book the easiest thing to reach at one fixed moment.",
      frequency: "Every day",
      cues: ["Before bed, I read 10 pages", "On the train to work, I open my book instead of the phone", "After lunch, I read for 10 minutes"],
      mini: "One page — open the book, read a page. Often it turns into ten.",
      steps: ["Put the book on the pillow or desk", "Phone in another room", "Read 10 pages"],
      pitfalls: [
        { t: "Waiting for a free hour", d: "Big blocks rarely come. Ten pages fit into almost any day." },
        { t: "Forcing a boring book", d: "It's fine to drop a book. The habit is reading, not finishing every title." },
      ],
    },
    ru: {
      title: "Привычка читать каждый день",
      metaTitle: "Трекер чтения — привычка читать каждый день, бесплатный шаблон",
      metaDescription: "Как выработать привычку читать каждый день: начните с 10 страниц, мини-версия в 1 страницу, планы «если — то» и шаги. Серия чтения бесплатно в Streakly.",
      intro: "Ежедневное чтение копится быстрее, чем кажется: десять страниц в день — это около дюжины книг в год. Мешает обычно не нехватка времени, а лишние усилия: книга в другой комнате, а телефон ближе. Сделайте книгу самым доступным предметом в один и тот же момент.",
      frequency: "Каждый день",
      cues: ["Перед сном читаю 10 страниц", "В дороге на работу открываю книгу вместо телефона", "После обеда читаю 10 минут"],
      mini: "Одна страница — откройте книгу и прочитайте страницу. Часто она превращается в десять.",
      steps: ["Положить книгу на подушку или стол", "Телефон — в другую комнату", "Прочитать 10 страниц"],
      pitfalls: [
        { t: "Ждать свободного часа", d: "Большие отрезки времени выпадают редко. Десять страниц помещаются почти в любой день." },
        { t: "Мучить скучную книгу", d: "Бросить книгу — нормально. Привычка — это чтение, а не дочитывание каждой книги." },
      ],
    },
  },
  walk: {
    en: {
      title: "Daily walk habit",
      metaTitle: "Daily Walk Habit Tracker — 20 Minutes a Day, Free Template",
      metaDescription: "Make a daily walk a habit: 20 minutes outside, a 5-minute mini version, if-then cues and steps. Track your walking streak free in Streakly.",
      intro: "A daily walk is the gentlest way to move more, clear your head and get daylight. It needs no gear and no gym — only a moment in the day that reliably comes. Tie it to something you already do, and keep the phone in your pocket.",
      frequency: "Every day",
      cues: ["After lunch, I walk for 20 minutes", "When I finish work, I walk around the block before going home", "After dinner, I take a short walk"],
      mini: "Five minutes outside — shoes on, out the door. It keeps the streak on a rainy day.",
      steps: ["Shoes by the door", "20 minutes outside", "No phone, or only music"],
      pitfalls: [
        { t: "Waiting for good weather", d: "Decide in advance that a short walk counts in any weather — the mini version is for exactly that." },
        { t: "No fixed time", d: "\"Sometime today\" usually becomes never. Pick the moment it follows." },
      ],
    },
    ru: {
      title: "Привычка ежедневной прогулки",
      metaTitle: "Трекер прогулок — 20 минут в день, бесплатный шаблон",
      metaDescription: "Как сделать ежедневную прогулку привычкой: 20 минут на улице, мини-версия на 5 минут, планы «если — то» и шаги. Серия прогулок бесплатно в Streakly.",
      intro: "Ежедневная прогулка — самый мягкий способ больше двигаться, проветрить голову и получить дневной свет. Не нужно ни снаряжения, ни зала — только момент в дне, который точно наступит. Привяжите прогулку к тому, что вы и так делаете, а телефон оставьте в кармане.",
      frequency: "Каждый день",
      cues: ["После обеда гуляю 20 минут", "Когда заканчиваю работу — круг по району перед домом", "После ужина — короткая прогулка"],
      mini: "Пять минут на улице — обулись и вышли. В дождь это сохранит серию.",
      steps: ["Обувь у двери", "20 минут на улице", "Без телефона или только с музыкой"],
      pitfalls: [
        { t: "Ждать хорошей погоды", d: "Заранее решите, что короткая прогулка засчитывается в любую погоду — мини-версия как раз для этого." },
        { t: "Нет конкретного времени", d: "«Когда-нибудь сегодня» обычно превращается в «никогда». Выберите момент, после которого вы идёте." },
      ],
    },
  },
  workout: {
    en: {
      title: "Workout habit",
      metaTitle: "Workout Habit Tracker — 3 Times a Week, Free Template",
      metaDescription: "Build a workout habit that survives busy weeks: 3 times a week, a 10-push-up mini version, if-then cues and steps. Track it free in Streakly.",
      intro: "A workout habit fails less from lack of motivation than from an all-or-nothing plan. Three sessions a week with room for a short version on hard days beats an ambitious plan you drop in week two. Streakly counts weekly habits in weeks, so a rest day never breaks the streak.",
      frequency: "3 times a week",
      cues: ["After work, I change into training clothes", "On Monday, Wednesday and Friday mornings, I train before breakfast", "When I put the kids to bed, I do a home workout"],
      mini: "Ten push-ups or a 10-minute session — it counts and keeps the week alive.",
      steps: ["Warm-up, 5 minutes", "Main workout", "Stretch, 5 minutes"],
      pitfalls: [
        { t: "Too much too soon", d: "Start easier than you think you should. Soreness is the most common reason people quit." },
        { t: "Missing one session = giving up the week", d: "One missed day doesn't matter. Two misses in a row is where habits fade — get back on the next planned day." },
      ],
    },
    ru: {
      title: "Привычка тренироваться",
      metaTitle: "Трекер тренировок — 3 раза в неделю, бесплатный шаблон",
      metaDescription: "Как выработать привычку тренироваться, которая переживёт загруженные недели: 3 раза в неделю, мини-версия из 10 отжиманий, планы и шаги. Бесплатно в Streakly.",
      intro: "Привычка тренироваться ломается не столько из-за мотивации, сколько из-за плана «всё или ничего». Три тренировки в неделю с запасом на короткую версию в тяжёлый день лучше амбициозного плана, который бросают на второй неделе. Streakly считает такие привычки неделями, поэтому день отдыха не прерывает серию.",
      frequency: "3 раза в неделю",
      cues: ["После работы переодеваюсь в спортивную форму", "В понедельник, среду и пятницу утром тренируюсь до завтрака", "Когда укладываю детей — домашняя тренировка"],
      mini: "Десять отжиманий или 10-минутная тренировка — засчитывается и сохраняет неделю.",
      steps: ["Разминка, 5 минут", "Основная тренировка", "Растяжка, 5 минут"],
      pitfalls: [
        { t: "Слишком много и сразу", d: "Начните легче, чем кажется нужным. Сильная крепатура — самая частая причина бросить." },
        { t: "Пропуск = неделя потеряна", d: "Один пропуск ничего не значит. Два подряд — момент, когда привычки угасают: вернитесь в следующий запланированный день." },
      ],
    },
  },
  meditate: {
    en: {
      title: "Meditation habit",
      metaTitle: "Meditation Habit Tracker — 10 Minutes a Day, Free Template",
      metaDescription: "Start a daily meditation habit: 10 minutes after waking up, a 1-minute mini version, if-then cues and steps. Track your meditation streak free in Streakly.",
      intro: "Meditation is easy to begin and hard to keep, because the benefit is quiet and the excuse is loud. Attach it to the first minutes of the day, when nothing else has started, and make it so short you can't say no. You can always sit longer.",
      frequency: "Every day",
      cues: ["Right after waking up, I sit for 10 minutes", "After brushing my teeth in the evening, I meditate", "When I sit down at my desk, I take 3 slow breaths first"],
      mini: "One minute, or three slow breaths — it keeps the streak on a rushed morning.",
      steps: ["Sit comfortably, set a timer", "Follow the breath", "One sentence on how it went"],
      pitfalls: [
        { t: "Expecting a clear mind", d: "Wandering thoughts are the practice, not a failure. Noticing them is the point." },
        { t: "Sessions that are too long", d: "Thirty minutes on day one rarely lasts. Ten, or even one, done daily builds the habit." },
      ],
    },
    ru: {
      title: "Привычка медитировать",
      metaTitle: "Трекер медитаций — 10 минут в день, бесплатный шаблон",
      metaDescription: "Как начать медитировать каждый день: 10 минут после пробуждения, мини-версия на 1 минуту, планы «если — то» и шаги. Серия медитаций бесплатно в Streakly.",
      intro: "Медитацию легко начать и трудно продолжать: польза тихая, а отговорки громкие. Привяжите её к первым минутам дня, когда ничего ещё не началось, и сделайте настолько короткой, что отказаться невозможно. Посидеть дольше можно всегда.",
      frequency: "Каждый день",
      cues: ["Сразу после пробуждения сажусь на 10 минут", "Вечером, после чистки зубов, — медитация", "Когда сажусь за рабочий стол, сначала делаю 3 медленных вдоха"],
      mini: "Одна минута или три медленных вдоха — сохраняет серию в спешное утро.",
      steps: ["Сесть удобно, поставить таймер", "Следить за дыханием", "Одна фраза о том, как прошло"],
      pitfalls: [
        { t: "Ждать пустой головы", d: "Блуждающие мысли — это и есть практика, а не провал. Смысл в том, чтобы их замечать." },
        { t: "Слишком длинные сессии", d: "Тридцать минут в первый день редко приживаются. Десять или даже одна, но каждый день, — строят привычку." },
      ],
    },
  },
  sleep: {
    en: {
      title: "Sleep schedule habit",
      metaTitle: "Sleep Schedule Habit Tracker — In Bed on Time, Free Template",
      metaDescription: "Build a consistent sleep schedule: in bed by 23:00, screens off earlier, a mini version, if-then cues and steps. Track your bedtime streak free in Streakly.",
      intro: "A regular bedtime is a habit about the evening, not the night: what you do in the hour before decides when you actually sleep. Track the part you control — screens off and lights out at a set time — and let the rest follow.",
      frequency: "Every day",
      cues: ["At 22:30, I put my phone on the charger outside the bedroom", "When the dishwasher is on, I start getting ready for bed", "After my evening shower, I don't open the laptop"],
      mini: "Screens off 30 minutes later than planned — still a step in the right direction.",
      steps: ["Phone on the charger outside the bedroom", "Dim the lights", "In bed by the set time"],
      pitfalls: [
        { t: "Tracking the wrong thing", d: "You can't force sleep, but you can control when screens go off. Track that." },
        { t: "Weekend drift", d: "A big shift on weekends makes Monday hard. Keep weekend bedtime within about an hour." },
      ],
    },
    ru: {
      title: "Привычка ложиться вовремя",
      metaTitle: "Трекер сна — ложиться вовремя, бесплатный шаблон режима",
      metaDescription: "Как наладить режим сна: в кровати до 23:00, экраны выключать раньше, мини-версия, планы «если — то» и шаги. Серия режима сна бесплатно в Streakly.",
      intro: "Режим сна — это привычка про вечер, а не про ночь: то, что вы делаете за час до сна, решает, когда вы на самом деле уснёте. Отслеживайте то, что под вашим контролем, — выключить экраны и погасить свет в заданное время, — а остальное подтянется.",
      frequency: "Каждый день",
      cues: ["В 22:30 ставлю телефон на зарядку вне спальни", "Когда включаю посудомойку — начинаю готовиться ко сну", "После вечернего душа не открываю ноутбук"],
      mini: "Выключить экраны на 30 минут позже плана — всё равно шаг в нужную сторону.",
      steps: ["Телефон на зарядку вне спальни", "Приглушить свет", "В кровати к назначенному времени"],
      pitfalls: [
        { t: "Отслеживать не то", d: "Заставить себя уснуть нельзя, а выключить экраны — можно. Отслеживайте это." },
        { t: "Сдвиг на выходных", d: "Сильный сдвиг в выходные делает понедельник тяжёлым. Держите время отбоя в пределах примерно часа." },
      ],
    },
  },
  language: {
    en: {
      title: "Learn a language habit",
      metaTitle: "Language Learning Habit Tracker — 15 Minutes a Day, Free",
      metaDescription: "Make language learning a daily habit: 15 minutes, 5 days a week, a 5-word mini version, if-then cues and steps. Track it free in Streakly.",
      intro: "Languages reward frequency over intensity: fifteen minutes on most days beats a two-hour session once a week. Fix the time, keep the material ready, and let a five-word version save the days when there's no energy for more.",
      frequency: "5 times a week",
      cues: ["After my morning coffee, I practise for 15 minutes", "On the commute, I listen to a lesson", "Before opening social media, I review 5 new words"],
      mini: "Five new words — a tiny step that keeps the language in your head.",
      steps: ["Review yesterday's words", "One new lesson or exercise", "Say or write three sentences"],
      pitfalls: [
        { t: "Only apps, no speaking", d: "Apps are great for a streak, but add a few minutes of speaking or writing each week." },
        { t: "Changing methods every week", d: "Pick one course and stay with it for a month before judging it." },
      ],
    },
    ru: {
      title: "Привычка учить язык",
      metaTitle: "Трекер изучения языка — 15 минут в день, бесплатный шаблон",
      metaDescription: "Как сделать изучение языка ежедневной привычкой: 15 минут, 5 раз в неделю, мини-версия на 5 слов, планы и шаги. Бесплатно в Streakly.",
      intro: "В языках регулярность важнее интенсивности: пятнадцать минут почти каждый день лучше двухчасового занятия раз в неделю. Закрепите время, держите материалы под рукой, а версия на пять слов спасёт дни, когда сил больше нет.",
      frequency: "5 раз в неделю",
      cues: ["После утреннего кофе занимаюсь 15 минут", "В дороге слушаю урок", "Перед тем как открыть соцсети, повторяю 5 новых слов"],
      mini: "Пять новых слов — крошечный шаг, который держит язык в голове.",
      steps: ["Повторить вчерашние слова", "Один новый урок или упражнение", "Сказать или написать три предложения"],
      pitfalls: [
        { t: "Только приложения, без речи", d: "Приложения хороши для серии, но добавляйте несколько минут разговора или письма каждую неделю." },
        { t: "Менять методы каждую неделю", d: "Выберите один курс и держитесь его месяц, прежде чем оценивать." },
      ],
    },
  },
  journal: {
    en: {
      title: "Journaling habit",
      metaTitle: "Journaling Habit Tracker — Three Lines a Day, Free Template",
      metaDescription: "Start a journaling habit you'll keep: three lines a day, a 1-line mini version, if-then cues and prompts. Track your journaling streak free in Streakly.",
      intro: "Journaling doesn't need pages. Three honest lines a day — what happened, what you felt, what you'll do tomorrow — are enough to notice patterns over a month. Keep it short and keep it at the same moment.",
      frequency: "Every day",
      cues: ["Before bed, I write three lines", "When I close my laptop for the day, I write what went well", "With my morning coffee, I write one intention for the day"],
      mini: "One line — even \"tired, but went for a walk\" keeps the habit.",
      steps: ["What happened today", "How I felt", "One thing for tomorrow"],
      pitfalls: [
        { t: "Writing an essay", d: "Long entries feel great once and heavy the next day. Three lines are sustainable." },
        { t: "Only writing on bad days", d: "Good days matter too — they show what works." },
      ],
    },
    ru: {
      title: "Привычка вести дневник",
      metaTitle: "Трекер дневника — три строки в день, бесплатный шаблон",
      metaDescription: "Как начать вести дневник и не бросить: три строки в день, мини-версия в одну строку, планы «если — то» и подсказки. Серия дневника бесплатно в Streakly.",
      intro: "Дневнику не нужны страницы. Три честные строки в день — что произошло, что вы чувствовали, что сделаете завтра — достаточно, чтобы за месяц заметить закономерности. Пишите коротко и в одно и то же время.",
      frequency: "Каждый день",
      cues: ["Перед сном пишу три строки", "Когда закрываю ноутбук в конце дня — пишу, что получилось", "За утренним кофе пишу одно намерение на день"],
      mini: "Одна строка — даже «устал, но погулял» сохраняет привычку.",
      steps: ["Что произошло сегодня", "Что я чувствовал", "Одно дело на завтра"],
      pitfalls: [
        { t: "Писать сочинение", d: "Длинные записи приятны один раз и тяжелы на следующий день. Три строки — устойчиво." },
        { t: "Писать только в плохие дни", d: "Хорошие дни тоже важны — они показывают, что работает." },
      ],
    },
  },
}
