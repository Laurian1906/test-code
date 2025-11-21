import PropTypes from "prop-types";
import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Loader2, X } from "lucide-react";

export default function ChatInput({
  onSend,
  disabled,
  onFileUpload,
  uploadedFiles,
  onRemoveFile,
}) {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      await onFileUpload(files);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {uploadedFiles && uploadedFiles.length > 0 && (
        <div className="px-6 pt-4">
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm"
              >
                <span className="text-gray-700 truncate max-w-40">
                  {file.name}
                </span>
                <button
                  onClick={() => onRemoveFile(index)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Întreabă orice..."
              disabled={disabled}
              className="resize-none border border-gray-300 rounded-lg pr-12 min-h-[56px] max-h-32 focus-visible:ring-1 focus-visible:ring-gray-400"
              rows={1}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              className="absolute right-3 bottom-3 p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : (
                <Paperclip className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </form>

      <div className="px-6 pb-4 text-center">
        <p className="text-xs text-gray-400">
          Feedback-ul tău poate comite greșeli. Te rog să verifici răspunsurile
          importante.
        </p>
      </div>
    </div>
  );
}

ChatInput.propTypes = {
  onSend: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  onFileUpload: PropTypes.func,
  uploadedFiles: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
    })
  ),
  onRemoveFile: PropTypes.func,
};
