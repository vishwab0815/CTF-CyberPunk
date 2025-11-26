"use client";

import React from "react";

export default function LevelCard({ children }) {
  return (
    <div className="relative bg-black/50 border border-primary/25 backdrop-blur-3xl rounded-3xl shadow-2xl p-6 md:p-10 overflow-hidden">
      {children}
    </div>
  );
}
