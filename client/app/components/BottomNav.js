"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, MessageSquare, Users, User, Plus, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "https://chat-production-4708.up.railway.app";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasNotification, setHasNotification] = useState(false);
  const [mounted, setMounted] = useState(false);
  const currentUser = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setProfilePic(localStorage.getItem("profilePic"));
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const socket = io(SOCKET_URL);
    socket.emit("login", currentUser);
    socket.on("notification", () => {
      setHasNotification(true);
    });
    // Fetch unread notifications on mount
    fetch(`https://chat-production-4708.up.railway.app/notifications?username=${currentUser}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.some(n => n.read === false)) setHasNotification(true);
        else setHasNotification(false);
      });
    // Listen for route changes to /notifications
    const handleRoute = () => {
      if (window.location.pathname === "/notifications") {
        // Mark all as read
        fetch("https://chat-production-4708.up.railway.app/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: currentUser })
        }).then(() => setHasNotification(false));
      }
    };
    window.addEventListener("popstate", handleRoute);
    window.addEventListener("pushstate", handleRoute);
    window.addEventListener("replacestate", handleRoute);
    // Also check immediately
    handleRoute();
    return () => {
      socket.disconnect();
      window.removeEventListener("popstate", handleRoute);
      window.removeEventListener("pushstate", handleRoute);
      window.removeEventListener("replacestate", handleRoute);
    };
  }, [currentUser]);

  const navItems = [
    { href: "/feed", icon: Home, label: "Home" },
    { href: "/search", icon: Search, label: "Search" },
    // Plus icon will be inserted in the middle below
    { href: "/messages", icon: MessageSquare, label: "Messages" },
    { href: "/friends", icon: Users, label: "Friends" },
    { href: "/notifications", icon: Bell, label: "Notifications", notification: hasNotification },
    { href: "/chat/me", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex justify-around items-center h-14 md:hidden">
      {navItems.slice(0,2).map(({ href, icon: Icon, label }) => {
        const isActive =
          (href === "/feed" && pathname === "/feed") ||
          (href !== "/feed" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive ? "text-blue-600" : "text-gray-700 hover:text-blue-500"}`}
            aria-label={label}
          >
            <Icon size={26} />
          </Link>
        );
      })}
      {/* Plus/Upload Button in the center */}
      <button
        onClick={() => {
          if (pathname !== "/feed") {
            router.push("/feed");
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("open-upload-modal"));
            }, 300);
          } else {
            window.dispatchEvent(new CustomEvent("open-upload-modal"));
          }
        }}
        className="flex flex-col items-center justify-center flex-1 h-full text-gray-700 hover:text-blue-500 focus:outline-none"
        aria-label="Upload Post"
        style={{ background: "none", border: "none" }}
      >
        <Plus size={32} />
      </button>
      {navItems.slice(2, navItems.length - 1).map(({ href, icon: Icon, label, notification }) => {
        const isActive =
          (href === "/feed" && pathname === "/feed") ||
          (href !== "/feed" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive ? "text-blue-600" : "text-gray-700 hover:text-blue-500"}`}
            aria-label={label}
          >
            <span className="relative">
              <Icon size={26} />
              {notification && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </span>
          </Link>
        );
      })}
      {/* Profile picture as last nav item */}
      <Link
        href="/chat/me"
        className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${pathname.startsWith("/chat/me") ? "text-blue-600" : "text-gray-700 hover:text-blue-500"}`}
        aria-label="Profile"
      >
        <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border">
          {mounted && profilePic ? (
            <img
              src={profilePic}
              alt="profile"
              className="w-8 h-8 object-cover rounded-full"
              onError={e => { e.target.onerror = null; e.target.src = '/file.svg'; }}
            />
          ) : (
            <User size={20} className="text-gray-500" />
          )}
        </span>
      </Link>
    </nav>
  );
} 