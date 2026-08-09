import { useThemeContext } from "@/contexts/ThemeContext";
import { Button } from "./ui/button";
import { SidebarTrigger } from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Crown, LogOutIcon, Moon, Shield, Sun, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { signOut } from "firebase/auth";
import { auth as authFirebase } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// Route → header title. First matching prefix wins; "/" is exact.
const TITLES: [string, string][] = [
  ["/speaking-feedback", "Speaking Feedback"],
  ["/speaking", "Speaking"],
  ["/writing", "Writing"],
  // Trailing slash first: /feedback/:id is one evaluation, /feedback is the list.
  ["/feedback/", "Writing Feedback"],
  ["/feedback", "Feedback History"],
  ["/premium", "Premium"],
  ["/admin", "Admin"],
  ["/profile", "Profile"],
];

function pageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  return TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "Page not found";
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useThemeContext();
  const auth = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut(authFirebase);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="bg-sidebar px-4 sticky top-0 h-16 w-full flex items-center gap-3 border-b border-sidebar-border flex-shrink-0 z-50">
        <SidebarTrigger className="size-11 -ml-1 shrink-0" />
        <h1 className="text-lg font-semibold truncate">{pageTitle(pathname)}</h1>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="size-11 hover:bg-sidebar-accent"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Account menu"
                className="size-11 hover:bg-sidebar-accent"
              >
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="truncate font-semibold">
                  {auth.user?.displayName ?? "Signed in"}
                </span>
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {auth.user?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate("/profile")}>
                <User />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/premium")}>
                <Crown />
                Premium
              </DropdownMenuItem>
              {auth.user?.role === "Admin" && (
                <DropdownMenuItem onSelect={() => navigate("/admin")}>
                  <Shield />
                  Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
                <LogOutIcon />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-8">
        {children}
      </div>
    </div>
  );
}

export default MainLayout;
