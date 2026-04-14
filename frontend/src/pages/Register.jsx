import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

export default function Register() {
  const [formData, setFormData] = useState({ userId: '', password: '', securityAnswer: '' });
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', formData);
      alert('회원가입이 완료되었습니다! 로그인해주세요.');
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="flex justify-center mt-10">
      <div className="glass p-10 rounded-2xl w-[400px]">
        <h2 className="text-3xl font-bold mb-2 text-center text-textmain">계정 생성</h2>
        <p className="text-center text-textmuted mb-8">IT 중고장터에 가입하세요</p>
        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-textmuted mb-1">아이디</label>
            <input 
              className="w-full bg-white p-3 rounded-lg border border-gray-200 outline-none focus:border-primary transition-all" 
              placeholder="아이디를 입력하세요" 
              value={formData.userId} onChange={e=>setFormData({...formData, userId: e.target.value})} 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textmuted mb-1">비밀번호</label>
            <input 
              type="password" 
              className="w-full bg-white p-3 rounded-lg border border-gray-200 outline-none focus:border-primary transition-all" 
              placeholder="새 비밀번호" 
              value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textmuted mb-1">보안 질문: "나의 보물 1호는?"</label>
            <input 
              className="w-full bg-white p-3 rounded-lg border border-gray-200 outline-none focus:border-primary transition-all" 
              placeholder="답변을 입력하세요" 
              value={formData.securityAnswer} onChange={e=>setFormData({...formData, securityAnswer: e.target.value})} 
              required
            />
          </div>
          <button className="w-full bg-textmain hover:bg-black text-white font-bold py-3 rounded-lg transition-all mt-4">
            가입하기
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-textmuted">
          이미 계정이 있으신가요? <Link to="/login" className="text-primary hover:underline font-medium">로그인</Link>
        </p>
      </div>
    </div>
  );
}
