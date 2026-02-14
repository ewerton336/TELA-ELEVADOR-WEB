import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
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
      <div className="flex items-center justify-between flex-shrink-0 mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/10 border border-white/20">
            <MessageSquare className="w-5 h-5 text-orange-300" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-white">
              Avisos do Condomínio
            </h2>
            <p className="text-xs text-white/60 leading-tight">
              {isUrgent ? "Urgente" : "Aviso"}
            </p>
          </div>
        </div>
        <div className="text-white/50 text-sm">
          {(isUrgent ? urgentIndex : normalIndex) + 1} /{" "}
          {isUrgent ? urgentMessages.length : normalMessages.length}
        </div>
      </div>

      {isUrgent ? (
        <UrgentCard message={currentMessage} />
      ) : (
        <MessageCardLarge message={currentMessage} />
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
function MessageCardLarge({ message }: { message: Message }) {
  return (
    <Card className="h-full overflow-hidden bg-white/5 border border-white/15 shadow-lg">
      <div className="h-full p-7 flex flex-col">
        <div className="flex items-center gap-2 flex-shrink-0">
          <MessageSquare className="w-6 h-6 text-orange-300" />
          <span className="text-xs bg-white/10 text-orange-100 px-3 py-1 rounded-full font-medium border border-white/20">
            Aviso do síndico
          </span>
        </div>
        <h2 className="text-2xl text-white mt-4 leading-tight font-semibold flex-shrink-0 line-clamp-2">
          {message.title}
        </h2>
        <div className="flex-1 overflow-hidden">
          <div
            className="text-white/90 text-lg leading-relaxed line-clamp-[20]"
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        </div>
        <div className="flex items-center gap-2 text-white/60 flex-shrink-0">
          <Clock className="w-5 h-5" />
          <span className="text-base">{formatDate(message.createdAt)}</span>
        </div>
      </div>
    </Card>
  );
}

function UrgentCard({ message }: { message: Message }) {
  return (
    <Card className="h-full overflow-hidden border border-white/20 bg-gradient-to-br from-red-700 to-orange-600 shadow-xl">
      <div className="h-full p-6 flex flex-col text-white">
        <div className="flex items-center gap-3 flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-white" />
          <span className="text-sm bg-black/30 text-white px-3 py-1 rounded-full font-semibold">
            URGENTE
          </span>
        </div>
        <h3 className="text-2xl mt-3 leading-tight font-semibold flex-shrink-0 drop-shadow line-clamp-2">
          {message.title}
        </h3>
        <div className="flex-1 overflow-hidden">
          <div
            className="text-lg leading-relaxed text-white/90 line-clamp-[20]"
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        </div>
        <div className="flex items-center gap-2 text-white/80 flex-shrink-0">
          <Clock className="w-4 h-4" />
          <span className="text-sm">{formatDate(message.createdAt)}</span>
        </div>
      </div>
    </Card>
  );
}
