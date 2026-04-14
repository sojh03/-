import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, UPLOADS_BASE } from '../api';

function MannerTempBadge({ temp }) {
  const t = parseFloat(temp) || 36.5;
  const color = t >= 38 ? 'text-orange-500' : t >= 36.5 ? 'text-blue-500' : 'text-blue-300';
  const label = t >= 40 ? '따뜻해요 🔥' : t >= 38 ? '좋아요 😊' : t >= 36.5 ? '보통이에요' : '차가워요 🥶';
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <span className={`text-lg font-extrabold ${color}`}>{t.toFixed(1)}°C</span>
      <span className="text-xs text-textmuted">매너온도</span>
      <span className="text-xs text-textmuted">· {label}</span>
    </div>
  );
}

export default function MyPage() {
  const [activeTab, setActiveTab] = useState('items');
  const [user, setUser] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // 보안 폼
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [securityAction, setSecurityAction] = useState(null); // 'password' | 'security'
  const [currentPw, setCurrentPw] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newSecurityAnswer, setNewSecurityAnswer] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!token) return navigate('/login');
    fetchUser();
    fetchMyPosts();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/auth/me', { headers });
      setUser(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchMyPosts = async () => {
    try {
      const res = await api.get('/board', { params: { adminView: true } });
      const userId = localStorage.getItem('userId');
      setMyPosts(res.data.filter(p => p.author?.userId === userId));
    } catch (err) { console.error(err); }
  };

  const handleProfileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('profileImage', file);
    try {
      const res = await api.put('/auth/profile-image', formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      localStorage.setItem('profileImage', res.data.profileImage);
      fetchUser();
      window.location.reload();
    } catch (err) { alert('업로드 실패'); }
  };

  const openSecurityAction = (action) => {
    setSecurityAction(action);
    setShowPasswordModal(true);
    setVerified(false);
    setCurrentPw('');
    setNewPassword('');
    setNewSecurityAnswer('');
  };

  const verifyPassword = async (e) => {
    e.preventDefault();
    // 비밀번호 검증: 로그인 API로 확인
    try {
      await api.post('/auth/login', { userId: localStorage.getItem('userId'), password: currentPw });
      setVerified(true);
    } catch (err) {
      alert('비밀번호가 틀립니다');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/change-password', { currentPassword: currentPw, newPassword }, { headers });
      alert('비밀번호가 변경되었습니다');
      setShowPasswordModal(false);
    } catch (err) { alert(err.response?.data?.message || '변경 실패'); }
  };

  const handleChangeSecurity = async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/change-security', { currentPassword: currentPw, newSecurityAnswer }, { headers });
      alert('보안 답변이 변경되었습니다');
      setShowPasswordModal(false);
    } catch (err) { alert(err.response?.data?.message || '변경 실패'); }
  };

  if (!user) return <div className="text-center py-20 text-textmuted">로딩중...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {/* 프로필 헤더 */}
      <div className="glass rounded-2xl p-8 mb-6 flex items-center gap-6">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-lg">
            {user.profileImage ? (
              <img src={`${UPLOADS_BASE}/${user.profileImage}`} alt="프로필" className="w-full h-full object-cover"/>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200">
                {user.userId.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
            <span className="text-white text-xs font-bold">변경</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleProfileUpload}/>
          </label>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-textmain">{user.userId}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${user.role === 'Admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {user.role === 'Admin' ? '관리자' : '일반 사용자'}
            </span>
            <span className="text-sm text-textmuted">가입일: {new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="text-sm text-textmuted mt-1">등록 상품 {myPosts.length}개</div>
          <MannerTempBadge temp={user.mannerTemp ?? 36.5} />
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setActiveTab('items')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'items' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
          📦 내 상품
        </button>
        <button onClick={() => setActiveTab('security')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'security' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
          🔒 보안 설정
        </button>
      </div>

      {/* 내 상품 */}
      {activeTab === 'items' && (
        <div>
          {myPosts.length === 0 ? (
            <div className="text-center py-16 text-textmuted glass rounded-2xl">
              <p className="text-lg mb-2">등록한 상품이 없습니다.</p>
              <Link to="/create" className="text-primary hover:underline">첫 상품을 등록해보세요</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {myPosts.map(post => (
                <Link to={`/post/${post._id}`} key={post._id}
                  className="bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                    {post.imagePath ? (
                      <img src={`${UPLOADS_BASE}/${post.imagePath}`} alt={post.title} className="w-full h-full object-cover"/>
                    ) : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">없음</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        post.status === 'OnSale' ? 'bg-green-100 text-green-700' :
                        post.status === 'SoldOut' ? 'bg-gray-200 text-gray-600' : 'bg-red-100 text-red-600'
                      }`}>{post.status === 'OnSale' ? '판매중' : post.status === 'SoldOut' ? '판매완료' : '숨김'}</span>
                      <h3 className="text-sm font-bold text-textmain truncate">{post.title}</h3>
                    </div>
                    <p className="text-xs text-textmuted">{new Date(post.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-base font-extrabold text-primary">{post.price?.toLocaleString()}원</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 보안 설정 */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-textmain mb-1">비밀번호 변경</h3>
            <p className="text-sm text-textmuted mb-4">비밀번호를 변경합니다. 현재 비밀번호 확인이 필요합니다.</p>
            <button onClick={() => openSecurityAction('password')}
              className="px-5 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-sm">
              비밀번호 변경
            </button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-textmain mb-1">보안 질문 답변 변경</h3>
            <p className="text-sm text-textmuted mb-2">질문: <span className="font-medium text-textmain">{user.securityQuestion}</span></p>
            <button onClick={() => openSecurityAction('security')}
              className="px-5 py-2.5 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors text-sm">
              답변 변경
            </button>
          </div>
        </div>
      )}

      {/* 비밀번호 확인 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[400px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            {!verified ? (
              <>
                <h3 className="text-xl font-bold text-textmain mb-2">🔐 비밀번호 확인</h3>
                <p className="text-sm text-textmuted mb-6">보안 설정을 변경하려면 현재 비밀번호를 입력하세요.</p>
                <form onSubmit={verifyPassword} className="space-y-4">
                  <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                    placeholder="현재 비밀번호" autoFocus required
                    className="w-full p-3 rounded-lg border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"/>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2.5 text-textmuted font-medium rounded-lg hover:bg-gray-100">취소</button>
                    <button type="submit" className="px-5 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-blue-700">확인</button>
                  </div>
                </form>
              </>
            ) : securityAction === 'password' ? (
              <>
                <h3 className="text-xl font-bold text-textmain mb-2">새 비밀번호 입력</h3>
                <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="새 비밀번호" autoFocus required
                    className="w-full p-3 rounded-lg border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"/>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2.5 text-textmuted font-medium rounded-lg hover:bg-gray-100">취소</button>
                    <button type="submit" className="px-5 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-blue-700">변경</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-textmain mb-2">새 보안 답변 입력</h3>
                <p className="text-sm text-textmuted mb-4">질문: "{user.securityQuestion}"</p>
                <form onSubmit={handleChangeSecurity} className="space-y-4">
                  <input type="text" value={newSecurityAnswer} onChange={e => setNewSecurityAnswer(e.target.value)}
                    placeholder="새 답변" autoFocus required
                    className="w-full p-3 rounded-lg border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"/>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2.5 text-textmuted font-medium rounded-lg hover:bg-gray-100">취소</button>
                    <button type="submit" className="px-5 py-2.5 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700">변경</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
