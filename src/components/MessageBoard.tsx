import { useEffect, useMemo, useState, useRef, useLayoutEffect } from "react";
import { Message } from "@/services/messageService";
import { MessageSquare, AlertTriangle, Clock, Calendar } from "lucide-react";
import { formatDate, formatTime } from "@/lib/dateFormatter";

interface MessageBoardProps {
  messages: Message[];
}

function useFitText(content: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const fit = () => {
      el.style.fontSize = "";
      let size = parseFloat(getComputedStyle(el).fontSize) || 22;
      const min = 12;
      let guard = 0;
      while (size > min && box.scrollHeight > box.clientHeight && guard < 80) {
        size -= 1;
        el.style.fontSize = `${size}px`;
        guard += 1;
      }
    };
    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(box);
    if (document.fonts?.ready) {
      document.fonts.ready.then(fit).catch(() => void 0);
    }
    return () => ro.disconnect();
  }, [content]);
  return ref;
}

export function MessageBoard({ messages }: MessageBoardProps) {
  const [currentType, setCurrentType] = useState<"urgent" | "normal">("normal");
  const [normalIndex, setNormalIndex] = useState(0);
  const [urgentIndex, setUrgentIndex] = useState(0);
  const progressDurationMs = currentType === "urgent" ? 30000 : 15000;

  // Filtra apenas mensagens ativas
  const activeMessages = useMemo(
    () => messages.filter((m) => m.active !== false),
    [messages],
  );

  const urgentMessages = useMemo(
    () => activeMessages.filter((m) => m.priority === "urgent"),
    [activeMessages],
  );
  const normalMessages = useMemo(
    () => activeMessages.filter((m) => m.priority === "normal"),
    [activeMessages],
  );

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const hasUrgent = urgentMessages.length > 0;
    const hasNormal = normalMessages.length > 0;

    const scheduleNext = () => {
      if (!hasUrgent && !hasNormal) return;

      // Se há aviso urgente, ele fica fixo - não alterna
      if (hasUrgent) {
        // Apenas rotaciona entre urgentes se houver mais de um
        if (urgentMessages.length > 1) {
          timeoutId = setTimeout(() => {
            setUrgentIndex((prev) => (prev + 1) % urgentMessages.length);
          }, 30000);
        }
        return;
      }

      // Só exibe avisos normais se não houver urgentes
      if (hasNormal && normalMessages.length > 1) {
        timeoutId = setTimeout(() => {
          setNormalIndex((prev) => (prev + 1) % normalMessages.length);
        }, 15000);
      }
    };

    scheduleNext();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    currentType,
    normalMessages.length,
    urgentMessages.length,
    urgentIndex,
    normalIndex,
  ]);

  useEffect(() => {
    // Aviso urgente tem prioridade total - fica fixo até ser removido
    if (urgentMessages.length > 0) {
      setCurrentType("urgent");
      return;
    }
    // Só mostra normais quando não há urgentes
    if (normalMessages.length > 0) {
      setCurrentType("normal");
    }
  }, [normalMessages.length, urgentMessages.length]);

  useEffect(() => {
    if (normalMessages.length > 0 && normalIndex >= normalMessages.length) {
      setNormalIndex(0);
    }
    if (urgentMessages.length > 0 && urgentIndex >= urgentMessages.length) {
      setUrgentIndex(0);
    }
  }, [normalIndex, urgentIndex, normalMessages.length, urgentMessages.length]);

  const progressStyle = {
    "--message-progress-duration": `${progressDurationMs}ms`,
  } as React.CSSProperties;

  const currentMessage =
    currentType === "urgent"
      ? urgentMessages[urgentIndex]
      : normalMessages[normalIndex];

  if (!currentMessage) {
    return (
      <div className="h-full flex items-center justify-center text-white/70">
        <div className="text-center">
          <MessageSquare className="w-20 h-20 mx-auto mb-4 opacity-60" />
          <p className="text-fs-subtitle text-white/75">Nenhum aviso no momento</p>
        </div>
      </div>
    );
  }

  const isUrgent = currentType === "urgent";

  return (
    <div className="h-full flex flex-col overflow-hidden text-white">
      {isUrgent ? (
        <UrgentCard
          message={currentMessage}
          index={urgentIndex}
          total={urgentMessages.length}
        />
      ) : (
        <NormalCard
          message={currentMessage}
          index={normalIndex}
          total={normalMessages.length}
        />
      )}

      {/* Progress bar */}
      {((isUrgent && urgentMessages.length > 1) ||
        (!isUrgent && normalMessages.length > 1)) && (
        <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden flex-shrink-0">
          <div
            key={`${currentType}-${isUrgent ? urgentIndex : normalIndex}`}
            className={`message-progress-bar h-full ${isUrgent ? "bg-white/50" : "bg-orange-500"}`}
            style={progressStyle}
          />
        </div>
      )}
    </div>
  );
}

