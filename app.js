const STORE_KEY = "qidra.local.platform.v3";

const seed = {
  session: {
    signedIn: false,
    email: "qidra.hub@gmail.com",
    role: "admin",
    theme: "light",
    language: "ru",
    activeTicketId: "TCK-1001",
  },
  projects: [
    {
      id: "al-mahd",
      name: "Al Mahd",
      category: "Gold Mining",
      model: "Mudaraba",
      geography: "DR Congo, Kasai",
      target: 250000,
      raised: 168500,
      status: "Open",
      risk: "Operational",
      owner: "QIDRA Mining Partner",
      stage: "Sharia review complete",
      description:
        "Gold mining and processing project with profit distribution from real production income.",
    },
    {
      id: "amana-gold",
      name: "Al Amana Gold",
      category: "Gold Trading",
      model: "Mudaraba",
      geography: "DR Congo / UAE",
      target: 120000,
      raised: 86000,
      status: "Open",
      risk: "Trade execution",
      owner: "Al Amana Operations",
      stage: "Legal package",
      description:
        "Gold purchase and resale workflow with real commodity turnover and UAE settlement channels.",
    },
    {
      id: "qidra-re",
      name: "Qidra Real Estate",
      category: "Real Estate",
      model: "Musharaka",
      geography: "Dubai",
      target: 400000,
      raised: 92000,
      status: "Draft",
      risk: "Market cycle",
      owner: "QIDRA Real Estate",
      stage: "Project packaging",
      description:
        "Collective investment model for Dubai property acquisition, rental and resale opportunities.",
    },
    {
      id: "microgold",
      name: "MicroGold",
      category: "Gold Trading",
      model: "Wakalah",
      geography: "DR Congo / UAE",
      target: 75000,
      raised: 28000,
      status: "Draft",
      risk: "Liquidity",
      owner: "QIDRA Operations",
      stage: "Product packaging",
      description:
        "Small-ticket gold participation product for clients who need a lower entry threshold.",
    },
    {
      id: "pension-gold",
      name: "QIDRA Pension Gold",
      category: "Gold Savings",
      model: "Mudaraba",
      geography: "UAE",
      target: 180000,
      raised: 43000,
      status: "Draft",
      risk: "Long-term custody",
      owner: "QIDRA",
      stage: "Compliance review",
      description:
        "Long-term halal gold accumulation concept with clear risk disclosure and no fixed yield promise.",
    },
    {
      id: "dubai-flip",
      name: "Real Estate Flip",
      category: "Real Estate",
      model: "Musharaka",
      geography: "Dubai",
      target: 300000,
      raised: 51000,
      status: "Review",
      risk: "Market cycle",
      owner: "QIDRA Real Estate",
      stage: "Deal sourcing",
      description:
        "Dubai property resale opportunity structured around shared ownership and real transaction profit.",
    },
  ],
  applications: [
    {
      id: "APP-1007",
      investor: "Amina K.",
      email: "amina@example.com",
      project: "Al Mahd",
      amount: 15000,
      status: "Review",
      source: "Telegram",
      date: "2026-05-28",
    },
    {
      id: "APP-1008",
      investor: "Murad S.",
      email: "murad@example.com",
      project: "Al Amana Gold",
      amount: 8500,
      status: "Approved",
      source: "Google",
      date: "2026-05-29",
    },
    {
      id: "APP-1009",
      investor: "Yusuf A.",
      email: "yusuf@example.com",
      project: "Qidra Real Estate",
      amount: 22000,
      status: "Needs documents",
      source: "Website",
      date: "2026-05-30",
    },
  ],
  users: [
    {
      id: "USR-001",
      name: "Adam",
      email: "qidra.hub@gmail.com",
      role: "Owner",
      kyc: "Verified",
      balance: 0,
      joined: "2026-01-28",
    },
    {
      id: "USR-102",
      name: "Amina K.",
      email: "amina@example.com",
      role: "Investor",
      kyc: "Pending",
      balance: 15000,
      joined: "2026-05-28",
    },
    {
      id: "USR-103",
      name: "Murad S.",
      email: "murad@example.com",
      role: "Investor",
      kyc: "Verified",
      balance: 8500,
      joined: "2026-05-29",
    },
  ],
  tasks: [
    { id: "WF-1", title: "Verify Al Amana Gold legal package", owner: "Admin", status: "Today" },
    { id: "WF-2", title: "Confirm sharia notes for Real Estate", owner: "Council", status: "This week" },
    { id: "WF-3", title: "Prepare May investor update", owner: "Investor relations", status: "Draft" },
  ],
  managers: [
    {
      id: "MGR-001",
      name: "Adam",
      email: "qidra.hub@gmail.com",
      position: "Super admin",
      permissions: ["clients", "projects", "applications", "finance", "documents", "support", "team", "settings"],
      status: "Active",
    },
    {
      id: "MGR-002",
      name: "Compliance manager",
      email: "compliance@qidra.local",
      position: "Compliance",
      permissions: ["clients", "applications", "documents"],
      status: "Draft",
    },
    {
      id: "MGR-003",
      name: "Support manager",
      email: "support@qidra.local",
      position: "Support",
      permissions: ["clients", "support"],
      status: "Active",
    },
  ],
  supportTickets: [
    {
      id: "TCK-1001",
      client: "Amina K.",
      email: "amina@example.com",
      subject: "KYC document upload",
      status: "Open",
      assignedTo: "Support manager",
      messages: [
        { from: "client", text: "Здравствуйте, я загрузила паспорт. Нужно ли добавить подтверждение адреса?", time: "2026-05-30 14:10" },
        { from: "admin", text: "Здравствуйте. Да, пожалуйста приложите документ с адресом за последние 3 месяца.", time: "2026-05-30 14:22" },
      ],
    },
    {
      id: "TCK-1002",
      client: "Murad S.",
      email: "murad@example.com",
      subject: "Investment application status",
      status: "Waiting",
      assignedTo: "Investor relations",
      messages: [
        { from: "client", text: "Can I see the current status of my Al Amana Gold application?", time: "2026-05-29 18:40" },
      ],
    },
  ],
  documents: [
    {
      name: "Terms & Conditions RU",
      type: "Legal",
      status: "Published",
      href: "assets/documents/legal/terms-conditions-ru.docx",
    },
    {
      name: "Privacy Policy RU",
      type: "Legal",
      status: "Published",
      href: "assets/documents/legal/privacy-policy-ru.docx",
    },
    {
      name: "Cookie Policy RU",
      type: "Legal",
      status: "Published",
      href: "assets/documents/legal/cookie-policy-ru.docx",
    },
    {
      name: "QIDRA Business License",
      type: "Compliance",
      status: "Published",
      href: "assets/documents/compliance/business-license.pdf",
    },
    {
      name: "Certificate of Formation",
      type: "Compliance",
      status: "Published",
      href: "assets/documents/compliance/certificate-of-formation.pdf",
    },
    {
      name: "DNFBP Confirmation",
      type: "Compliance",
      status: "Published",
      href: "assets/documents/compliance/dnfbp-confirmation.pdf",
    },
    {
      name: "ESR Declaration",
      type: "Compliance",
      status: "Published",
      href: "assets/documents/compliance/esr-declaration.pdf",
    },
    { name: "AML Policy", type: "Required page", status: "To prepare" },
    { name: "KYC Policy", type: "Required page", status: "To prepare" },
    { name: "Risk Disclaimer", type: "Required page", status: "To prepare" },
    { name: "Sharia Compliance Statement", type: "Required page", status: "To prepare" },
    { name: "Complaints Procedure", type: "Required page", status: "To prepare" },
    { name: "Data Processing Notice", type: "Required page", status: "To prepare" },
  ],
};

