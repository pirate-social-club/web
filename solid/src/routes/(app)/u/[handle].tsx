import { Link, Meta, Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import { useUiLocale } from "../../../lib/ui-locale";
import { getLocaleMessages, interpolateMessage } from "../../../locales";

export default function ProfileRoute() {
  const params = useParams();
  const { locale } = useUiLocale();
  const copy = () => getLocaleMessages(locale(), "routes").profile;
  const handle = () => params.handle ?? "";
  const title = () => interpolateMessage(copy().title, { handle: handle() });
  return (
    <main data-route-path="/u/:handle" data-route-handle={params.handle}>
      <Title>{title()}</Title>
      <Meta property="og:title" content={title()} />
      <Link rel="canonical" href={`/u/${handle()}`} />
      <h1>{interpolateMessage(copy().heading, { handle: handle() })}</h1>
    </main>
  );
}
