# QIDRA - brief дизайн-системы

Дата добавления: 2026-08-08  
Статус: рабочий brief для Figma и frontend-команды  
Связанные файлы кода:

- `app/globals.css`
- `tailwind.config.ts`
- `components/ui/Button.tsx`
- `components/ui/Input.tsx`
- `components/ui/Select.tsx`
- `components/ui/PasswordInput.tsx`
- `components/ui/ProgressBar.tsx`
- `components/ui/ProjectStatusBadge.tsx`
- `components/Header.tsx`
- `components/Footer.tsx`

## 1. Цель

Собрать базовую дизайн-систему QIDRA, чтобы новые страницы Marketplace, кабинетов компаний, кабинетов участников, админки и поддержки создавались из готовых токенов и компонентов, а не вручную каждый раз.

## 2. Блокирующий источник для цветов

Figma сейчас недоступна без прав редактора. Для финальной фиксации brand palette нужно одно из двух:

1. Выдать редакторский доступ к Figma той учётной записи, которая подключена к Codex/Figma.
2. Передать скриншот главной страницы с логотипом и ключевыми блоками в хорошем качестве.

До этого можно использовать фактические токены из production-кода, но их нужно считать техническим baseline, а не финальным брендбуком.

## 3. Текущие CSS-токены из кода

Источник: `app/globals.css`.

```css
--qidra-dark: #121417;
--qidra-white: #ffffff;
--qidra-accent: #4f46e5;
--qidra-accent-80: rgba(86, 87, 246, 0.8);
--qidra-accent-8: rgba(86, 87, 246, 0.08);
--qidra-accent-light: #ececff;
--qidra-gray-blue-dark: #2f3a4d;
--qidra-gray-blue: #667085;
--qidra-gray-medium: #a2a8b5;
--qidra-gray-light: #f6f7f9;
--qidra-line: rgba(18, 20, 23, 0.1);
--qidra-panel: #fbfcfd;
--qidra-red: #d64545;
--qidra-green: #148a5b;
--qidra-gold: #c39a3b;
--qidra-forest: #063f37;
```

## 4. Цветовые роли

Основные роли:

- `qidra-dark` - основной текст, тёмные кнопки, важные заголовки.
- `qidra-white` - фон карточек и шапки.
- `qidra-accent` - основной CTA, активные состояния, прогресс, ссылки.
- `qidra-accent-light` и `qidra-accent-8` - мягкие акцентные подложки.
- `qidra-gray-blue-dark` - вторичный тёмный текст.
- `qidra-gray-blue` - описания, подписи, мета-информация.
- `qidra-gray-medium` - placeholder, disabled, вторичные границы.
- `qidra-gray-light` - фоны полей, карточек, секций.
- `qidra-line` - тонкие разделители.
- `qidra-red` - ошибки, destructive action, rejected.
- `qidra-green` - success, approved, funded.
- `qidra-gold` - premium/asset/commodity accents.
- `qidra-forest` - reserved для исламского/шариатского/устойчивого акцента.

## 5. Типографика

Текущий production baseline:

- Основной шрифт: `Golos Text`.
- Fallback: `var(--font-sans), system-ui, sans-serif`.
- Основной текст: 16-18 px.
- Мелкие подписи: 12-14 px.
- Большие заголовки: 40-72 px в зависимости от страницы.

Рекомендуемая шкала:

- Display: 64/72, weight 500-600.
- H1: 54/60, weight 500-600.
- H2: 40/48, weight 500-600.
- H3: 28/36, weight 500-600.
- Body large: 18/30, weight 400-500.
- Body: 16/24, weight 400-500.
- Caption: 14/20.
- Micro: 12/16.

## 6. Радиусы, сетка и отступы

Текущая визуальная логика:

- Большие карточки: 24-28 px.
- Поля и кнопки: единый `rounded-qidra`.
- Pills/badges: full radius.
- Контейнеры: `container-qidra`, max-width должен быть единым для публичных страниц, кабинета компании и каталога.

Рекомендуемая сетка:

- Desktop: 12 колонок.
- Tablet: 8 колонок.
- Mobile: 4 колонки.
- Базовый spacing unit: 4 px.
- Основные отступы секций: 40/64/96 px.

## 7. Компоненты библиотеки

Минимальная библиотека для Figma и frontend:

1. Header public.
2. Header authenticated.
3. Footer.
4. Button: primary, dark, outline, white, destructive, disabled, loading.
5. Input: default, focus, filled, error, disabled, readonly.
6. Password input with visibility toggle.
7. Select.
8. Textarea.
9. Checkbox.
10. Radio.
11. File upload card.
12. Uploaded file row with remove/replace.
13. Project status badge.
14. Project catalog card.
15. Project detail metric card.
16. Company profile card.
17. Investor profile card.
18. Wallet balance card.
19. Support chat bubble.
20. Modal/toast: success, warning, error, confirm.
21. Admin review panel.
22. Dividend calculation form block.
23. Dividend period row.
24. Empty state.
25. Skeleton/loading state.

## 8. Состояния компонентов

Каждый компонент должен иметь состояния:

- default;
- hover;
- focus;
- active;
- disabled;
- loading;
- error;
- success;
- readonly;
- empty.

Для форм обязательно:

- error message под полем;
- визуальная граница поля до фокуса;
- visible focus ring;
- недеструктивный inline hint;
- сохранение читаемости на iPhone Safari.

## 9. Что нужно собрать в Figma

Структура Figma-файла:

1. Foundations: colors, typography, spacing, radii, shadows.
2. Components: UI primitives.
3. Patterns: forms, review cards, project cards, upload blocks.
4. Pages: public marketplace, investor cabinet, company cabinet, admin.
5. States: loading, empty, error, success.
6. Mobile: ключевые responsive states.

## 10. Результат

После сборки дизайн-системы новые разделы должны проектироваться и разрабатываться через готовые элементы. Это снижает риск повторных багов: сломанных карточек каталога, невидимых полей, разъезжающихся форм, нечитаемых кабинетов компании и несогласованных состояний ошибок.