/* ── Data/hora de publicação (inline no cabeçalho) ── */
function HeaderDateTime({
  createdAt,
  variant,
}: {
  createdAt: string;
  variant: "normal" | "urgent";
}) {
  const colorClass =
    variant === "urgent" ? "text-red-100/90" : "text-white/75";

  return (
    <div className={`flex items-center gap-1.5 ${colorClass} flex-shrink-0`}>
      <Calendar className="w-4 h-4 flex-shrink-0" />
      <span className="msg-meta-text whitespace-nowrap">
        {formatDate(createdAt)}
      </span>
      <span className="opacity-40 px-0.5">·</span>
      <Clock className="w-4 h-4 flex-shrink-0" />
      <span className="msg-meta-text whitespace-nowrap">
        {formatTime(createdAt)}
      </span>
    </div>
  );
}

/* ── Card de mensagem normal ── */
function NormalCard({
  message,
  index = 0,
  total = 1,
}: {
  message: Message;
  index?: number;
  total?: number;
}) {
  const contentRef = useFitText(message.content);
  return (
    <div className="msg-card h-full flex flex-col rounded-2xl border border-white/10 bg-slate-800/40 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-orange-500/25 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-orange-300" />
          </div>
          <span className="text-fs-meta font-bold uppercase tracking-widest text-orange-300 truncate">
            Aviso do síndico
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {message.createdAt && (
            <HeaderDateTime createdAt={message.createdAt} variant="normal" />
          )}
          {total > 1 && (
            <span className="text-fs-meta text-white/70 tabular-nums font-medium">
              {index + 1}/{total}
            </span>
          )}
        </div>
      </div>

      <div className="mx-6 h-px bg-white/10 flex-shrink-0" />

      {message.title && (
        <h2 className="msg-title px-6 pt-5 pb-3 flex-shrink-0">
          {message.title}
        </h2>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        <div
          ref={contentRef}
          className="msg-content msg-body"
          dangerouslySetInnerHTML={{ __html: message.content }}
        />
      </div>
    </div>
  );
}

/* ── Card de mensagem urgente ── */
function UrgentCard({
  message,
  index = 0,
  total = 1,
}: {
  message: Message;
  index?: number;
  total?: number;
}) {
  const contentRef = useFitText(message.content);
  return (
    <div className="msg-card msg-card--urgent h-full flex flex-col rounded-2xl border-2 border-red-500 bg-red-950/85 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-red-500/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-200" />
          </div>
          <span className="text-fs-meta font-extrabold uppercase tracking-widest text-red-200 truncate">
            Urgente
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {message.createdAt && (
            <HeaderDateTime createdAt={message.createdAt} variant="urgent" />
          )}
          {total > 1 && (
            <span className="text-fs-meta text-red-100/80 tabular-nums font-medium">
              {index + 1}/{total}
            </span>
          )}
        </div>
      </div>

      <div className="mx-6 h-px bg-red-400/25 flex-shrink-0" />

      {message.title && (
        <h2 className="msg-title px-6 pt-5 pb-3 flex-shrink-0">
          {message.title}
        </h2>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        <div
          ref={contentRef}
          className="msg-content msg-body text-white"
          dangerouslySetInnerHTML={{ __html: message.content }}
        />
      </div>
    </div>
  );
}
