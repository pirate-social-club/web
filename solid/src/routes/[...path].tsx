import { getRequestEvent } from "@solidjs/web";
import { createUiLocale } from "../lib/ui-locale";
import { getLocaleMessages } from "../locales";

export default function NotFoundRoute() {
  const event = getRequestEvent();
  if (event) event.locals.routeStatus = 404;
  const { locale } = createUiLocale();
  const copy = () => getLocaleMessages(locale(), "routes").notFound;
  return (
    <main data-route-path="*404" data-route-status="404">
      <h1>{copy().title}</h1>
      <p>{copy().description}</p>
      <a href="/">{copy().returnHome}</a>
    </main>
  );
}
