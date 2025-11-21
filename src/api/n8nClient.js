/**
 * n8n Client for Chat Integration
 *
 * This client handles communication with n8n workflows for chat/LLM functionality.
 * Replace Base44 InvokeLLM calls with n8n webhook/API calls.
 */

// n8n webhook URLs - configure these in your n8n workflows
// Must be set in .env file
// For local development: http://localhost:5678/webhook/chat
// For production: https://your-n8n-instance.com/webhook/chat
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
const N8N_REPORT_WEBHOOK_URL = import.meta.env.VITE_N8N_REPORT_WEBHOOK_URL;

if (!N8N_WEBHOOK_URL) {
  console.error(
    "❌ VITE_N8N_WEBHOOK_URL is not set in .env file. Please configure it."
  );
  throw new Error(
    "VITE_N8N_WEBHOOK_URL environment variable is required. Please set it in .env file."
  );
}

const normalizeTicketPayload = (responseData) => {
  if (!responseData) return {};

  if (responseData.ticket && typeof responseData.ticket === "object") {
    return responseData.ticket;
  }

  // Backwards compatibility with older schema (extracted_data)
  if (
    responseData.extracted_data &&
    typeof responseData.extracted_data === "object"
  ) {
    const data = responseData.extracted_data;
    const firstCategory =
      Array.isArray(data.categories) && data.categories.length > 0
        ? data.categories[0]
        : {};

    return {
      id: data.id || null,
      ticket_id: data.ticket_id || null,
      category: data.category || firstCategory.category,
      subcategory: data.subcategory || firstCategory.subcategory,
      description: data.description || firstCategory.description,
      severity: data.severity || firstCategory.severity,
      location_county: data.location_county || data.location?.county || null,
      location_city: data.location_city || data.location?.city || null,
      institution: data.institution || null,
      status: data.status || "new",
      summary: data.summary || null,
      tags: data.tags || [],
      user_role: data.user_role || null,
      user_recommendations:
        data.user_recommendations || data.recommendations || null,
      datetime: data.datetime || new Date().toISOString(),
    };
  }

  return {};
};

const buildResponsePayload = (data) => {
  const ticket = normalizeTicketPayload(data);
  const ticketHasData = ticket && Object.keys(ticket).length > 0;

  // next_message is REQUIRED
  let nextMessage = "";
  if (data && typeof data.next_message === "string") {
    nextMessage = data.next_message.trim();
  } else if (data && data.next_message != null) {
    nextMessage = String(data.next_message).trim();
  } else {
    // Fallback to other message-like fields
    nextMessage =
      data?.message?.trim() ||
      data?.content?.trim() ||
      ticket?.user_recommendations?.trim() ||
      "";
  }

  // TEMPORARY FIX: If next_message is still empty but we have reasoning,
  // use reasoning as fallback (this should be fixed in n8n workflow)
  if (!nextMessage && data?.reasoning) {
    console.warn(
      "⚠️ next_message is missing - using reasoning as temporary fallback. " +
        "Please fix n8n workflow to always return next_message explicitly."
    );
    // Extract a user-friendly message from reasoning if possible
    // Try to find the actual question/message, not the internal explanation
    const reasoningText = String(data.reasoning).trim();

    // If reasoning contains a question or user-facing message, use it
    // Otherwise, generate a default message based on ticket state
    if (reasoningText.length > 0) {
      // Check if reasoning looks like it contains a user message
      // (contains question marks, user-facing language, etc.)
      if (
        reasoningText.includes("?") ||
        reasoningText.includes("Poți") ||
        reasoningText.includes("Ce") ||
        reasoningText.includes("Cum") ||
        reasoningText.length < 200
      ) {
        nextMessage = reasoningText;
      } else {
        // Reasoning is too technical, generate a default message
        if (ticket?.category) {
          nextMessage = `Am înțeles că vrei să raportezi o problemă legată de ${ticket.category}. Poți să-mi spui mai multe detalii despre ce s-a întâmplat?`;
        } else {
          nextMessage =
            "Poți să-mi spui mai multe detalii despre ce s-a întâmplat?";
        }
      }
    } else {
      // Generate default message
      if (ticket?.category) {
        nextMessage = `Am înțeles că vrei să raportezi o problemă legată de ${ticket.category}. Poți să-mi spui mai multe detalii despre ce s-a întâmplat?`;
      } else {
        nextMessage =
          "Poți să-mi spui mai multe detalii despre ce s-a întâmplat?";
      }
    }
  }

  return {
    next_message: nextMessage,
    ticket: ticketHasData ? ticket : {},
    confidence: data?.confidence || "medium",
  };
};

