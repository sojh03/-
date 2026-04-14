import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, UPLOADS_BASE, API_BASE } from '../api';

export default function BoardDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', price: '' });
  const navigate = useNavigate();

  const currentUserId = localStorage.getItem('userId');
  const currentUserRole = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  useEffect(() => {
    api.get(`/board/${id}`).then(res => {
      setPost(res.data);
      setEditForm({ title: res.data.title, content: res.data.content, price: res.data.price });
    }).catch(console.error);
  }, [id]);

  const handleDelete = async () => {
    if(!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/board/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      alert('게시글이 삭제되었습니다.');
      navigate('/');
    } catch(err) {
      alert(err.response?.data?.message || '삭제 실패');
    }
  };

  const handleEditSubmit = async () => {
    try {
      const res = await api.put(`/board/${id}`, {
        title: editForm.title,
        content: editForm.content,
        price: Number(editForm.price)
      }, { headers: { 'Authorization': `Bearer ${token}` } });
      setPost(res.data);
      setIsEditing(false);
      alert('게시글이 수정되었습니다.');
    } catch(err) {
      alert(err.response?.data?.message || '수정 실패');
    }
  };

  const handleEditCancel = () => {
    setEditForm({ title: post.title, content: post.content, price: post.price });
    setIsEditing(false);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.put(`/board/${id}`, { status: newStatus }, { headers: { 'Authorization': `Bearer ${token}` } });
      setPost({...post, status: newStatus});
    } catch(err) {
      alert(err.response?.data?.message || '상태 업데이트 실패');
    }
  };

  if (!post) return <div className="text-center mt-20 text-textmuted">로딩 중...</div>;

  const isAuthor = post.author?.userId === currentUserId;
  const isAdmin = currentUserRole === 'Admin';
  const canEdit = isAuthor;           // 수정: 작성자만
  const canDelete = isAuthor || isAdmin; // 삭제: 작성자 OR 관리자

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-4">
      <div className="md:flex">
        {/* 이미지 영역 */}
        <div className="md:w-1/2 bg-background flex items-center justify-center p-8 border-r border-gray-100">
          {post.imagePath ? (
            <img src={`${UPLOADS_BASE}/${post.imagePath}`} alt={post.title} className="max-h-96 w-auto object-contain drop-shadow-xl rounded" />
          ) : (
            <div className="h-64 flex items-center justify-center text-textmuted">사진 없음</div>
          )}
        </div>

        {/* 내용 영역 */}
        <div className="md:w-1/2 p-8 lg:p-12 flex flex-col">
          {isEditing ? (
            /* ─── 수정 모드 ─── */
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-textmuted uppercase tracking-wider mb-1">제목</label>
                <input
                  className="w-full border border-gray-200 rounded-lg p-3 text-textmain outline-none focus:border-primary transition-all"
                  value={editForm.title}
                  onChange={e => setEditForm({...editForm, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-textmuted uppercase tracking-wider mb-1">가격 (₩)</label>
                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-lg p-3 text-textmain outline-none focus:border-primary transition-all"
                  value={editForm.price}
                  onChange={e => setEditForm({...editForm, price: e.target.value})}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-textmuted uppercase tracking-wider mb-1">상세 설명</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg p-3 text-textmain outline-none focus:border-primary transition-all resize-none h-40"
                  value={editForm.content}
                  onChange={e => setEditForm({...editForm, content: e.target.value})}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleEditSubmit}
                  className="flex-1 bg-primary text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  저장하기
                </button>
                <button
                  onClick={handleEditCancel}
                  className="flex-1 border border-gray-200 text-textmuted font-bold py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            /* ─── 뷰 모드 ─── */
            <>
              <div className="flex justify-between items-start mb-4">
                {/* [VULN] XSS: dangerouslySetInnerHTML로 raw HTML 렌더링 → <script>, <img onerror> 등 실행 */}
                <h1 className="text-3xl font-extrabold text-textmain" dangerouslySetInnerHTML={{__html: post.title}}></h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  post.status === 'OnSale' ? 'bg-green-100 text-green-700' :
                  post.status === 'SoldOut' ? 'bg-gray-200 text-gray-700' : 'bg-red-100 text-red-700'
                }`}>{post.status}</span>
              </div>
              <div className="text-primary text-4xl font-black mb-8">₩{post.price?.toLocaleString()}</div>

              <div className="flex-1">
                <h3 className="text-sm font-bold text-textmuted uppercase tracking-wider mb-2">상세 설명</h3>
                {/* [VULN] XSS: 내용도 dangerouslySetInnerHTML - 게시글 조회 시 삽입된 스크립트 실행 */}
                <p className="text-textmain leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: post.content}}></p>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
                <div className="flex flex-col gap-2 text-sm text-textmuted">
                  <span>판매자: <span className="font-bold text-textmain">{post.author?.userId}</span></span>
                  <span>등록일: {new Date(post.createdAt).toLocaleDateString()}</span>
                </div>

                {post.manualPath && (
                  <a
                    href={`${API_BASE}/board/download/${post.manualPath}`}
                    download
                    className="mt-4 flex items-center justify-center w-full py-3 bg-secondary/10 text-secondary hover:bg-secondary/20 font-bold rounded-lg transition-all"
                  >
                    📄 공식 매뉴얼 다운로드
                  </a>
                )}
              </div>

              {/* ─── 채팅 버튼 (타인 게시글 + 로그인 시) ─── */}
              {!isAuthor && localStorage.getItem('token') && (
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const res = await api.post('/chat/start', { postId: post._id }, { headers: { Authorization: `Bearer ${token}` } });
                      navigate(`/chat/${res.data.roomId}`);
                    } catch (err) { alert(err.response?.data?.message || '채팅 시작 실패'); }
                  }}
                  className="mt-4 w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 text-sm flex items-center justify-center gap-2"
                >
                  💬 판매자에게 채팅하기
                </button>
              )}

              {/* ─── 액션 버튼 영역 ─── */}
              {(canEdit || canDelete) && (
                <div className="mt-6 pt-6 border-t border-gray-50 flex flex-wrap gap-2 justify-end">
                  {/* 판매 완료: 작성자만 */}
                  {isAuthor && post.status === 'OnSale' && (
                    <button onClick={() => handleStatusChange('SoldOut')} className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded hover:bg-gray-700 transition-colors">
                      판매 완료 처리
                    </button>
                  )}
                  {/* 숨기기: 관리자만 */}
                  {isAdmin && post.status !== 'Hidden' && (
                    <button onClick={() => handleStatusChange('Hidden')} className="px-4 py-2 bg-orange-100 text-orange-700 text-sm font-bold rounded hover:bg-orange-200 transition-colors">
                      게시글 숨기기 (관리자)
                    </button>
                  )}
                  {/* 수정: 작성자만 */}
                  {canEdit && (
                    <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 text-sm font-bold rounded hover:bg-blue-100 transition-colors">
                      수정하기
                    </button>
                  )}
                  {/* 삭제: 작성자 OR 관리자 */}
                  {canDelete && (
                    <button onClick={handleDelete} className="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-bold rounded transition-colors">
                      게시글 삭제
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
