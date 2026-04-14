import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { userId, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      localStorage.setItem('userId', res.data.userId);
      localStorage.setItem('profileImage', res.data.profileImage || '');
      navigate('/');
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="flex justify-center mt-16">
      <div className="glass p-10 rounded-2xl w-[400px]">
        <h2 className="text-3xl font-bold mb-2 text-center text-textmain">환영합니다!</h2>
        <p className="text-center text-textmuted mb-8">서비스를 이용하려면 로그인하세요</p>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-textmuted mb-1">아이디</label>
            <input
              className="w-full bg-white p-3 rounded-lg border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="아이디를 입력하세요"
              value={userId} onChange={e=>setUserId(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textmuted mb-1">비밀번호</label>
            <input
              type="password"
              className="w-full bg-white p-3 rounded-lg border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="비밀번호를 입력하세요"
              value={password} onChange={e=>setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end">
            <Link to="/find-password" className="text-sm text-primary hover:text-primaryhover font-medium">비밀번호 찾기</Link>
          </div>
          <button className="w-full bg-primary hover:bg-primaryhover text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/30 transition-all transform hover:-translate-y-0.5">
            로그인
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-textmuted">
          계정이 없으신가요? <Link to="/register" className="text-primary hover:underline font-medium">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
