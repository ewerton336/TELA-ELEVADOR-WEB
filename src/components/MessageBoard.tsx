import { useEffect, useMemo, useState } from "react";
import { Message } from "@/services/messageService";
import { MessageSquare, AlertTriangle, Clock, Calendar } from "lucide-react";

interface MessageBoardProps {
  messages: Message[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
      <div className="h-full flex items-center justify-center text-white/60">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum aviso no momento</p>
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

/* ── Bloco de metadados (data/hora) ── */
function MetaBlock({
  createdAt,
  variant,
}: {
  createdAt: string;
  variant: "normal" | "urgent";
}) {
  const colorClass =
    variant === "urgent"
      ? "text-red-200/70 bg-red-500/10 border-red-400/15"
      : "text-white/55 bg-white/5 border-white/10";

  return (
    <div
      className={`msg-meta-block flex items-center gap-3 px-4 py-2.5 mx-6 rounded-lg border ${colorClass} flex-shrink-0`}
    >
      <div className="flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-xs font-medium">{formatDate(createdAt)}</span>
      </div>
      <div className="w-px h-3 bg-current opacity-25" />
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-xs font-medium">{formatTime(createdAt)}</span>
      </div>
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
  return (
    <div className="msg-card h-full flex flex-col rounded-2xl border border-white/10 bg-slate-800/40 overflow-hidden">
      {/* Bloco 1 — Tipo + contador */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-orange-300">
            Aviso do síndico
          </span>
        </div>
        {total > 1 && (
          <span className="text-xs text-white/40 tabular-nums">
            {index + 1}/{total}
          </span>
        )}
      </div>

      {/* Separador */}
      <div className="mx-6 h-px bg-white/8 flex-shrink-0" />

      {/* Bloco 2 — Título */}
      {message.title && (
        <h2 className="text-[1.4rem] font-bold leading-tight text-white px-6 pt-4 pb-1 flex-shrink-0">
          {message.title}
        </h2>
      )}

      {/* Bloco 3 — Data e hora */}
      {message.createdAt && (
        <div className="pt-2 pb-3 flex-shrink-0">
          <MetaBlock createdAt={message.createdAt} variant="normal" />
        </div>
      )}

      {/* Bloco 4 — Conteúdo */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        <div
          className="msg-content text-white/75 text-base sm:text-lg leading-relaxed"
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
  return (
    <div className="msg-card msg-card--urgent h-full flex flex-col rounded-2xl border-2 border-red-500/50 bg-red-950/80 overflow-hidden">
      {/* Bloco 1 — Badge urgente + contador */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-500/25 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-300" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-red-300">
            Urgente
          </span>
        </div>
        {total > 1 && (
          <span className="text-xs text-white/40 tabular-nums">
            {index + 1}/{total}
          </span>
        )}
      </div>

      {/* Separador */}
      <div className="mx-6 h-px bg-red-400/15 flex-shrink-0" />

      {/* Bloco 2 — Título */}
      {message.title && (
        <h2 className="text-[1.4rem] font-bold leading-tight text-white px-6 pt-4 pb-1 flex-shrink-0">
          {message.title}
        </h2>
      )}

      {/* Bloco 3 — Data e hora */}
      {message.createdAt && (
        <div className="pt-2 pb-3 flex-shrink-0">
          <MetaBlock createdAt={message.createdAt} variant="urgent" />
        </div>
      )}

      {/* Bloco 4 — Conteúdo */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        <div
          className="msg-content text-white/85 text-base sm:text-lg leading-relaxed"
          dangerouslySetInnerHTML={{ __html: message.content }}
        />
      </div>
    </div>
  );
}
