import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, UPLOADS_BASE, API_BASE } from '../api';

export default function BoardDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', price: '' });
  const [imgIndex, setImgIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const navigate = useNavigate();

  const currentUserId = localStorage.getItem('userId');
  const currentUserRole = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  useEffect(() => {
    api.get(`/board/${id}`).then(res => {
      const p = res.data;
      setPost(p);
      setEditForm({ title: p.title, content: p.content, price: p.price });
      setLikeCount(p.likes?.length || 0);
      if (token) {
        api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(me => {
          setLiked(p.likes?.some(l => String(l) === String(me.data._id)));
        }).catch(() => {});
      }
      const recent = JSON.parse(localStorage.getItem('recentViewed') || '[]');
      const filtered = recent.filter(r => r._id !== p._id);
      filtered.unshift({ _id: p._id, title: p.title, price: p.price, imagePath: p.imagePaths?.[0] || p.imagePath });
      localStorage.setItem('recentViewed', JSON.stringify(filtered.slice(0, 10)));
    }).catch(console.error);
  }, [id]);

  const allImages = post ? (post.imagePaths?.length > 0 ? post.imagePaths : post.imagePath ? [post.imagePath] : []) : [];

  const handleDelete = async () => {
    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/board/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      alert('게시글이 삭제되었습니다.');
      navigate('/');
    } catch (err) { alert(err.response?.data?.message || '삭제 실패'); }
  };

  const handleEditSubmit = async () => {
    try {
      const res = await api.put(`/board/${id}`, {
        title: editForm.title, content: editForm.content, price: Number(editForm.price)
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPost(res.data); setIsEditing(false);
      alert('게시글이 수정되었습니다.');
    } catch (err) { alert(err.response?.data?.message || '수정 실패'); }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.put(`/board/${id}`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
      setPost(p => ({ ...p, status: newStatus }));
    } catch (err) { alert(err.response?.data?.message || '상태 업데이트 실패'); }
  };

  const handleLike = async () => {
    if (!token) return alert('로그인이 필요합니다');
    try {
      const res = await api.post(`/board/${id}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setLiked(res.data.liked);
      setLikeCount(res.data.likeCount);
    } catch (err) { alert('처리 실패'); }
  };

  const handleBump = async () => {
    try {
      await api.post(`/board/${id}/bump`, {}, { headers: { Authorization: `Bearer ${token}` } });
      alert('끌어올리기 완료! 목록 상단에 노출됩니다.');
    } catch (err) { alert(err.response?.data?.message || '실패'); }
  };

  const handleReport = async (e) => {
    e.preventDefault();
    if (!token) return alert('로그인이 필요합니다');
    try {
      await api.post('/reports', {
        targetType: 'post', targetId: post._id, targetName: post.title, reason: reportReason
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert('신고가 접수되었습니다.');
      setShowReportModal(false); setReportReason('');
    } catch (err) { alert(err.response?.data?.message || '신고 실패'); }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reviews', {
        postId: post._id, rating: reviewRating, comment: reviewComment
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert('후기가 등록되었습니다!');
      setShowReviewModal(false); setReviewComment('');
    } catch (err) { alert(err.response?.data?.message || '후기 등록 실패'); }
  };

  if (!post) return <div className="text-center mt-20 text-textmuted">로딩 중...</div>;

  const isAuthor = post.author?.userId === currentUserId;
  const isAdmin = currentUserRole === 'Admin';
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;

  const conditionColor = { '미개봉': 'bg-emerald-100 text-emerald-700', '거의새것': 'bg-blue-100 text-blue-700', '중고': 'bg-gray-100 text-gray-600' };
  const tradeColor = { '직거래': 'bg-orange-100 text-orange-600', '택배': 'bg-purple-100 text-purple-600', '상관없음': 'bg-gray-100 text-gray-600' };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-4">
      <div className="md:flex">
        {/* 이미지 영역 */}
        <div className="md:w-1/2 bg-background flex flex-col items-center justify-center p-6 border-r border-gray-100 gap-3">
          <div className="w-full aspect-square flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden relative">
            {allImages.length > 0 ? (
              <img src={`${UPLOADS_BASE}/${allImages[imgIndex]}`} alt={post.title}
                className="max-h-full max-w-full object-contain drop-shadow-md" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-300">
                <span className="text-6xl">📷</span><span className="text-sm">사진 없음</span>
              </div>
            )}
            {allImages.length > 1 && (
              <>
                <button onClick={() => setImgIndex(i => Math.max(0, i - 1))} disabled={imgIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/60 transition-colors">‹</button>
                <button onClick={() => setImgIndex(i => Math.min(allImages.length - 1, i + 1))} disabled={imgIndex === allImages.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/60 transition-colors">›</button>
                <span className="absolute bottom-2 right-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">{imgIndex + 1} / {allImages.length}</span>
              </>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 justify-center flex-wrap">
              {allImages.map((img, i) => (
                <button key={i} onClick={() => setImgIndex(i)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === imgIndex ? 'border-primary shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                  <img src={`${UPLOADS_BASE}/${img}`} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 내용 영역 */}
        <div className="md:w-1/2 p-8 lg:p-10 flex flex-col">
          {isEditing ? (
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-textmuted uppercase tracking-wider mb-1">제목</label>
                <input className="w-full border border-gray-200 rounded-lg p-3 text-textmain outline-none focus:border-primary transition-all"
                  value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-textmuted uppercase tracking-wider mb-1">가격 (₩)</label>
                <input type="number" className="w-full border border-gray-200 rounded-lg p-3 text-textmain outline-none focus:border-primary transition-all"
                  value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-textmuted uppercase tracking-wider mb-1">상세 설명</label>
                <textarea className="w-full border border-gray-200 rounded-lg p-3 text-textmain outline-none focus:border-primary transition-all resize-none h-40"
                  value={editForm.content} onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))} />
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={handleEditSubmit} className="flex-1 bg-primary text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors">저장하기</button>
                <button onClick={() => { setEditForm({ title: post.title, content: post.content, price: post.price }); setIsEditing(false); }}
                  className="flex-1 border border-gray-200 text-textmuted font-bold py-2 rounded-lg hover:bg-gray-50 transition-colors">취소</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-3">
                {/* [VULN] XSS: dangerouslySetInnerHTML으로 raw HTML 렌더링 */}
                <h1 className="text-2xl font-extrabold text-textmain leading-tight" dangerouslySetInnerHTML={{__html: post.title}}></h1>
                <span className={`ml-2 flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
                  post.status === 'OnSale' ? 'bg-green-100 text-green-700' :
                  post.status === 'SoldOut' ? 'bg-gray-200 text-gray-700' : 'bg-red-100 text-red-700'
                }`}>{post.status === 'OnSale' ? '판매중' : post.status === 'SoldOut' ? '판매완료' : '숨김'}</span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {post.category && <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">{post.category}</span>}
                {post.condition && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${conditionColor[post.condition] || 'bg-gray-100 text-gray-600'}`}>{post.condition}</span>}
                {post.tradeType && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${tradeColor[post.tradeType] || 'bg-gray-100 text-gray-600'}`}>{post.tradeType}</span>}
              </div>

              <div className="text-primary text-4xl font-black mb-3">₩{post.price?.toLocaleString()}</div>
              <div className="flex items-center gap-4 text-sm text-textmuted mb-4">
                <span>👁 조회 {post.views || 0}</span>
                <span>♥ 찜 {likeCount}</span>
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-bold text-textmuted uppercase tracking-wider mb-2">상세 설명</h3>
                {/* [VULN] XSS: 내용도 dangerouslySetInnerHTML */}
                <p className="text-textmain leading-relaxed whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{__html: post.content}}></p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                <div className="flex flex-col gap-1 text-sm text-textmuted">
                  <span>판매자:
                    <Link to={`/seller/${post.author?.userId}`} className="ml-1 font-bold text-textmain hover:text-primary transition-colors hover:underline underline-offset-2">
                      {post.author?.userId}
                    </Link>
                  </span>
                  <span>등록일: {new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
                {post.manualPath && (
                  <a href={`${API_BASE}/board/download/${post.manualPath}`} download
                    className="flex items-center justify-center w-full py-2.5 bg-secondary/10 text-secondary hover:bg-secondary/20 font-bold rounded-lg transition-all text-sm">
                    📄 공식 매뉴얼 다운로드
                  </a>
                )}
              </div>

              {token && (
                <div className="mt-4 flex gap-2">
                  <button onClick={handleLike}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border ${liked ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100' : 'bg-white text-textmuted border-gray-200 hover:border-red-200 hover:text-red-400'}`}>
                    {liked ? '♥ 찜 취소' : '♡ 찜하기'}
                  </button>
                  {!isAuthor && (
                    <button onClick={() => setShowReportModal(true)}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs text-gray-400 border border-gray-200 hover:bg-gray-50 transition-all">신고</button>
                  )}
                </div>
              )}

              {!isAuthor && token && (
                <button onClick={async () => {
                  try {
                    const res = await api.post('/chat/start', { postId: post._id }, { headers: { Authorization: `Bearer ${token}` } });
                    navigate(`/chat/${res.data.roomId}`);
                  } catch (err) { alert(err.response?.data?.message || '채팅 시작 실패'); }
                }}
                  className="mt-3 w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 text-sm flex items-center justify-center gap-2">
                  💬 판매자에게 채팅하기
                </button>
              )}

              {!isAuthor && token && post.status === 'SoldOut' && (
                <button onClick={() => setShowReviewModal(true)}
                  className="mt-2 w-full py-2.5 bg-amber-50 text-amber-600 border border-amber-200 font-bold rounded-xl hover:bg-amber-100 transition-all text-sm">
                  ⭐ 거래 후기 남기기
                </button>
              )}

              {(canEdit || canDelete) && (
                <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-2 justify-end">
                  {isAuthor && post.status === 'OnSale' && (
                    <>
                      <button onClick={handleBump} className="px-4 py-2 bg-green-50 text-green-700 text-sm font-bold rounded hover:bg-green-100 transition-colors">🔝 끌어올리기</button>
                      <button onClick={() => handleStatusChange('SoldOut')} className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded hover:bg-gray-700 transition-colors">판매 완료 처리</button>
                    </>
                  )}
                  {isAdmin && post.status !== 'Hidden' && (
                    <button onClick={() => handleStatusChange('Hidden')} className="px-4 py-2 bg-orange-100 text-orange-700 text-sm font-bold rounded hover:bg-orange-200 transition-colors">게시글 숨기기 (관리자)</button>
                  )}
                  {canEdit && (
                    <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 text-sm font-bold rounded hover:bg-blue-100 transition-colors">수정하기</button>
                  )}
                  {canDelete && (
                    <button onClick={handleDelete} className="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-bold rounded transition-colors">게시글 삭제</button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 신고 모달 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[400px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-textmain mb-2">🚨 게시글 신고</h3>
            <p className="text-sm text-textmuted mb-5">신고 사유를 입력해주세요. 관리자가 검토 후 처리합니다.</p>
            <form onSubmit={handleReport} className="space-y-4">
              <textarea rows="4" value={reportReason} onChange={e => setReportReason(e.target.value)}
                placeholder="신고 사유 (예: 사기 의심, 불법 상품, 욕설 등)" required
                className="w-full p-3 rounded-lg border border-gray-200 outline-none focus:border-red-400 resize-none text-sm" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowReportModal(false)} className="px-4 py-2.5 text-textmuted font-medium rounded-lg hover:bg-gray-100">취소</button>
                <button type="submit" className="px-5 py-2.5 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">신고하기</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 후기 모달 */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[400px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-textmain mb-2">⭐ 거래 후기</h3>
            <p className="text-sm text-textmuted mb-5"><span className="font-bold text-textmain">{post.author?.userId}</span> 판매자에게 후기를 남겨주세요</p>
            <form onSubmit={handleReview} className="space-y-4">
              <div className="flex justify-center gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setReviewRating(n)}
                    className={`text-3xl transition-transform hover:scale-110 ${n <= reviewRating ? 'opacity-100' : 'opacity-25'}`}>⭐</button>
                ))}
              </div>
              <p className="text-center text-sm text-textmuted">{['','별로예요','아쉬워요','괜찮아요','좋아요','최고예요!'][reviewRating]}</p>
              <textarea rows="3" value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                placeholder="거래 경험을 공유해주세요 (선택)"
                className="w-full p-3 rounded-lg border border-gray-200 outline-none focus:border-amber-400 resize-none text-sm" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowReviewModal(false)} className="px-4 py-2.5 text-textmuted font-medium rounded-lg hover:bg-gray-100">취소</button>
                <button type="submit" className="px-5 py-2.5 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600">후기 등록</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
