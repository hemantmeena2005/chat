"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Users, Search, ArrowRight, Plus, Image as ImageIcon, X } from "lucide-react";
import { io } from "socket.io-client";

const SOCKET_URL = "https://chat-production-4708.up.railway.app";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});
  const router = useRouter();
  const socketRef = useRef(null);
  const currentUser = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef();

  useEffect(() => {
    if (currentUser) {
      setIsLoggedIn(true);
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
    } else {
      setIsLoggedIn(false);
      setLoading(false);
    }
    // eslint-disable-next-line
  }, []);

  const handleChat = (user) => {
    router.push(`/chat/${user}`);
  };

  // Handle image file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle post upload
  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("author", localStorage.getItem("username"));
      if (imageFile) formData.append("imageFile", imageFile);
      if (caption) formData.append("caption", caption);
      const res = await fetch("https://chat-production-4708.up.railway.app/posts", {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const data = await res.json();
        setUploadError(data.error || "Failed to upload post");
        setUploading(false);
        return;
      }
      setShowUpload(false);
      setImageFile(null);
      setImagePreview("");
      setCaption("");
      // Optionally refresh posts/feed here
      window.location.reload();
    } catch (err) {
      setUploadError("Failed to upload post");
      setUploading(false);
    }
  };

  if (isLoggedIn) {
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

        {/* Floating Action Button for Upload */}
        <button
          className="fixed bottom-20 right-6 z-50 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition md:hidden"
          onClick={() => setShowUpload(true)}
          aria-label="Upload Post"
        >
          <Plus size={28} />
        </button>

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm relative">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                onClick={() => setShowUpload(false)}
                aria-label="Close"
              >
                <X size={22} />
              </button>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ImageIcon size={20} /> Upload Post
              </h2>
              <form onSubmit={handleUpload}>
                <div className="mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="mt-3 rounded-lg w-full max-h-48 object-contain border" />
                  )}
                </div>
                <div className="mb-4">
                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black bg-gray-50"
                    placeholder="Write a caption..."
                    rows={3}
                  />
                </div>
                {uploadError && <div className="text-red-500 text-sm mb-2">{uploadError}</div>}
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Not logged in: show landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={32} className="text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
              Welcome to <span className="text-blue-600">ChatApp</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Connect with friends in real-time. Search for users, send friend requests, and chat instantly with our modern messaging platform.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              Get Started
              <ArrowRight size={18} />
            </Link>
            <Link 
              href="/login" 
              className="bg-white text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors font-semibold border border-gray-200"
            >
              Login
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Find Friends</h3>
            <p className="text-gray-600">Search for users and discover new connections on our platform.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Build Network</h3>
            <p className="text-gray-600">Send and accept friend requests to grow your social network.</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={24} className="text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Real-time Chat</h3>
            <p className="text-gray-600">Chat instantly with friends using our real-time messaging system.</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Start Chatting?</h2>
          <p className="text-blue-100 mb-6 max-w-md mx-auto">
            Join thousands of users who are already connecting and chatting on ChatApp.
          </p>
          <Link 
            href="/signup" 
            className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold inline-flex items-center gap-2"
          >
            Create Account
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
