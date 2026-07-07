import { useThemeContext } from "@/contexts/ThemeContext";
import { Button } from "./ui/button";
import { SidebarTrigger } from "./ui/sidebar";
import { Bell, LogOutIcon, Moon, Sun, User } from "lucide-react";
import { useDropdown } from "@/hooks/use-trigger-dropdown";
import { useNavigate } from "react-router";
import { signOut } from "firebase/auth";
import { auth as authFirebase } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

function MainLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useThemeContext();

  const { isDropdownOpen, toggleDropdown } = useDropdown();

  const handleSignOut = async () => {
    try {
      await signOut(authFirebase);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="bg-sidebar px-4 sticky top-0 h-16 w-full flex items-center border-b border-sidebar-border flex-shrink-0 z-50">
        <div className="flex items-center w-full">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="mr-4" />
            <h1 className="text-lg font-semibold">IELTS AI Evaluator</h1>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hover:bg-sidebar-accent"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-sidebar-accent"
            >
              <Bell className="h-5 w-5" />
            </Button>
            <div className="">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDropdown}
                className="hover:bg-sidebar-accent"
              >
                <User className="h-5 w-5" />
              </Button>
              <div>
                <div
                  className={`absolute text-right right-8 top-15 shadow-lg rounded-md border-1 bg-sidebar transition-all ease-in-out duration-100 ${
                    isDropdownOpen ? "opacity-100" : "opacity-0 hidden"
                  }`}
                >
                  <ul className="text-xs text-foreground w-content ml-6">
                    <li
                      className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2 pr-3 mx-1 my-1 rounded-md cursor-pointer pl-4"
                      onClick={() => navigate("/profile")}
                    >
                      <b>{auth.user?.displayName}</b>
                      <div className="h-3"></div>
                      <span className="text-foreground font-medium">
                        {auth.user?.email}
                      </span>
                    </li>

                    <hr></hr>
                    <li
                      className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2 pr-3 mx-1 my-1 rounded-md cursor-pointer"
                      onClick={() => navigate("/premium")}
                    >
                      Premium
                    </li>
                    {auth.user?.role == "Admin" && (
                      <li
                        className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2 pr-3 mx-1 my-1 rounded-md cursor-pointer"
                        onClick={() => navigate("/admin")}
                      >
                        Admin
                      </li>
                    )}
                    <hr></hr>
                    <li
                      className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground py-2 pr-3 mx-1 my-1 rounded-md cursor-pointer"
                      onClick={() => handleSignOut()}
                    >
                      <LogOutIcon className="h-3 w-3 inline mr-2" />
                      <span>Logout</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="p-12 h-screen flex-1 bg-background">
        {children}
      </div>
    </div>
  );
}

export default MainLayout;
