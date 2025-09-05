import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Mic,
  PenTool,
  History,
  Crown,
  BookOpen,
  Edit3,
} from "lucide-react";

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

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Speaking", url: "/speaking", icon: Mic },
  { title: "Writing", url: "/writing", icon: Edit3 },
  { title: "Feedback History", url: "/feedback", icon: History },
  { title: "Premium", url: "/premium", icon: Crown },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const { isMobile } = useSidebar();

  const collapsed = !isMobile && state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = (isActive: boolean) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "";

  return (
    <Sidebar
      className={`${
        collapsed ? "w-16" : "w-64"
      } border-r transition-all duration-300`}
      collapsible="icon"
    >
      <SidebarContent className="pt-4">
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-lg">IELTS AI</h2>
                <p className="text-xs">AI-Powered Learning</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : "font-medium"}>
            Learning Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12">
                    <NavLink
                      to={item.url}
                      end
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${getNavCls(
                        isActive(item.url)
                      )}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
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
      </SidebarContent>
    </Sidebar>
  );
}