let state = loadState();
let currentRoute = "home";
let currentProjectFilter = "all";

const permissionOptions = [
  { id: "clients", ru: "Клиенты", en: "Clients" },
  { id: "projects", ru: "Проекты", en: "Projects" },
  { id: "applications", ru: "Заявки", en: "Applications" },
  { id: "finance", ru: "Финансы", en: "Finance" },
  { id: "documents", ru: "Документы", en: "Documents" },
  { id: "support", ru: "Поддержка", en: "Support" },
  { id: "team", ru: "Команда", en: "Team" },
  { id: "settings", ru: "Настройки", en: "Settings" },
];

const translations = {
  ru: {
    brandSubtitle: "Халяльный инвестиционный маркетплейс",
    navHome: "Главная",
    navOverview: "Обзор",
    navProjects: "Проекты",
    navInvestor: "Кабинет инвестора",
    navOwner: "Кабинет проекта",
    navAdmin: "Админ-панель",
    navSupport: "Поддержка",
    navTeam: "Команда",
    navDocuments: "Документы",
    roleAdmin: "Администратор",
    roleManager: "Менеджер",
    roleInvestor: "Инвестор",
    roleOwner: "Владелец проекта",
    statusLabel: "Статус",
    localSafe: "Работает локально. Безопасно для тестов.",
    searchLabel: "Поиск",
    searchPlaceholder: "Проект, клиент, заявка",
    heroPill: "Без риба · Доходность не гарантируется",
    heroTitle: "QIDRA Halal Investment Marketplace",
    heroText:
      "Реальные активы, исламские модели партнёрства, KYC/AML workflow и прозрачные кабинеты для инвесторов, владельцев проектов и команды QIDRA.",
    guest: "Гость",
    signIn: "Войти",
    signOut: "Выйти",
    demoMode: "Demo mode",
    session: "сессия",
    homeTitle: "Главная",
    overviewTitle: "Обзор",
    projectsTitle: "Проекты",
    investorTitle: "Кабинет инвестора",
    ownerTitle: "Кабинет проекта",
    adminTitle: "Админ-панель",
    crmTitle: "CRM",
    supportTitle: "Поддержка",
    teamTitle: "Команда",
    documentsTitle: "Документы",
    openCabinet: "Войти в кабинет",
    viewProjects: "Смотреть проекты",
    publicLead:
      "QIDRA помогает инвесторам и владельцам проектов работать с реальными активами по принципам исламского финансирования.",
    publicDisclaimer:
      "QIDRA LLC не является банком, брокером или инвестиционным консультантом. Инвестиции связаны с риском, доходность не гарантируется.",
    marketplace: "Маркетплейс проектов",
    addProject: "Добавить",
    noProjects: "Проекты не найдены.",
    application: "Заявка",
    newProject: "Новый проект",
    supportChat: "Чат поддержки",
    sendReply: "Отправить ответ",
    managerAccess: "Менеджеры и права доступа",
    addManager: "Добавить менеджера",
    loginTitle: "Вход в QIDRA",
    cabinetLogin: "Войти в кабинет",
    openFile: "Открыть файл",
    prepareNeeded: "Нужно подготовить",
    raisedCapital: "Привлечённый капитал",
    acrossProjects: "По демо-проектам QIDRA",
    openProjects: "Открытые проекты",
    halalMarketplace: "Халяльный маркетплейс",
    applicationsLabel: "Заявки",
    needAction: "требуют внимания",
    usersLabel: "Пользователи",
    operatorsLabel: "Инвесторы и операторы",
    projectPipeline: "Проектный pipeline",
    workflow: "Рабочий процесс",
    liveBoard: "Живая доска",
    portfolio: "Портфель",
    approvedParticipation: "Одобренное участие",
    pendingApplications: "Заявки в ожидании",
    awaitingReview: "Ожидают проверки QIDRA",
    availableCabinet: "Доступно в кабинете",
    projectOnboarding: "Подача проекта",
    submitProject: "Подать проект",
    myProjects: "Мои проекты",
    investorRequests: "Запросы инвесторов",
    registeredAccounts: "Зарегистрированные аккаунты",
    marketplaceRecords: "Записи маркетплейса",
    backupExport: "Экспорт выполнен",
    investorApplications: "Заявки инвесторов",
    user: "Пользователь",
    role: "Роль",
    balance: "Баланс",
    joined: "Дата входа",
    action: "Действие",
    source: "Источник",
    amount: "Сумма",
    project: "Проект",
    applicationTitlePrefix: "Заявка",
    nameLabel: "Имя",
    emailLabel: "Email",
    participationAmount: "Сумма участия",
    commentLabel: "Комментарий",
    submitApplication: "Отправить заявку",
    titleLabel: "Название",
    categoryLabel: "Категория",
    modelLabel: "Модель",
    geographyLabel: "География",
    targetLabel: "Цель",
    raisedLabel: "Собрано",
    descriptionLabel: "Описание",
    createProject: "Создать проект",
    applicationNoteDefault: "Интересует халяльная модель участия.",
    projectDescriptionDefault: "Проект с реальным активом и халяльной моделью распределения прибыли.",
    legalNotice:
      "QIDRA LLC выступает технологическим посредником и маркетплейсом проектов. Платформа не является банком, не предоставляет инвестиционные советы и не обещает фиксированную доходность.",
    accessDeniedTitle: "Нет доступа",
    accessDeniedText: "Для этого раздела нужна другая роль или дополнительное право доступа.",
  },
  en: {
    brandSubtitle: "Halal investment marketplace",
    navHome: "Home",
    navOverview: "Overview",
    navProjects: "Projects",
    navInvestor: "Investor cabinet",
    navOwner: "Project cabinet",
    navAdmin: "Admin panel",
    navSupport: "Support",
    navTeam: "Team",
    navDocuments: "Documents",
    roleAdmin: "Admin",
    roleManager: "Manager",
    roleInvestor: "Investor",
    roleOwner: "Project owner",
    statusLabel: "Status",
    localSafe: "Runs locally. Safe for testing.",
    searchLabel: "Search",
    searchPlaceholder: "Project, client, application",
    heroPill: "No riba · No guaranteed returns",
    heroTitle: "QIDRA Halal Investment Marketplace",
    heroText:
      "Real assets, Islamic partnership models, KYC/AML workflow and clear cabinets for investors, project owners and the QIDRA team.",
    guest: "Guest",
    signIn: "Sign in",
    signOut: "Sign out",
    demoMode: "Demo mode",
    session: "session",
    homeTitle: "Home",
    overviewTitle: "Overview",
    projectsTitle: "Projects",
    investorTitle: "Investor cabinet",
    ownerTitle: "Project cabinet",
    adminTitle: "Admin panel",
    crmTitle: "CRM",
    supportTitle: "Support",
    teamTitle: "Team",
    documentsTitle: "Documents",
    openCabinet: "Enter cabinet",
    viewProjects: "View projects",
    publicLead:
      "QIDRA helps investors and project owners work with real assets under Islamic finance principles.",
    publicDisclaimer:
      "QIDRA LLC is not a bank, broker or investment adviser. Investments involve risk and returns are not guaranteed.",
    marketplace: "Project marketplace",
    addProject: "Add",
    noProjects: "No projects found.",
    application: "Apply",
    newProject: "New project",
    supportChat: "Support chat",
    sendReply: "Send reply",
    managerAccess: "Managers and access rights",
    addManager: "Add manager",
    loginTitle: "QIDRA sign in",
    cabinetLogin: "Enter cabinet",
    openFile: "Open file",
    prepareNeeded: "To prepare",
    raisedCapital: "Raised capital",
    acrossProjects: "Across QIDRA demo projects",
    openProjects: "Open projects",
    halalMarketplace: "Halal marketplace",
    applicationsLabel: "Applications",
    needAction: "need action",
    usersLabel: "Users",
    operatorsLabel: "Investors and operators",
    projectPipeline: "Project pipeline",
    workflow: "Workflow",
    liveBoard: "Live board",
    portfolio: "Portfolio",
    approvedParticipation: "Approved participation",
    pendingApplications: "Pending applications",
    awaitingReview: "Awaiting QIDRA review",
    availableCabinet: "Available in cabinet",
    projectOnboarding: "Project onboarding",
    submitProject: "Submit project",
    myProjects: "My projects",
    investorRequests: "Investor requests",
    registeredAccounts: "Registered accounts",
    marketplaceRecords: "Marketplace records",
    backupExport: "Export completed",
    investorApplications: "Investor applications",
    user: "User",
    role: "Role",
    balance: "Balance",
    joined: "Joined",
    action: "Action",
    source: "Source",
    amount: "Amount",
    project: "Project",
    applicationTitlePrefix: "Application",
    nameLabel: "Name",
    emailLabel: "Email",
    participationAmount: "Participation amount",
    commentLabel: "Comment",
    submitApplication: "Submit application",
    titleLabel: "Title",
    categoryLabel: "Category",
    modelLabel: "Model",
    geographyLabel: "Geography",
    targetLabel: "Target",
    raisedLabel: "Raised",
    descriptionLabel: "Description",
    createProject: "Create project",
    applicationNoteDefault: "Interested in the halal participation model.",
    projectDescriptionDefault: "Real asset project with a halal profit-sharing model.",
    legalNotice:
      "QIDRA LLC acts as a technology intermediary and project marketplace. The platform is not a bank, does not provide investment advice and does not promise fixed returns.",
    accessDeniedTitle: "No access",
    accessDeniedText: "This section requires another role or an additional access permission.",
  },
};

