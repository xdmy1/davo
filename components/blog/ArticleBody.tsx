import { Fragment, type ReactNode } from "react";
import { Info, TriangleAlert, ShieldAlert, CheckCircle2 } from "lucide-react";
import type { Block } from "@/lib/blog/types";

// Tiny inline formatter: supports **bold** and [label](url). Kept intentionally
// small — article copy lives in data files, not free-form user input.
function renderInline(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold text-[color:var(--navy-900)]">
          {match[1]}
        </strong>
      );
    } else if (match[2] !== undefined && match[3] !== undefined) {
      nodes.push(
        <a
          key={key++}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[color:var(--red-500)] underline underline-offset-2 hover:text-[color:var(--red-600)]"
        >
          {match[2]}
        </a>
      );
    }
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.map((n, i) => <Fragment key={i}>{n}</Fragment>);
}

const calloutStyles = {
  info: {
    icon: Info,
    wrap: "border-[color:var(--navy-100)] bg-[color:var(--navy-50)]",
    iconColor: "text-[color:var(--navy-700)]",
  },
  warning: {
    icon: TriangleAlert,
    wrap: "border-[#f4d9a8] bg-[#fef6e7]",
    iconColor: "text-[color:var(--warning)]",
  },
  danger: {
    icon: ShieldAlert,
    wrap: "border-[color:var(--red-100,#f7cdd1)] bg-[color:var(--red-50)]",
    iconColor: "text-[color:var(--red-500)]",
  },
  success: {
    icon: CheckCircle2,
    wrap: "border-[#bceadd] bg-[color:var(--success-soft)]",
    iconColor: "text-[color:var(--success)]",
  },
} as const;

export default function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p
                key={i}
                className="text-[17px] leading-[1.75] text-[color:var(--ink-700)]"
              >
                {renderInline(block.text)}
              </p>
            );

          case "h2":
            return (
              <h2
                key={i}
                id={block.id}
                className="scroll-mt-28 pt-6 font-[family-name:var(--font-montserrat)] text-2xl md:text-[28px] font-extrabold tracking-tight text-[color:var(--navy-900)]"
              >
                <span className="mr-3 inline-block h-6 w-1.5 translate-y-0.5 rounded-full bg-[color:var(--red-500)] align-middle" />
                {block.text}
              </h2>
            );

          case "h3":
            return (
              <h3
                key={i}
                className="pt-2 font-[family-name:var(--font-montserrat)] text-lg md:text-xl font-bold text-[color:var(--navy-900)]"
              >
                {block.text}
              </h3>
            );

          case "ul":
            return (
              <ul key={i} className="space-y-2.5">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-3 text-[16px] leading-[1.7] text-[color:var(--ink-700)]">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--red-500)]" />
                    <span>{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            );

          case "ol":
            return (
              <ol key={i} className="space-y-2.5">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-3 text-[16px] leading-[1.7] text-[color:var(--ink-700)]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--navy-50)] text-xs font-bold text-[color:var(--navy-900)]">
                      {j + 1}
                    </span>
                    <span className="pt-0.5">{renderInline(item)}</span>
                  </li>
                ))}
              </ol>
            );

          case "quote":
            return (
              <blockquote
                key={i}
                className="border-l-4 border-[color:var(--red-500)] bg-[color:var(--ink-50)] py-4 pl-5 pr-4 text-lg italic text-[color:var(--navy-900)]"
              >
                {renderInline(block.text)}
                {block.cite && (
                  <cite className="mt-2 block text-sm not-italic text-[color:var(--ink-500)]">
                    — {block.cite}
                  </cite>
                )}
              </blockquote>
            );

          case "callout": {
            const s = calloutStyles[block.variant];
            const Icon = s.icon;
            return (
              <div key={i} className={`rounded-2xl border p-5 md:p-6 ${s.wrap}`}>
                <div className="flex gap-3.5">
                  <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.iconColor}`} />
                  <div>
                    {block.title && (
                      <div className="font-[family-name:var(--font-montserrat)] font-bold text-[color:var(--navy-900)]">
                        {block.title}
                      </div>
                    )}
                    <p className="mt-1 text-[15px] leading-relaxed text-[color:var(--ink-700)]">
                      {renderInline(block.text)}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          case "table":
            return (
              <div
                key={i}
                className="overflow-x-auto rounded-2xl border border-[color:var(--ink-200)]"
              >
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[color:var(--navy-900)] text-white">
                      {block.head.map((h, j) => (
                        <th
                          key={j}
                          className="px-4 py-3 font-[family-name:var(--font-montserrat)] font-semibold whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr
                        key={r}
                        className={r % 2 === 0 ? "bg-white" : "bg-[color:var(--ink-50)]"}
                      >
                        {row.map((cell, c) => (
                          <td
                            key={c}
                            className={`px-4 py-3 align-top text-[color:var(--ink-700)] ${
                              c === 0
                                ? "font-semibold text-[color:var(--navy-900)] whitespace-nowrap"
                                : ""
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case "stats":
            return (
              <div key={i} className="grid gap-3 sm:grid-cols-3">
                {block.items.map((stat, j) => (
                  <div
                    key={j}
                    className="rounded-2xl border border-[color:var(--ink-200)] bg-white p-5 text-center"
                  >
                    <div className="font-[family-name:var(--font-montserrat)] text-2xl md:text-[28px] font-extrabold text-[color:var(--red-500)]">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--ink-500)]">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
