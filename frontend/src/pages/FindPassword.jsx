import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';

export default function FindPassword() {
  const [formData, setFormData] = useState({ userId: '', securityAnswer: '' });
  const [foundPassword, setFoundPassword] = useState('');
  const navigate = useNavigate();

  const handleFind = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/find-password', formData);
      setFoundPassword(response.data.password);
    } catch (err) {
      alert(err.response?.data?.message || 'Password find failed');
    }
  };

  return (
    <div className="flex justify-center mt-16">
      <div className="glass p-10 rounded-2xl w-[400px]">
        <h2 className="text-3xl font-bold mb-2 text-center text-textmain">비밀번호 찾기</h2>
        <p className="text-center text-textmuted mb-8">보안 질문에 답하여 비밀번호를 확인하세요</p>
        {!foundPassword ? (
          <form onSubmit={handleFind} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-textmuted mb-1">아이디</label>
              <input
                className="w-full bg-white p-3 rounded-lg border border-gray-200 outline-none focus:border-primary"
                placeholder="가입한 아이디"
                value={formData.userId} onChange={e=>setFormData({...formData, userId: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textmuted mb-1">보안 질문: "나의 보물 1호는?"</label>
              <input
                className="w-full bg-white p-3 rounded-lg border border-gray-200 outline-none focus:border-primary"
                placeholder="답변 입력"
                value={formData.securityAnswer} onChange={e=>setFormData({...formData, securityAnswer: e.target.value})}
                required
              />
            </div>
            <button className="w-full bg-secondary hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all mt-4">
              비밀번호 확인
            </button>
          </form>
        ) : (
          <div className="space-y-5 text-center">
            <div className="p-4 bg-gray-100 rounded-lg border border-gray-200">
              <span className="text-sm text-textmuted block mb-1">회원님의 비밀번호는 다음과 같습니다</span>
              <span className="text-xl font-bold text-primary">{foundPassword}</span>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all mt-4"
            >
              로그인하러 가기
            </button>
          </div>
        )}
        <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-textmuted hover:text-primary transition-colors">로그인으로 돌아가기</Link>
        </div>
      </div>
    </div>
  );
}
