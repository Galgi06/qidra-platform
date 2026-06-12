import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProjectCard } from "@/components/ProjectCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { acceptsApplications, getPublicProjects, type CatalogProject } from "@/lib/project-catalog";
import { incomeSourceLabel, propertyStatusLabel, propertyTypeLabel } from "@/lib/real-estate";

export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  const isRu = locale === "ru";
  const query = searchParamString(params?.q).trim();
  const sectorFilter = searchParamString(params?.sector);
  const structureFilter = searchParamString(params?.structure);
  const countryFilter = searchParamString(params?.country);
  const cityFilter = searchParamString(params?.city);
  const propertyTypeFilter = searchParamString(params?.propertyType);
  const propertyStatusFilter = searchParamString(params?.propertyStatus);
  const currencyFilter = searchParamString(params?.currency);
  const incomeSourceFilter = searchParamString(params?.incomeSource);
  const projects = await getPublicProjects();
  const filteredProjects = projects.filter((project) => {
    const sectorMatch = !sectorFilter || project.sector === sectorFilter;
    const structureMatch = !structureFilter || project.structure.toLowerCase() === structureFilter.toLowerCase();
    const countryMatch = !countryFilter || project.realEstate?.country?.toLowerCase() === countryFilter.toLowerCase();
    const cityMatch = !cityFilter || project.realEstate?.city?.toLowerCase() === cityFilter.toLowerCase();
    const propertyTypeMatch = !propertyTypeFilter || project.realEstate?.propertyType === propertyTypeFilter;
    const propertyStatusMatch = !propertyStatusFilter || project.realEstate?.objectStatus === propertyStatusFilter;
    const currencyMatch = !currencyFilter || (project.realEstate?.fundraisingCurrency || "").toLowerCase() === currencyFilter.toLowerCase();
    const incomeSourceMatch = !incomeSourceFilter || Boolean(project.realEstate?.incomeSources?.includes(incomeSourceFilter as never));
    const queryText = [project.title[locale], project.summary[locale], project.description[locale], project.location, project.structure, inferProjectSectorLabel(project.sector as SectorValue, locale), project.realEstate?.country, project.realEstate?.city, project.realEstate?.objectName, project.realEstate?.titleComplex]
      .join(" ")
      .toLowerCase();
    const queryMatch = !query || queryText.includes(query.toLowerCase());

    return sectorMatch && structureMatch && countryMatch && cityMatch && propertyTypeMatch && propertyStatusMatch && currencyMatch && incomeSourceMatch && queryMatch;
  });
  const openProjects = filteredProjects.filter((project) => acceptsApplications(project));
  const unavailableProjects = filteredProjects.filter((project) => !acceptsApplications(project));
  const sectors = buildSectorStats(projects, locale);
  const realEstateProjects = projects.filter((project) => project.realEstate);

  return (
    <>
      <Header locale={locale} path="/projects" />
      <main>
        <section className="bg-qidra-grayLight px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8">
          <Breadcrumbs items={[{ label: "Qidra", href: withLocale("/", locale) }, { label: locale === "ru" ? "Проекты" : "Projects" }]} />
            <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Каталог Qidra" : "Qidra catalog"}</p>
                <h1 className="mt-4 text-[44px] font-medium leading-[1.1] tracking-[0] text-qidra-dark sm:text-[58px] lg:text-[72px]">
                  {isRu ? "Международные проекты" : "International projects"}
                </h1>
                <p className="mt-5 max-w-4xl text-20 text-qidra-grayBlue sm:text-[24px]">
                  {isRu
                    ? "Выберите направление, изучите документы и условия сотрудничества, затем отправьте заявку на участие."
                    : "Choose a sector, review documents and cooperation terms, then submit a participation application."}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <ButtonLink href={withLocale("/investor/projects/new", locale)} className="h-12">
                    {isRu ? "Разместить свой проект" : "List your project"}
                  </ButtonLink>
                  <ButtonLink href={withLocale("/investor", locale)} variant="outline" className="h-12">
                    {isRu ? "Профиль участника" : "Participant profile"}
                  </ButtonLink>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
                <CatalogStat value={projects.length.toString()} label={isRu ? "проекта" : "projects"} />
                <CatalogStat value="2" label={isRu ? "структуры" : "structures"} />
                <CatalogStat value="UAE" label={isRu ? "юрисдикция" : "jurisdiction"} />
              </div>
            </div>
            <form className={`grid gap-3 rounded-[20px] bg-white p-4 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] ${sectorFilter === "real-estate" ? "lg:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-[1fr_220px_220px_auto]"}`} action="/projects">
              <input name="lang" type="hidden" value={locale} />
              <label className="grid gap-2 text-13 font-medium text-qidra-dark">
                {isRu ? "Поиск проекта" : "Project search"}
                <input
                  className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
                  defaultValue={query}
                  name="q"
                  placeholder={isRu ? "Название, отрасль, страна, модель" : "Name, sector, country, model"}
                />
              </label>
              <label className="grid gap-2 text-13 font-medium text-qidra-dark">
                {isRu ? "Направление" : "Sector"}
                <select className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none focus:border-qidra-accent" defaultValue={sectorFilter} name="sector">
                  <option value="">{isRu ? "Все направления" : "All sectors"}</option>
                  {sectorOptions(locale).map((sector) => (
                    <option key={sector.value} value={sector.value}>{sector.label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-13 font-medium text-qidra-dark">
                {isRu ? "Структура" : "Structure"}
                <select className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none focus:border-qidra-accent" defaultValue={structureFilter} name="structure">
                  <option value="">{isRu ? "Все модели" : "All models"}</option>
                  <option value="Mudaraba">Mudaraba</option>
                  <option value="Musharaka">Musharaka</option>
                </select>
              </label>
              {sectorFilter === "real-estate" ? (
                <>
                  <label className="grid gap-2 text-13 font-medium text-qidra-dark">
                    {isRu ? "Страна" : "Country"}
                    <select className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none focus:border-qidra-accent" defaultValue={countryFilter} name="country">
                      <option value="">{isRu ? "Все страны" : "All countries"}</option>
                      {uniqueOptions(realEstateProjects.map((project) => project.realEstate?.country)).map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-13 font-medium text-qidra-dark">
                    {isRu ? "Город" : "City"}
                    <select className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none focus:border-qidra-accent" defaultValue={cityFilter} name="city">
                      <option value="">{isRu ? "Все города" : "All cities"}</option>
                      {uniqueOptions(realEstateProjects.map((project) => project.realEstate?.city)).map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-13 font-medium text-qidra-dark">
                    {isRu ? "Тип недвижимости" : "Property type"}
                    <select className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none focus:border-qidra-accent" defaultValue={propertyTypeFilter} name="propertyType">
                      <option value="">{isRu ? "Все типы" : "All types"}</option>
                      {uniqueOptions(realEstateProjects.map((project) => project.realEstate?.propertyType)).map((value) => (
                        <option key={value} value={value}>{propertyTypeLabel(value as never, locale)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-13 font-medium text-qidra-dark">
                    {isRu ? "Статус" : "Status"}
                    <select className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none focus:border-qidra-accent" defaultValue={propertyStatusFilter} name="propertyStatus">
                      <option value="">{isRu ? "Все статусы" : "All statuses"}</option>
                      {uniqueOptions(realEstateProjects.map((project) => project.realEstate?.objectStatus)).map((value) => (
                        <option key={value} value={value}>{propertyStatusLabel(value as never, locale)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-13 font-medium text-qidra-dark">
                    {isRu ? "Источник дохода" : "Income source"}
                    <select className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none focus:border-qidra-accent" defaultValue={incomeSourceFilter} name="incomeSource">
                      <option value="">{isRu ? "Все источники" : "All sources"}</option>
                      {uniqueOptions(realEstateProjects.flatMap((project) => project.realEstate?.incomeSources || [])).map((value) => (
                        <option key={value} value={value}>{incomeSourceLabel(value as never, locale)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-13 font-medium text-qidra-dark">
                    {isRu ? "Валюта" : "Currency"}
                    <select className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none focus:border-qidra-accent" defaultValue={currencyFilter} name="currency">
                      <option value="">{isRu ? "Все валюты" : "All currencies"}</option>
                      {uniqueOptions(realEstateProjects.map((project) => project.realEstate?.fundraisingCurrency || project.realEstate?.currency)).map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
              <button className="h-12 self-end rounded-qidra bg-qidra-dark px-6 text-16 font-medium text-white transition-colors hover:bg-qidra-accent" type="submit">
                {isRu ? "Найти" : "Search"}
              </button>
            </form>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {sectors.map((sector) => (
                <a
                  key={sector.value}
                  className={`rounded-[18px] p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] transition-colors ${
                    sectorFilter === sector.value ? "bg-qidra-dark text-white" : "bg-white text-qidra-dark hover:bg-qidra-grayLight"
                  }`}
                  href={projectFilterHref(locale, { sector: sector.value })}
                >
                  <p className="text-18 font-medium">{sector.label}</p>
                  <p className={`mt-2 text-14 ${sectorFilter === sector.value ? "text-white/70" : "text-qidra-grayBlue"}`}>
                    {sector.count} {isRu ? "проектов" : "projects"}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-6">
            {openProjects.length ? (
              <div className="grid gap-5">
                <div>
                  <h2 className="text-[36px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[44px]">
                    {isRu ? "Открытые для участия" : "Open for participation"}
                  </h2>
                  <p className="mt-3 max-w-4xl text-18 text-qidra-grayBlue">
                    {isRu
                      ? "По этим проектам сейчас принимаются заявки. Участие доступно только в пределах свободного баланса и после изучения документов."
                      : "These projects currently accept applications. Participation is available only within the free balance and after reviewing the documents."}
                  </p>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  {openProjects.map((project) => (
                    <ProjectCard key={project.slug} project={project} locale={locale} />
                  ))}
                </div>
              </div>
            ) : (
              <NotificationPanel
                title={isRu ? "Открытые проекты не найдены" : "No open projects found"}
                text={isRu ? "Измените поиск или выберите другое направление." : "Change the search or choose another sector."}
              />
            )}
            {unavailableProjects.length ? (
              <div className="mt-12 grid gap-5">
                <div>
                  <h2 className="text-[36px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[44px]">
                    {isRu ? "Завершённые и недоступные для новых заявок" : "Completed or unavailable for new applications"}
                  </h2>
                  <p className="mt-3 max-w-4xl text-18 text-qidra-grayBlue">
                    {isRu
                      ? "Эти проекты уже привлекли нужный объём средств или временно закрыты командой Qidra. Новые заявки по ним не принимаются, но карточки и документы остаются доступными для истории и ознакомления."
                      : "These projects have reached their target or are temporarily closed by the Qidra team. New applications are not accepted, while profiles and documents remain available for records and review."}
                  </p>
                </div>
                <div className="grid gap-5 lg:grid-cols-2">
                  {unavailableProjects.map((project) => (
                    <ProjectCard key={project.slug} project={project} locale={locale} />
                  ))}
                </div>
              </div>
            ) : null}
            <p className="max-w-4xl text-14 text-qidra-grayBlue">
              {isRu
                ? "Qidra не обещает фиксированную доходность. Любое участие требует самостоятельного изучения документов, условий и рисков проекта."
                : "Qidra does not promise fixed returns. Any participation requires independent review of project documents, terms and risks."}
            </p>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

type SectorValue = "healthcare" | "metallurgy" | "real-estate" | "trade" | "technology" | "other";

function sectorOptions(locale: "ru" | "en") {
  return [
    { value: "real-estate", label: locale === "ru" ? "Недвижимость" : "Real estate" },
    { value: "trade", label: locale === "ru" ? "Торговля" : "Trade" },
    { value: "metallurgy", label: locale === "ru" ? "Металлургия и сырьё" : "Metallurgy and resources" },
    { value: "healthcare", label: locale === "ru" ? "Медицина" : "Healthcare" },
    { value: "technology", label: locale === "ru" ? "Технологии" : "Technology" },
    { value: "other", label: locale === "ru" ? "Другие направления" : "Other sectors" }
  ] satisfies { value: SectorValue; label: string }[];
}

function inferProjectSector(project: CatalogProject, locale: "ru" | "en"): SectorValue {
  return (project.sector as SectorValue) || "other";
}

function inferProjectSectorLabel(sector: SectorValue, locale: "ru" | "en") {
  return sectorOptions(locale).find((item) => item.value === sector)?.label ?? sector;
}

function buildSectorStats(projects: CatalogProject[], locale: "ru" | "en") {
  return sectorOptions(locale).map((sector) => ({
    ...sector,
    count: projects.filter((project) => inferProjectSector(project, locale) === sector.value).length
  }));
}

function projectFilterHref(locale: "ru" | "en", params: { sector?: string; structure?: string; q?: string }) {
  const urlParams = new URLSearchParams({ lang: locale });
  if (params.sector) urlParams.set("sector", params.sector);
  if (params.structure) urlParams.set("structure", params.structure);
  if (params.q) urlParams.set("q", params.q);
  return `/projects?${urlParams.toString()}`;
}

function searchParamString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function NotificationPanel({ text, title }: { text: string; title: string }) {
  return (
    <div className="rounded-[20px] border border-qidra-grayLight bg-white p-6 sm:p-8">
      <h2 className="text-[28px] font-medium leading-tight text-qidra-dark">{title}</h2>
      <p className="mt-2 text-16 text-qidra-grayBlue">{text}</p>
    </div>
  );
}

function CatalogStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[16px] bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-[28px] font-medium leading-none text-qidra-dark">{value}</p>
      <p className="mt-2 text-14 text-qidra-grayBlue">{label}</p>
    </div>
  );
}

function uniqueOptions(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}