function lang() {
  return state.session.language === "en" ? "en" : "ru";
}

function t(key) {
  return translations[lang()][key] || translations.ru[key] || key;
}

function localPermissionName(permission) {
  const item = permissionOptions.find((option) => option.id === permission);
  return item ? item[lang()] : permission;
}

function textMap(value, map) {
  return map[value]?.[lang()] || value;
}

function statusText(value) {
  return textMap(value, {
    Open: { ru: "Открыт", en: "Open" },
    Draft: { ru: "Черновик", en: "Draft" },
    Review: { ru: "Проверка", en: "Review" },
    "Needs documents": { ru: "Нужны документы", en: "Needs documents" },
    Approved: { ru: "Одобрено", en: "Approved" },
    Rejected: { ru: "Отклонено", en: "Rejected" },
    Waiting: { ru: "Ожидает", en: "Waiting" },
    Closed: { ru: "Закрыто", en: "Closed" },
    Active: { ru: "Активен", en: "Active" },
    Published: { ru: "Опубликовано", en: "Published" },
    "To prepare": { ru: "Нужно подготовить", en: "To prepare" },
    Verified: { ru: "Проверен", en: "Verified" },
    Pending: { ru: "В ожидании", en: "Pending" },
    Owner: { ru: "Владелец", en: "Owner" },
    Investor: { ru: "Инвестор", en: "Investor" },
  });
}

function roleText(role) {
  return (
    {
      admin: t("roleAdmin"),
      manager: t("roleManager"),
      investor: t("roleInvestor"),
      owner: t("roleOwner"),
    }[role] || role
  );
}

function defaultEmailForRole(role) {
  return (
    {
      admin: "qidra.hub@gmail.com",
      manager: "support@qidra.local",
      investor: "amina@example.com",
      owner: "owner@qidra.local",
    }[role] || state.session.email
  );
}

function normalizeState(next) {
  const normalized = { ...structuredClone(seed), ...next };
  normalized.session = { ...structuredClone(seed.session), ...(next.session || {}) };
  normalized.projects = Array.isArray(next.projects) ? next.projects : structuredClone(seed.projects);
  normalized.applications = Array.isArray(next.applications)
    ? next.applications
    : structuredClone(seed.applications);
  normalized.users = Array.isArray(next.users) ? next.users : structuredClone(seed.users);
  normalized.tasks = Array.isArray(next.tasks) ? next.tasks : structuredClone(seed.tasks);
  normalized.managers = Array.isArray(next.managers) ? next.managers : structuredClone(seed.managers);
  normalized.supportTickets = Array.isArray(next.supportTickets)
    ? next.supportTickets
    : structuredClone(seed.supportTickets);
  normalized.documents = Array.isArray(next.documents) ? next.documents : structuredClone(seed.documents);

  const supportManager = normalized.managers.find((manager) => manager.email === "support@qidra.local");
  if (supportManager) supportManager.status = "Active";
  if (!normalized.session.language) normalized.session.language = "ru";
  if (!["admin", "manager", "investor", "owner"].includes(normalized.session.role)) {
    normalized.session.role = "admin";
  }
  return normalized;
}

