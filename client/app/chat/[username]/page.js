"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { Send, ArrowLeft, User } from "lucide-react";

const SOCKET_URL = "http://localhost:5050";

export default function ChatPage() {
  const { username } = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const currentUser = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  const socketRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit("login", currentUser);
    socketRef.current.emit("get_messages", { withUser: username });
    socketRef.current.on("chat_history", (msgs) => {
      setMessages(msgs);
      socketRef.current.emit("mark_read", { withUser: username });
    });
    socketRef.current.on("receive_message", (msg) => {
      if (
        (msg.from === currentUser && msg.to === username) ||
        (msg.from === username && msg.to === currentUser)
      ) {
        setMessages((prev) => [...prev, msg]);
      }
    });
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [username, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() && currentUser && socketRef.current) {
      socketRef.current.emit("send_message", { to: username, text: input });
      setInput("");
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">{username}</h1>
            <p className="text-sm text-gray-500">Active now</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">Start the conversation with {username}</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={msg._id || idx}
              className={`flex ${msg.from === currentUser ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-xs md:max-w-md lg:max-w-lg ${msg.from === currentUser ? "order-2" : "order-1"}`}>
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    msg.from === currentUser
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-white text-gray-900 rounded-bl-md border border-gray-200"
                  }`}
                >
                  <p className="text-sm break-words">{msg.text}</p>
                  {msg.timestamp && (
                    <p className={`text-xs mt-1 ${
                      msg.from === currentUser ? "text-blue-100" : "text-gray-400"
                    }`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black bg-gray-50"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
