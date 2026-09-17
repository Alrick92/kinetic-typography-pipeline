import React from "react";

export const DotProgress: React.FC<{ total: number; filled: number; color: string; mutedColor: string }> = ({
  total,
  filled,
  color,
  mutedColor,
}) => (
  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          backgroundColor: i < filled ? color : "transparent",
          border: `2px solid ${i < filled ? color : mutedColor}`,
        }}
      />
    ))}
  </div>
);
