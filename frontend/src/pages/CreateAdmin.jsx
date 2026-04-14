import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function CreateAdmin() {
  const [formData, setFormData] = useState({ userId: '', password: '', securityAnswer: '' });
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await api.post('/auth/admin-create', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('관리자 계정이 성공적으로 생성되었습니다!');
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Admin creation failed. Only admins can create admins.');
    }
  };

  return (
    <div className="flex justify-center mt-10">
      <div className="glass p-10 rounded-2xl w-[400px]">
        <h2 className="text-3xl font-bold mb-2 text-center text-textmain">관리자 생성</h2>
        <p className="text-center text-textmuted mb-8">새로운 관리자 계정을 추가하세요</p>
        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-textmuted mb-1">관리자 아이디</label>
            <input 
              className="w-full bg-white p-3 rounded-lg border border-gray-200 outline-none focus:border-red-500 transition-all" 
              placeholder="아이디를 입력하세요" 
              value={formData.userId} onChange={e=>setFormData({...formData, userId: e.target.value})} 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textmuted mb-1">비밀번호</label>
            <input 
              type="password" 
              className="w-full bg-white p-3 rounded-lg border border-gray-200 outline-none focus:border-red-500 transition-all" 
              placeholder="새 비밀번호" 
              value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textmuted mb-1">보안 질문: "나의 보물 1호는?"</label>
            <input 
              className="w-full bg-white p-3 rounded-lg border border-gray-200 outline-none focus:border-red-500 transition-all" 
              placeholder="답변을 입력하세요" 
              value={formData.securityAnswer} onChange={e=>setFormData({...formData, securityAnswer: e.target.value})} 
              required
            />
          </div>
          <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all mt-4">
            관리자 계정 생성
          </button>
        </form>
      </div>
    </div>
  );
}
