"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Edit, Trash2, LogOut } from "lucide-react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5050";

export default function ProfilePage() {
  const [username, setUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const socketRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem("username");
    setUsername(stored || "");
    setNewName(stored || "");
    socketRef.current = io(SOCKET_URL);
    if (stored) {
      socketRef.current.emit("login", stored);
      socketRef.current.emit("get_friends");
      socketRef.current.on("friends", setFriends);
      socketRef.current.on("friends_updated", setFriends);
    }
    setLoading(false);
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const handleNameChange = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    if (!newName.trim()) {
      setError("Name cannot be empty");
      setSaving(false);
      return;
    }
    // Simulate server update
    setTimeout(() => {
      localStorage.setItem("username", newName);
      setUsername(newName);
      setSaving(false);
    }, 600);
  };

  const handleRemoveFriend = (friend) => {
    if (!socketRef.current) return;
    socketRef.current.emit("remove_friend", { friend });
  };

  const handleLogout = () => {
    localStorage.removeItem("username");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <User size={32} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{username}</h2>
              <p className="text-gray-500 text-sm">Your profile</p>
            </div>
          </div>
          <form onSubmit={handleNameChange} className="flex gap-2 mt-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black bg-gray-50"
              placeholder="Change your name"
              disabled={saving}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50"
              disabled={saving || !newName.trim() || newName === username}
            >
              <Edit size={16} />
              Save
            </button>
          </form>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User size={18} /> Friends
          </h3>
          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : friends.length === 0 ? (
            <div className="text-gray-400">No friends yet.</div>
          ) : (
            <ul className="divide-y">
              {friends.map(friend => (
                <li key={friend} className="flex items-center justify-between py-3">
                  <span className="text-gray-800">{friend}</span>
                  <button
                    onClick={() => handleRemoveFriend(friend)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-full"
                    title="Remove friend"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-gray-200 text-black py-3 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 font-semibold"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );
} 