import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Mic, Edit3, History, Crown } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  /** Extra route prefixes that belong to this section. */
  alsoMatch?: string[];
};

const practiceItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Speaking", url: "/speaking", icon: Mic },
  { title: "Writing", url: "/writing", icon: Edit3 },
  {
    title: "Feedback History",
    url: "/feedback",
    icon: History,
    alsoMatch: ["/speaking-feedback"],
  },
];

// A section stays lit on its child routes, so /writing/Task2/7 keeps "Writing"
// highlighted while the user is mid-practice. Matches on segment boundaries so
// /speaking never claims /speaking-feedback.
const isNavItemActive = (pathname: string, item: NavItem) =>
  [item.url, ...(item.alsoMatch ?? [])].some(
    (base) =>
      pathname === base || (base !== "/" && pathname.startsWith(`${base}/`)),
  );

const accountItems: NavItem[] = [{ title: "Premium", url: "/premium", icon: Crown }];

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="shrink-0"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" className="fill-primary" />
      <text
        x="32"
        y="44"
        fontSize="34"
        fontWeight="700"
        textAnchor="middle"
        className="fill-primary-foreground"
      >
        W
      </text>
    </svg>
  );
}

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const collapsed = !isMobile && state === "collapsed";

  const renderGroup = (label: string, items: NavItem[]) => (
    <SidebarGroup key={label}>
      <SidebarGroupLabel
        className={
          collapsed
            ? "sr-only"
            : "text-xs uppercase tracking-wider text-muted-foreground"
        }
      >
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isNavItemActive(currentPath, item);
            return (
              <SidebarMenuItem key={item.title}>
                {/* Styling lives here, not on the NavLink: only this className is
                    run through tailwind-merge against the button variants. */}
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  className={`h-11 gap-3 rounded-full px-3 transition-colors duration-200 ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground active:bg-sidebar-primary active:text-sidebar-primary-foreground"
                      : ""
                  }`}
                >
                  <NavLink
                    to={item.url}
                    aria-current={active ? "page" : undefined}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {!collapsed && (
                      <span className="font-medium">{item.title}</span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="pt-4">
        <div className="px-4 mb-6">
          <div className="flex items-center gap-3">
            <LogoMark />
            {!collapsed && (
              <div className="min-w-0">
                <h2 className="font-semibold text-lg leading-tight truncate">
                  When IELTS?
                </h2>
                <p className="text-xs tracking-widest text-muted-foreground truncate">
                  LEARN · SPEAK · WRITE
                </p>
              </div>
            )}
          </div>
        </div>

        {renderGroup("Practice", practiceItems)}
        {renderGroup("Account", accountItems)}
      </SidebarContent>
    </Sidebar>
  );
}
