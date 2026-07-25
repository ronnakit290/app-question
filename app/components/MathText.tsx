"use client";

import { useMemo } from "react";
import katex from "katex";

/**
 * เรนเดอร์ข้อความที่ผสมสูตรคณิต/วิทยาศาสตร์
 *
 * รองรับ
 *  - `$...$`  และ `\(...\)`  → inline math
 *  - `$$...$$` และ `\[...\]` → display math (บล็อกกลาง)
 *  - `**ตัวหนา**` และ `` `code` `` เล็กๆ น้อยๆ
 *  - ตัวห้อย/ตัวยกแบบง่ายนอกโหมดคณิต เช่น `H_2O`, `10^3`, `x^{2n}`
 *  - เศษส่วนแบบ `1/2` ที่เขียนใน math mode จะได้ \frac อยู่แล้ว
 */

type Token =
  | { type: "text"; value: string }
  | { type: "math"; value: string; display: boolean };

const MATH_PATTERN =
  /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;

  for (const m of input.matchAll(MATH_PATTERN)) {
    const index = m.index ?? 0;
    if (index > last) tokens.push({ type: "text", value: input.slice(last, index) });

    const display = m[1] !== undefined || m[2] !== undefined;
    const value = m[1] ?? m[2] ?? m[3] ?? m[4] ?? "";
    tokens.push({ type: "math", value: value.trim(), display });
    last = index + m[0].length;
  }

  if (last < input.length) tokens.push({ type: "text", value: input.slice(last) });
  return tokens;
}

/** แปลง `x^2` / `H_2O` ที่อยู่นอก math mode ให้เป็น sup/sub */
function renderPlain(text: string, keyBase: string) {
  const parts: React.ReactNode[] = [];
  const pattern = /([A-Za-z0-9)\]])([\^_])(\{[^}]{1,12}\}|[A-Za-z0-9+-]+)/g;
  let last = 0;
  let i = 0;

  for (const m of text.matchAll(pattern)) {
    const index = m.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const raw = m[3].startsWith("{") ? m[3].slice(1, -1) : m[3];
    parts.push(m[1]);
    parts.push(
      m[2] === "^" ? (
        <sup key={`${keyBase}-s${i}`} className="text-[0.72em]">
          {raw}
        </sup>
      ) : (
        <sub key={`${keyBase}-s${i}`} className="text-[0.72em]">
          {raw}
        </sub>
      ),
    );
    last = index + m[0].length;
    i++;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

export default function MathText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const nodes = useMemo(() => {
    const tokens = tokenize(children ?? "");

    return tokens.map((t, i) => {
      if (t.type === "math") {
        let html: string;
        try {
          html = katex.renderToString(t.value, {
            displayMode: t.display,
            throwOnError: false,
            strict: false,
            output: "htmlAndMathml",
            trust: false,
          });
        } catch {
          return <span key={i}>{t.value}</span>;
        }
        return (
          <span
            key={i}
            className={t.display ? "my-2 block text-center" : "inline-block"}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      // ตัวหนา + inline code แบบเบาๆ แล้วค่อยจัดการ sup/sub
      const chunks = t.value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
      return (
        <span key={i}>
          {chunks.map((c, j) => {
            if (c.startsWith("**") && c.endsWith("**"))
              return (
                <strong key={j} className="font-semibold">
                  {renderPlain(c.slice(2, -2), `${i}-${j}`)}
                </strong>
              );
            if (c.startsWith("`") && c.endsWith("`"))
              return (
                <code
                  key={j}
                  className="rounded bg-black/[0.05] px-1 py-0.5 font-mono text-[0.9em]"
                >
                  {c.slice(1, -1)}
                </code>
              );
            return <span key={j}>{renderPlain(c, `${i}-${j}`)}</span>;
          })}
        </span>
      );
    });
  }, [children]);

  return <span className={className}>{nodes}</span>;
}
