export type CommentMediaType = "image" | "video" | "audio" | "gif" | "sticker";

type Props = {
  mediaType?: CommentMediaType | string | null;
  mediaUrl?: string | null;
  className?: string;
};

export function CommentMediaBody({ mediaType, mediaUrl, className = "" }: Props) {
  if (!mediaUrl || !mediaType) return null;

  if (mediaType === "sticker") {
    return (
      <img
        src={mediaUrl}
        alt="Sticker"
        className={`mt-1.5 w-24 h-24 object-contain ${className}`}
        loading="lazy"
      />
    );
  }

  if (mediaType === "image" || mediaType === "gif") {
    return (
      <img
        src={mediaUrl}
        alt=""
        className={`mt-1.5 max-h-40 rounded-lg object-cover border border-border/30 ${className}`}
        loading="lazy"
      />
    );
  }

  if (mediaType === "video") {
    return (
      <video
        src={mediaUrl}
        controls
        playsInline
        className={`mt-1.5 max-h-40 w-full rounded-lg border border-border/30 bg-black/40 ${className}`}
      />
    );
  }

  if (mediaType === "audio") {
    return (
      <audio
        src={mediaUrl}
        controls
        className={`mt-1.5 w-full max-w-full h-9 ${className}`}
      />
    );
  }

  return null;
}
