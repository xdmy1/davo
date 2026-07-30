import type { BlogPost, ResolvedPost } from "./types";
import type { Locale } from "@/lib/i18n/config";

// Ordered newest-first. Add new posts to the top of this array.
export const posts: BlogPost[] = [
  {
    slug: "autocar-avion-tren-moldova-europa",
    date: "2026-07-30",
    readingMinutes: 8,
    locales: ["ro", "ru"],
    i18n: {
      ro: {
        category: "Ghid de călătorie",
        title: "Autocar, avion sau tren: cum ajungi cel mai bine din Moldova în Europa (2026)",
        excerpt:
          "Comparație cinstită între autocar, avion și tren pentru drumul Moldova → Vestul Europei: costul real, timpul din ușă în ușă, bagajul, coletele și confortul — ca să alegi în cunoștință de cauză.",
        metaTitle: "Autocar vs. avion vs. tren: cum ajungi din Moldova în Europa (2026)",
        metaDescription:
          "Comparație autocar, avion și tren Moldova → Europa: preț, timp din ușă în ușă, bagaj 35 kg inclus, colete și confort. Ce e mai avantajos pentru Anglia, Germania, Belgia, Olanda, Luxemburg.",
        author: "Echipa DAVO Group",
        keyTakeaways: [
          "Avionul câștigă la orele de zbor, dar „din ușă în ușă” diferența scade din cauza aeroportului, transferurilor și escalelor.",
          "Autocarul include 35 kg bagaj de cală + 5 kg de mână, fără taxe per kilogram.",
          "Cu autocarul poți trimite și colete pe aceeași cursă, inclusiv perisabile în remorcă frigorifică.",
          "Autocarul te ia din orașul tău din Moldova și te duce direct, fără schimburi.",
          "Pentru buget, bagaj mult și familie cu copii, autocarul e cea mai echilibrată alegere.",
        ],
        content: [
          {
            type: "p",
            text: "Ai o cursă de făcut din Moldova spre Vestul Europei — Anglia, Germania, Belgia, Olanda sau Luxemburg — și te întrebi cum ajungi mai bine: cu **autocarul, cu avionul sau cu trenul**? Fiecare variantă are locul ei. Mai jos comparăm cinstit costul real, timpul din ușă în ușă, bagajul și confortul, ca să alegi ce ți se potrivește.",
          },
          {
            type: "stats",
            items: [
              { value: "de la 120 €", label: "Bilet autocar dus" },
              { value: "35 kg", label: "Bagaj inclus, fără taxe" },
              { value: "ușă la ușă", label: "Preluare din orașul tău" },
            ],
          },
          { type: "h2", id: "pe-scurt", text: "Cele trei opțiuni, pe scurt" },
          {
            type: "p",
            text: "Pe hârtie, avionul e cel mai rapid, trenul e cel mai pitoresc, iar autocarul e cel mai echilibrat pentru cei mai mulți moldoveni care fac naveta spre casă sau spre muncă. Diferența adevărată apare când socotești **tot** — nu doar prețul biletului sau orele „în aer”.",
          },
          {
            type: "table",
            head: ["Criteriu", "Autocar (DAVO)", "Avion", "Tren"],
            rows: [
              ["Preț dus (orientativ)", "de la 120 €", "80–250 € + bagaje", "150–350 €, cu schimburi"],
              ["Bagaj inclus", "35 kg cală + 5 kg mână", "adesea doar ~10 kg de mână", "limitat, variază"],
              ["Colete / cutii", "Da, chiar și frigorific", "Nu (sau foarte scump)", "Nu"],
              ["Transferuri", "0 — direct", "aeroport + adesea escală", "2–4 schimburi de tren"],
              ["Preluare", "Din orașul tău", "Doar aeroport Chișinău", "Doar gară mare"],
              ["La bord", "Starlink, prânz, însoțitoare", "băuturi contra cost", "vagon-restaurant uneori"],
            ],
          },
          { type: "h2", id: "pret", text: "Prețul: cât te costă cu adevărat" },
          {
            type: "p",
            text: "Biletul de avion pare uneori ieftin, dar din Chișinău zborurile directe spre Vest sunt puține, așa că apar escale, iar prețul urcă. Adaugă apoi bagajul de cală (de regulă taxat separat, de la ~10–25 € de bucată, uneori mai mult), transportul spre și dinspre aeroport și eventuala cazare dacă escala e lungă.",
          },
          {
            type: "p",
            text: "Trenul din Moldova spre Vestul Europei înseamnă mai multe schimburi (de regulă prin România, Ungaria, Austria sau Germania) și tarife occidentale — rareori iese mai ieftin decât autocarul, iar durata totală e mare.",
          },
          {
            type: "callout",
            variant: "info",
            title: "Ce e inclus deja la autocar",
            text: "La DAVO, prețul biletului include **35 kg bagaj de cală, 5 kg de mână, prânz cald, ceai și cafea nelimitat și internet Starlink** — fără costuri-surpriză la aeroport sau pe drum.",
          },
          { type: "h2", id: "timp", text: "Timpul: nu doar orele de mers" },
          {
            type: "p",
            text: "Avionul câștigă la orele efective de zbor, dar „din ușă în ușă” diferența se micșorează: ajungi la aeroport cu 2–3 ore înainte, faci drumul până la și de la aeroport, plus escala. Autocarul te ia din orașul tău și te lasă aproape de destinație, fără cozi la check-in și securitate.",
          },
          {
            type: "p",
            text: "Pe scurt: dacă pui la socoteală **tot drumul**, nu doar zborul, autocarul e mai comod decât pare — mai ales pentru destinații fără zbor direct din Chișinău.",
          },
          { type: "h2", id: "bagaje", text: "Bagaje și colete: unde autocarul chiar câștigă" },
          {
            type: "p",
            text: "Aici diferența e mare. Mulți moldoveni nu călătoresc „ușor” — duc sau aduc cadouri, produse de acasă, lucruri pentru familie.",
          },
          {
            type: "ul",
            items: [
              "**35 kg** bagaj de cală + **5 kg** de mână, incluse, fără taxe per kilogram.",
              "Poți trimite și un **colet** cu aceeași cursă — inclusiv perisabile, în remorcă frigorifică.",
              "Fără cântărire stresantă la poartă și fără taxe de supragreutate ca la avion.",
            ],
          },
          {
            type: "p",
            text: "La avion, fiecare kilogram în plus costă; la tren, spațiul e limitat și nu poți expedia cutii mari.",
          },
          { type: "h2", id: "confort", text: "Confort la bord" },
          {
            type: "p",
            text: "O cursă lungă e mult mai ușoară când ai tot ce-ți trebuie la bord:",
          },
          {
            type: "ul",
            items: [
              "Internet **Starlink** nelimitat pe toată ruta.",
              "Prânz cald gratuit, ceai și cafea naturală nelimitat.",
              "Însoțitoare de bord 24/24 și șoferi profesioniști.",
              "Scaune reclinabile, climatizare și opriri regulate.",
            ],
          },
          { type: "h2", id: "recomandare", text: "Pentru cine e fiecare variantă" },
          {
            type: "ul",
            items: [
              "**Avionul** — dacă ești grăbit, călătorești ușor și există un zbor convenabil din Chișinău.",
              "**Trenul** — dacă îți place drumul cu peisaj și nu te deranjează schimburile.",
              "**Autocarul** — pentru cei mai mulți: buget prietenos, mult bagaj, familie cu copii, colete de trimis și confort de la ușă la ușă.",
            ],
          },
          {
            type: "callout",
            variant: "success",
            title: "Recomandarea noastră",
            text: "Dacă mergi regulat între Moldova și Europa, cu bagaj și fără bătăi de cap, autocarul e alegerea echilibrată. DAVO te ia din orașul tău și te duce direct, cu tot confortul inclus.",
          },
        ],
        faq: [
          {
            q: "Cât durează o cursă cu autocarul din Moldova în Europa?",
            a: "Depinde de destinație — de regulă între ~24 și ~40 de ore, cu opriri regulate pentru odihnă, masă și pauze. Vezi programul exact pe pagina fiecărei țări.",
          },
          {
            q: "Pot lua mai mult de 35 kg de bagaj?",
            a: "Da, contra cost, dacă ne anunți din timp. Cele 35 kg de cală + 5 kg de mână sunt incluse gratuit; pentru surplus ne înțelegem în prealabil.",
          },
          {
            q: "Pot trimite un colet fără să călătoresc?",
            a: "Da. Transportăm colete separat pe toate rutele, inclusiv produse perisabile în remorcă frigorifică. Îl preluăm din Moldova și îl livrăm la destinație.",
          },
          {
            q: "De unde mă ia autocarul?",
            a: "Din orașul tău din Moldova — plecăm din Chișinău și oprim în mai multe orașe pe traseu. La destinație te lăsăm cât mai aproape de adresă.",
          },
          {
            q: "Este internet la bord?",
            a: "Da, internet Starlink nelimitat pe toată ruta, plus prize USB la fiecare scaun.",
          },
        ],
      },
      ru: {
        category: "Гид путешественника",
        title: "Автобус, самолёт или поезд: как лучше добраться из Молдовы в Европу (2026)",
        excerpt:
          "Честное сравнение автобуса, самолёта и поезда для поездки Молдова → Западная Европа: реальная цена, время «от двери до двери», багаж, посылки и комфорт — чтобы выбрать осознанно.",
        metaTitle: "Автобус, самолёт или поезд: как добраться из Молдовы в Европу (2026)",
        metaDescription:
          "Сравнение автобуса, самолёта и поезда Молдова → Европа: цена, время от двери до двери, багаж 35 кг, посылки и комфорт. Что выгоднее для поездки в Англию, Германию, Бельгию, Нидерланды.",
        author: "Команда DAVO Group",
        keyTakeaways: [
          "Самолёт выигрывает по часам полёта, но «от двери до двери» разница сокращается из-за аэропорта, пересадок и стыковок.",
          "Автобус включает 35 кг багажа + 5 кг ручной клади, без платы за каждый килограмм.",
          "Автобусом можно отправить и посылку тем же рейсом, включая скоропортящееся в рефрижераторе.",
          "Автобус забирает вас из вашего города в Молдове и везёт напрямую, без пересадок.",
          "Для бюджета, большого багажа и семьи с детьми автобус — самый сбалансированный выбор.",
        ],
        content: [
          {
            type: "p",
            text: "Вам нужно доехать из Молдовы в Западную Европу — Англию, Германию, Бельгию, Нидерланды или Люксембург — и вы думаете, как лучше: **автобусом, самолётом или поездом**? У каждого варианта своё место. Ниже честно сравниваем реальную цену, время от двери до двери, багаж и комфорт, чтобы вы выбрали то, что подходит именно вам.",
          },
          {
            type: "stats",
            items: [
              { value: "от 120 €", label: "Билет на автобус в один конец" },
              { value: "35 кг", label: "Багаж включён, без доплат" },
              { value: "до двери", label: "Забираем из вашего города" },
            ],
          },
          { type: "h2", id: "pe-scurt", text: "Три варианта коротко" },
          {
            type: "p",
            text: "На бумаге самолёт — самый быстрый, поезд — самый живописный, а автобус — самый сбалансированный для большинства молдаван, которые ездят домой или на работу. Настоящая разница видна, когда считаешь **всё** — а не только цену билета или часы «в воздухе».",
          },
          {
            type: "table",
            head: ["Критерий", "Автобус (DAVO)", "Самолёт", "Поезд"],
            rows: [
              ["Цена в один конец (ориентир)", "от 120 €", "80–250 € + багаж", "150–350 €, с пересадками"],
              ["Багаж включён", "35 кг + 5 кг ручной", "часто только ~10 кг ручной", "ограничен, зависит"],
              ["Посылки / коробки", "Да, даже рефрижератор", "Нет (или очень дорого)", "Нет"],
              ["Пересадки", "0 — напрямую", "аэропорт + часто стыковка", "2–4 пересадки"],
              ["Посадка", "Из вашего города", "Только аэропорт Кишинёв", "Только крупный вокзал"],
              ["На борту", "Starlink, обед, сопровождение", "напитки за плату", "вагон-ресторан иногда"],
            ],
          },
          { type: "h2", id: "pret", text: "Цена: сколько это стоит на самом деле" },
          {
            type: "p",
            text: "Авиабилет иногда кажется дешёвым, но из Кишинёва прямых рейсов на Запад мало, поэтому появляются стыковки, и цена растёт. Добавьте багаж (обычно оплачивается отдельно, от ~10–25 € за место, иногда больше), дорогу в аэропорт и из него, а также возможное проживание при долгой стыковке.",
          },
          {
            type: "p",
            text: "Поезд из Молдовы в Западную Европу — это несколько пересадок (обычно через Румынию, Венгрию, Австрию или Германию) и западные тарифы; редко выходит дешевле автобуса, а общее время в пути большое.",
          },
          {
            type: "callout",
            variant: "info",
            title: "Что уже включено в автобус",
            text: "У DAVO цена билета включает **35 кг багажа, 5 кг ручной клади, горячий обед, чай и кофе без ограничений и интернет Starlink** — без сюрпризов в аэропорту или в дороге.",
          },
          { type: "h2", id: "timp", text: "Время: не только часы в пути" },
          {
            type: "p",
            text: "Самолёт выигрывает по чистым часам полёта, но «от двери до двери» разница сокращается: в аэропорт нужно приехать за 2–3 часа, добраться до него и обратно, плюс стыковка. Автобус забирает вас из вашего города и высаживает рядом с местом назначения, без очередей на регистрацию и досмотр.",
          },
          {
            type: "p",
            text: "Коротко: если считать **всю дорогу**, а не только полёт, автобус удобнее, чем кажется — особенно для направлений без прямого рейса из Кишинёва.",
          },
          { type: "h2", id: "bagaje", text: "Багаж и посылки: где автобус реально выигрывает" },
          {
            type: "p",
            text: "Здесь разница большая. Многие молдаване не путешествуют «налегке» — везут или привозят подарки, продукты из дома, вещи для семьи.",
          },
          {
            type: "ul",
            items: [
              "**35 кг** багажа + **5 кг** ручной клади включены, без платы за килограмм.",
              "Можно отправить и **посылку** тем же рейсом — включая скоропортящееся, в рефрижераторе.",
              "Без нервного взвешивания у выхода и без доплат за перевес, как в самолёте.",
            ],
          },
          {
            type: "p",
            text: "В самолёте каждый лишний килограмм стоит денег; в поезде место ограничено, и большие коробки не отправишь.",
          },
          { type: "h2", id: "confort", text: "Комфорт на борту" },
          {
            type: "p",
            text: "Долгая поездка гораздо легче, когда на борту есть всё необходимое:",
          },
          {
            type: "ul",
            items: [
              "Безлимитный интернет **Starlink** на всём маршруте.",
              "Бесплатный горячий обед, чай и натуральный кофе без ограничений.",
              "Сопровождение 24/24 и профессиональные водители.",
              "Откидные кресла, кондиционер и регулярные остановки.",
            ],
          },
          { type: "h2", id: "recomandare", text: "Кому какой вариант подходит" },
          {
            type: "ul",
            items: [
              "**Самолёт** — если вы спешите, путешествуете налегке и есть удобный рейс из Кишинёва.",
              "**Поезд** — если любите дорогу с пейзажами и не против пересадок.",
              "**Автобус** — для большинства: доступный бюджет, много багажа, семья с детьми, посылки и комфорт от двери до двери.",
            ],
          },
          {
            type: "callout",
            variant: "success",
            title: "Наша рекомендация",
            text: "Если вы регулярно ездите между Молдовой и Европой, с багажом и без хлопот, автобус — сбалансированный выбор. DAVO забирает вас из вашего города и везёт напрямую, со всем комфортом в цене.",
          },
        ],
        faq: [
          {
            q: "Сколько длится поездка на автобусе из Молдовы в Европу?",
            a: "Зависит от направления — обычно от ~24 до ~40 часов, с регулярными остановками на отдых, еду и перерывы. Точное расписание смотрите на странице каждой страны.",
          },
          {
            q: "Можно взять больше 35 кг багажа?",
            a: "Да, за доплату, если предупредите заранее. 35 кг багажа + 5 кг ручной клади включены бесплатно; по перевесу договариваемся заранее.",
          },
          {
            q: "Можно отправить посылку, не путешествуя самому?",
            a: "Да. Мы перевозим посылки отдельно на всех маршрутах, включая скоропортящееся в рефрижераторе. Забираем в Молдове и доставляем по адресу.",
          },
          {
            q: "Откуда меня заберёт автобус?",
            a: "Из вашего города в Молдове — выезжаем из Кишинёва и останавливаемся в нескольких городах по пути. В пункте назначения высаживаем как можно ближе к адресу.",
          },
          {
            q: "Есть ли интернет на борту?",
            a: "Да, безлимитный интернет Starlink на всём маршруте, плюс USB-розетки у каждого кресла.",
          },
        ],
      },
    },
  },
  {
    slug: "tahografe-autoutilitare-2026-obligatii-exceptii-sanctiuni",
    date: "2026-07-08",
    readingMinutes: 9,
    source: {
      name: "trans.info",
      url: "https://trans.info/ro/tahografe-pe-autoutilitare-din-1-iulie-2026-cine-intra-sub-obligatie-exceptii-si-sanctiuni-faq-484864",
    },
    locales: ["ro", "ru"],
    i18n: {
      ro: {
        category: "Reglementări UE",
        title:
          "Tahografe pe autoutilitare din 1 iulie 2026: cine intră sub obligație, excepții și sancțiuni",
        excerpt:
          "De la 1 iulie 2026, o parte dintre autoutilitarele de peste 2,5 tone folosite la transport comercial internațional și cabotaj trebuie să aibă tahograf inteligent. Ghid complet: cine intră, ce excepții există, ce sancțiuni riști și cum te pregătești.",
        metaTitle:
          "Tahografe pe autoutilitare din 1 iulie 2026 — obligații, excepții, sancțiuni",
        metaDescription:
          "Din 1 iulie 2026, autoutilitarele de peste 2,5 t la transport internațional și cabotaj au nevoie de tahograf inteligent G2V2. Cine intră sub obligație, excepțiile din Regulamentul 561/2006, limitele de timp și sancțiunile pe fiecare țară.",
        author: "Echipa DAVO Group",
        keyTakeaways: [
          "Obligația intră în vigoare la 1 iulie 2026 pentru vehicule și ansambluri cu MMA peste 2,5 și până la 3,5 tone, la transport comercial internațional sau cabotaj.",
          "Este necesar un tahograf inteligent de generația a doua, versiunea 2 (Smart Tacho G2V2), montat exclusiv în ateliere autorizate.",
          "Există două excepții în Regulamentul (CE) 561/2006 — „meșteșugarul” (art. 3 aa) și „pe cont propriu” (art. 3 ha).",
          "Șoferii vizați respectă același regim de conducere și odihnă ca șoferii de camion.",
          "Sancțiunile diferă enorm între țări — de la 58 € în Malta până la 30.000 € și închisoare în Franța.",
        ],
        content: [
          {
            type: "p",
            text: "Transportul rutier ușor intră într-o nouă etapă. În Uniunea Europeană, regulile din **Pachetul de Mobilitate** se extind și asupra unei părți dintre autoutilitarele folosite la transportul de marfă. Dacă operezi vehicule ușoare pe rute internaționale sau la cabotaj, iată tot ce trebuie să știi înainte de 1 iulie 2026.",
          },
          {
            type: "stats",
            items: [
              { value: "1 iul 2026", label: "Data intrării în vigoare" },
              { value: "2,5–3,5 t", label: "Intervalul de masă vizat" },
              { value: "G2V2", label: "Tahograf inteligent necesar" },
            ],
          },
          {
            type: "h2",
            id: "calendar",
            text: "Calendarul aplicării și ce intră, concret, în regulă",
          },
          { type: "h3", text: "De când devine obligatoriu tahograful pe autoutilitare?" },
          {
            type: "p",
            text: "Data de start este **1 iulie 2026**. De la această dată, vehiculele ușoare care îndeplinesc criteriile trebuie să aibă aparatul de înregistrare montat și funcțional.",
          },
          { type: "h3", text: "Ce vehicule sunt vizate?" },
          {
            type: "p",
            text: "Obligația se aplică vehiculelor și ansamblurilor (autoutilitară + remorcă) cu masa maximă autorizată **peste 2,5 tone și până la 3,5 tone**, atunci când efectuează transport comercial internațional de marfă sau operațiuni de cabotaj.",
          },
          { type: "h3", text: "Se aplică și la cabotaj?" },
          {
            type: "p",
            text: "Da. Regula acoperă atât cursele comerciale internaționale, cât și operațiunile de cabotaj, pentru vehiculele din intervalul de masă vizat (peste 2,5 și până la 3,5 tone).",
          },
          {
            type: "callout",
            variant: "info",
            title: "Contează MMA, nu masa reală",
            text: "Reperul este **masa maximă autorizată (MMA) din actele vehiculului**, nu masa reală sau încărcată. La ansamblurile cu remorcă se ia în calcul MMA a întregului ansamblu — astfel poate intra sub obligație inclusiv un autoturism care tractează o remorcă grea într-un context comercial.",
          },
          { type: "h3", text: "Ce tip de tahograf trebuie montat?" },
          {
            type: "p",
            text: "Este necesar un **tahograf inteligent de generația a doua, versiunea 2 (Smart Tacho G2V2)**. Montarea, calibrarea și blocarea pe firmă se fac exclusiv în ateliere autorizate.",
          },
          {
            type: "h2",
            id: "exceptii",
            text: "Excepții: când nu ai nevoie de tahograf",
          },
          {
            type: "p",
            text: "Nu orice autoutilitară de peste 2,5 tone are obligație la internațional. Regulamentul (CE) nr. 561/2006 prevede două excepții importante — **articolul 3 litera (aa)** și **articolul 3 litera (ha)** — care permit, în anumite situații, transportul fără aparat de înregistrare.",
          },
          { type: "h3", text: "Excepția „meșteșugarului” (art. 3 alin. (aa))" },
          {
            type: "p",
            text: "Elimină obligația tahografului dacă sunt îndeplinite **simultan toate** condițiile:",
          },
          {
            type: "ul",
            items: [
              "masa maximă autorizată **nu depășește 7,5 tone**;",
              "transportul se face pe o rază de maximum **100 de kilometri** față de sediul firmei;",
              "conducerea vehiculului **nu este ocupația principală** a șoferului;",
              "transportul este **secundar** față de activitatea principală a firmei.",
            ],
          },
          {
            type: "p",
            text: "Excepția acoperă transportul de materiale, echipamente, scule sau bunuri folosite în activități de tip meșteșugăresc.",
          },
          { type: "h3", text: "Excepția „pe cont propriu” (art. 3 alin. (ha))" },
          {
            type: "p",
            text: "Se aplică vehiculelor de **2,5–3,5 tone** care transportă bunuri în cadrul activității proprii a firmei. Aici **nu există limita de 100 km** (sunt permise distanțe internaționale lungi), cu condiția ca:",
          },
          {
            type: "ul",
            items: [
              "transportul să **nu fie contra cost** pentru terți;",
              "bunurile să aparțină firmei sau să fie legate de activitatea ei comercială;",
              "conducerea vehiculului să **nu fie ocupația principală** a angajatului.",
            ],
          },
          {
            type: "callout",
            variant: "warning",
            title: "Atenție la interpretare",
            text: "Autoritățile contestă de regulă această excepție dacă șoferul este angajat explicit ca șofer profesionist.",
          },
          {
            type: "h2",
            id: "timp-conducere",
            text: "Timp de conducere și odihnă pentru șoferii de autoutilitare",
          },
          {
            type: "p",
            text: "Din 1 iulie 2026, șoferii vizați trebuie să respecte **același regim ca șoferii de camion**:",
          },
          {
            type: "ul",
            items: [
              "timp de conducere zilnic de până la **9 ore** (maximum **10 ore**, de două ori pe săptămână);",
              "timp de conducere săptămânal de până la **56 de ore**;",
              "timp de conducere pe două săptămâni de până la **90 de ore**;",
              "pauză obligatorie de **45 de minute** după **4,5 ore** de conducere (poate fi împărțită în 15 min + 30 min);",
              "odihnă zilnică de minimum **11 ore** în fiecare interval de **24 de ore**.",
            ],
          },
          {
            type: "p",
            text: "Suplimentar, se aplică regulile Pachetului de Mobilitate: obligativitatea cardului de conducător auto și întoarcerea periodică la bază / la domiciliu.",
          },
          {
            type: "h2",
            id: "sanctiuni",
            text: "Sancțiuni în Europa dacă nu ai tahograful cerut",
          },
          {
            type: "p",
            text: "Operarea fără Smart Tacho G2V2 este încadrată drept **încălcare gravă**. Cuantumurile diferă semnificativ de la o țară la alta, iar în majoritatea statelor vehiculul poate fi imobilizat până la intrarea în legalitate.",
          },
          {
            type: "table",
            head: ["Țară", "Sancțiune"],
            rows: [
              ["România", "1.800–2.400 € (posibilă reținerea vehiculului)"],
              ["Austria", "400–5.000 € (imobilizare până la remediere)"],
              ["Belgia", "2.640 € (fix)"],
              ["Bulgaria", "1.500 € neconform; 3.000 € lipsă tahograf G2.0"],
              ["Croația", "șofer 390–920 €; firmă 1.980–3.310 €"],
              ["Cipru", "până la 3.417 €"],
              ["Muntenegru", "2.500–6.000 €"],
              ["Cehia", "până la 350.000 CZK; remorcare pe cheltuiala operatorului"],
              ["Danemarca", "șofer până la 6.000 DKK; firmă până la 12.000 DKK"],
              ["Estonia", "șofer până la 800 €; firmă până la 3.200 €"],
              ["Finlanda", "min. 10 – max. 25 de zile de salariu"],
              ["Franța", "până la 30.000 €; până la 1 an închisoare; confiscare"],
              ["Grecia", "3.000 €; imobilizare imediată până la plată"],
              ["Spania", "2.001 €"],
              ["Lituania", "șofer 350–600 €; responsabil 900–1.700 €"],
              ["Luxemburg", "251–25.000 € și/sau 8 zile–5 ani închisoare"],
              ["Letonia", "430–700 €"],
              ["Malta", "58,23 €"],
              ["Țările de Jos", "4.400 €"],
              ["Germania", "1.500 €"],
              ["Polonia", "12.000 PLN (firmă 10.000 + manager 2.000)"],
              ["Portugalia", "1.200–6.000 €"],
              ["Slovacia", "1.659–16.596 €; posibilă reținerea plăcuțelor"],
              ["Slovenia", "până la 1.500 €"],
              ["Elveția", "min. 540 CHF; blocarea vehiculului până la plată"],
              ["Suedia", "20.000 SEK"],
              ["Ungaria", "800.000 HUF"],
              ["Marea Britanie", "300 £"],
              ["Italia", "866–3.464 €; montare în 10 zile; suspendare permis 15 zile–3 luni"],
            ],
          },
          { type: "h2", id: "pregatire", text: "Cum te pregătești ca firmă" },
          {
            type: "p",
            text: "Pe lângă montarea aparatului, apar mai multe obligații administrative pentru transportatori:",
          },
          {
            type: "ul",
            items: [
              "costul echipamentului: aproximativ **1.000 € net** (plus montaj);",
              "obținerea **cardului de firmă** și a **cardurilor de conducător auto** pentru toți șoferii;",
              "descărcarea datelor: de pe cardul șoferului cel puțin o dată la **28 de zile**; din memoria tahografului cel puțin o dată la **90 de zile**;",
              "arhivarea fișierelor timp de **1–2 ani**;",
              "instruirea șoferilor și a dispecerilor privind utilizarea aparatului și planificarea programului conform limitelor de timp.",
            ],
          },
          { type: "h3", text: "Ce se schimbă în planificarea de zi cu zi?" },
          {
            type: "p",
            text: "Planificarea ad-hoc — prin telefon sau tabele Excel — devine nesustenabilă. Controalele mai stricte și pauzele obligatorii împing firmele către instrumente digitale, corelarea încărcăturilor cu pauzele impuse și, tot mai des, sisteme telematice care permit descărcări DDD la distanță și monitorizarea automată, în timp real, a abaterilor de la timpul de lucru.",
          },
          {
            type: "callout",
            variant: "success",
            title: "Concluzie",
            text: "Dacă folosești vehicule de 2,5–3,5 tone pe rute internaționale sau la cabotaj, verifică din timp dacă intri sub obligație, montează un tahograf G2V2 într-un atelier autorizat și pune la punct procesele de descărcare a datelor și de planificare a timpului de lucru. Pregătirea din timp îți evită amenzi mari și imobilizări ale vehiculelor.",
          },
        ],
        faq: [
          {
            q: "De când devine obligatoriu tahograful pe autoutilitare?",
            a: "De la 1 iulie 2026. Din această dată, vehiculele ușoare care îndeplinesc criteriile trebuie să aibă aparatul montat și funcțional.",
          },
          {
            q: "Ce vehicule sunt vizate?",
            a: "Vehiculele și ansamblurile (autoutilitară cu remorcă) cu masa maximă autorizată peste 2,5 tone și până la 3,5 tone, la transport comercial internațional de marfă sau la cabotaj.",
          },
          {
            q: "Se aplică și la cabotaj?",
            a: "Da. Regula acoperă atât cursele internaționale comerciale, cât și operațiunile de cabotaj, pentru vehiculele din intervalul peste 2,5 – 3,5 tone.",
          },
          {
            q: "Contează masa reală sau masa maximă autorizată?",
            a: "Reperul este masa maximă autorizată (MMA) din actele vehiculului, nu masa reală. La ansambluri cu remorcă se ia MMA a întregului ansamblu — poate fi afectat inclusiv un autoturism care tractează o remorcă grea în context comercial.",
          },
          {
            q: "Ce tip de tahograf trebuie montat?",
            a: "Un tahograf inteligent de generația a doua, versiunea 2 (Smart Tacho G2V2). Montarea, calibrarea și blocarea pe firmă se fac exclusiv în ateliere autorizate.",
          },
          {
            q: "Orice autoutilitară de peste 2,5 tone are obligație la internațional?",
            a: "Nu. Regulamentul (CE) 561/2006 conține două excepții importante (art. 3 lit. (aa) și art. 3 lit. (ha)) care permit, în anumite situații, transportul fără aparat de înregistrare.",
          },
          {
            q: "Ce înseamnă „excepția meșteșugarului” (articolul 3 alineatul (aa))?",
            a: "Elimină obligația tahografului dacă sunt îndeplinite simultan toate condițiile: masa maximă autorizată de cel mult 7,5 tone, transport pe o rază de maximum 100 km de sediul firmei, conducerea vehiculului nu este ocupația principală a șoferului, iar transportul este secundar față de activitatea principală a firmei.",
          },
          {
            q: "Cum funcționează excepția „pe cont propriu” (articolul 3 alineatul (ha))?",
            a: "Se aplică vehiculelor de 2,5–3,5 tone care transportă bunuri în cadrul activității proprii a firmei. Nu există limita de 100 km, cu condiția ca transportul să nu fie contra cost pentru terți, bunurile să aparțină/să fie legate de activitatea firmei, iar conducerea să nu fie ocupația principală a angajatului. De regulă, autoritățile contestă excepția dacă șoferul este angajat explicit ca șofer profesionist.",
          },
          {
            q: "Ce limite de timp se aplică din 1 iulie 2026?",
            a: "Același regim ca la șoferii de camion: conducere zilnică de până la 9 ore (extensibil la maximum 10 ore de două ori pe săptămână), conducere săptămânală de până la 56 de ore, conducere pe două săptămâni de până la 90 de ore, pauză obligatorie de 45 de minute după 4,5 ore de conducere (divizibilă 15+30 min) și odihnă zilnică de minimum 11 ore pe 24 de ore.",
          },
          {
            q: "Ce sancțiuni se aplică în Europa dacă nu ai tahograful cerut?",
            a: "Operarea fără Smart Tacho G2V2 este o încălcare gravă, cu penalizări foarte diferite de la țară la țară: România 1.800–2.400 € cu reținerea vehiculului; Austria 400–5.000 €; Franța până la 30.000 €, un an de închisoare și confiscare; Germania 1.500 €; Polonia 12.000 PLN; Italia 866–3.464 € cu suspendarea permisului. În majoritatea țărilor vehiculul poate fi imobilizat până la intrarea în legalitate.",
          },
          {
            q: "Ce obligații suplimentare apar pentru transportatori?",
            a: "Achiziția aparatului (aprox. 1.000 € net plus montaj), obținerea cardului de firmă și a cardurilor de șofer, descărcarea datelor de pe cardul șoferului cel puțin la 28 de zile și din memoria tahografului cel puțin la 90 de zile, arhivarea fișierelor 1–2 ani și instruirea șoferilor și dispecerilor.",
          },
          {
            q: "Ce se schimbă în planificarea de zi cu zi?",
            a: "Planificarea ad-hoc prin telefon sau tabele Excel devine nesustenabilă. Controalele mai stricte și pauzele obligatorii împing firmele spre instrumente digitale și sisteme telematice care permit descărcări DDD la distanță și analiza automată a abaterilor de la timpul de lucru.",
          },
        ],
      },

      ru: {
        category: "Регламенты ЕС",
        title:
          "Тахографы на фургонах с 1 июля 2026: кого касается, исключения и штрафы",
        excerpt:
          "С 1 июля 2026 года часть фургонов массой свыше 2,5 тонн, используемых для международных коммерческих перевозок и каботажа, должна быть оснащена умным тахографом. Полный гид: кого это касается, какие есть исключения, какие штрафы грозят и как подготовиться.",
        metaTitle:
          "Тахографы на фургонах с 1 июля 2026 — обязанности, исключения, штрафы",
        metaDescription:
          "С 1 июля 2026 фургоны свыше 2,5 т на международных перевозках и каботаже должны иметь умный тахограф G2V2. Кого это касается, исключения из Регламента 561/2006, лимиты времени и штрафы по каждой стране.",
        author: "Команда DAVO Group",
        keyTakeaways: [
          "Требование вступает в силу 1 июля 2026 года для автомобилей и составов с максимальной разрешённой массой свыше 2,5 и до 3,5 тонн при международных коммерческих перевозках или каботаже.",
          "Необходим умный тахограф второго поколения, версии 2 (Smart Tacho G2V2), устанавливаемый только в авторизованных мастерских.",
          "В Регламенте (ЕС) 561/2006 есть два исключения — «ремесленник» (ст. 3 aa) и «за свой счёт» (ст. 3 ha).",
          "Водители, которых это касается, соблюдают тот же режим труда и отдыха, что и водители грузовиков.",
          "Штрафы сильно различаются между странами — от 58 € на Мальте до 30 000 € и тюрьмы во Франции.",
        ],
        content: [
          {
            type: "p",
            text: "Автомобильные грузоперевозки лёгким транспортом вступают в новый этап. В Европейском союзе правила из **Пакета мобильности** распространяются и на часть фургонов, используемых для перевозки грузов. Если вы эксплуатируете лёгкие автомобили на международных рейсах или на каботаже, вот всё, что нужно знать до 1 июля 2026 года.",
          },
          {
            type: "stats",
            items: [
              { value: "1 июл 2026", label: "Дата вступления в силу" },
              { value: "2,5–3,5 т", label: "Диапазон массы" },
              { value: "G2V2", label: "Требуемый умный тахограф" },
            ],
          },
          {
            type: "h2",
            id: "calendar",
            text: "Календарь применения и что конкретно попадает под правило",
          },
          { type: "h3", text: "С какого момента тахограф на фургонах становится обязательным?" },
          {
            type: "p",
            text: "Дата старта — **1 июля 2026 года**. С этой даты лёгкие автомобили, отвечающие критериям, должны иметь установленный и исправный регистрирующий прибор.",
          },
          { type: "h3", text: "Какие автомобили попадают под правило?" },
          {
            type: "p",
            text: "Обязанность распространяется на автомобили и составы (фургон + прицеп) с максимальной разрешённой массой **свыше 2,5 тонн и до 3,5 тонн**, когда они выполняют международные коммерческие грузоперевозки или каботажные операции.",
          },
          { type: "h3", text: "Распространяется ли это на каботаж?" },
          {
            type: "p",
            text: "Да. Правило охватывает как международные коммерческие рейсы, так и каботажные операции для автомобилей в указанном диапазоне массы (свыше 2,5 и до 3,5 тонн).",
          },
          {
            type: "callout",
            variant: "info",
            title: "Важна МРМ, а не фактическая масса",
            text: "Ориентир — **максимальная разрешённая масса (МРМ) по документам автомобиля**, а не фактическая или загруженная масса. Для составов с прицепом учитывается МРМ всего состава — так под обязанность может попасть даже легковой автомобиль, буксирующий тяжёлый прицеп в коммерческом контексте.",
          },
          { type: "h3", text: "Какой тип тахографа нужно установить?" },
          {
            type: "p",
            text: "Необходим **умный тахограф второго поколения, версии 2 (Smart Tacho G2V2)**. Установка, калибровка и привязка к фирме выполняются исключительно в авторизованных мастерских.",
          },
          {
            type: "h2",
            id: "exceptii",
            text: "Исключения: когда тахограф не нужен",
          },
          {
            type: "p",
            text: "Не каждый фургон свыше 2,5 тонн обязан иметь тахограф на международных перевозках. Регламент (ЕС) № 561/2006 предусматривает два важных исключения — **статья 3 пункт (aa)** и **статья 3 пункт (ha)** — которые в определённых ситуациях позволяют перевозки без регистрирующего прибора.",
          },
          { type: "h3", text: "Исключение «ремесленника» (ст. 3 п. (aa))" },
          {
            type: "p",
            text: "Отменяет обязанность иметь тахограф, если **одновременно выполнены все** условия:",
          },
          {
            type: "ul",
            items: [
              "максимальная разрешённая масса **не превышает 7,5 тонн**;",
              "перевозка выполняется в радиусе не более **100 километров** от места нахождения фирмы;",
              "управление автомобилем **не является основным занятием** водителя;",
              "перевозка носит **вспомогательный характер** по отношению к основной деятельности фирмы.",
            ],
          },
          {
            type: "p",
            text: "Исключение охватывает перевозку материалов, оборудования, инструментов или товаров, используемых в ремесленной деятельности.",
          },
          { type: "h3", text: "Исключение «за свой счёт» (ст. 3 п. (ha))" },
          {
            type: "p",
            text: "Применяется к автомобилям **2,5–3,5 тонн**, перевозящим товары в рамках собственной деятельности фирмы. Здесь **нет ограничения в 100 км** (разрешены длинные международные расстояния), при условии, что:",
          },
          {
            type: "ul",
            items: [
              "перевозка **не осуществляется за плату** для третьих лиц;",
              "товары принадлежат фирме или связаны с её коммерческой деятельностью;",
              "управление автомобилем **не является основным занятием** работника.",
            ],
          },
          {
            type: "callout",
            variant: "warning",
            title: "Осторожно с трактовкой",
            text: "Власти, как правило, оспаривают это исключение, если водитель нанят именно как профессиональный водитель.",
          },
          {
            type: "h2",
            id: "timp-conducere",
            text: "Время управления и отдыха для водителей фургонов",
          },
          {
            type: "p",
            text: "С 1 июля 2026 года водители, которых это касается, обязаны соблюдать **тот же режим, что и водители грузовиков**:",
          },
          {
            type: "ul",
            items: [
              "ежедневное время управления до **9 часов** (максимум **10 часов**, дважды в неделю);",
              "недельное время управления до **56 часов**;",
              "время управления за две недели до **90 часов**;",
              "обязательный перерыв **45 минут** после **4,5 часов** управления (можно разбить на 15 мин + 30 мин);",
              "ежедневный отдых не менее **11 часов** в каждый период **24 часов**.",
            ],
          },
          {
            type: "p",
            text: "Дополнительно применяются правила Пакета мобильности: обязательность карты водителя и периодическое возвращение на базу / домой.",
          },
          {
            type: "h2",
            id: "sanctiuni",
            text: "Штрафы в Европе, если у вас нет требуемого тахографа",
          },
          {
            type: "p",
            text: "Эксплуатация без Smart Tacho G2V2 квалифицируется как **серьёзное нарушение**. Суммы существенно различаются от страны к стране, и в большинстве государств автомобиль может быть задержан до устранения нарушения.",
          },
          {
            type: "table",
            head: ["Страна", "Штраф"],
            rows: [
              ["Румыния", "1 800–2 400 € (возможно задержание автомобиля)"],
              ["Австрия", "400–5 000 € (иммобилизация до устранения)"],
              ["Бельгия", "2 640 € (фиксированный)"],
              ["Болгария", "1 500 € несоответствие; 3 000 € отсутствие тахографа G2.0"],
              ["Хорватия", "водитель 390–920 €; фирма 1 980–3 310 €"],
              ["Кипр", "до 3 417 €"],
              ["Черногория", "2 500–6 000 €"],
              ["Чехия", "до 350 000 CZK; эвакуация за счёт оператора"],
              ["Дания", "водитель до 6 000 DKK; фирма до 12 000 DKK"],
              ["Эстония", "водитель до 800 €; фирма до 3 200 €"],
              ["Финляндия", "мин. 10 – макс. 25 дней зарплаты"],
              ["Франция", "до 30 000 €; до 1 года тюрьмы; конфискация"],
              ["Греция", "3 000 €; немедленная иммобилизация до оплаты"],
              ["Испания", "2 001 €"],
              ["Литва", "водитель 350–600 €; ответственное лицо 900–1 700 €"],
              ["Люксембург", "251–25 000 € и/или 8 дней–5 лет тюрьмы"],
              ["Латвия", "430–700 €"],
              ["Мальта", "58,23 €"],
              ["Нидерланды", "4 400 €"],
              ["Германия", "1 500 €"],
              ["Польша", "12 000 PLN (фирма 10 000 + менеджер 2 000)"],
              ["Португалия", "1 200–6 000 €"],
              ["Словакия", "1 659–16 596 €; возможно изъятие номеров"],
              ["Словения", "до 1 500 €"],
              ["Швейцария", "мин. 540 CHF; блокировка автомобиля до оплаты"],
              ["Швеция", "20 000 SEK"],
              ["Венгрия", "800 000 HUF"],
              ["Великобритания", "300 £"],
              ["Италия", "866–3 464 €; установка в течение 10 дней; лишение прав 15 дней–3 месяца"],
            ],
          },
          { type: "h2", id: "pregatire", text: "Как подготовиться как компания" },
          {
            type: "p",
            text: "Помимо установки прибора, у перевозчиков появляется несколько административных обязанностей:",
          },
          {
            type: "ul",
            items: [
              "стоимость оборудования: примерно **1 000 € нетто** (плюс установка);",
              "получение **карты предприятия** и **карт водителя** для всех водителей;",
              "выгрузка данных: с карты водителя не реже одного раза в **28 дней**; из памяти тахографа не реже одного раза в **90 дней**;",
              "хранение файлов в течение **1–2 лет**;",
              "обучение водителей и диспетчеров использованию прибора и планированию графика в соответствии с лимитами времени.",
            ],
          },
          { type: "h3", text: "Что меняется в повседневном планировании?" },
          {
            type: "p",
            text: "Планирование «на ходу» — по телефону или в таблицах Excel — становится нежизнеспособным. Более строгий контроль и обязательные перерывы подталкивают компании к цифровым инструментам, к согласованию загрузок с обязательными перерывами и всё чаще к телематическим системам, позволяющим удалённую выгрузку DDD и автоматический мониторинг отклонений от рабочего времени в реальном времени.",
          },
          {
            type: "callout",
            variant: "success",
            title: "Вывод",
            text: "Если вы используете автомобили 2,5–3,5 тонн на международных рейсах или на каботаже, заранее проверьте, попадаете ли вы под обязанность, установите тахограф G2V2 в авторизованной мастерской и наладьте процессы выгрузки данных и планирования рабочего времени. Заблаговременная подготовка убережёт вас от крупных штрафов и задержаний автомобилей.",
          },
        ],
        faq: [
          {
            q: "С какого момента тахограф на фургонах становится обязательным?",
            a: "С 1 июля 2026 года. С этой даты лёгкие автомобили, отвечающие критериям, должны иметь установленный и исправный прибор.",
          },
          {
            q: "Какие автомобили попадают под правило?",
            a: "Автомобили и составы (фургон с прицепом) с максимальной разрешённой массой свыше 2,5 тонн и до 3,5 тонн при международных коммерческих грузоперевозках или каботаже.",
          },
          {
            q: "Распространяется ли это на каботаж?",
            a: "Да. Правило охватывает как международные коммерческие рейсы, так и каботажные операции для автомобилей в диапазоне свыше 2,5 – 3,5 тонн.",
          },
          {
            q: "Что важно — фактическая масса или максимальная разрешённая масса?",
            a: "Ориентир — максимальная разрешённая масса (МРМ) по документам автомобиля, а не фактическая масса. Для составов с прицепом берётся МРМ всего состава — под правило может попасть даже легковой автомобиль, буксирующий тяжёлый прицеп в коммерческом контексте.",
          },
          {
            q: "Какой тип тахографа нужно установить?",
            a: "Умный тахограф второго поколения, версии 2 (Smart Tacho G2V2). Установка, калибровка и привязка к фирме выполняются исключительно в авторизованных мастерских.",
          },
          {
            q: "Любой ли фургон свыше 2,5 тонн обязан иметь тахограф на международных перевозках?",
            a: "Нет. Регламент (ЕС) 561/2006 содержит два важных исключения (ст. 3 п. (aa) и ст. 3 п. (ha)), которые в определённых ситуациях позволяют перевозки без регистрирующего прибора.",
          },
          {
            q: "Что означает «исключение ремесленника» (статья 3 пункт (aa))?",
            a: "Отменяет обязанность иметь тахограф, если одновременно выполнены все условия: максимальная разрешённая масса не более 7,5 тонн, перевозка в радиусе не более 100 км от места нахождения фирмы, управление автомобилем не является основным занятием водителя, а перевозка носит вспомогательный характер по отношению к основной деятельности фирмы.",
          },
          {
            q: "Как работает исключение «за свой счёт» (статья 3 пункт (ha))?",
            a: "Применяется к автомобилям 2,5–3,5 тонн, перевозящим товары в рамках собственной деятельности фирмы. Ограничения в 100 км нет, при условии, что перевозка не осуществляется за плату для третьих лиц, товары принадлежат/связаны с деятельностью фирмы, а управление не является основным занятием работника. Как правило, власти оспаривают исключение, если водитель нанят именно как профессиональный водитель.",
          },
          {
            q: "Какие лимиты времени применяются с 1 июля 2026 года?",
            a: "Тот же режим, что и у водителей грузовиков: ежедневное управление до 9 часов (с продлением максимум до 10 часов дважды в неделю), недельное управление до 56 часов, управление за две недели до 90 часов, обязательный перерыв 45 минут после 4,5 часов управления (делится 15+30 мин) и ежедневный отдых не менее 11 часов за 24 часа.",
          },
          {
            q: "Какие штрафы применяются в Европе, если у вас нет требуемого тахографа?",
            a: "Эксплуатация без Smart Tacho G2V2 — серьёзное нарушение с очень разными санкциями от страны к стране: Румыния 1 800–2 400 € с задержанием автомобиля; Австрия 400–5 000 €; Франция до 30 000 €, год тюрьмы и конфискация; Германия 1 500 €; Польша 12 000 PLN; Италия 866–3 464 € с лишением прав. В большинстве стран автомобиль может быть задержан до устранения нарушения.",
          },
          {
            q: "Какие дополнительные обязанности появляются у перевозчиков?",
            a: "Покупка прибора (примерно 1 000 € нетто плюс установка), получение карты предприятия и карт водителей, выгрузка данных с карты водителя не реже чем раз в 28 дней и из памяти тахографа не реже чем раз в 90 дней, хранение файлов 1–2 года и обучение водителей и диспетчеров.",
          },
          {
            q: "Что меняется в повседневном планировании?",
            a: "Планирование «на ходу» по телефону или в таблицах Excel становится нежизнеспособным. Более строгий контроль и обязательные перерывы подталкивают компании к цифровым инструментам и телематическим системам, позволяющим удалённую выгрузку DDD и автоматический анализ отклонений от рабочего времени.",
          },
        ],
      },
    },
  },
];

function resolvePost(post: BlogPost, locale: Locale): ResolvedPost {
  const { i18n, ...base } = post;
  const content = i18n[locale] ?? i18n[post.locales[0]];
  return { ...base, ...content };
}

export function getAllPosts(): BlogPost[] {
  return posts;
}

export function getLocalizedPosts(locale: Locale): ResolvedPost[] {
  return posts.map((p) => resolvePost(p, locale));
}

export function getLocalizedPost(slug: string, locale: Locale): ResolvedPost | undefined {
  const post = posts.find((p) => p.slug === slug);
  return post ? resolvePost(post, locale) : undefined;
}

export function getRelatedPosts(slug: string, locale: Locale, limit = 2): ResolvedPost[] {
  return posts
    .filter((p) => p.slug !== slug)
    .slice(0, limit)
    .map((p) => resolvePost(p, locale));
}
