"use client";

import { useEffect } from "react";

/**
 * บนมือถือ เมื่อคีย์บอร์ดเด้งขึ้นมา `100dvh` ยังนับพื้นที่ที่คีย์บอร์ดบังอยู่
 * ทำให้ header ถูกดันหลุดจอ — เลยผูกความสูงจริงจาก visualViewport
 * ไว้ที่ CSS variable `--app-h` แล้วให้ layout ใช้ค่านั้นแทน
 */
export function useViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;

    const apply = () => {
      const h = vv?.height ?? window.innerHeight;
      root.style.setProperty("--app-h", `${Math.round(h)}px`);
      // ชดเชยกรณีหน้าจอถูกเลื่อนขึ้นตามคีย์บอร์ด (iOS)
      root.style.setProperty("--app-top", `${Math.round(vv?.offsetTop ?? 0)}px`);
    };

    apply();
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("orientationchange", apply);

    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("orientationchange", apply);
      root.style.removeProperty("--app-h");
      root.style.removeProperty("--app-top");
    };
  }, []);
}
