import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Edit, Send, FileText } from "lucide-react";

export default function ConfirmationScreen({
  ticketData,
  onConfirm,
  onEdit,
  isLoading,
}) {
  // Helper function to extract readable text from JSON if needed
  const getFormattedDescription = () => {
    const text = ticketData.summary || ticketData.description || "";

    // Check if it's a JSON string
    if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(text);

        // Skip if it's an empty response object (from n8n error)
        const structuredPayload =
          parsed.ticket ||
          parsed.extracted_data ||
          parsed.data?.ticket ||
          parsed.data?.extracted_data;

        if (
          parsed.next_message === "" &&
          (!structuredPayload || Object.keys(structuredPayload).length === 0)
        ) {
          return "Nu s-au putut extrage informații din răspunsul AI. Te rog să reîncerci conversația.";
        }

        // If it's the AI response format, extract the description from ticket payload
        if (structuredPayload) {
          const extracted = structuredPayload;

          // Build a readable description from extracted data
          let description = "";

          // Handle multiple categories/incidents (array format)
          if (
            extracted.categories &&
            Array.isArray(extracted.categories) &&
            extracted.categories.length > 0
          ) {
            description = extracted.categories
              .map((cat, idx) => {
                let desc = `${idx + 1}. ${cat.category || "Nespecificată"}`;
                if (cat.subcategory) desc += ` - ${cat.subcategory}`;
                if (cat.description) desc += `\n   ${cat.description}`;
                if (cat.severity) desc += `\n   Severitate: ${cat.severity}`;
                return desc;
              })
              .join("\n\n");
          }
          // Handle single description
          else if (extracted.description) {
            description = extracted.description;
          } else if (extracted.summary) {
            description = extracted.summary;
          }

          // Add location if available
          if (extracted.location_city || extracted.location_county) {
            const location = [
              extracted.location_city,
              extracted.location_county,
            ]
              .filter(Boolean)
              .join(", ");
            description += location
              ? description
                ? `\n\n📍 Locație: ${location}`
                : `📍 Locație: ${location}`
              : "";
          } else if (extracted.location) {
            description += description
              ? `\n\n📍 Locație: ${extracted.location}`
              : `📍 Locație: ${extracted.location}`;
          }

          // Add user role if available
          if (extracted.user_role) {
            description += description
              ? `\n👤 Rol: ${extracted.user_role}`
              : `👤 Rol: ${extracted.user_role}`;
          }

          // Add recommendations if available
          if (extracted.user_recommendations || extracted.recommendations) {
            const rec =
              extracted.user_recommendations || extracted.recommendations;
            description += description
              ? `\n\n💡 Recomandări:\n${rec}`
              : `💡 Recomandări:\n${rec}`;
          }

          return description || text;
        }

        return text;
      } catch {
        // Not valid JSON, return as is
        return text;
      }
    }

    return text;
  };

  // Extract category from ticketData or from JSON if needed
  const getCategory = () => {
    if (ticketData.category) return ticketData.category;

    // Try to extract from description if it's JSON
    const text = ticketData.summary || ticketData.description || "";
    if (text.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(text);
        const structuredPayload =
          parsed.ticket ||
          parsed.extracted_data ||
          parsed.data?.ticket ||
          parsed.data?.extracted_data;

        if (
          structuredPayload?.categories &&
          Array.isArray(structuredPayload.categories)
        ) {
          // Return first category or combine them
          const categories = structuredPayload.categories
            .map((c) => c.category)
            .filter(Boolean);
          return categories.length > 0 ? categories.join(", ") : null;
        }

        if (structuredPayload?.category) {
          return structuredPayload.category;
        }
      } catch {
        // Ignore
      }
    }

    return null;
  };

  // Extract subcategory similarly
  const getSubcategory = () => {
    if (ticketData.subcategory) return ticketData.subcategory;

    const text = ticketData.summary || ticketData.description || "";
    if (text.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(text);
        const structuredPayload =
          parsed.ticket ||
          parsed.extracted_data ||
          parsed.data?.ticket ||
          parsed.data?.extracted_data;

        if (
          structuredPayload?.categories &&
          Array.isArray(structuredPayload.categories)
        ) {
          const subcategories = structuredPayload.categories
            .map((c) => c.subcategory)
            .filter(Boolean);
          return subcategories.length > 0 ? subcategories.join(", ") : null;
        }

        if (structuredPayload?.subcategory) {
          return structuredPayload.subcategory;
        }
      } catch {
        // Ignore
      }
    }

    return null;
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Verifică informațiile
        </h2>
        <p className="text-gray-600">
          Înainte de a trimite raportul, te rog să verifici că toate detaliile
          sunt corecte
        </p>
      </div>

      <Card className="bg-white border border-gray-200 p-6 mb-6">
        <div className="space-y-4">
          {(getCategory() || ticketData.category) && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Categorie
              </h3>
              <p className="text-gray-900 font-medium">
                {getCategory() || ticketData.category || "Nespecificată"}
              </p>
            </div>
          )}

          {(getSubcategory() || ticketData.subcategory) && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Subcategorie
              </h3>
              <p className="text-gray-900">
                {getSubcategory() || ticketData.subcategory}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Descriere
            </h3>
            <p className="text-gray-900 whitespace-pre-line">
              {getFormattedDescription()}
            </p>
          </div>

          {(ticketData.location_county || ticketData.location_city) && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Locație
              </h3>
              <p className="text-gray-900">
                {[ticketData.location_city, ticketData.location_county]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          )}

          {ticketData.institution && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Instituție
              </h3>
              <p className="text-gray-900">{ticketData.institution}</p>
            </div>
          )}

          {ticketData.severity && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Severitate
              </h3>
              <p className="text-gray-900 capitalize">{ticketData.severity}</p>
            </div>
          )}

          {ticketData.file_urls && ticketData.file_urls.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Fișiere atașate
              </h3>
              <div className="flex flex-wrap gap-2">
                {ticketData.file_urls.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm"
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">Fișier {index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-3 justify-center">
        <Button
          onClick={onEdit}
          variant="outline"
          size="lg"
          disabled={isLoading}
        >
          <Edit className="w-4 h-4 mr-2" />
          Modifică
        </Button>
        <Button
          onClick={onConfirm}
          size="lg"
          className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Se trimite...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Trimite raportul
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

ConfirmationScreen.propTypes = {
  ticketData: PropTypes.shape({
    summary: PropTypes.string,
    description: PropTypes.string,
    category: PropTypes.string,
    subcategory: PropTypes.string,
    location_city: PropTypes.string,
    location_county: PropTypes.string,
    institution: PropTypes.string,
    severity: PropTypes.string,
    file_urls: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onConfirm: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};
