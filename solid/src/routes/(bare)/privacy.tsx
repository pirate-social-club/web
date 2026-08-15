import { Meta, Title } from "@solidjs/meta";
import { parsePrivacyPolicy, PRIVACY_POLICY_SOURCE } from "../../features/privacy-policy";

function InlineText(props: { text: string }) {
  return props.text.split(/(`[^`]+`)/g).map((part) =>
    part.startsWith("`") && part.endsWith("`") && part.length >= 2
      ? <code>{part.slice(1, -1)}</code>
      : part,
  );
}

export default function PrivacyRoute() {
  const blocks = parsePrivacyPolicy(PRIVACY_POLICY_SOURCE);

  return (
    <main data-route-path="/privacy">
      <Title>Privacy Policy · Pirate Web</Title>
      <Meta name="description" content="Pirate Web Privacy Policy" />
      <nav aria-label="Legal navigation">
        <a href="/">Home</a>
        <a href="/terms">Terms</a>
        <a href="/delete-account">Account deletion</a>
        <a href="mailto:support@pirate.sc">support@pirate.sc</a>
      </nav>
      <article aria-labelledby="privacy-policy-title">
        {blocks.map((block) => {
          if (block.type === "heading") {
            if (block.level === 1) return <h1 id="privacy-policy-title">{block.text}</h1>;
            if (block.level === 2) return <h2>{block.text}</h2>;
            return <h3>{block.text}</h3>;
          }
          if (block.type === "list") {
            return <ul>{block.items.map((item) => <li><InlineText text={item} /></li>)}</ul>;
          }
          return <p><InlineText text={block.text} /></p>;
        })}
      </article>
    </main>
  );
}