function loadState() {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return normalizeState(structuredClone(seed));
  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return normalizeState(structuredClone(seed));
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value, total) {
  return Math.min(100, Math.round((value / total) * 100));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function currentManager() {
  return state.managers.find((manager) => manager.email.toLowerCase() === state.session.email.toLowerCase());
}

function hasPermission(permission) {
  if (!state.session.signedIn) return false;
  if (state.session.role === "admin") return true;
  if (state.session.role !== "manager") return false;
  const manager = currentManager();
  return Boolean(manager && manager.status === "Active" && manager.permissions.includes(permission));
}

function canAccessRoute(route) {
  if (["home", "projects", "documents"].includes(route)) return true;
  if (!state.session.signedIn) return false;
  if (route === "overview") return true;
  if (route === "investor") return state.session.role === "investor";
  if (route === "owner") return state.session.role === "owner";
  if (route === "support") {
    return ["admin", "investor", "owner"].includes(state.session.role) || hasPermission("support");
  }
  if (route === "admin") {
    return ["applications", "projects", "finance", "documents"].some((permission) => hasPermission(permission));
  }
  if (route === "crm") return hasPermission("clients");
  if (route === "team") return hasPermission("team");
  return false;
}

function canOperateSupport() {
  return state.session.role === "admin" || hasPermission("support");
}

function visibleSupportTickets() {
  if (canOperateSupport()) return state.supportTickets;
  return state.supportTickets.filter((ticket) => ticket.email.toLowerCase() === state.session.email.toLowerCase());
}

function defaultRouteForSession() {
  if (!state.session.signedIn) return "home";
  if (state.session.role === "admin") return "admin";
  if (state.session.role === "investor") return "investor";
  if (state.session.role === "owner") return "owner";
  if (hasPermission("support")) return "support";
  if (hasPermission("clients")) return "crm";
  if (hasPermission("applications") || hasPermission("projects")) return "admin";
  if (hasPermission("team")) return "team";
  return "overview";
}

function setRoute(route) {
  currentRoute = canAccessRoute(route) ? route : defaultRouteForSession();
  qsa(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.route === currentRoute));
  const titles = {
    home: t("homeTitle"),
    overview: t("overviewTitle"),
    projects: t("projectsTitle"),
    investor: t("investorTitle"),
    owner: t("ownerTitle"),
    admin: t("adminTitle"),
    crm: t("crmTitle"),
    support: t("supportTitle"),
    team: t("teamTitle"),
    documents: t("documentsTitle"),
  };
  qs("#pageTitle").textContent = titles[currentRoute] || "QIDRA";
  render();
}

