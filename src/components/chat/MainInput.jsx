import { useState } from "react";
import PropTypes from "prop-types";
import { Textarea } from "@/components/ui/textarea";
import { Send, Plus } from "lucide-react";

export default function MainInput({
  onSubmit,
  onNewChat,
  placeholder = "Întreabă orice...",
}) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSubmit(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full space-y-3">
      {onNewChat && (
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Chat Nou</span>
        </button>
      )}

      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 pr-12 focus-visible:ring-1 focus-visible:ring-gray-400 min-h-[56px] max-h-32 bg-white"
            rows={1}
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="absolute right-3 bottom-3 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </form>

      <p className="text-xs text-gray-400 text-center">
        Feedback-ul tău poate comite greșeli. Te rog să verifici răspunsurile
        importante.
      </p>
    </div>
  );
}

MainInput.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onNewChat: PropTypes.func,
  placeholder: PropTypes.string,
};
