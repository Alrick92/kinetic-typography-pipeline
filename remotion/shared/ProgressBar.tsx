import React from "react";

export const ProgressBar: React.FC<{ progress: number; color: string; trackColor: string; width: number }> = ({
  progress,
  color,
  trackColor,
  width,
}) => (
  <div style={{ width, height: 10, borderRadius: 6, border: `2px solid ${trackColor}`, overflow: "hidden" }}>
    <div
      style={{
        width: `${Math.min(Math.max(progress, 0), 1) * 100}%`,
        height: "100%",
        backgroundColor: color,
      }}
    />
  </div>
);
