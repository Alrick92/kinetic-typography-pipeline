import React from "react";
import { Img, staticFile } from "remotion";

export const AvatarImage: React.FC<{
  path: string | null;
  size: number;
  placeholderColor: string;
  ringColor?: string;
}> = ({ path, size, placeholderColor, ringColor }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      overflow: "hidden",
      flexShrink: 0,
      border: ringColor ? `4px solid ${ringColor}` : undefined,
      backgroundColor: placeholderColor,
    }}
  >
    {path ? <Img src={staticFile(path)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
  </div>
);
