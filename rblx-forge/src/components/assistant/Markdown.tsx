// Markdown del chat: GFM completo + resaltado real (highlight.js) + copiar.
// Sin HTML crudo (react-markdown lo escapa por defecto): seguro por diseño.
import { memo, useMemo, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js/lib/core';
import lua from 'highlight.js/lib/languages/lua';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import powershell from 'highlight.js/lib/languages/powershell';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';
import ini from 'highlight.js/lib/languages/ini';
import diff from 'highlight.js/lib/languages/diff';
import { openUrl } from '@tauri-apps/plugin-opener';

hljs.registerLanguage('lua', lua);
hljs.registerLanguage('luau', lua);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('powershell', powershell);
hljs.registerLanguage('ps1', powershell);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('ini', ini);
hljs.registerLanguage('toml', ini);
hljs.registerLanguage('diff', diff);

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlight(code: string, lang: string | null): string {
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    }
  } catch {
    /* cae a texto plano */
  }
  return escapeHtml(code);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

function CopyButton({ text, title }: { text: string; title: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        const done = await copyText(text);
        setOk(done);
        if (done) setTimeout(() => setOk(false), 1400);
      }}
      title={title}
      className="rounded border border-forge-border-soft px-1.5 py-0.5 text-[11px] text-forge-faint transition-colors hover:border-forge-accent-dim hover:text-forge-text"
    >
      {ok ? '✓ copiado' : '⧉ copiar'}
    </button>
  );
}

function CodeBlock({ lang, code }: { lang: string | null; code: string }) {
  const html = useMemo(() => highlight(code.replace(/\n$/, ''), lang), [code, lang]);
  return (
    <div className="my-2 overflow-hidden rounded-lg border border-forge-border bg-forge-bg">
      <div className="flex items-center gap-2 border-b border-forge-border-soft bg-forge-panel px-2.5 py-1">
        <span className="mono text-[10px] uppercase tracking-wide text-forge-faint">{lang || 'código'}</span>
        <span className="ml-auto"><CopyButton text={code.replace(/\n$/, '')} title="Copiar bloque de código" /></span>
      </div>
      <pre className="overflow-x-auto p-2.5 text-[12px] leading-relaxed">
        <code className="mono hljs" dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

interface CodeProps {
  node?: unknown;
  className?: string;
  children?: ReactNode;
  inline?: boolean;
}

function Code({ className, children }: CodeProps) {
  const raw = String(children ?? '');
  const m = /language-([\w+-]+)/.exec(className || '');
  if (!m) {
    return <code className="mono rounded bg-forge-panel3 px-1 py-0.5 text-[12px] text-forge-accent">{children}</code>;
  }
  return <CodeBlock lang={m[1].toLowerCase()} code={raw} />;
}

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="md-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: Code as never,
          pre: ({ children }: { children?: ReactNode }) => <>{children}</>,
          a: ({ href, children }: { href?: string; children?: ReactNode }) => (
            <a
              href={href}
              title={href}
              className="text-forge-info underline decoration-forge-info/40 underline-offset-2 hover:decoration-forge-info"
              onClick={(e) => {
                if (href && /^https?:\/\//i.test(href)) {
                  e.preventDefault();
                  openUrl(href).catch(() => {});
                }
              }}
            >
              {children}
            </a>
          ),
          table: ({ children }: { children?: ReactNode }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-forge-border">
              <table className="w-full border-collapse text-[12.5px]">{children}</table>
            </div>
          ),
          th: ({ children }: { children?: ReactNode }) => (
            <th className="border-b border-forge-border bg-forge-panel px-2.5 py-1.5 text-left font-bold">{children}</th>
          ),
          td: ({ children }: { children?: ReactNode }) => (
            <td className="border-b border-forge-border-soft px-2.5 py-1.5 align-top">{children}</td>
          ),
          blockquote: ({ children }: { children?: ReactNode }) => (
            <blockquote className="my-2 border-l-2 border-forge-accent-dim pl-3 text-forge-muted">{children}</blockquote>
          ),
          h1: ({ children }: { children?: ReactNode }) => <h1 className="mb-1.5 mt-3 text-[16px] font-extrabold">{children}</h1>,
          h2: ({ children }: { children?: ReactNode }) => <h1 className="mb-1.5 mt-3 text-[15px] font-extrabold">{children}</h1>,
          h3: ({ children }: { children?: ReactNode }) => <h3 className="mb-1 mt-2.5 text-[13.5px] font-bold">{children}</h3>,
          h4: ({ children }: { children?: ReactNode }) => <h4 className="mb-1 mt-2 text-[12.5px] font-bold">{children}</h4>,
          ul: ({ children }: { children?: ReactNode }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>,
          ol: ({ children }: { children?: ReactNode }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
          p: ({ children }: { children?: ReactNode }) => <p className="my-1.5 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
          hr: () => <hr className="my-2.5 border-forge-border-soft" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});
