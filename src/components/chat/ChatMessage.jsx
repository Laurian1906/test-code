import PropTypes from "prop-types";
import { useState } from "react";
import {
  MessageCircle,
  User,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Copy,
  Share2,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function ChatMessage({ message, isUser, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: message.content,
        });
      } catch (error) {
        console.error("Failed to share:", error);
      }
    } else {
      handleCopy();
    }
  };

  const handleFeedback = (type) => {
    setFeedback(type === feedback ? null : type);
  };

  return (
    <div
      className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"} mb-6`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-gray-200" : "bg-purple-500"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-gray-600" />
        ) : (
          <MessageCircle className="w-4 h-4 text-white" />
        )}
      </div>

      <div
        className={`flex-1 ${
          isUser ? "flex flex-col items-end" : "flex flex-col items-start"
        }`}
      >
        {/* Message Bubble and Actions Container */}
        <div className="inline-block max-w-2xl">
          {/* Message Bubble */}
          <div
            className={`${
              isUser
                ? "bg-blue-500 text-white rounded-2xl rounded-tr-sm"
                : "bg-white text-gray-900 rounded-2xl rounded-tl-sm border border-gray-200"
            } px-4 py-3`}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>

          {/* Action Buttons - only for bot messages */}
          {!isUser && (
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${
                    feedback === "like" ? "bg-gray-100" : ""
                  }`}
                  onClick={() => handleFeedback("like")}
                >
                  <ThumbsUp
                    className={`w-4 h-4 ${
                      feedback === "like" ? "text-blue-600" : "text-gray-500"
                    }`}
                  />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${
                    feedback === "dislike" ? "bg-gray-100" : ""
                  }`}
                  onClick={() => handleFeedback("dislike")}
                >
                  <ThumbsDown
                    className={`w-4 h-4 ${
                      feedback === "dislike" ? "text-blue-600" : "text-gray-500"
                    }`}
                  />
                </Button>

                {onRegenerate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onRegenerate}
                  >
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-gray-500 hover:text-gray-700"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span className="text-xs">Copiat</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-xs">Copy</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-gray-500 hover:text-gray-700"
                  onClick={handleShare}
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-xs">Share</span>
                </Button>
              </div>
            </div>
          )}

          {/* Timestamp */}
          {message.timestamp && (
            <p className="text-xs text-gray-400 mt-1">
              {format(new Date(message.timestamp), "HH:mm")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

ChatMessage.propTypes = {
  message: PropTypes.shape({
    content: PropTypes.string.isRequired,
    timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  isUser: PropTypes.bool,
  onRegenerate: PropTypes.func,
};
