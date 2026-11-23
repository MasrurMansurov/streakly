-- Language of the reminder notification (the UI language the user last saved settings in)
alter table public.reminder_settings
  add column locale text not null default 'en' check (locale in ('en', 'ru'));
