import PropTypes from "prop-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AuthDialog({ open, onOpenChange }) {
  const navigate = useNavigate();
  const handleLogin = () => {
    onOpenChange(false);
    navigate("/login", {
      replace: false,
      state: { from: window.location.pathname || "/" },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Bine ai venit!
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Conectează-te pentru a-ți salva feedback-ul și a urmări istoricul
            conversațiilor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              Beneficii cont:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Salvează istoricul conversațiilor</li>
              <li>✓ Urmărește statusul feedback-ului tău</li>
              <li>✓ Primește notificări despre progres</li>
              <li>✓ Acces rapid la feedback-uri anterioare</li>
            </ul>
          </div>

          <Button
            onClick={handleLogin}
            className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white h-12"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Conectare / Înregistrare
          </Button>

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              Continuă ca vizitator
            </Button>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center pt-4">
          Prin conectare, accepți termenii și condițiile noastre
        </p>
      </DialogContent>
    </Dialog>
  );
}

AuthDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
};
