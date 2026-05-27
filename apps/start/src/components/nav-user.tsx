import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { clearCachedRootAuth } from "@/lib/root-auth-cache";
import { SignOutIcon, HouseIcon, CodeIcon, ChatsIcon, GearIcon } from "@phosphor-icons/react";
import { Link, useRouter } from "@tanstack/react-router";
import { m } from "@/paraglide/messages";
import { useGoogleAnalytics } from "tanstack-router-ga4";

type User = typeof authClient.$Infer.Session.user;

export const NavUser = ({ currentUser }: { currentUser: User }) => {
  const router = useRouter();

  const ga = useGoogleAnalytics();

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      ga.event("logout", { user: currentUser.id });
    } finally {
      clearCachedRootAuth();
      if (location.pathname.startsWith("/dashboard")) {
        window.location.assign("/");
      } else {
        window.location.reload();
      }
      router.invalidate();
    }
  };

  const initials = (currentUser.name ?? currentUser.email).trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar className="rounded-none after:rounded-none">
          <AvatarImage
            className="rounded-none"
            src={currentUser.image ?? undefined}
            alt={currentUser.name}
          />
          <AvatarFallback className="rounded-none">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" sideOffset={4}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-1">
            <div className="font-mono text-foreground text-xs">{currentUser.name}</div>
            <div className="text-muted-foreground text-xs">{currentUser.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuItem
            render={
              <Link to="/dashboard">
                <HouseIcon />
                <span>{m.nav_user_dashboard()}</span>
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link to="/dashboard/skills">
                <CodeIcon />
                <span>{m.nav_user_skills()}</span>
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link to="/dashboard/feedbacks">
                <ChatsIcon />
                <span>{m.nav_user_feedbacks()}</span>
              </Link>
            }
          />
          <DropdownMenuItem
            render={
              <Link to="/dashboard/settings">
                <GearIcon />
                <span>{m.nav_user_settings()}</span>
              </Link>
            }
          />
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={async () => {
              await handleSignOut();
            }}
            variant="destructive"
          >
            <SignOutIcon /> <span>{m.nav_user_sign_out()}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