function updateStaticText() {
  document.documentElement.lang = lang();
  qsa("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  qs("#globalSearch").placeholder = t("searchPlaceholder");
  qs("#languageSwitcher").value = lang();
}

function updateRoleVisibility() {
  updateStaticText();
  const role = state.session.role;
  const signedIn = state.session.signedIn;
  qsa(".nav-item").forEach((el) => el.classList.toggle("hidden", !canAccessRoute(el.dataset.route)));
  qsa(".admin-only").forEach((el) => el.classList.toggle("hidden", !signedIn || !canAccessRoute(el.dataset.route)));
  qsa(".manager-only").forEach((el) => el.classList.toggle("hidden", !signedIn || !canAccessRoute(el.dataset.route)));
  qsa(".investor-only").forEach((el) => el.classList.toggle("hidden", !signedIn || role !== "investor"));
  qsa(".owner-only").forEach((el) => el.classList.toggle("hidden", !signedIn || role !== "owner"));
  qsa(".cabinet-only").forEach((el) => el.classList.toggle("hidden", !signedIn || !canAccessRoute(el.dataset.route)));
  qs("#roleSwitcher").value = role;
  qs("#sideStatus").textContent = state.session.signedIn
    ? `${roleText(state.session.role)} ${t("session")}`
    : t("demoMode");
  qs("#loginButton").textContent = state.session.signedIn ? t("signOut") : t("signIn");
  qs("#userBadge").textContent = state.session.signedIn
    ? `${state.session.email} · ${roleText(state.session.role)}`
    : t("guest");
}

function render() {
  updateRoleVisibility();
  document.documentElement.dataset.theme = state.session.theme;
  const view = qs("#view");
  const search = qs("#globalSearch").value.trim().toLowerCase();
  if (!canAccessRoute(currentRoute)) {
    currentRoute = defaultRouteForSession();
  }
  const routeRenderers = {
    home: renderHome,
    overview: renderOverview,
    projects: () => renderProjects(search),
    investor: renderInvestor,
    owner: renderOwner,
    admin: () => renderAdmin(search),
    crm: () => renderCrm(search),
    support: renderSupport,
    team: renderTeam,
    documents: renderDocuments,
  };
  view.innerHTML = (routeRenderers[currentRoute] || renderOverview)();
  bindViewEvents();
}

function renderHome() {
  const featured = state.projects.slice(0, 3);
  return `
    <div class="landing-grid">
      <section class="landing-main">
        <img class="landing-logo" src="assets/brand/qidra-logo-gold.png" alt="QIDRA" />
        <h2>${t("heroTitle")}</h2>
        <p>${t("publicLead")}</p>
        <div class="landing-actions">
          <button class="primary-btn" data-action="open-login">${t("openCabinet")}</button>
          <button class="ghost-btn" data-route-link="projects">${t("viewProjects")}</button>
        </div>
        <p class="notice legal-note">${t("publicDisclaimer")}</p>
      </section>
      <section class="card">
        <div class="card-head">
          <h3>${t("marketplace")}</h3>
          <span class="badge">${featured.length}</span>
        </div>
        <div class="card-stack">
          ${featured.map(projectCard).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderOverview() {
  const totalRaised = state.projects.reduce((sum, project) => sum + project.raised, 0);
  const openProjects = state.projects.filter((project) => project.status === "Open").length;
  const pendingApplications = state.applications.filter((app) => app.status !== "Approved").length;

  return `
    <div class="grid four">
      ${metric(t("raisedCapital"), money(totalRaised), t("acrossProjects"))}
      ${metric(t("openProjects"), openProjects, t("halalMarketplace"))}
      ${metric(t("applicationsLabel"), state.applications.length, `${pendingApplications} ${t("needAction")}`)}
      ${metric(t("usersLabel"), state.users.length, t("operatorsLabel"))}
    </div>
    <div class="grid two">
      <section class="card">
        <div class="card-head">
          <h3>${t("projectPipeline")}</h3>
          <button class="ghost-btn" data-action="new-project">${t("newProject")}</button>
        </div>
        <div class="card-stack">
          ${state.projects.map(projectCard).join("")}
        </div>
      </section>
      <section class="card">
        <div class="card-head">
          <h3>${t("workflow")}</h3>
          <span class="badge">${t("liveBoard")}</span>
        </div>
        <div class="timeline">
          ${state.tasks
            .map(
              (task) => `
                <div class="timeline-item">
                  <span class="timeline-dot"></span>
                  <div>
                    <strong>${escapeHtml(task.title)}</strong>
                    <p class="meta">${escapeHtml(task.owner)} · ${escapeHtml(task.status)}</p>
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
        <p class="notice legal-note">
          ${t("publicDisclaimer")}
        </p>
      </section>
    </div>
  `;
}

function metric(label, value, help) {
  return `
    <article class="metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p class="meta">${escapeHtml(help)}</p>
    </article>
  `;
}

function projectCard(project) {
  const progress = percent(project.raised, project.target);
  return `
    <article class="project-card">
      <div class="project-top">
        <div>
          <span class="badge">${escapeHtml(project.category)}</span>
          <h3>${escapeHtml(project.name)}</h3>
          <p class="meta">${escapeHtml(project.geography)} · ${escapeHtml(project.model)}</p>
        </div>
        <strong>${escapeHtml(statusText(project.status))}</strong>
      </div>
      <p>${escapeHtml(project.description)}</p>
      <div class="progress" title="${progress}%"><span style="width:${progress}%"></span></div>
      <div class="project-top">
        <span>${money(project.raised)} / ${money(project.target)}</span>
        <button class="primary-btn" data-action="apply" data-project="${escapeHtml(project.id)}">${t("application")}</button>
      </div>
    </article>
  `;
}

function renderProjects(search = "") {
  const categories = ["all", ...new Set(state.projects.map((project) => project.category))];
  const projects = state.projects.filter((project) => {
    const matchesCategory = currentProjectFilter === "all" || project.category === currentProjectFilter;
    const haystack = `${project.name} ${project.category} ${project.geography}`.toLowerCase();
    return matchesCategory && haystack.includes(search);
  });

  return `
    <section class="card">
      <div class="card-head">
          <h3>${t("marketplace")}</h3>
        <div class="toolbar">
          <div class="tabs">
            ${categories
              .map(
                (category) => `
                  <button class="tab ${currentProjectFilter === category ? "active" : ""}" data-filter="${escapeHtml(
                    category,
                  )}">${category === "all" ? (lang() === "ru" ? "Все" : "All") : escapeHtml(category)}</button>
                `,
              )
              .join("")}
          </div>
          <button class="ghost-btn" data-action="new-project">${t("addProject")}</button>
        </div>
      </div>
      <div class="grid three">
        ${projects.map(projectCard).join("") || `<p class="notice">${t("noProjects")}</p>`}
      </div>
    </section>
  `;
}

function renderInvestor() {
  const approved = state.applications.filter((app) => app.status === "Approved");
  const total = approved.reduce((sum, app) => sum + app.amount, 0);
  return `
    <div class="grid three">
      ${metric(t("portfolio"), money(total), t("approvedParticipation"))}
      ${metric(t("pendingApplications"), state.applications.length - approved.length, t("awaitingReview"))}
      ${metric(t("navDocuments"), state.documents.length, t("availableCabinet"))}
    </div>
    <section class="table-wrap">
      <table>
        <thead>
          <tr><th>${t("application")}</th><th>${t("project")}</th><th>${t("amount")}</th><th>${t("statusLabel")}</th><th>${t("source")}</th></tr>
        </thead>
        <tbody>
          ${state.applications
            .map(
              (app) => `
                <tr>
                  <td><span class="row-title">${escapeHtml(app.id)}</span><span class="row-subtitle">${escapeHtml(
                    app.date,
                  )}</span></td>
                  <td>${escapeHtml(app.project)}</td>
                  <td>${money(app.amount)}</td>
                  <td><span class="badge">${escapeHtml(statusText(app.status))}</span></td>
                  <td>${escapeHtml(app.source)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderOwner() {
  return `
    <div class="grid two">
      <section class="card">
        <div class="card-head">
          <h3>${t("projectOnboarding")}</h3>
          <button class="primary-btn" data-action="new-project">${t("submitProject")}</button>
        </div>
        <div class="timeline">
          ${["Primary check", "Sharia analysis", "Legal check", "Final moderation"]
            .map(
              (step, index) => `
                <div class="timeline-item">
                  <span class="timeline-dot"></span>
                  <div>
                    <strong>${step}</strong>
                    <p class="meta">${index < 2 ? "Active" : "Waiting"}</p>
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
      </section>
      <section class="card">
        <div class="card-head">
          <h3>${t("myProjects")}</h3>
          <span class="badge">${state.projects.length} ${t("navProjects").toLowerCase()}</span>
        </div>
        <div class="card-stack">
          ${state.projects.map(projectCard).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderAdmin(search = "") {
  const apps = state.applications.filter((app) =>
    `${app.id} ${app.investor} ${app.project} ${app.status}`.toLowerCase().includes(search),
  );
  const openTickets = state.supportTickets.filter((ticket) => ticket.status !== "Closed");
  const verifiedUsers = state.users.filter((user) => user.kyc === "Verified");
  const publishedDocs = state.documents.filter((doc) => doc.status === "Published");
  const pendingDocs = state.documents.filter((doc) => doc.status !== "Published");
  const activeManagers = state.managers.filter((manager) => manager.status === "Active");
  const accessRows = permissionOptions.map((permission) => {
    const owners = activeManagers.filter((manager) => manager.permissions.includes(permission.id));
    return `
      <div class="access-row">
        <strong>${escapeHtml(permission[lang()])}</strong>
        <div class="mini-tags">
          ${
            owners.length
              ? owners.map((manager) => `<span>${escapeHtml(manager.name)}</span>`).join("")
              : `<span>${lang() === "ru" ? "Не назначено" : "Unassigned"}</span>`
          }
        </div>
      </div>
    `;
  });
  const adminCards = [
    canAccessRoute("support")
      ? `
        <section class="card">
          <div class="card-head">
            <h3>${t("supportChat")}</h3>
            <span class="badge">${state.supportTickets.filter((ticket) => ticket.status !== "Closed").length}</span>
          </div>
          <p class="meta">${lang() === "ru" ? "Диалоги клиентов и операционные вопросы." : "Client conversations and operational questions."}</p>
          <button class="ghost-btn card-action" data-route-link="support">${t("navSupport")}</button>
        </section>
      `
      : "",
    canAccessRoute("team")
      ? `
        <section class="card">
          <div class="card-head">
            <h3>${t("managerAccess")}</h3>
            <span class="badge">${state.managers.length}</span>
          </div>
          <p class="meta">${lang() === "ru" ? "Роли, права доступа и менеджеры платформы." : "Roles, permissions and platform managers."}</p>
          <button class="ghost-btn card-action" data-route-link="team">${t("navTeam")}</button>
        </section>
      `
      : "",
    `
      <section class="card">
        <div class="card-head">
          <h3>${t("navDocuments")}</h3>
          <span class="badge">${state.documents.length}</span>
        </div>
        <p class="meta">${lang() === "ru" ? "Юридические и compliance файлы QIDRA." : "QIDRA legal and compliance files."}</p>
        <button class="ghost-btn card-action" data-route-link="documents">${t("navDocuments")}</button>
      </section>
    `,
  ].join("");
  return `
    <div class="grid four">
      ${metric(t("usersLabel"), state.users.length, t("registeredAccounts"))}
      ${metric(t("applicationsLabel"), state.applications.length, t("investorRequests"))}
      ${metric(t("navProjects"), state.projects.length, t("marketplaceRecords"))}
      ${metric(t("navSupport"), openTickets.length, lang() === "ru" ? "открытых обращений" : "open tickets")}
    </div>
    <div class="grid three">
      <section class="card">
        <div class="card-head">
          <h3>${lang() === "ru" ? "Операционный контроль" : "Operations control"}</h3>
          <span class="badge">${lang() === "ru" ? "Сегодня" : "Today"}</span>
        </div>
        <div class="status-list">
          <div><span>${lang() === "ru" ? "KYC проверено" : "KYC verified"}</span><strong>${verifiedUsers.length}/${state.users.length}</strong></div>
          <div><span>${lang() === "ru" ? "Заявки на проверке" : "Applications in review"}</span><strong>${state.applications.filter((app) => app.status === "Review" || app.status === "Needs documents").length}</strong></div>
          <div><span>${lang() === "ru" ? "Активные менеджеры" : "Active managers"}</span><strong>${activeManagers.length}</strong></div>
        </div>
      </section>
      <section class="card">
        <div class="card-head">
          <h3>${lang() === "ru" ? "Compliance-пакет" : "Compliance package"}</h3>
          <span class="badge">${publishedDocs.length}/${state.documents.length}</span>
        </div>
        <div class="progress"><span style="width:${percent(publishedDocs.length, state.documents.length)}%"></span></div>
        <p class="meta">${pendingDocs.length} ${lang() === "ru" ? "документов нужно подготовить для публичного сайта." : "documents still need to be prepared for the public site."}</p>
      </section>
      <section class="card">
        <div class="card-head">
          <h3>${lang() === "ru" ? "Инфраструктура" : "Infrastructure"}</h3>
          <span class="badge">Cloud Run</span>
        </div>
        <div class="status-list">
          <div><span>frontend-prod</span><strong>${lang() === "ru" ? "активен" : "active"}</strong></div>
          <div><span>api-prod</span><strong>${lang() === "ru" ? "активен" : "active"}</strong></div>
          <div><span>Cloud SQL</span><strong>${t("backupExport")}</strong></div>
        </div>
      </section>
    </div>
    <div class="grid three">
      ${adminCards}
    </div>
    ${
      hasPermission("team")
        ? `
          <section class="card access-map">
            <div class="card-head">
              <h3>${lang() === "ru" ? "Карта прав менеджеров" : "Manager access map"}</h3>
              <span class="badge">RBAC</span>
            </div>
            <div class="access-grid">${accessRows.join("")}</div>
          </section>
        `
        : ""
    }
    <section class="table-wrap">
      <div class="card-head table-title">
        <h3>${t("investorApplications")}</h3>
        <span class="badge">Admin</span>
      </div>
      <table>
        <thead>
          <tr><th>ID</th><th>${lang() === "ru" ? "Инвестор" : "Investor"}</th><th>${t("project")}</th><th>${t("amount")}</th><th>${t("statusLabel")}</th><th>${t("action")}</th></tr>
        </thead>
        <tbody>
          ${apps
            .map(
              (app) => `
                <tr>
                  <td>${escapeHtml(app.id)}</td>
                  <td><span class="row-title">${escapeHtml(app.investor)}</span><span class="row-subtitle">${escapeHtml(
                    app.email,
                  )}</span></td>
                  <td>${escapeHtml(app.project)}</td>
                  <td>${money(app.amount)}</td>
                  <td><span class="badge">${escapeHtml(statusText(app.status))}</span></td>
                  <td>
                    <select data-action="status" data-id="${escapeHtml(app.id)}" ${
                      hasPermission("applications") ? "" : "disabled"
                    }>
                      ${["Review", "Needs documents", "Approved", "Rejected"]
                        .map((status) => `<option ${status === app.status ? "selected" : ""}>${status}</option>`)
                        .join("")}
                    </select>
                  </td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderCrm(search = "") {
  const users = state.users.filter((user) =>
    `${user.name} ${user.email} ${user.role} ${user.kyc}`.toLowerCase().includes(search),
  );
  const pendingKyc = users.filter((user) => user.kyc !== "Verified");
  const totalBalance = users.reduce((sum, user) => sum + user.balance, 0);
  const latestTickets = state.supportTickets.filter((ticket) =>
    users.some((user) => user.email.toLowerCase() === ticket.email.toLowerCase()),
  );
  return `
    <div class="grid three">
      ${metric(t("usersLabel"), users.length, t("registeredAccounts"))}
      ${metric("KYC", `${users.length - pendingKyc.length}/${users.length}`, lang() === "ru" ? "проверены" : "verified")}
      ${metric(t("balance"), money(totalBalance), lang() === "ru" ? "по клиентским профилям" : "across client profiles")}
    </div>
    <section class="client-grid">
      ${users
        .map((user) => {
          const ticket = latestTickets.find((item) => item.email.toLowerCase() === user.email.toLowerCase());
          const app = state.applications.find((item) => item.email.toLowerCase() === user.email.toLowerCase());
          return `
            <article class="client-card">
              <div class="card-head">
                <div>
                  <h3>${escapeHtml(user.name)}</h3>
                  <p class="meta">${escapeHtml(user.email)} · ${escapeHtml(user.id)}</p>
                </div>
                <span class="badge">${escapeHtml(statusText(user.kyc))}</span>
              </div>
              <div class="status-list compact">
                <div><span>${t("role")}</span><strong>${escapeHtml(statusText(user.role))}</strong></div>
                <div><span>${t("balance")}</span><strong>${money(user.balance)}</strong></div>
                <div><span>${t("application")}</span><strong>${app ? escapeHtml(app.id) : "—"}</strong></div>
                <div><span>${t("navSupport")}</span><strong>${ticket ? escapeHtml(statusText(ticket.status)) : "—"}</strong></div>
              </div>
              <div class="client-actions">
                <button class="ghost-btn" data-route-link="support" ${ticket ? "" : "disabled"}>${t("navSupport")}</button>
                <button class="ghost-btn" data-route-link="documents">${t("navDocuments")}</button>
              </div>
            </article>
          `;
        })
        .join("")}
    </section>
    <section class="table-wrap">
      <table>
        <thead>
          <tr><th>${t("user")}</th><th>Email</th><th>${t("role")}</th><th>KYC</th><th>${t("balance")}</th><th>${t("joined")}</th></tr>
        </thead>
        <tbody>
          ${users
            .map(
              (user) => `
                <tr>
                  <td><span class="row-title">${escapeHtml(user.name)}</span><span class="row-subtitle">${escapeHtml(
                    user.id,
                  )}</span></td>
                  <td>${escapeHtml(user.email)}</td>
                  <td>${escapeHtml(statusText(user.role))}</td>
                  <td><span class="badge">${escapeHtml(statusText(user.kyc))}</span></td>
                  <td>${money(user.balance)}</td>
                  <td>${escapeHtml(user.joined)}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderSupport() {
  const tickets = visibleSupportTickets();
  const activeTicket = tickets.find((ticket) => ticket.id === state.session.activeTicketId) || tickets[0];
  if (activeTicket) state.session.activeTicketId = activeTicket.id;
  const operatorMode = canOperateSupport();
  const openCount = tickets.filter((ticket) => ticket.status === "Open").length;
  const waitingCount = tickets.filter((ticket) => ticket.status === "Waiting").length;
  const closedCount = tickets.filter((ticket) => ticket.status === "Closed").length;

  return `
    <div class="grid three support-stats">
      ${metric(lang() === "ru" ? "Открытые" : "Open", openCount, lang() === "ru" ? "нужен ответ" : "needs reply")}
      ${metric(lang() === "ru" ? "Ожидают" : "Waiting", waitingCount, lang() === "ru" ? "ожидаем клиента" : "waiting for client")}
      ${metric(lang() === "ru" ? "Закрытые" : "Closed", closedCount, lang() === "ru" ? "завершены" : "resolved")}
    </div>
    <div class="support-layout">
      <section class="table-wrap ticket-list">
        <div class="card-head table-title">
          <h3>${t("supportChat")}</h3>
          <span class="badge">${tickets.length}</span>
        </div>
        <table>
          <thead>
            <tr><th>ID</th><th>${lang() === "ru" ? "Клиент" : "Client"}</th><th>${lang() === "ru" ? "Статус" : "Status"}</th></tr>
          </thead>
          <tbody>
            ${tickets
              .map(
                (ticket) => `
                  <tr class="${ticket.id === activeTicket?.id ? "selected-row" : ""}" data-ticket="${escapeHtml(ticket.id)}">
                    <td>${escapeHtml(ticket.id)}</td>
                    <td><span class="row-title">${escapeHtml(ticket.client)}</span><span class="row-subtitle">${escapeHtml(
                      ticket.subject,
                    )}</span></td>
                    <td><span class="badge">${escapeHtml(statusText(ticket.status))}</span></td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </section>
      <section class="card chat-panel">
        ${
          activeTicket
            ? `
              <div class="card-head">
                <div>
                  <h3>${escapeHtml(activeTicket.subject)}</h3>
                  <p class="meta">${escapeHtml(activeTicket.client)} · ${escapeHtml(activeTicket.email)} · ${escapeHtml(
                    activeTicket.assignedTo,
                  )}</p>
                </div>
                <select data-action="ticket-status" data-id="${escapeHtml(activeTicket.id)}" ${
                  operatorMode ? "" : "disabled"
                }>
                  ${["Open", "Waiting", "Closed"]
                    .map((status) => `<option value="${status}" ${status === activeTicket.status ? "selected" : ""}>${statusText(status)}</option>`)
                    .join("")}
                </select>
              </div>
              <div class="chat-thread">
                ${activeTicket.messages
                  .map(
                    (message) => `
                      <div class="chat-message ${message.from === "admin" ? "admin-message" : ""}">
                        <p>${escapeHtml(message.text)}</p>
                        <span>${escapeHtml(message.time)}</span>
                      </div>
                    `,
                  )
                  .join("")}
              </div>
              <div class="ticket-profile">
                <div><span>${lang() === "ru" ? "Клиент" : "Client"}</span><strong>${escapeHtml(activeTicket.client)}</strong></div>
                <div><span>Email</span><strong>${escapeHtml(activeTicket.email)}</strong></div>
                <div><span>${lang() === "ru" ? "Ответственный" : "Assigned"}</span><strong>${escapeHtml(activeTicket.assignedTo)}</strong></div>
              </div>
              <form class="form reply-form" id="replyForm">
                <textarea name="reply" rows="3" required>${
                  operatorMode
                    ? lang() === "ru"
                      ? "Здравствуйте. Мы проверим и вернёмся с ответом."
                      : "Hello. We will check this and get back to you."
                    : lang() === "ru"
                      ? "Напишите сообщение в поддержку."
                      : "Write a message to support."
                }</textarea>
                <button class="primary-btn" type="submit">${
                  operatorMode ? t("sendReply") : lang() === "ru" ? "Отправить сообщение" : "Send message"
                }</button>
              </form>
            `
            : `<p class="notice">${lang() === "ru" ? "Пока нет обращений." : "No support tickets yet."}</p>`
        }
      </section>
    </div>
  `;
}

function renderTeam() {
  return `
    <div class="grid two">
      <section class="card">
        <div class="card-head">
          <h3>${t("addManager")}</h3>
          <span class="badge">RBAC</span>
        </div>
        <form class="form" id="managerForm">
          <div class="form-row">
            <label>${lang() === "ru" ? "Имя" : "Name"}<input name="name" value="New manager" required /></label>
            <label>Email<input name="email" type="email" value="manager@qidra.local" required /></label>
          </div>
          <label>${lang() === "ru" ? "Должность" : "Position"}<input name="position" value="Manager" required /></label>
          <div class="permission-grid">
            ${permissionOptions
              .map(
                (permission) => `
                  <label class="check-card">
                    <input type="checkbox" name="permissions" value="${permission.id}" ${
                      ["clients", "support"].includes(permission.id) ? "checked" : ""
                    } />
                    <span>${permission[lang()]}</span>
                  </label>
                `,
              )
              .join("")}
          </div>
          <button class="primary-btn" type="submit">${t("addManager")}</button>
        </form>
      </section>
      <section class="table-wrap">
        <div class="card-head table-title">
          <h3>${t("managerAccess")}</h3>
          <span class="badge">${state.managers.length}</span>
        </div>
        <table>
          <thead>
            <tr><th>${lang() === "ru" ? "Менеджер" : "Manager"}</th><th>${lang() === "ru" ? "Роль" : "Role"}</th><th>${lang() === "ru" ? "Права" : "Access"}</th><th>${lang() === "ru" ? "Статус" : "Status"}</th></tr>
          </thead>
          <tbody>
            ${state.managers
              .map(
                (manager) => `
                  <tr>
                    <td><span class="row-title">${escapeHtml(manager.name)}</span><span class="row-subtitle">${escapeHtml(
                      manager.email,
                    )}</span></td>
                    <td>${escapeHtml(manager.position)}</td>
                    <td>
                      <div class="mini-tags">
                        ${manager.permissions
                          .map((permission) => `<span>${escapeHtml(localPermissionName(permission))}</span>`)
                          .join("")}
                      </div>
                    </td>
                    <td><span class="badge">${escapeHtml(statusText(manager.status))}</span></td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </section>
    </div>
  `;
}

function renderDocuments() {
  return `
    <div class="grid three">
      ${state.documents
        .map(
          (doc) => `
            <article class="card">
              <div class="card-head">
                <h3>${escapeHtml(doc.name)}</h3>
                <span class="badge">${escapeHtml(statusText(doc.status))}</span>
              </div>
              <p class="meta">${escapeHtml(doc.type)}</p>
              ${
                doc.href
                  ? `<a class="doc-link" href="${escapeHtml(doc.href)}" target="_blank" rel="noopener">${t("openFile")}</a>`
                  : `<span class="doc-link disabled">${t("prepareNeeded")}</span>`
              }
            </article>
          `,
        )
        .join("")}
    </div>
    <p class="notice">
      ${t("legalNotice")}
    </p>
  `;
}

function bindViewEvents() {
  qsa("[data-route-link]").forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.routeLink));
  });

  qsa("[data-action='open-login']").forEach((button) => {
    button.addEventListener("click", openLoginModal);
  });

  qsa("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      currentProjectFilter = button.dataset.filter;
      render();
    });
  });

  qsa("[data-action='apply']").forEach((button) => {
    button.addEventListener("click", () => openApplicationModal(button.dataset.project));
  });

  qsa("[data-action='new-project']").forEach((button) => {
    button.addEventListener("click", openProjectModal);
  });

  qsa("[data-action='status']").forEach((select) => {
    select.addEventListener("change", () => {
      if (!hasPermission("applications")) return;
      const app = state.applications.find((item) => item.id === select.dataset.id);
      if (app) {
        app.status = select.value;
        saveState();
        render();
      }
    });
  });

  qsa("[data-ticket]").forEach((row) => {
    row.addEventListener("click", () => {
      state.session.activeTicketId = row.dataset.ticket;
      saveState();
      render();
    });
  });

  qsa("[data-action='ticket-status']").forEach((select) => {
    select.addEventListener("change", () => {
      if (!canOperateSupport()) return;
      const ticket = state.supportTickets.find((item) => item.id === select.dataset.id);
      if (ticket) {
        ticket.status = select.value;
        saveState();
        render();
      }
    });
  });

  const replyForm = qs("#replyForm");
  if (replyForm) {
    replyForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!canAccessRoute("support")) return;
      const operatorMode = canOperateSupport();
      const ticket = state.supportTickets.find((item) => item.id === state.session.activeTicketId);
      const data = new FormData(event.currentTarget);
      if (ticket) {
        ticket.messages.push({
          from: operatorMode ? "admin" : "client",
          text: data.get("reply"),
          time: new Date().toISOString().slice(0, 16).replace("T", " "),
        });
        ticket.status = operatorMode ? "Waiting" : "Open";
        saveState();
        render();
      }
    });
  }

  const managerForm = qs("#managerForm");
  if (managerForm) {
    managerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!hasPermission("team")) return;
      const data = new FormData(event.currentTarget);
      state.managers.push({
        id: `MGR-${String(state.managers.length + 1).padStart(3, "0")}`,
        name: data.get("name"),
        email: data.get("email"),
        position: data.get("position"),
        permissions: data.getAll("permissions"),
        status: "Active",
      });
      saveState();
      render();
    });
  }
}

