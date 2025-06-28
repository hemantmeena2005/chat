"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { Search, MessageSquare, UserPlus, Users, Check, Clock } from "lucide-react";

const API_URL = "https://chat-production-4708.up.railway.app"; // Change if your server runs on a different port

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const router = useRouter();
  const currentUser = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  const socketRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    if (!socketRef.current) {
      socketRef.current = io(API_URL);
      socketRef.current.emit("login", currentUser);
      socketRef.current.emit("get_friends");
      socketRef.current.emit("get_friend_requests");
      socketRef.current.on("friends", setFriends);
      socketRef.current.on("friend_requests", setRequests);
      // Track sent requests (users to whom currentUser has sent requests)
      socketRef.current.on("friend_request", ({ from }) => {
        if (from === currentUser) setSentRequests((prev) => [...prev, from]);
      });
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [currentUser]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/users?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const users = await res.json();
      setResults(users.filter((u) => u !== currentUser));
    } catch (err) {
      setError("Could not fetch users");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChat = (username) => {
    router.push(`/chat/${username}`);
  };

  const handleSendRequest = (to) => {
    if (!socketRef.current || !currentUser) return;
    socketRef.current.emit("send_friend_request", { to });
    setSentRequests((prev) => [...prev, to]);
  };

  const getStatus = (user) => {
    if (friends.includes(user)) return { type: "friend", text: "Already Friends", icon: Users, color: "green" };
    if (requests.includes(user)) return { type: "requested", text: "Requested You", icon: Check, color: "blue" };
    if (sentRequests.includes(user)) return { type: "sent", text: "Request Sent", icon: Clock, color: "orange" };
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-600 text-white px-6 py-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Search size={24} />
              Search Users
            </h1>
          </div>
          
          <div className="p-4">
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search username..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-black bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      Search
                    </>
                  )}
                </button>
              </div>
            </form>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {results.length > 0 ? (
              <div className="space-y-3">
                {results.map((user) => {
                  const status = getStatus(user);
                  return (
                    <div key={user} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user}</p>
                          {status && (
                            <p className={`text-sm text-${status.color}-600 flex items-center gap-1`}>
                              <status.icon size={14} />
                              {status.text}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors"
                          onClick={() => handleChat(user)}
                          title="Start chat"
                        >
                          <MessageSquare size={16} />
                        </button>
                        {!status ? (
                          <button
                            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                            onClick={() => handleSendRequest(user)}
                            title="Add friend"
                          >
                            <UserPlus size={16} />
                          </button>
                        ) : (
                          <span className={`text-xs px-3 py-2 bg-${status.color}-100 text-${status.color}-700 rounded-full font-medium`}>
                            {status.text}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              !loading && !error && (
                <div className="text-center py-8">
                  <Search size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No users found.</p>
                  <p className="text-sm text-gray-400 mt-2">Try searching for a different username.</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 