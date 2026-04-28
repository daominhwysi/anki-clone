import {
  Settings, Trash,
  TrendingUp,
  Book, Inbox,
} from "lucide-react";
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar";

interface SidebarProps {
  onDashboard: () => void;
  onLibrary: () => void;
  onInbox: () => void;
  onTrash: () => void;
  view: string;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  trashCount: number;
  inboxCount: number;
  onSettings: () => void;
}

export function Sidebar({ onDashboard, onLibrary, onInbox, onTrash, view, onResizeMouseDown, trashCount, inboxCount, onSettings }: SidebarProps) {
  const { setOpenMobile, state } = useSidebar();

  const handleNav = (fn: () => void) => {
    fn();
    setOpenMobile(false);
  };

  const isCollapsed = state === "collapsed";

  return (
    <SidebarUI
      collapsible="icon"
      className="border-r bg-sidebar group"
    >
      <SidebarContent className="py-4 custom-scrollbar">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view === "dashboard"}
                  onClick={() => handleNav(onDashboard)}
                  tooltip="Dashboard"
                  className="gap-3"
                >
                  <TrendingUp className="size-4 shrink-0" />
                  <span className="font-medium">Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view === "library"}
                  onClick={() => handleNav(onLibrary)}
                  tooltip="Library"
                  className="gap-3"
                >
                  <Book className="size-4 shrink-0" />
                  <span className="font-medium">Library</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={view === "inbox"}
                  onClick={() => handleNav(onInbox)}
                  tooltip="Inbox"
                  className="gap-3"
                >
                  <Inbox className="size-4 shrink-0" />
                  <span className="font-medium">Inbox</span>
                  {inboxCount > 0 && (
                    <SidebarMenuBadge className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full border border-primary/20 ml-auto group-data-[state=collapsed]:hidden">
                      {inboxCount}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          onMouseDown={onResizeMouseDown}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-50 group-hover:bg-primary/20"
        />
      )}

      <SidebarFooter className="p-2 border-t mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Settings"
              onClick={onSettings}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="size-4 shrink-0" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={view === "trash"}
              onClick={() => handleNav(onTrash)}
              tooltip="Trash"
              className="text-muted-foreground hover:text-foreground"
            >
              <Trash className="size-4 shrink-0" />
              <span>Trash</span>
              {trashCount > 0 && (
                <SidebarMenuBadge className="bg-destructive/10 text-destructive text-[10px] px-1.5 py-0.5 rounded-full border border-destructive/20 ml-auto group-data-[state=collapsed]:hidden">
                  {trashCount}
                </SidebarMenuBadge>
              )}
            </SidebarMenuButton>

          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarUI>
  );
}
