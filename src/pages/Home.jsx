import { useState, useEffect, useRef, useCallback } from "react";
import {
  processChatConversation,
  generateSummary,
  sendReportToWebhook,
} from "@/api/n8nClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Menu,
  MessageCircle,
  LogIn,
  X,
  Search,
  Plus,
  MessageSquare,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

import CategoryCards from "../components/chat/CategoryCards";
import ChatMessage from "../components/chat/ChatMessage";
import MainInput from "../components/chat/MainInput";
import ConfirmationScreen from "../components/chat/ConfirmationScreen";
import SuccessScreen from "../components/chat/SuccessScreen";
import AuthDialog from "../components/chat/AuthDialog";
import UserMenu from "../components/chat/UserMenu";
import { useAuth } from "@/contexts/AuthContext.jsx";

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTicketId, setCurrentTicketId] = useState(null);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [conversationState, setConversationState] = useState("main");
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [ticketDetails, setTicketDetails] = useState({});
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [anonymousUserId, setAnonymousUserId] = useState(null);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();
  const { user: currentUser, logout: logoutUser } = useAuth();

  const generateAnonymousUserId = () =>
    `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const getOrCreateAnonymousUserId = useCallback(() => {
    let userId = anonymousUserId || sessionStorage.getItem("anonymous_user_id");
    if (!userId) {
      userId = generateAnonymousUserId();
      sessionStorage.setItem("anonymous_user_id", userId);
    }
    if (userId !== anonymousUserId) {
      setAnonymousUserId(userId);
    }
    return userId;
  }, [anonymousUserId]);

  const getReporterId = () => {
    if (currentUser) {
      return currentUser.id || currentUser.email || "authenticated_user";
    }
    return getOrCreateAnonymousUserId();
  };

  // Generate or retrieve anonymous user ID
  useEffect(() => {
    getOrCreateAnonymousUserId();
  }, [getOrCreateAnonymousUserId]);

  // Load tickets from localStorage for anonymous users
  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      // Load tickets from localStorage
      try {
        const storedTickets = localStorage.getItem("base44_tickets");
        if (storedTickets) {
          return JSON.parse(storedTickets);
        }
      } catch (error) {
        console.error("Error loading tickets from localStorage:", error);
      }
      return [];
    },
    enabled: true, // Enabled to load tickets from localStorage
  });

  // Create ticket mutation - saves to localStorage for anonymous users
  const createTicketMutation = useMutation({
    mutationFn: async (data) => {
      // Create a local ticket object
      const newTicket = {
        id: `ticket-${Date.now()}`,
        ...data,
        created_date: new Date().toISOString(),
      };

      // Save to localStorage
      try {
        const storedTickets = localStorage.getItem("base44_tickets");
        const tickets = storedTickets ? JSON.parse(storedTickets) : [];
        tickets.push(newTicket);
        localStorage.setItem("base44_tickets", JSON.stringify(tickets));
      } catch (error) {
        console.error("Error saving ticket to localStorage:", error);
      }

      return newTicket;
    },
    onSuccess: (newTicket) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setCurrentTicketId(newTicket.id);
      setCurrentTicket(newTicket);
    },
  });

  // Update ticket mutation - saves to localStorage for anonymous users
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Update local ticket object
      const updatedTicket = {
        id,
        ...data,
        updated_date: new Date().toISOString(),
      };

      // Save to localStorage
      try {
        const storedTickets = localStorage.getItem("base44_tickets");
        if (storedTickets) {
          const tickets = JSON.parse(storedTickets);
          const index = tickets.findIndex((t) => t.id === id);
          if (index !== -1) {
            // Merge existing ticket data with updates
            tickets[index] = { ...tickets[index], ...updatedTicket };
            localStorage.setItem("base44_tickets", JSON.stringify(tickets));
          } else {
            // If ticket doesn't exist, add it
            tickets.push(updatedTicket);
            localStorage.setItem("base44_tickets", JSON.stringify(tickets));
          }
        } else {
          // If no tickets exist, create new array
          localStorage.setItem(
            "base44_tickets",
            JSON.stringify([updatedTicket])
          );
        }
      } catch (error) {
        console.error("Error updating ticket in localStorage:", error);
      }

      return updatedTicket;
    },
    onSuccess: (updatedTicket) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setCurrentTicket(updatedTicket);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Filter tickets
  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to remove duplicates based on id
  const removeDuplicates = (tickets) => {
    const seen = new Set();
    return tickets.filter((ticket) => {
      const key =
        ticket.id ||
        `${ticket.created_date}-${ticket.category}-${ticket.description}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  const today = removeDuplicates(
    filteredTickets.filter((t) => {
      const created = new Date(t.created_date);
      const now = new Date();
      return created.toDateString() === now.toDateString();
    })
  );

  const older = removeDuplicates(
    filteredTickets.filter((t) => {
      const created = new Date(t.created_date);
      const now = new Date();
      return created.toDateString() !== now.toDateString();
    })
  );

  // Helper function to filter out error/fallback messages before sending to n8n
  const filterValidMessages = (messages) => {
    const errorMessages = [
      "Scuze, am întâmpinat o problemă. Te rog să încerci din nou.",
      "Scuze, nu am putut procesa răspunsul.",
    ];

    return messages.filter((msg) => {
      // Keep all user messages
      if (msg.role === "user") return true;
      // Filter out bot error messages
      if (msg.role === "bot" && errorMessages.includes(msg.content)) {
        return false;
      }
      // Keep all other bot messages
      return true;
    });
  };

  // Helper function for processing AI bot responses
  const finalizeTicketSubmission = async ({
    summaryOverride,
    conversationHistoryOverride,
    ticketDataOverride,
  } = {}) => {
    try {
      const finalMessages = conversationHistoryOverride || messages;
      const baseTicketData = {
        ...ticketDetails,
        ...(ticketDataOverride || {}),
      };
      const finalSummary =
        summaryOverride ??
        baseTicketData.summary ??
        ticketDetails.summary ??
        currentTicket?.summary ??
        "";

      const ticketData = {
        ...currentTicket,
        ...baseTicketData,
        summary: finalSummary,
        ticket_id: baseTicketData.ticket_id || currentTicket?.ticket_id || null,
        status: "finalizat",
        conversation_history: finalMessages,
        file_urls: uploadedFiles.map((f) => f.url),
      };

      if (currentTicketId) {
        await updateTicketMutation.mutateAsync({
          id: currentTicketId,
          data: ticketData,
        });
      }

      const reporterId = getReporterId();
      try {
        if (reporterId) {
          await sendReportToWebhook({
            ticketData,
            anonymousUserId: reporterId,
          });
        } else {
          console.warn(
            "⚠️ Could not determine reporter ID, skipping webhook submission."
          );
        }
      } catch (error) {
        console.error("Error sending report to webhook:", error);
      }

      // Clear tickets from localStorage only for anonymous sessions
      if (!currentUser && reporterId) {
        try {
          const storedTickets = localStorage.getItem("base44_tickets");
          if (storedTickets) {
            const tickets = JSON.parse(storedTickets);
            const filteredTickets = tickets.filter(
              (t) => t.id !== currentTicketId
            );
            localStorage.setItem(
              "base44_tickets",
              JSON.stringify(filteredTickets)
            );
            queryClient.invalidateQueries({ queryKey: ["tickets"] });
          }
        } catch (error) {
          console.error("Error clearing tickets from localStorage:", error);
        }
      }

      setCurrentTicket(ticketData);
      setMessages([]);
      setTicketDetails({});
      setUploadedFiles([]);
      setConversationState("success");
    } catch (error) {
      console.error("Error submitting ticket:", error);
      throw error;
    }
  };

  const _processAIBotResponse = async (conversationHistoryUpToUserMessage) => {
    setIsProcessing(true);
    try {
      console.log("💬 Processing chat conversation with n8n...");

      // Filter out error messages before sending to n8n
      const validHistory = filterValidMessages(
        conversationHistoryUpToUserMessage
      );
      console.log(
        "📝 Filtered conversation history (removed errors):",
        validHistory
      );

      // Extract latest user prompt to send to n8n
      const latestUserMessage = [...validHistory]
        .reverse()
        .find(
          (msg) =>
            msg.role === "user" &&
            typeof msg?.content === "string" &&
            msg.content.trim().length > 0
        );

      if (!latestUserMessage) {
        console.warn("⚠️ No valid user prompt found for n8n request");
        return;
      }

      const prompt = latestUserMessage.content.trim();
      console.log("📤 Sending prompt to n8n:", prompt);

      // Use n8n instead of Base44 for chat processing
      const aiResponse = await processChatConversation({
        prompt,
      });
      console.log("✅ Received response from n8n:", aiResponse);

      const newTicketData = {
        ...ticketDetails,
        ...(aiResponse.ticket || {}),
      };
      setTicketDetails(newTicketData);

      const hasTicketData =
        Object.keys(aiResponse.ticket || {}).length > 0 ||
        Object.keys(newTicketData).length > 0;
      const hasBotMessage =
        aiResponse.next_message && aiResponse.next_message.trim().length > 0;

      // If no valid message and no extracted data, don't proceed
      if (!hasTicketData && !hasBotMessage) {
        console.warn("⚠️ No valid data from n8n, skipping response");
        return;
      }

      if (aiResponse.next_message === "READY_FOR_CONFIRMATION") {
        const summary = await generateSummary();
        const confirmMsg = {
          role: "bot",
          content: `Perfect! Am înțeles feedback-ul tău. Te rog să verifici informațiile înainte de trimitere.`,
          timestamp: new Date().toISOString(),
        };
        const finalMessages = [
          ...conversationHistoryUpToUserMessage,
          confirmMsg,
        ];

        const updatedTicketData = {
          ...newTicketData,
          summary,
        };
        setTicketDetails(updatedTicketData);
        setMessages(finalMessages);

        if (currentTicketId) {
          await updateTicketMutation.mutateAsync({
            id: currentTicketId,
            data: {
              ...updatedTicketData,
              conversation_history: finalMessages,
              file_urls: uploadedFiles.map((f) => f.url),
            },
          });
        }
        setConversationState("confirmation");
      } else {
        // Only add bot message if there's actual content
        if (hasBotMessage) {
          const botMsg = {
            role: "bot",
            content: aiResponse.next_message,
            timestamp: new Date().toISOString(),
          };

          const finalMessages = [...conversationHistoryUpToUserMessage, botMsg];
          setMessages(finalMessages);

          if (currentTicketId) {
            await updateTicketMutation.mutateAsync({
              id: currentTicketId,
              data: {
                ...newTicketData,
                conversation_history: finalMessages,
              },
            });
          }
        }
        // If no message but we do have ticket data, persist it silently
        if (!hasBotMessage && hasTicketData && currentTicketId) {
          await updateTicketMutation.mutateAsync({
            id: currentTicketId,
            data: {
              ...newTicketData,
            },
          });
        }
      }
    } catch (error) {
      console.error("Error processing AI message:", error);
      const errorMsg = {
        role: "bot",
        content: "Scuze, am întâmpinat o problemă. Te rog să încerci din nou.",
        timestamp: new Date().toISOString(),
      };
      setMessages([...conversationHistoryUpToUserMessage, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const startNewConversation = async (initialMessage, category = null) => {
    setConversationState("chatting");

    const userMsg = {
      role: "user",
      content: initialMessage,
      timestamp: new Date().toISOString(),
    };

    // Set only user message - let LLM respond naturally
    setMessages([userMsg]);

    // Create ticket locally (will be migrated to backend)
    const ticketData = {
      conversation_history: [userMsg],
      status: "în_curs",
      is_anonymous: true, // Always anonymous for now
      description: initialMessage,
      category: category?.title || null,
    };

    createTicketMutation.mutate(ticketData);

    // Immediately process with AI to get natural response
    await _processAIBotResponse([userMsg]);
  };

  const handleCategorySelect = async (category) => {
    const initialMsg = `Vreau să raportez: ${category.title}`;
    startNewConversation(initialMsg, category);
  };

  const handleMainInputSubmit = async (message) => {
    startNewConversation(message);
  };

  const handleSendMessage = async (userMessageContent) => {
    if (isProcessing) return;

    const userMsg = {
      role: "user",
      content: userMessageContent,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    await _processAIBotResponse(updatedMessages);
  };

  const handleRegenerateMessage = async (messageIndex) => {
    if (isProcessing || messageIndex < 1) return;

    const botMessageToRegenerate = messages[messageIndex];
    if (!botMessageToRegenerate || botMessageToRegenerate.role !== "bot")
      return;

    const userMessageBeforeBot = messages[messageIndex - 1];
    if (!userMessageBeforeBot || userMessageBeforeBot.role !== "user") return;

    const conversationBaseForRegen = messages.slice(0, messageIndex);
    setMessages(conversationBaseForRegen);

    await _processAIBotResponse(conversationBaseForRegen);
  };

  // File upload functions - disabled for now (will be migrated to local storage)
  // These will be re-enabled when file upload is implemented
  // const handleFileUpload = async (files) => { ... }
  // const handleRemoveFile = (index) => { ... }

  const handleConfirmSubmit = async () => {
    await finalizeTicketSubmission();
  };

  const handleEditConfirmation = () => {
    setConversationState("chatting");
  };

  const handleNewChat = () => {
    setCurrentTicketId(null);
    setCurrentTicket(null);
    setMessages([]);
    setUploadedFiles([]);
    setTicketDetails({});
    setConversationState("main");
  };

  const handleSelectTicket = (ticketId) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket) {
      setCurrentTicketId(ticketId);
      setCurrentTicket(ticket);
      setMessages(ticket.conversation_history || []);
      setUploadedFiles(
        ticket.file_urls
          ? ticket.file_urls.map((url, i) => ({ name: `Fișier ${i + 1}`, url }))
          : []
      );
      setTicketDetails({
        category: ticket.category,
        subcategory: ticket.subcategory,
        severity: ticket.severity,
        description: ticket.description,
      });

      if (ticket.status === "finalizat") {
        setConversationState("success");
      } else {
        setConversationState("chatting");
      }

      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      {/* Chat History Sidebar - extensibil */}
      <div
        className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-72" : "w-0"
        } overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-200 mt-16">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Chat History
          </h2>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-gray-50 border-gray-200"
            />
          </div>

          <Button
            onClick={() => {
              handleNewChat();
              setSidebarOpen(false);
            }}
            className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Chat Nou
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {today.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
                  TODAY
                </h3>
                <div className="space-y-1">
                  {today.map((ticket, index) => {
                    // Generate stable unique key
                    const ticketKey = ticket.id
                      ? `today-${ticket.id}`
                      : `today-${index}-${
                          ticket.created_date ||
                          ticket.ticket_id ||
                          ticket.category ||
                          "unknown"
                        }`;

                    return (
                      <button
                        key={ticketKey}
                        onClick={() => handleSelectTicket(ticket.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          currentTicketId === ticket.id
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {ticket.category ||
                              ticket.description ||
                              "Conversație nouă"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {older.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
                  OLDER
                </h3>
                <div className="space-y-1">
                  {older.map((ticket, index) => {
                    // Generate stable unique key
                    const ticketKey = ticket.id
                      ? `older-${ticket.id}`
                      : `older-${index}-${
                          ticket.created_date ||
                          ticket.ticket_id ||
                          ticket.category ||
                          "unknown"
                        }`;

                    return (
                      <button
                        key={ticketKey}
                        onClick={() => handleSelectTicket(ticket.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          currentTicketId === ticket.id
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {ticket.category ||
                              ticket.description ||
                              "Conversație nouă"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredTickets.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Nicio conversație</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Fixed Header - acoperă întregul ecran */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">
              Încrederea ne face bine!
            </h1>
          </div>

          <div>
            {currentUser ? (
              <UserMenu user={currentUser} onLogout={logoutUser} />
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAuthDialog(true)}
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Conectare</span>
              </Button>
            )}
          </div>
        </div>

        {/* Content Area with padding top for fixed header */}
        <div className="flex-1 overflow-hidden flex flex-col pt-16">
          {/* Hamburger Button - in chat area (available for anonymous users too) */}
          {tickets.length > 0 && (
            <div className="px-6 pt-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hover:bg-gray-100"
              >
                {sidebarOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          )}

          {conversationState === "main" && (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
                <div className="w-full max-w-4xl">
                  <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
                    Cu ce te pot ajuta?
                  </h1>
                  <CategoryCards onSelectCategory={handleCategorySelect} />
                </div>
              </div>

              <div className="p-6 bg-white border-t border-gray-200">
                <div className="max-w-4xl mx-auto">
                  <MainInput onSubmit={handleMainInputSubmit} />
                </div>
              </div>
            </div>
          )}

          {conversationState === "chatting" && (
            <div className="flex flex-col h-full">
              <ScrollArea className="flex-1 px-6 py-8" ref={scrollRef}>
                <div className="max-w-4xl mx-auto">
                  {messages.map((message, index) => {
                    // Generate stable unique key: combine timestamp, index, role, and content hash
                    const contentHash = message.content
                      ? message.content
                          .substring(0, 30)
                          .replace(/\s/g, "")
                          .substring(0, 20)
                      : "empty";

                    const messageKey = message.timestamp
                      ? `msg-${message.timestamp}-${index}-${message.role}-${contentHash}`
                      : `msg-${index}-${message.role}-${contentHash}`;

                    return (
                      <ChatMessage
                        key={messageKey}
                        message={message}
                        isUser={message.role === "user"}
                        onRegenerate={
                          message.role === "bot"
                            ? () => handleRegenerateMessage(index)
                            : undefined
                        }
                      />
                    );
                  })}
                  {isProcessing && (
                    <div className="flex gap-4 mb-6">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-purple-500">
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-white rounded-full animate-bounce" />
                        </div>
                      </div>
                      <div className="bg-white text-gray-900 rounded-2xl rounded-tl-sm border border-gray-200 px-4 py-3">
                        <div className="flex gap-1">
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="border-t border-gray-200 bg-white p-6">
                <div className="max-w-4xl mx-auto">
                  <MainInput
                    onSubmit={handleSendMessage}
                    onNewChat={handleNewChat}
                    placeholder="Continuă conversația..."
                  />
                </div>
              </div>
            </div>
          )}

          {conversationState === "confirmation" && currentTicket && (
            <ScrollArea className="h-full">
              <ConfirmationScreen
                ticketData={{ ...currentTicket, ...ticketDetails }}
                onConfirm={handleConfirmSubmit}
                onEdit={handleEditConfirmation}
                isLoading={updateTicketMutation.isPending}
              />
            </ScrollArea>
          )}

          {conversationState === "success" && currentTicket && (
            <SuccessScreen
              ticketId={currentTicket.ticket_id}
              onNewChat={handleNewChat}
            />
          )}
        </div>
      </div>

      {/* Auth Dialog */}
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  );
}
