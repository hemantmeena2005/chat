"use client";
import { useEffect, useState, useRef } from "react";
import { Heart, MessageCircle, Send, Plus, Image as ImageIcon, X, User } from "lucide-react";

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentLoading, setCommentLoading] = useState({});
  const currentUser = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef();
  const [profilePics, setProfilePics] = useState({});

  useEffect(() => {
    fetchPosts();
    // Listen for custom event from bottom nav
    const openModal = () => setShowUpload(true);
    window.addEventListener("open-upload-modal", openModal);
    return () => window.removeEventListener("open-upload-modal", openModal);
  }, []);

  // Fetch profile pictures for all post authors
  useEffect(() => {
    async function fetchProfilePicsForAuthors() {
      const authors = Array.from(new Set(posts.map(p => p.author)));
      const pics = {};
      await Promise.all(authors.map(async (user) => {
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
    if (posts.length > 0) fetchProfilePicsForAuthors();
  }, [posts]);

  async function fetchPosts() {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5050/posts");
      const data = await res.json();
      setPosts(data);
    } catch {
      setPosts([]);
    }
    setLoading(false);
  }

  async function handleLike(postId) {
    setLikeLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      await fetch(`http://localhost:5050/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser })
      });
      fetchPosts();
    } catch {}
    setLikeLoading((prev) => ({ ...prev, [postId]: false }));
  }

  async function handleComment(postId) {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    setCommentLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      await fetch(`http://localhost:5050/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser, text })
      });
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      fetchPosts();
    } catch {}
    setCommentLoading((prev) => ({ ...prev, [postId]: false }));
  }

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
      const res = await fetch("http://localhost:5050/posts", {
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
      fetchPosts();
    } catch (err) {
      setUploadError("Failed to upload post");
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading feed...</span>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 pb-20">
      <h1 className="text-2xl font-bold mb-6 text-center">Feed</h1>
      {posts.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No posts yet.</div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post._id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              {/* User info at top */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border">
                  {profilePics[post.author] ? (
                    <img
                      src={profilePics[post.author]}
                      alt={post.author + ' profile'}
                      className="w-10 h-10 object-cover rounded-full"
                      onError={e => { e.target.onerror = null; e.target.src = '/public/file.svg'; }}
                    />
                  ) : (
                    <User size={22} className="text-blue-600" />
                  )}
                </div>
                <div>
                  <span className="font-semibold text-gray-900">{post.author}</span>
                  <span className="block text-xs text-gray-400">{new Date(post.createdAt).toLocaleString()}</span>
                </div>
              </div>
              {post.image && (
                <img
                  src={post.image.startsWith('http') ? post.image : `http://localhost:5050${post.image}`}
                  alt="Post"
                  className="w-full object-cover max-h-80 bg-gray-100"
                />
              )}
              <div className="p-4">
                {post.caption && <p className="mb-3 text-gray-800">{post.caption}</p>}
                <div className="flex items-center gap-4 mb-2">
                  <button
                    className={`flex items-center gap-1 ${post.likes.includes(currentUser) ? "text-red-500" : "text-gray-500 hover:text-red-500"}`}
                    onClick={() => handleLike(post._id)}
                    disabled={likeLoading[post._id]}
                  >
                    <Heart fill={post.likes.includes(currentUser) ? "#ef4444" : "none"} size={22} />
                    <span className="text-sm">{post.likes.length}</span>
                  </button>
                  <span className="flex items-center gap-1 text-gray-500">
                    <MessageCircle size={20} />
                    <span className="text-sm">{post.comments.length}</span>
                  </span>
                </div>
                {/* Comments */}
                <div className="mb-2">
                  {post.comments.slice(-2).map((c, idx) => (
                    <div key={idx} className="text-sm text-gray-700 mb-1">
                      <span className="font-semibold text-gray-800">{c.user}:</span> {c.text}
                    </div>
                  ))}
                  {post.comments.length > 2 && (
                    <div className="text-xs text-blue-600 cursor-pointer mb-1">View all {post.comments.length} comments</div>
                  )}
                </div>
                {/* Add Comment */}
                <form
                  className="flex gap-2 mt-2"
                  onSubmit={e => {
                    e.preventDefault();
                    handleComment(post._id);
                  }}
                >
                  <input
                    type="text"
                    value={commentInputs[post._id] || ""}
                    onChange={e => setCommentInputs((prev) => ({ ...prev, [post._id]: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-black bg-gray-50"
                    placeholder="Add a comment..."
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                    disabled={commentLoading[post._id] || !(commentInputs[post._id] || "").trim()}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
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