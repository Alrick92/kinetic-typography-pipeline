import React from "react";
import { AbsoluteFill, Img, Loop, OffthreadVideo, staticFile, useVideoConfig } from "remotion";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export const VideoBackground: React.FC<{ mediaPath: string; loopSec: number }> = ({ mediaPath, loopSec }) => {
  const { fps } = useVideoConfig();
  const isImage = IMAGE_EXTENSIONS.has(mediaPath.slice(mediaPath.lastIndexOf(".")).toLowerCase());

  return (
    <AbsoluteFill>
      {isImage ? (
        <Img src={staticFile(mediaPath)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Loop durationInFrames={Math.round(loopSec * fps)}>
          <OffthreadVideo
            src={staticFile(mediaPath)}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Loop>
      )}
      {/* Darken slightly so overlaid text stays legible over arbitrary footage. */}
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.35)" }} />
    </AbsoluteFill>
  );
};
