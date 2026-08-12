import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_FRONTEND_FILE_LIMIT = 600;

// These are intentional debt ceilings, not general style limits. Reducing a
// file is always allowed; increasing one requires extracting at least as much
// responsibility as the feature adds. Production files not listed here use the
// stricter default limit above.
export const FRONTEND_FILE_LIMITS = new Map([
  ["src/app/telegram-mini-app/telegram-mini-app-route.tsx", 1667],
  ["src/components/compositions/posts/video-feed/video-feed.tsx", 1657],
  ["src/app/authenticated-routes/video-home-route.tsx", 1354],
  ["src/components/compositions/community/gates-editor/tree-builder/gate-tree-builder.tsx", 1335],
  ["src/app/authenticated-state/create-post-state.tsx", 1307],
  ["src/app/authenticated-routes/post-route.tsx", 1277],
  ["src/app/authenticated-routes/study-route.tsx", 1255],
  ["src/app/authenticated-routes/moderation-route.tsx", 1226],
  ["src/app/authenticated-routes/wallet-settings-route.tsx", 1200],
  ["src/app/authenticated-routes/community-route.tsx", 1161],
  ["src/app/video-experience/video-experience-overlay.tsx", 984],
  ["src/app/authenticated-helpers/use-boost-campaign-controller.ts", 889],
  ["src/app/authenticated-routes/home-routes.tsx", 890],
  ["src/components/compositions/community/gates-editor/community-gates-editor-page.tsx", 939],
  ["src/app/authenticated-routes/create-post-route.tsx", 927],
  ["src/app/chat/use-chat-controller.tsx", 924],
  ["src/app/public-community-route.tsx", 920],
  ["src/app/authenticated-state/post-state.tsx", 920],
  ["src/components/compositions/posts/post-card/post-card-song-content.tsx", 843],
  ["src/components/compositions/community/assistant-policy/community-assistant-policy.tsx", 819],
  ["src/components/compositions/chat/chat-route-views.tsx", 815],
  ["src/app/router.ts", 805],
  ["src/components/compositions/rewards/reward-booster-surfaces.tsx", 799],
  ["src/components/compositions/community/handle-policy-editor/community-handle-policy-editor-page.tsx", 796],
  ["src/app/authenticated-state/use-community-telegram-state.ts", 789],
  ["src/components/compositions/notifications/inbox-page/notification-inbox-page.tsx", 754],
  ["src/components/compositions/settings/settings-page/panels/settings-page-domains-tab.tsx", 752],
  ["src/components/compositions/posts/post-composer/use-post-composer-controller.ts", 721],
  ["src/components/compositions/posts/post-card/post-card-embed.tsx", 721],
  ["src/components/compositions/community/namespace-verification-page/community-namespace-verification-page.tsx", 720],
  ["src/app/authenticated-helpers/post-media-presentation.ts", 696],
  ["src/components/compositions/song-study/song-study-surface.tsx", 688],
  ["src/components/compositions/posts/post-card/post-card-live-room-content.tsx", 628],
  ["src/components/compositions/app/app-sidebar/app-sidebar.tsx", 616],
  ["src/app/authenticated-state/use-community-join-verification.ts", 605],
  ["src/app/authenticated-state/use-domains-tab.ts", 603],
  ["src/app/authenticated-routes/profile-settings-routes.tsx", 603],
]);

const AUDIT_ROOTS = ["src/app", "src/components/compositions"];
const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(scriptPath), "..");

export function countLines(source) {
  return source.length === 0 ? 0 : source.split(/\r?\n/u).length - (source.endsWith("\n") ? 1 : 0);
}

export function shouldAuditFrontendFile(file) {
  const normalized = file.replaceAll("\\", "/");
  if (!/\.(?:ts|tsx)$/u.test(normalized) || normalized.endsWith(".d.ts")) return false;
  if (/(?:^|\/)(?:generated|__generated__|vendor)(?:\/|$)/u.test(normalized)) return false;
  if (/(?:^|\/)stories(?:\/|$)|\.stories\.(?:ts|tsx)$/u.test(normalized)) return false;
  if (/\.(?:test|spec)\.(?:ts|tsx)$/u.test(normalized)) return false;
  if (/\.config\.(?:ts|tsx)$/u.test(normalized)) return false;
  return true;
}

async function collectFrontendFiles(root) {
  const files = [];

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      const file = relative(root, absolutePath).replaceAll("\\", "/");
      if (shouldAuditFrontendFile(file)) files.push(file);
    }
  }

  for (const auditRoot of AUDIT_ROOTS) {
    await visit(join(root, auditRoot));
  }

  return files.sort();
}

export function findSizeViolations(entries, limits = FRONTEND_FILE_LIMITS) {
  return entries.flatMap(({ file, lines }) => {
    const limit = limits.get(file) ?? DEFAULT_FRONTEND_FILE_LIMIT;
    return lines > limit ? [{ file, limit, lines }] : [];
  });
}

export async function auditFrontendFileSizes(root = repositoryRoot) {
  const files = await collectFrontendFiles(root);
  const entries = await Promise.all(files.map(async (file) => ({
    file,
    lines: countLines(await readFile(join(root, file), "utf8")),
  })));
  const violations = findSizeViolations(entries);
  const presentFiles = new Set(files);

  for (const [file, limit] of FRONTEND_FILE_LIMITS) {
    const entry = entries.find((candidate) => candidate.file === file);
    if (!entry) {
      console.log(`${file}: removed (ratchet satisfied)`);
    } else if (entry.lines <= limit) {
      console.log(`${file}: ${entry.lines}/${limit} lines`);
    }
  }

  for (const { file, limit, lines } of violations) {
    const kind = FRONTEND_FILE_LIMITS.has(file) ? "Oversized-file ratchet" : "New frontend file limit";
    console.error(
      `::error file=${file}::${kind} exceeded: ${lines} lines (limit ${limit}, +${lines - limit}). Extract responsibility or reduce another part of this file.`,
    );
  }

  console.log(
    `Audited ${presentFiles.size} production frontend files; unlisted files are limited to ${DEFAULT_FRONTEND_FILE_LIMIT} lines.`,
  );

  return { entries, violations };
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const { violations } = await auditFrontendFileSizes();
  if (violations.length > 0) process.exitCode = 1;
}