/**
 * Invoke LLM through n8n workflow
 *
 * @param {Object} params - LLM parameters
 * @param {Object} [params.response_json_schema] - Optional JSON schema for structured response
 * @returns {Promise<Object>} LLM response
 */
export async function invokeLLM({ response_json_schema, prompt } = {}) {
  try {
    // n8n manages its own conversation history and prompts
    // Only send the JSON schema for structured output
    const requestBody = {
      response_json_schema,
      timestamp: new Date().toISOString(),
    };

    requestBody.prompt =
      typeof prompt === "string" ? prompt : prompt ? String(prompt) : "";

    console.log("📤 Calling n8n webhook:", N8N_WEBHOOK_URL);
    console.log("📤 Request body:", requestBody);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Get response text first to check if it's valid JSON
    const responseText = await response.text();
    console.log("📥 n8n raw response:", responseText);
    console.log("📥 Response status:", response.status, response.statusText);
    console.log(
      "📥 Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      console.error(
        "❌ n8n webhook error:",
        response.status,
        response.statusText,
        responseText
      );
      throw new Error(
        `n8n webhook error: ${response.status} ${response.statusText} - ${responseText}`
      );
    }

    // Check if response is empty
    if (!responseText || responseText.trim().length === 0) {
      console.error("❌ n8n webhook returned empty response");
      throw new Error(
        "n8n webhook returned empty response. Please check your n8n workflow."
      );
    }

    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse n8n response as JSON:", parseError);
      console.error("❌ Response text was:", responseText);
      throw new Error(
        `n8n webhook returned invalid JSON: ${
          parseError.message
        }. Response: ${responseText.substring(0, 200)}`
      );
    }

    console.log("✅ n8n parsed response:", data);

    // n8n can return data in different formats:
    // 1. Array format: [{output: {next_message, ticket, confidence}}]
    // 2. Wrapped format: { data: { next_message, ticket, confidence } }
    // 3. Direct format: { next_message, ticket, confidence }

    let responseData = null;

    // Check if it's an array (n8n common format)
    if (Array.isArray(data) && data.length > 0) {
      // Extract from first item's output property
      if (data[0].output) {
        responseData = data[0].output;
      } else if (data[0].json && data[0].json.data) {
        responseData = data[0].json.data;
      } else if (data[0].json) {
        responseData = data[0].json;
      } else {
        responseData = data[0];
      }
    }
    // Check if wrapped in { data: {...} }
    else if (data.data) {
      responseData = data.data;
    }
    // Check if direct format
    else if (data.next_message !== undefined) {
      responseData = data;
    }
    // Check if has output property
    else if (data.output) {
      responseData = data.output;
    }
    // Fallback: use data as is
    else {
      responseData = data;
    }

    // Ensure it has the required structure
    if (responseData) {
      const payload = buildResponsePayload(responseData);
      const hasMessage = payload.next_message?.trim().length > 0;
      const hasTicket = Object.keys(payload.ticket || {}).length > 0;

      if (responseData.next_message !== undefined || hasMessage || hasTicket) {
        return payload;
      }
    }

    // If we still don't have the right format, try to extract any message that might exist
    // Don't return a generic error message - let the AI response come through
    if (responseData) {
      // Try to find any message-like field
      const possibleMessage =
        responseData.next_message ||
        responseData.content ||
        responseData.message ||
        responseData.text ||
        (typeof responseData === "string" ? responseData : null);

      if (possibleMessage) {
        return buildResponsePayload({
          ...responseData,
          next_message: possibleMessage,
        });
      }
    }

    // If no message found at all, log for debugging but don't return a generic message
    console.warn("⚠️ Unexpected n8n response format:", responseData);
    // Return null/empty to let the error propagate naturally
    return {
      next_message: "",
      ticket: {},
      confidence: "low",
    };
  } catch (error) {
    console.error("Error calling n8n webhook:", error);
    throw error;
  }
}

