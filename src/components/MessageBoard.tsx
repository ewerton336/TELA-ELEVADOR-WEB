import { useEffect, useMemo, useState } from "react";
import { Message } from "@/services/messageService";
import { MessageSquare, AlertTriangle, Clock } from "lucide-react";

interface MessageBoardProps {
  messages: Message[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
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

  // Se há mensagens urgentes, mostra layout com urgentes em destaque
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
        <MessageCardLarge
          message={currentMessage}
          index={normalIndex}
          total={normalMessages.length}
        />
      )}

      {/* Progress bar */}
      {((isUrgent && urgentMessages.length > 1) ||
        (!isUrgent && normalMessages.length > 1)) && (
        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden flex-shrink-0">
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

// Componente de card de mensagem (grande - fullscreen)
function MessageCardLarge({
  message,
  index = 0,
  total = 1,
}: {
  message: Message;
  index?: number;
  total?: number;
}) {
  return (
    <div className="h-full p-6 flex flex-col bg-gradient-to-br from-slate-800/50 to-slate-900/30 rounded-2xl border border-white/10">
      <div className="flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-orange-300" />
          <span className="text-xs bg-white/10 text-orange-100 px-3 py-1 rounded-full font-medium border border-white/20">
            Aviso do síndico
          </span>
        </div>
        <span className="text-xs text-white/60">
          {index + 1} / {total}
        </span>
      </div>
      <h2 className="text-3xl text-white mt-4 leading-tight font-bold flex-shrink-0">
        {message.title}
      </h2>
      <div className="flex-1 overflow-y-auto mt-4">
        <div
          className="text-white/90 text-lg leading-relaxed"
          dangerouslySetInnerHTML={{ __html: message.content }}
        />
      </div>
      <div className="flex items-center gap-2 text-white/60 flex-shrink-0 mt-4">
        <Clock className="w-5 h-5" />
        <span className="text-sm">{formatDate(message.createdAt)}</span>
      </div>
    </div>
  );
}

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
    <div className="h-full overflow-hidden border border-white/20 bg-gradient-to-br from-red-700 to-orange-600 rounded-2xl shadow-xl p-6 flex flex-col text-white">
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-white" />
          <span className="text-sm bg-black/30 text-white px-3 py-1 rounded-full font-semibold">
            URGENTE
          </span>
        </div>
        <span className="text-xs text-white/60">
          {index + 1} / {total}
        </span>
      </div>
      <h3 className="text-3xl mt-3 leading-tight font-bold flex-shrink-0 drop-shadow">
        {message.title}
      </h3>
      <div className="flex-1 overflow-y-auto mt-4">
        <div
          className="text-lg leading-relaxed text-white/95"
          dangerouslySetInnerHTML={{ __html: message.content }}
        />
      </div>
      <div className="flex items-center gap-2 text-white/80 flex-shrink-0 mt-4">
        <Clock className="w-4 h-4" />
        <span className="text-sm">{formatDate(message.createdAt)}</span>
      </div>
    </div>
  );
}
