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
  const [profilePic, setProfilePic] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeout = useRef(null);
  const [replyTo, setReplyTo] = useState(null);

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
    // Typing indicator
    socketRef.current.on("typing", ({ from }) => {
      if (from === username) setIsTyping(true);
    });
    socketRef.current.on("stop_typing", ({ from }) => {
      if (from === username) setIsTyping(false);
    });
    // Fetch profilePic for chat partner
    async function fetchProfilePic() {
      try {
        const res = await fetch(`http://localhost:5050/user/${username}`);
        if (res.ok) {
          const data = await res.json();
          setProfilePic(data.profilePic || null);
        }
      } catch {}
    }
    fetchProfilePic();
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

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (socketRef.current) {
      socketRef.current.emit("typing", { to: username });
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socketRef.current.emit("stop_typing", { to: username });
      }, 1200);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() && currentUser && socketRef.current) {
      socketRef.current.emit("send_message", { to: username, text: input, replyTo: replyTo?._id });
      setInput("");
      setReplyTo(null);
    }
  };

  const handleReply = (msg) => {
    setReplyTo(msg);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 pb-14 md:pb-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
            {profilePic ? (
              <img
                src={profilePic}
                alt={username + ' profile'}
                className="w-10 h-10 object-cover rounded-full"
                onError={e => { e.target.onerror = null; e.target.src = '/public/file.svg'; }}
              />
            ) : (
              <User size={20} className="text-blue-600" />
            )}
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
                  className={`px-4 py-3 rounded-2xl relative group cursor-pointer ${
                    msg.from === currentUser
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-white text-gray-900 rounded-bl-md border border-gray-200"
                  }`}
                  onClick={() => handleReply(msg)}
                  title="Reply to this message"
                >
                  {msg.replyTo && (
                    <div className="text-xs text-gray-500 italic border-l-4 border-blue-400 pl-2 mb-1">
                      Replying to: {msg.replyTo.text}
                    </div>
                  )}
                  <p className="text-sm break-words">{msg.text}</p>
                  {msg.timestamp && (
                    <p className={`text-xs mt-1 ${
                      msg.from === currentUser ? "text-blue-100" : "text-gray-400"
                    }`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  )}
                  <span className="hidden group-hover:block absolute top-1 right-2 text-xs text-blue-400">↩</span>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
        {isTyping && (
          <div className="text-xs text-gray-500 italic px-2 pb-2">{username} is typing...</div>
        )}
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center gap-2 bg-blue-50 border-l-4 border-blue-400 px-3 py-2 mb-2 rounded">
          <div className="flex-1 text-xs text-gray-700 truncate">
            Replying to: <span className="italic">{replyTo.text}</span>
          </div>
          <button onClick={handleCancelReply} className="text-blue-500 hover:text-blue-700 text-xs">Cancel</button>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
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
