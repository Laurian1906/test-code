import { useState } from "react";
import PropTypes from "prop-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SettingsDialog from "./SettingsDialog";

export default function UserMenu({ user, onLogout }) {
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = () => {
    if (typeof onLogout === "function") {
      onLogout();
    }
  };

  const displayName = user?.full_name || user?.name || "Utilizator";
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const canEditProfile = !user?.provider || user?.provider === "base44";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full w-9 h-9">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                {getInitials(displayName)}
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-semibold">{displayName}</span>
              {user?.email && (
                <span className="text-xs text-gray-500 font-normal">
                  {user.email}
                </span>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user?.role === "admin" && (
            <>
              <DropdownMenuItem asChild>
                <Link
                  to={createPageUrl("Dashboard")}
                  className="cursor-pointer"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Administrare
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {canEditProfile && (
            <DropdownMenuItem onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Setări
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleLogout} className="text-red-600">
            <LogOut className="w-4 h-4 mr-2" />
            Deconectare
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canEditProfile && (
        <SettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          user={user}
        />
      )}
    </>
  );
}

UserMenu.propTypes = {
  user: PropTypes.object,
  onLogout: PropTypes.func,
};
