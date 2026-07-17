export async function shareEntity(input: {
  title: string;
  text?: string;
  path: string;
}) {
  const url = `${window.location.origin}${input.path.startsWith("/") ? input.path : `/${input.path}`}`;
  const payload = {
    title: input.title,
    text: input.text ?? input.title,
    url,
  };

  if (navigator.share) {
    try {
      await navigator.share(payload);
      return { ok: true, method: "native" as const };
    } catch {
      // fall through to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return { ok: true, method: "clipboard" as const };
  } catch {
    return { ok: false, method: "none" as const };
  }
}
