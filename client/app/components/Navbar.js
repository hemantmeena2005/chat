"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import NotificationToast from "./NotificationToast";
import { io } from "socket.io-client";
import { MessageSquare } from "lucide-react";

const SOCKET_URL = "http://localhost:5050";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState(null);
  const [notification, setNotification] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUsername(localStorage.getItem("username"));
      // Listen for storage changes (cross-tab)
      const onStorage = () => setUsername(localStorage.getItem("username"));
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }
  }, []);

  // Listen for route changes and update username
  useEffect(() => {
    if (typeof window !== "undefined") {
      setUsername(localStorage.getItem("username"));
    }
  }, [pathname]);

  // Socket.io for notifications
  useEffect(() => {
    if (!username) return;
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL);
      socketRef.current.emit("login", username);
    }
    const socket = socketRef.current;
    // Listen for new message
    socket.on("receive_message", (msg) => {
      if (msg.to === username) {
        setNotification(`New message from ${msg.from}`);
        setNotificationCount(prev => prev + 1);
      }
    });
    // Listen for friend request
    socket.on("friend_request_received", ({ from }) => {
      setNotification(`New friend request from ${from}`);
      setNotificationCount(prev => prev + 1);
    });
    return () => {
      if (socket) {
        socket.off("receive_message");
        socket.off("friend_request_received");
      }
    };
  }, [username]);

  const handleLogout = () => {
    localStorage.removeItem("username");
    setUsername(null);
    setIsMobileMenuOpen(false);
    router.push("/login");
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const NavLink = ({ href, children, className = "" }) => (
    <Link 
      href={href} 
      className={`px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 text-black ${className}`}
      onClick={closeMobileMenu}
    >
      {children}
    </Link>
  );

  return (
    <>
      <NotificationToast message={notification} onClose={() => setNotification("")} />
      <nav className="bg-white text-black px-4 py-3 flex justify-between items-center shadow border-b border-gray-200 sticky top-0 z-50">
        {/* Logo */}
        <Link href="/" className="font-bold text-xl hover:underline text-black">
          ChatApp
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-2 items-center">
          <NavLink href="/search">Search</NavLink>
          {username && (
            <>
              <NavLink href="/messages">Messages</NavLink>
              <div className="relative">
                <NavLink href="/friends">Friend Requests</NavLink>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </div>
              <NavLink href={`/chat/${username}`}>My Chat</NavLink>
            </>
          )}
        </div>

        {/* Desktop User Section */}
        <div className="hidden md:flex gap-4 items-center">
          {username ? (
            <>
              <span className="font-semibold text-black bg-gray-100 px-3 py-1 rounded">
                {username}
              </span>
              <button 
                onClick={handleLogout} 
                className="bg-gray-200 text-black px-3 py-1 rounded hover:bg-gray-300 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline text-black">Login</Link>
              <Link href="/signup" className="hover:underline text-black">Signup</Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Link
          href="/messages"
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          aria-label="Messages"
        >
          <MessageSquare size={28} className="text-black" />
        </Link>
      </nav>
    </>
  );
} 