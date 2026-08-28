import { Search, type LucideIcon } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar";
import { Link, useLocation } from "@tanstack/react-router";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
  }[];
}) {
  const location = useLocation();
  return (
      <SidebarMenu>
        {items.map((item) => {
        const isActive = location.pathname === item.url;
        return(
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={isActive} 
            tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
            className="px-2.5 md:px-2"
            >
              <Link to={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )})}
      </SidebarMenu>
  );
}