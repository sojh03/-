import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, UPLOADS_BASE } from '../api';

const STATUS_LABEL = { SoldOut: '판매완료', Reserved: '예약중', Hidden: '숨김', OnSale: '판매중' };
const STATUS_COLOR = { SoldOut: 'bg-gray-200 text-gray-600', Reserved: 'bg-yellow-100 text-yellow-700', OnSale: 'bg-green-100 text-green-700', Hidden: 'bg-red-100 text-red-600' };

export default function WishlistPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      alert('로그인이 필요합니다');
      return navigate('/login');
    }
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      // Get our own user ID, then filter posts where we are in likes[]
      const [meRes, postsRes] = await Promise.all([
        api.get('/auth/me', { headers }),
        api.get('/board')
      ]);
      const myId = meRes.data._id;
      const all = postsRes.data;
      const liked = all.filter(p => p.likes?.some(id => String(id) === String(myId)));
      setPosts(liked);
    } catch (err) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlike = async (postId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/board/${postId}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setPosts(prev => prev.filter(p => p._id !== postId));
    } catch (err) {
      alert('처리 실패');
    }
  };

  const getImageSrc = (post) => {
    const img = post.imagePaths?.[0] || post.imagePath;
    return img ? `${UPLOADS_BASE}/${img}` : null;
  };

  if (loading) return <div className="text-center py-20 text-textmuted">로딩 중...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-textmain">찜한 상품</h1>
          <p className="text-textmuted text-sm mt-1">{posts.length}개의 상품을 찜했습니다</p>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">🤍</div>
          <p className="text-textmuted text-lg font-medium">찜한 상품이 없습니다</p>
          <p className="text-textmuted text-sm mt-1 mb-6">마음에 드는 상품에 하트를 눌러 저장해보세요</p>
          <Link to="/" className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primaryhover transition-all shadow-lg shadow-primary/30">
            상품 둘러보기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {posts.map(post => {
            const imgSrc = getImageSrc(post);
            const isSoldOut = post.status === 'SoldOut';
            return (
              <Link key={post._id} to={`/post/${post._id}`}
                className="relative bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow group">
                {/* 이미지 */}
                <div className={`relative w-full aspect-square bg-gray-50 ${isSoldOut ? 'opacity-60' : ''}`}>
                  {imgSrc ? (
                    <img src={imgSrc} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">📷</div>
                  )}
                  <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_COLOR[post.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[post.status] || post.status}
                  </span>
                  <button
                    onClick={(e) => handleUnlike(post._id, e)}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full shadow-sm text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    title="찜 해제"
                  >
                    ♥
                  </button>
                </div>

                <div className="p-3">
                  <p className="text-xs font-semibold text-textmain truncate">{post.title}</p>
                  <p className="text-sm font-bold text-primary mt-0.5">{Number(post.price).toLocaleString()}원</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-textmuted">{post.author?.userId || '알 수 없음'}</span>
                    <div className="flex items-center gap-2 text-[10px] text-textmuted">
                      <span>👁 {post.views || 0}</span>
                      <span>♥ {post.likes?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