function openModal(title, html) {
  qs("#modalTitle").textContent = title;
  qs("#modalBody").innerHTML = html;
  qs("#modalBackdrop").hidden = false;
}

function closeModal() {
  qs("#modalBackdrop").hidden = true;
  qs("#modalBody").innerHTML = "";
}

function openLoginModal() {
  const roleLabel = lang() === "ru" ? "Роль" : "Role";
  const passwordLabel = lang() === "ru" ? "Пароль" : "Password";
  const roles =
    lang() === "ru"
      ? [
          ["admin", "Администратор"],
          ["manager", "Менеджер"],
          ["investor", "Инвестор"],
          ["owner", "Владелец проекта"],
        ]
      : [
          ["admin", "Admin"],
          ["manager", "Manager"],
          ["investor", "Investor"],
          ["owner", "Project owner"],
        ];
  openModal(
    t("loginTitle"),
    `
      <form class="form" id="loginForm">
        <label>
          Email
          <input name="email" type="email" value="${escapeHtml(state.session.email)}" required />
        </label>
        <label>
          ${roleLabel}
          <select name="role">
            ${roles
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${value === state.session.role ? "selected" : ""}>${label}</option>`,
              )
              .join("")}
          </select>
        </label>
        <label>
          ${passwordLabel}
          <input name="password" type="password" value="demo-qidra" required />
        </label>
        <button class="primary-btn" type="submit">${t("cabinetLogin")}</button>
      </form>
    `,
  );
  const loginRole = qs("#loginForm select[name='role']");
  const loginEmail = qs("#loginForm input[name='email']");
  loginRole.addEventListener("change", () => {
    loginEmail.value = defaultEmailForRole(loginRole.value);
  });
  qs("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.session.signedIn = true;
    state.session.email = data.get("email");
    state.session.role = data.get("role");
    saveState();
    closeModal();
    setRoute(defaultRouteForSession());
  });
}

function openApplicationModal(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  openModal(
    `${t("applicationTitlePrefix")}: ${project.name}`,
    `
      <form class="form" id="applicationForm">
        <div class="form-row">
          <label>${t("nameLabel")}<input name="investor" value="New investor" required /></label>
          <label>${t("emailLabel")}<input name="email" type="email" value="investor@example.com" required /></label>
        </div>
        <label>${t("participationAmount")}<input name="amount" type="number" min="100" step="100" value="5000" required /></label>
        <label>${t("commentLabel")}<textarea name="note" rows="3">${t("applicationNoteDefault")}</textarea></label>
        <button class="primary-btn" type="submit">${t("submitApplication")}</button>
      </form>
    `,
  );
  qs("#applicationForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.applications.unshift({
      id: `APP-${1000 + state.applications.length + 1}`,
      investor: data.get("investor"),
      email: data.get("email"),
      project: project.name,
      amount: Number(data.get("amount")),
      status: "Review",
      source: "Website",
      date: new Date().toISOString().slice(0, 10),
    });
    saveState();
    closeModal();
    render();
  });
}

function openProjectModal() {
  openModal(
    t("newProject"),
    `
      <form class="form" id="projectForm">
        <div class="form-row">
          <label>${t("titleLabel")}<input name="name" value="New QIDRA Project" required /></label>
          <label>${t("categoryLabel")}
            <select name="category">
              <option>Gold Mining</option>
              <option>Gold Trading</option>
              <option>Real Estate</option>
              <option>Trade</option>
              <option>Infrastructure</option>
            </select>
          </label>
        </div>
        <div class="form-row">
          <label>${t("modelLabel")}<select name="model"><option>Mudaraba</option><option>Musharaka</option><option>Wakalah</option></select></label>
          <label>${t("geographyLabel")}<input name="geography" value="UAE / Africa" required /></label>
        </div>
        <div class="form-row">
          <label>${t("targetLabel")}<input name="target" type="number" value="100000" required /></label>
          <label>${t("raisedLabel")}<input name="raised" type="number" value="0" required /></label>
        </div>
        <label>${t("descriptionLabel")}<textarea name="description" rows="4">${t("projectDescriptionDefault")}</textarea></label>
        <button class="primary-btn" type="submit">${t("createProject")}</button>
      </form>
    `,
  );
  qs("#projectForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.projects.unshift({
      id: data.get("name").toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, ""),
      name: data.get("name"),
      category: data.get("category"),
      model: data.get("model"),
      geography: data.get("geography"),
      target: Number(data.get("target")),
      raised: Number(data.get("raised")),
      status: "Draft",
      risk: "Initial review",
      owner: "QIDRA",
      stage: "Primary check",
      description: data.get("description"),
    });
    saveState();
    closeModal();
    render();
  });
}

function boot() {
  qs(".brand").addEventListener("click", (event) => {
    event.preventDefault();
    setRoute("home");
  });
  qsa(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.route));
  });
  qs("#languageSwitcher").addEventListener("change", (event) => {
    state.session.language = event.target.value;
    saveState();
    setRoute(currentRoute);
  });
  qs("#roleSwitcher").addEventListener("change", (event) => {
    state.session.role = event.target.value;
    state.session.email = defaultEmailForRole(event.target.value);
    state.session.signedIn = true;
    saveState();
    setRoute(defaultRouteForSession());
  });
  qs("#globalSearch").addEventListener("input", render);
  qs("#themeToggle").addEventListener("click", () => {
    state.session.theme = state.session.theme === "dark" ? "light" : "dark";
    saveState();
    render();
  });
  qs("#loginButton").addEventListener("click", () => {
    if (state.session.signedIn) {
      state.session.signedIn = false;
      saveState();
      setRoute("home");
    } else {
      openLoginModal();
    }
  });
  qs("#modalClose").addEventListener("click", closeModal);
  qs("#modalBackdrop").addEventListener("click", (event) => {
    if (event.target.id === "modalBackdrop") closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
  setRoute(currentRoute);
}

boot();
