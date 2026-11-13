import type { Metadata } from "next";
import { BUSINESS, LEGAL } from "@/config/site";

export const metadata: Metadata = {
  title: "Политика за поверителност",
  description: "Как Classy & Beautiful събира, използва и пази личните ви данни.",
  alternates: { canonical: "/poveritelnost" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-taupe-200 pt-8">
      <h2 className="text-3xl mb-4">{title}</h2>
      <div className="space-y-4 text-taupe-700 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  const mail = (
    <a href={`mailto:${BUSINESS.email}`} className="underline underline-offset-2 hover:text-brand-black">
      {BUSINESS.email}
    </a>
  );

  return (
    <article className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 max-w-3xl">
      <p className="eyebrow mb-4">Поверителност</p>
      <h1 className="text-5xl sm:text-6xl mb-4">Политика за поверителност</h1>
      <p className="text-sm text-taupe-500 mb-12">Последна актуализация: {LEGAL.privacyPolicyUpdated}</p>

      <div className="space-y-10">
        <Section title="Кои сме ние">
          <p>
            Администратор на личните данни е {LEGAL.companyName}, ЕИК {LEGAL.eik}, със седалище и адрес на
            управление {LEGAL.address} (&quot;Classy &amp; Beautiful&quot;, &quot;ние&quot;). За всички въпроси,
            свързани с личните данни, пишете ни на {mail} или се обадете на{" "}
            <a href={`tel:${BUSINESS.phone}`} className="underline underline-offset-2 hover:text-brand-black">
              {BUSINESS.phoneDisplay}
            </a>
            .
          </p>
        </Section>

        <Section title="Какви данни събираме">
          <p>Когато запазвате час онлайн, събираме:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>име и фамилия;</li>
            <li>телефон и имейл адрес;</li>
            <li>бележка, ако решите да оставите такава;</li>
            <li>избрания салон, процедура, дата и час.</li>
          </ul>
          <p>
            За защита от злоупотреби (например масови фалшиви резервации) временно записваме IP адреса, от който
            е направена резервацията.
          </p>
        </Section>

        <Section title="За какво ги използваме">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>За да изпълним резервацията</strong> - да я потвърдим, да ви изпратим потвърждение по имейл и
              да се свържем с вас при промяна. Основание: стъпки по ваше искане преди сключване на договор (чл. 6,
              пар. 1, б. „б“ от Общия регламент относно защитата на данните).
            </li>
            <li>
              <strong>За сигурност на сайта</strong> - ограничаване на броя опити за резервация и вход. Основание:
              нашият законен интерес (чл. 6, пар. 1, б. „е“).
            </li>
          </ul>
          <p>Не използваме данните ви за реклама и не ги продаваме на трети лица.</p>
        </Section>

        <Section title="Колко време ги пазим">
          <ul className="list-disc pl-5 space-y-1">
            <li>Данните от резервацията - до 24 месеца след датата на посещението, след което се анонимизират.</li>
            <li>IP адреси, записани за защита от злоупотреби - до 24 часа.</li>
          </ul>
        </Section>

        <Section title="Кой друг има достъп">
          <p>Използваме доверени доставчици, които обработват данните само по наше указание:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Supabase - база данни, в която се пазят резервациите (сървъри в Европейския съюз);</li>
            <li>Vercel - хостинг на сайта;</li>
            <li>Resend - изпращане на имейли за потвърждение.</li>
          </ul>
        </Section>

        <Section title="Бисквитки и данни в браузъра">
          <p>
            Сайтът <strong>не използва рекламни или проследяващи бисквитки</strong>, затова не ви молим за
            съгласие с банер.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Статистика за посещенията</strong> - използваме Vercel Web Analytics, която работи без
              бисквитки и показва само обобщени данни (брой посещения, страници, държава, вид устройство). Не може
              да ви идентифицира и не ви проследява в други сайтове.
            </li>
            <li>
              <strong>„Запомни ме“</strong> - ако отбележите тази опция при резервация, името, телефонът и имейлът
              ви се пазят само във вашия браузър (localStorage), за да се попълнят автоматично следващия път. Не се
              изпращат към нас, докато не направите резервация. Можете да ги изтриете, като махнете отметката или
              изчистите данните на браузъра.
            </li>
            <li>
              <strong>Служебна бисквитка</strong> - използва се само за вход на персонала в административния панел.
            </li>
          </ul>
        </Section>

        <Section title="Вашите права">
          <p>Имате право да поискате:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>достъп до данните, които пазим за вас;</li>
            <li>коригиране на неточни данни;</li>
            <li>изтриване на данните („правото да бъдеш забравен“);</li>
            <li>ограничаване на обработването или да възразите срещу него;</li>
            <li>получаване на данните в машинночетим формат (преносимост).</li>
          </ul>
          <p>Пишете ни на {mail} - ще отговорим до един месец.</p>
          <p>
            Ако смятате, че правата ви са нарушени, можете да подадете жалба до Комисията за защита на личните
            данни: гр. София 1592, бул. „Проф. Цветан Лазаров“ № 2,{" "}
            <a
              href="https://www.cpdp.bg"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-brand-black"
            >
              www.cpdp.bg
            </a>
            .
          </p>
        </Section>

        <Section title="Промени">
          <p>
            Можем да актуализираме тази политика. Датата на последната промяна е посочена в началото на страницата.
          </p>
        </Section>
      </div>
    </article>
  );
}
