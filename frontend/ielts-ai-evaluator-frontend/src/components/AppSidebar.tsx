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

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard };

const practiceItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Speaking", url: "/speaking", icon: Mic },
  { title: "Writing", url: "/writing", icon: Edit3 },
  { title: "Feedback History", url: "/feedback", icon: History },
];

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

  const isActive = (path: string) => currentPath === path;
  const getNavCls = (active: boolean) =>
    active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "";

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
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild className="h-11" tooltip={item.title}>
                <NavLink
                  to={item.url}
                  end
                  className={`flex items-center gap-3 px-3 py-2 rounded-full transition-all duration-200 ${getNavCls(
                    isActive(item.url)
                  )}`}
                >
                  <item.icon className="size-4 flex-shrink-0" />
                  {!collapsed && (
                    <span className="font-medium">{item.title}</span>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
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
