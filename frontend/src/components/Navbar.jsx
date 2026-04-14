import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, UPLOADS_BASE } from '../api';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('userId');
  const profileImage = localStorage.getItem('profileImage');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    const fetchUnread = async () => {
      try {
        const res = await api.get('/chat/unread-count', { headers: { Authorization: `Bearer ${token}` } });
        setUnreadCount(res.data.unreadCount || 0);
      } catch (err) { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('profileImage');
    navigate('/login');
  };

  return (
    <nav className="glass fixed w-full z-50 top-0 left-0 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            IT 중고장터
          </Link>
          <div className="flex space-x-4 items-center">
            {token ? (
              <>
                <Link to="/create" className="text-textmain font-medium hover:text-primary transition-colors">
                  판매하기
                </Link>
                <Link to="/chat" className="relative text-textmain font-medium hover:text-primary transition-colors">
                  💬 채팅
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse shadow-sm shadow-red-500/50">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
                {role === 'Admin' && (
                  <>
                    <Link to="/admin-create" className="text-red-600 font-medium hover:text-red-800 transition-colors">
                      관리자 생성
                    </Link>
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Admin</span>
                  </>
                )}
                <button onClick={handleLogout} className="px-4 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                  로그아웃
                </button>
                {/* 프로필 */}
                <Link to="/mypage" className="flex-shrink-0" title="마이페이지">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary/30 hover:border-primary transition-colors shadow-sm bg-gray-100">
                    {profileImage ? (
                      <img src={`${UPLOADS_BASE}/${profileImage}`} alt="프로필" className="w-full h-full object-cover"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary bg-primary/10">
                        {userId ? userId.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-textmain font-medium hover:text-primary transition-colors">
                  로그인
                </Link>
                <Link to="/register" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primaryhover shadow-lg shadow-primary/30 transition-all font-medium">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
