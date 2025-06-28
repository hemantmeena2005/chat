"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { MessageSquare, ArrowRight } from "lucide-react";

const SOCKET_URL = "http://localhost:5050";

export default function MessagesPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const router = useRouter();
  const currentUser = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  const socketRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit("login", currentUser);
    socketRef.current.on("connect", () => {
      socketRef.current.emit("get_all_messages");
      socketRef.current.emit("get_unread_counts");
    });
    socketRef.current.on("all_messages", (allMsgs) => {
      const convos = [];
      Object.entries(allMsgs).forEach(([key, msgs]) => {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && (lastMsg.from === currentUser || lastMsg.to === currentUser)) {
          const users = key.split("-");
          const other = users.find((u) => u !== currentUser);
          if (other) {
            convos.push({ user: other, lastMsg });
          }
        }
      });
      setConversations(convos);
      setLoading(false);
    });
    socketRef.current.on("unread_counts", (counts) => {
      setUnreadCounts(counts);
    });
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
    // eslint-disable-next-line
  }, [currentUser]);

  const handleChat = (user) => {
    router.push(`/chat/${user}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 text-white px-6 py-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare size={24} />
              Messages
            </h1>
          </div>
          
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No messages yet.</p>
                <p className="text-sm text-gray-400 mt-2">Start a conversation to see messages here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map(({ user, lastMsg }) => (
                  <div 
                    key={user} 
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-gray-100"
                    onClick={() => handleChat(user)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 truncate">{user}</span>
                        {unreadCounts && unreadCounts[user] > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                            {unreadCounts[user]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate max-w-xs md:max-w-md">
                        {lastMsg.text}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <ArrowRight size={20} className="text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
