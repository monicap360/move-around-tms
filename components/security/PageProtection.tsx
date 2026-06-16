"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/* ── Routes that receive Phase 1 protection ── */
const PROTECTED_PREFIXES = [
  "/ronyx/owner-operators",
  "/ronyx/staff",
  "/ronyx/dispatch",
  "/ronyx/fast-scan",
  "/ronyx/payroll",
  "/ronyx/billing",
  "/ronyx/backup",
  "/ronyx/reports",
];

/* ── Targets where copy/select/right-click should still work ── */
function isAllowedTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof Node)) return false;
  let node: Node | null = el instanceof Element ? el : (el as Node).parentElement;
  while (node && node instanceof Element) {
    const tag = node.tagName.toLowerCase();
    if (["input","textarea","select"].includes(tag))   return true;
    if (node.hasAttribute("contenteditable"))           return true;
    if (node.classList.contains("allow-copy"))          return true;
    if (node.hasAttribute("data-allow-copy"))           return true;
    node = node.parentElement;
  }
  return false;
}

/* ════════════════════════════════════════════
   PageProtection Component
   Add to layout — reads NEXT_PUBLIC_ENABLE_PAGE_PROTECTION.
   If false/missing, renders nothing.
════════════════════════════════════════════ */
export default function PageProtection() {
  const pathname    = usePathname();
  const lastLogRef  = useRef<Record<string, number>>({});
  const [name, setName] = useState("Authorized Staff");

  const enabled     = process.env.NEXT_PUBLIC_ENABLE_PAGE_PROTECTION === "true";
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p));
  const active      = enabled && isProtected;

  /* Read staff name from localStorage (set by Mission Start™) */
  useEffect(() => {
    const saved = typeof window !== "undefined"
      ? localStorage.getItem("missionstart_name")
      : null;
    if (saved) setName(saved);
  }, []);

  /* Add/remove body class so CSS can scope rules */
  useEffect(() => {
    if (active) {
      document.body.classList.add("page-protected");
    } else {
      document.body.classList.remove("page-protected");
    }
    return () => { document.body.classList.remove("page-protected"); };
  }, [active]);

  /* Event listeners */
  useEffect(() => {
    if (!active) return;

    function log(eventType: string) {
      const now = Date.now();
      if (now - (lastLogRef.current[eventType] || 0) < 2000) return; // 2s debounce per type
      lastLogRef.current[eventType] = now;
      fetch("/api/ronyx/protection-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventType,
          page_url:   pathname,
          staff_name: name,
          user_agent: navigator.userAgent.substring(0, 200),
        }),
      }).catch(() => {});
    }

    /* Right-click */
    function onContextMenu(e: MouseEvent) {
      if (isAllowedTarget(e.target)) return;
      e.preventDefault();
      log("right_click");
    }

    /* Keyboard shortcuts */
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) {
        if (e.key === "PrintScreen") log("printscreen_attempt");
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "p") {
        e.preventDefault(); log("print_attempt");
      } else if (k === "s") {
        e.preventDefault(); log("save_attempt");
      } else if (k === "u") {
        e.preventDefault(); log("view_source_attempt");
      } else if (k === "c" || k === "x") {
        if (!isAllowedTarget(e.target) && !isAllowedTarget(document.activeElement)) {
          e.preventDefault(); log("copy_attempt");
        }
      }
    }

    /* Copy event (catches toolbar Edit→Copy too) */
    function onCopy(e: ClipboardEvent) {
      if (isAllowedTarget(e.target) || isAllowedTarget(document.activeElement)) return;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const ancestor = sel.getRangeAt(0).commonAncestorContainer;
        if (isAllowedTarget(ancestor) || isAllowedTarget((ancestor as Node).parentElement)) return;
      }
      e.preventDefault();
      log("copy_attempt");
    }

    /* Image/element drag */
    function onDragStart(e: DragEvent) {
      if (isAllowedTarget(e.target)) return;
      e.preventDefault();
      log("drag_attempt");
    }

    /* Print — inject a blocking overlay, remove on afterprint */
    function onBeforePrint() {
      log("print");
      const blocker = document.createElement("div");
      blocker.id = "__tms_print_block__";
      blocker.setAttribute("style",
        "position:fixed;inset:0;background:#fff;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;"
      );
      blocker.innerHTML =
        `<div style="font-size:22px;font-weight:900;color:#0f172a;">MoveAround TMS — Protected Document</div>` +
        `<div style="font-size:14px;color:#475569;">Printing is not authorized for this page.</div>` +
        `<div style="font-size:12px;color:#94a3b8;">Staff: ${name} · ${new Date().toLocaleString()}</div>`;
      document.body.appendChild(blocker);

      function onAfterPrint() {
        document.getElementById("__tms_print_block__")?.remove();
        window.removeEventListener("afterprint", onAfterPrint);
      }
      window.addEventListener("afterprint", onAfterPrint);
    }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown",     onKeyDown);
    document.addEventListener("copy",        onCopy);
    document.addEventListener("dragstart",   onDragStart);
    window.addEventListener("beforeprint",   onBeforePrint);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown",     onKeyDown);
      document.removeEventListener("copy",        onCopy);
      document.removeEventListener("dragstart",   onDragStart);
      window.removeEventListener("beforeprint",   onBeforePrint);
    };
  }, [active, name, pathname]);

  if (!active) return null;

  const today = new Date().toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });

  return (
    <>
      {/* Scoped CSS — applies only when .page-protected is on <body> */}
      <style>{`
        /* Disable text selection on layout (not in form elements) */
        .page-protected {
          -webkit-user-select: none;
          user-select: none;
        }
        /* Re-enable in interactive / copy-allowed elements */
        .page-protected input,
        .page-protected textarea,
        .page-protected select,
        .page-protected [contenteditable],
        .page-protected .allow-copy,
        .page-protected .allow-copy * {
          -webkit-user-select: text !important;
          user-select: text !important;
        }
        /* Disable image drag */
        .page-protected img {
          -webkit-user-drag: none;
          pointer-events: none;
        }
        /* Re-enable pointer on img inside links or buttons */
        .page-protected a img,
        .page-protected button img {
          pointer-events: auto;
        }
        /* Print guard */
        @media print {
          .page-protected body > *:not(#__tms_print_block__) {
            display: none !important;
          }
        }
      `}</style>

      {/* Watermark overlay — pointer-events:none so it never blocks clicks */}
      <div
        aria-hidden="true"
        style={{
          position:      "fixed",
          inset:         0,
          pointerEvents: "none",
          zIndex:        9997,
          overflow:      "hidden",
          userSelect:    "none",
          WebkitUserSelect: "none",
        }}
      >
        {/* Repeating diagonal watermark grid */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          style={{ position:"absolute", inset:0 }}
        >
          <defs>
            <pattern id="wm" x="0" y="0" width="320" height="160" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
              <text x="10"  y="36"  fontFamily="monospace" fontSize="9"  fontWeight="bold" fill="#0f172a" opacity="0.055" letterSpacing="1">MoveAround TMS — CONFIDENTIAL</text>
              <text x="10"  y="54"  fontFamily="monospace" fontSize="9"  fill="#0f172a" opacity="0.05">{name}</text>
              <text x="10"  y="72"  fontFamily="monospace" fontSize="8"  fill="#0f172a" opacity="0.04">{today}</text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wm)" />
        </svg>
      </div>
    </>
  );
}
