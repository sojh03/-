import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, UPLOADS_BASE } from '../api';

const STATUS_LABEL = { SoldOut: '판매완료', Reserved: '예약중', Hidden: '숨김', OnSale: '판매중' };
const STATUS_COLOR = { SoldOut: 'bg-gray-200 text-gray-600', Reserved: 'bg-yellow-100 text-yellow-700', OnSale: 'bg-green-100 text-green-700', Hidden: 'bg-red-100 text-red-600' };

function MannerTempBadge({ temp }) {
  const t = parseFloat(temp) || 36.5;
  const color = t >= 38 ? 'text-orange-500' : t >= 36.5 ? 'text-blue-500' : 'text-blue-300';
  const label = t >= 40 ? '따뜻해요 🔥' : t >= 38 ? '좋아요 😊' : t >= 36.5 ? '보통이에요' : '차가워요 🥶';
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{t.toFixed(1)}°C</div>
      <div className="text-xs text-textmuted">매너온도</div>
      <div className="text-[10px] text-textmuted">{label}</div>
    </div>
  );
}

function StarRow({ rating }) {
  return (
    <span className="text-yellow-400 text-sm">
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ opacity: n <= Math.round(rating) ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

export default function SellerProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts'); // 'posts' | 'reviews'

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/auth/users/${userId}`);
        setData(res.data);
      } catch (err) {
        alert('프로필을 불러올 수 없습니다');
        navigate('/');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) return <div className="text-center py-20 text-textmuted">로딩 중...</div>;
  if (!data) return null;

  const { user, posts, reviews, reviewAverage } = data;
  const joinDate = new Date(user.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  const getImageSrc = (post) => {
    const img = post.imagePaths?.[0] || post.imagePath;
    return img ? `${UPLOADS_BASE}/${img}` : null;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 프로필 헤더 */}
      <div className="glass rounded-2xl p-8 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* 아바타 */}
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 bg-gray-100 flex-shrink-0 shadow-lg">
          {user.profileImage ? (
            <img src={`${UPLOADS_BASE}/${user.profileImage}`} alt={user.userId} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-extrabold text-primary bg-primary/10">
              {user.userId.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-extrabold text-textmain mb-1">{user.userId}</h1>
          <p className="text-textmuted text-sm mb-3">가입일: {joinDate}</p>
          <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{posts.length}</div>
              <div className="text-xs text-textmuted">판매 상품</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{reviewAverage ?? '-'}</div>
              <div className="text-xs text-textmuted">평균 별점</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">{reviews.length}</div>
              <div className="text-xs text-textmuted">받은 후기</div>
            </div>
            <MannerTempBadge temp={user.mannerTemp ?? 36.5} />
          </div>
          {reviewAverage && (
            <div className="mt-2">
              <StarRow rating={parseFloat(reviewAverage)} />
              <span className="ml-1 text-sm text-textmuted">({reviews.length}개 후기)</span>
            </div>
          )}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-6">
        {[['posts', `판매 상품 (${posts.length})`], ['reviews', `받은 후기 (${reviews.length})`]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === key ? 'border-primary text-primary' : 'border-transparent text-textmuted hover:text-textmain'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 판매 상품 탭 */}
      {tab === 'posts' && (
        <div>
          {posts.length === 0 ? (
            <div className="text-center py-16 text-textmuted">등록한 상품이 없습니다</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {posts.map(post => {
                const imgSrc = getImageSrc(post);
                return (
                  <Link key={post._id} to={`/post/${post._id}`}
                    className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                    <div className="relative w-full aspect-square bg-gray-50">
                      {imgSrc ? (
                        <img src={imgSrc} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">📷</div>
                      )}
                      <span className={`absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_COLOR[post.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[post.status] || post.status}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-textmain truncate">{post.title}</p>
                      <p className="text-sm font-bold text-primary mt-0.5">{Number(post.price).toLocaleString()}원</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-textmuted">
                        <span>👁 {post.views || 0}</span>
                        <span>♥ {post.likes?.length || 0}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 후기 탭 */}
      {tab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-16 text-textmuted">받은 후기가 없습니다</div>
          ) : reviews.map(review => (
            <div key={review._id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                    {review.reviewer?.profileImage ? (
                      <img src={`${UPLOADS_BASE}/${review.reviewer.profileImage}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary bg-primary/10">
                        {review.reviewer?.userId?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-textmain text-sm">{review.reviewer?.userId || '탈퇴한 사용자'}</span>
                    <div><StarRow rating={review.rating} /></div>
                  </div>
                </div>
                <span className="text-xs text-textmuted">{new Date(review.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>
              {review.post && (
                <Link to={`/post/${review.post._id}`}
                  className="inline-block text-xs text-textmuted bg-gray-50 border border-gray-100 rounded px-2 py-1 mb-2 hover:text-primary transition-colors">
                  📦 {review.post.title}
                </Link>
              )}
              {review.comment && <p className="text-sm text-textmain leading-relaxed">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
