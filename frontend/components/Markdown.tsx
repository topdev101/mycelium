"use client";

import React from "react";

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];

  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(regex);
  parts.forEach((part, i) => {
    if (!part) return;
    if (part.startsWith("**") && part.endsWith("**")) {
      out.push(<strong key={`${keyPrefix}-b${i}`}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith("*") && part.endsWith("*")) {
      out.push(<em key={`${keyPrefix}-i${i}`}>{part.slice(1, -1)}</em>);
    } else {
      out.push(<React.Fragment key={`${keyPrefix}-t${i}`}>{part}</React.Fragment>);
    }
  });
  return out;
}

export function Markdown({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim().length > 0);

  return (
    <div className="rich">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => l.trim().startsWith("- "));
        const isLast = bi === blocks.length - 1;

        if (isList) {
          return (
            <ul key={`ul-${bi}`}>
              {lines.map((l, li) => (
                <li key={`li-${bi}-${li}`}>
                  {renderInline(l.trim().slice(2), `li-${bi}-${li}`)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`p-${bi}`} className={streaming && isLast ? "caret" : undefined}>
            {renderInline(block, `p-${bi}`)}
          </p>
        );
      })}
      {blocks.length === 0 && streaming && <p className="caret" />}
    </div>
  );
}
