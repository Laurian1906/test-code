import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Save, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsDialog({ open, onOpenChange, user }) {
  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) return;

    setIsSaving(true);
    try {
      await base44.auth.updateMe({ full_name: fullName });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Setări profil</DialogTitle>
          <DialogDescription>
            Actualizează informațiile contului tău
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">
              Email-ul nu poate fi modificat
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nume complet</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Introdu numele tău complet"
            />
          </div>

          {user?.role && (
            <div className="space-y-2">
              <Label>Rol</Label>
              <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
                {user.role === "admin" ? "Administrator" : "Utilizator"}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Anulează
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !fullName.trim()}
            className="bg-[#DC2626] hover:bg-[#B91C1C]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Se salvează...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvează
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

SettingsDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  user: PropTypes.shape({
    email: PropTypes.string,
    full_name: PropTypes.string,
    role: PropTypes.string,
    provider: PropTypes.string,
    picture: PropTypes.string,
  }),
};
