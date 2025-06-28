"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageSquare, Users, User } from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/messages", icon: MessageSquare, label: "Messages" },
  { href: "/friends", icon: Users, label: "Friends" },
  { href: "/chat/me", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex justify-around items-center h-14 md:hidden">
      {navItems.map(({ href, icon: Icon, label }) => {
        // Special case for /chat/[username] route
        const isActive =
          (href === "/" && pathname === "/") ||
          (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive ? "text-blue-600" : "text-gray-400 hover:text-blue-500"}`}
            aria-label={label}
          >
            <Icon size={26} />
          </Link>
        );
      })}
    </nav>
  );
} 