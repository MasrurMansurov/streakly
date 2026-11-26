# Каталоги и GitHub: пошаговые инструкции и готовые тексты (план роста, 1.4)

Зачем: люди ищут «альтернативу Habitica / Streaks / Loop» и «PWA habit tracker». Карточка
в каталоге приводит именно таких людей и даёт ссылку на сайт. Публиковать нужно от **вашего**
аккаунта: каталоги требуют регистрации владельца, а GitHub — права на репозиторий.

Тексты ниже на английском: каталоги международные. Копируйте блоки целиком.

Картинки для загрузки лежат в репозитории: `docs/screenshots/` (dashboard-light.png,
dashboard-dark.png, mobile.png, progress.png, wrapped.png, invite.png, checkin.gif).
Иконка: `public/icons/icon-512.png` (квадрат 512×512).

Проверено 26.11.2026: PWA List закрыт (май 2025) — его не используем.

---

## 1. GitHub — описание, сайт и темы (2 минуты, начать с этого)

Это бесплатное место в поиске GitHub: по темам `habit-tracker`, `nextjs`, `supabase`
разработчики находят проекты.

1. Откройте https://github.com/MasrurMansurov/streakly
2. Справа, в блоке **About**, нажмите на шестерёнку ⚙️.
3. **Description** — вставьте:
   ```
   Habit tracker that forgives: streak freezes, if-then plans, shared streaks with friends. Free, open source PWA — try it without signing up.
   ```
4. **Website** — вставьте: `https://streakly-pied-six.vercel.app`
5. **Topics** — вводите по одному слову и жмите Enter после каждого:
   ```
   habit-tracker habits streaks productivity pwa nextjs supabase typescript tailwindcss self-improvement open-source web-push
   ```
6. Остальные галочки в этом окне не трогайте. Нажмите **Save changes**.

Готово, если под названием репозитория появились описание, ссылка и синие «таблетки» тем.

---

## 2. AlternativeTo (10 минут + ожидание модерации)

Самый целевой каталог: сюда приходят те, кто уже ищет замену Habitica, Streaks, Loop.
Заявки проверяют вручную, часть отклоняют — поэтому важно заполнить всё аккуратно.
Ссылка на сайт там nofollow, так что ценность — в людях, а не в SEO.

1. Откройте https://alternativeto.net → **Sign up** (справа сверху) → подтвердите почту.
2. Справа сверху нажмите на свой аватар → **Suggest new application**.
3. Заполните поля:

**Name**
```
Streakly
```

**Website / Official link**
```
https://streakly-pied-six.vercel.app
```

**Short description** (одна строка)
```
A free, open-source habit tracker with forgiving streaks, if-then plans and shared streaks with friends.
```

**Description**
```
Streakly is a habit tracker built around how habits actually stick. Instead of punishing you for one bad day, it forgives: a missed day can be covered by a streak freeze, repaired, or paused with vacation mode — and coming back after a miss is rewarded.

- One-tap check-ins, also straight from the notification
- If-then plans ("After my morning coffee → read") and mini versions ("at least 1 page") for hard days
- Pacts: a shared streak with a friend that grows only when you both check in
- Challenges, a leaderboard and public profiles
- Insights from your own history: habits that go together, weak weekdays, mood and energy
- Year in review with a shareable story image
- Per-habit reminders (Web Push), works offline, installable as an app on phone and desktop
- English and Russian

Free, no ads, open source (MIT). You can try it without signing up.
```

**Platforms** — отметьте: `Online`, `Android`, `iPhone`, `Windows`, `Mac`, `Linux`
(это PWA: ставится из браузера на любое устройство). Если есть пункт `Self-Hosted` — тоже.

**License** — `Free` и `Open Source`.

**Categories** — `Productivity` (или `Lifestyle`), подкатегория `Habit Tracker`, если есть.

**Tags**
```
habit-tracker, streaks, productivity, pwa, open-source, self-improvement, accountability
```

**Source code (если есть поле)**
```
https://github.com/MasrurMansurov/streakly
```

**Screenshots** — загрузите `dashboard-light.png`, `mobile.png`, `progress.png`.
**Icon** — `public/icons/icon-512.png`.

4. Нажмите **Submit** и дождитесь письма об одобрении (бывает от суток до пары недель).
5. После одобрения откройте страницы конкурентов и добавьте Streakly как альтернативу:
   на странице приложения → **Contribute to this page** → **Suggest Alternatives** → найдите Streakly.
   Конкуренты (по одному разу на каждого):
   ```
   Habitica, Loop Habit Tracker, Streaks, Habitify, Way of Life, HabitShare, Productive
   ```

---

## 3. pwastore.io (3 минуты, без регистрации)

Открытый каталог устанавливаемых веб-приложений.

1. Откройте https://pwastore.io и найдите кнопку **Submit** (или «Add your PWA»).
   Если форма изменилась — заполняйте по смыслу теми же текстами.
2. Поля:

**URL**
```
https://streakly-pied-six.vercel.app/en
```

**Name**
```
Streakly
```

**Description**
```
Free, open-source habit tracker that forgives: streak freezes, repairs and vacation mode, if-then plans, mini versions for hard days, and shared streaks with friends. One-tap check-ins from notifications, works offline. Try it without signing up.
```

**Category** — `Productivity` (или `Lifestyle` / `Health & Fitness`).

3. Отправьте форму.

---

## 4. pwa.rocks (GitHub, 10 минут — по желанию)

Курируемая витрина красивых PWA на GitHub: https://github.com/osrec/pwa.rocks
Добавление — через Pull Request (нужен аккаунт GitHub, он у вас есть).

1. Откройте репозиторий и прочитайте README — там написано, в какой файл добавлять сайт.
2. Нажмите **Fork**, отредактируйте нужный файл прямо в браузере (значок карандаша),
   добавьте запись по образцу соседних:
   - Name: `Streakly`
   - URL: `https://streakly-pied-six.vercel.app/en`
   - Description: `Habit tracker with forgiving streaks and shared streaks with friends. Works offline.`
3. **Commit changes** → **Create pull request**. Текст PR:
   ```
   Add Streakly — a free, open-source habit tracker PWA (installable, offline, Web Push reminders).
   ```

Если у вас нет желания разбираться с PR — напишите, я подготовлю точный текст правки
под формат их файла.

---

## Что делать после публикации

- Через 2–3 недели посмотрите в воронке, откуда пришли люди (источник `alternativeto`,
  `github` и т. д. определяется автоматически):
  ```sql
  select * from public.growth_funnel(current_date - 30, current_date);
  ```
- Если AlternativeTo отклонил заявку — напишите мне причину из письма, поправим тексты.
