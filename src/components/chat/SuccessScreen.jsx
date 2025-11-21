import PropTypes from "prop-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, MessageSquare } from "lucide-react";

export default function SuccessScreen({ ticketId, onNewChat }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center max-w-2xl">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Feedback-ul a fost trimis cu succes!
        </h1>

        <p className="text-lg text-gray-600 mb-8">
          Mulțumim pentru feedback! Răspunsul tău a fost înregistrat și va fi
          analizat de echipa noastră.
        </p>

        <Card className="bg-blue-50 border-blue-200 p-6 mb-8 text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Codul feedback-ului tău
              </h3>
              <p className="text-2xl font-bold text-blue-600 mb-2">
                {ticketId}
              </p>
              <p className="text-sm text-blue-800">
                Poți folosi acest cod pentru a urmări statusul feedback-ului tău
              </p>
            </div>
          </div>
        </Card>

        <Button
          onClick={onNewChat}
          size="lg"
          className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Feedback nou
        </Button>
      </div>
    </div>
  );
}

SuccessScreen.propTypes = {
  ticketId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  onNewChat: PropTypes.func.isRequired,
};
