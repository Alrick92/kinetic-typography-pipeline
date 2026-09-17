import React from "react";
import { AbsoluteFill } from "remotion";

export const GradientBackground: React.FC<{ from: string; to: string; angle: number }> = ({ from, to, angle }) => (
  <AbsoluteFill style={{ background: `linear-gradient(${angle}deg, ${from}, ${to})` }} />
);
