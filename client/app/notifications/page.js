"use client";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, User } from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profilePics, setProfilePics] = useState({});
  const currentUser = typeof window !== "undefined" ? localStorage.getItem("username") : null;

  useEffect(() => {
    if (!currentUser) return;
    fetchNotifications();
  }, [currentUser]);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5050/notifications?username=${currentUser}`);
      const data = await res.json();
      setNotifications(data);
      // Fetch profile pics for all senders
      const senders = Array.from(new Set(data.map(n => n.from)));
      const pics = {};
      await Promise.all(senders.map(async (user) => {
        try {
          const res = await fetch(`http://localhost:5050/user/${user}`);
          if (res.ok) {
            const d = await res.json();
            pics[user] = d.profilePic || null;
          }
        } catch {}
      }));
      setProfilePics(pics);
    } catch {
      setNotifications([]);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6 text-center">Notifications</h1>
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading notifications...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No notifications yet.</div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div key={n._id} className="flex items-center gap-3 bg-white rounded-lg shadow border border-gray-200 p-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border">
                {profilePics[n.from] ? (
                  <img
                    src={profilePics[n.from]}
                    alt={n.from + ' profile'}
                    className="w-10 h-10 object-cover rounded-full"
                    onError={e => { e.target.onerror = null; e.target.src = '/public/file.svg'; }}
                  />
                ) : (
                  <User size={22} className="text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-gray-900 truncate">{n.from}</span>
                  {n.type === "like" ? (
                    <>
                      <Heart size={16} className="text-red-500 mx-1" />
                      <span>liked your post</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle size={16} className="text-blue-500 mx-1" />
                      <span>commented: <span className="italic text-gray-700">"{n.text}"</span></span>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              {n.postId && n.postId.image && (
                <img
                  src={n.postId.image.startsWith('http') ? n.postId.image : `http://localhost:5050${n.postId.image}`}
                  alt="Post preview"
                  className="w-14 h-14 object-cover rounded-lg border ml-2"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 