/**
 * Generate summary through n8n workflow
 * n8n manages summary generation internally
 *
 * @returns {Promise<string>} Generated summary
 */
export async function generateSummary() {
  try {
    // n8n manages prompts internally - don't send prompt from frontend
    const response = await invokeLLM({});
    // If response is an object with content/summary field, extract it
    if (typeof response === "object" && response.summary) {
      return response.summary;
    }
    if (typeof response === "object" && response.content) {
      return response.content;
    }
    // If response is already a string
    if (typeof response === "string") {
      return response;
    }
    // Fallback: stringify the response
    return JSON.stringify(response);
  } catch (error) {
    console.error("Error generating summary via n8n:", error);
    throw error;
  }
}

/**
 * Process chat conversation through n8n
 * n8n manages conversation history internally
 *
 * @param {Object} [params] - Chat parameters
 * @param {Object} [params.json_schema] - Optional JSON schema for structured response
 * @returns {Promise<Object>} Chat response with next_message and ticket payload
 */
export async function processChatConversation({ json_schema, prompt } = {}) {
  // Default JSON schema for structured output
  const defaultJsonSchema = {
    type: "object",
    properties: {
      next_message: { type: "string" },
      ticket: {
        type: "object",
        properties: {
          id: { type: "integer" },
          ticket_id: { type: "string" },
          category: { type: "string" },
          subcategory: { type: "string" },
          description: { type: "string" },
          severity: { type: "string" },
          location_county: { type: "string" },
          location_city: { type: "string" },
          institution: { type: "string" },
          status: { type: "string" },
          summary: { type: "string" },
          tags: {
            type: "array",
            items: { type: "string" },
          },
          user_role: { type: "string" },
          user_recommendations: { type: "string" },
          datetime: { type: "string" },
        },
      },
      confidence: { type: "string" },
    },
    required: ["next_message", "ticket", "confidence"],
  };

  // n8n manages its own conversation history and prompts internally
  // Only send the JSON schema for structured output
  return await invokeLLM({
    response_json_schema: json_schema || defaultJsonSchema,
    prompt,
  });
}

/**
 * Send report to n8n webhook (only for anonymous users)
 *
 * @param {Object} params - Report parameters
 * @param {Object} params.ticketData - The complete ticket/report data
 * @param {string} params.anonymousUserId - Anonymous user ID
 * @returns {Promise<void>}
 */
export async function sendReportToWebhook({ ticketData, anonymousUserId }) {
  if (!N8N_REPORT_WEBHOOK_URL) {
    console.warn(
      "⚠️ VITE_N8N_REPORT_WEBHOOK_URL is not set. Report will not be sent to webhook."
    );
    return;
  }

  try {
    const reportPayload = {
      anonymous_user_id: anonymousUserId,
      ticket_id: ticketData.ticket_id || ticketData.id,
      category: ticketData.category,
      subcategory: ticketData.subcategory,
      severity: ticketData.severity,
      description: ticketData.description || ticketData.summary,
      location_county: ticketData.location_county,
      location_city: ticketData.location_city,
      institution: ticketData.institution,
      user_type: ticketData.user_type,
      recommendations: ticketData.recommendations,
      conversation_history: ticketData.conversation_history || [],
      file_urls: ticketData.file_urls || [],
      created_date: ticketData.created_date,
      timestamp: new Date().toISOString(),
    };

    console.log("📤 Sending report to n8n webhook:", N8N_REPORT_WEBHOOK_URL);
    console.log("📤 Report payload:", reportPayload);

    const response = await fetch(N8N_REPORT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reportPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "❌ n8n report webhook error:",
        response.status,
        response.statusText,
        errorText
      );
      throw new Error(
        `n8n report webhook error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("✅ Report sent successfully to n8n:", data);
  } catch (error) {
    console.error("Error sending report to n8n webhook:", error);
    throw error;
  }
}

export default {
  invokeLLM,
  generateSummary,
  processChatConversation,
  sendReportToWebhook,
};
