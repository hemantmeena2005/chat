"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { Users, UserPlus, UserCheck, Check, X, MessageSquare } from "lucide-react";

const API_URL = "http://localhost:5050";

export default function FriendsPage() {
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profilePics, setProfilePics] = useState({});
  const currentUser = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  const socketRef = useRef(null);
  const router = useRouter();

  // Fetch profile pictures for users
  useEffect(() => {
    async function fetchProfilePics(users) {
      const pics = {};
      await Promise.all(users.map(async (user) => {
        try {
          const res = await fetch(`http://localhost:5050/user/${user}`);
          if (res.ok) {
            const data = await res.json();
            pics[user] = data.profilePic || null;
          }
        } catch {}
      }));
      setProfilePics(pics);
    }
    const allUsers = [...requests, ...friends];
    if (allUsers.length > 0) {
      fetchProfilePics(allUsers);
    }
  }, [requests, friends]);

  useEffect(() => {
    if (!currentUser) return;
    socketRef.current = io(API_URL);
    socketRef.current.emit("login", currentUser);
    socketRef.current.emit("get_friend_requests");
    socketRef.current.emit("get_friends");
    socketRef.current.on("friend_requests", (reqs) => {
      setRequests(reqs);
      setLoading(false);
    });
    socketRef.current.on("friends", setFriends);
    socketRef.current.on("friends_updated", setFriends);
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
    // eslint-disable-next-line
  }, [currentUser]);

  const handleAccept = (from) => {
    if (!socketRef.current) return;
    socketRef.current.emit("accept_friend_request", { from });
    setRequests((prev) => prev.filter((u) => u !== from));
  };

  const handleReject = (from) => {
    if (!socketRef.current) return;
    socketRef.current.emit("reject_friend_request", { from });
    setRequests((prev) => prev.filter((u) => u !== from));
  };

  const handleChat = (friend) => {
    router.push(`/chat/${friend}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">
        {/* Friend Requests Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-orange-600 text-white px-6 py-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <UserPlus size={24} />
              Friend Requests
            </h1>
          </div>
          
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <span className="ml-3 text-gray-600">Loading...</span>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No friend requests.</p>
                <p className="text-sm text-gray-400 mt-2">When someone sends you a request, it will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((from) => (
                  <div key={from} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden">
                        {profilePics[from] ? (
                          <img
                            src={profilePics[from]}
                            alt={from + " profile"}
                            className="w-10 h-10 object-cover rounded-full"
                            onError={e => { e.target.onerror = null; e.target.src = '/public/file.svg'; }}
                          />
                        ) : (
                          <UserPlus size={20} className="text-orange-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{from}</p>
                        <p className="text-sm text-gray-500">Wants to be your friend</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors"
                        onClick={() => handleAccept(from)}
                        title="Accept request"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                        onClick={() => handleReject(from)}
                        title="Reject request"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Friends Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-green-600 text-white px-6 py-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users size={24} />
              Your Friends
            </h2>
          </div>
          
          <div className="p-4">
            {friends.length === 0 ? (
              <div className="text-center py-8">
                <Users size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No friends yet.</p>
                <p className="text-sm text-gray-400 mt-2">Accept friend requests to start building your network.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div key={friend} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                        {profilePics[friend] ? (
                          <img
                            src={profilePics[friend]}
                            alt={friend + " profile"}
                            className="w-10 h-10 object-cover rounded-full"
                            onError={e => { e.target.onerror = null; e.target.src = '/public/file.svg'; }}
                          />
                        ) : (
                          <UserCheck size={20} className="text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{friend}</p>
                        <p className="text-sm text-gray-500">Friend</p>
                      </div>
                    </div>
                    <button
                      className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                      onClick={() => handleChat(friend)}
                      title="Start chat"
                    >
                      <MessageSquare size={16} />
                    </button>
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
