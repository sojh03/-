import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function BoardCreate() {
  const [formData, setFormData] = useState({ title: '', content: '', price: '' });
  const [imageFile, setImageFile] = useState(null);
  const [manualFile, setManualFile] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Please login first.");
        return navigate('/login');
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('content', formData.content);
    data.append('price', formData.price);

    if (imageFile) data.append('image', imageFile);
    if (manualFile) data.append('manual', manualFile);

    try {
      await api.post('/board', data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('게시글이 성공적으로 등록되었습니다!');
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || '게시글 등록 실패');
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-4">
      <div className="glass p-10 rounded-2xl bg-white shadow-sm">
        <h2 className="text-3xl font-extrabold mb-8 text-textmain">상품 등록하기</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-textmain mb-2">상품명</label>
            <input
              className="w-full bg-background p-3 rounded-lg border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="예: 맥북 프로 M2"
              value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div className="flex gap-6">
            <div className="flex-1">
                <label className="block text-sm font-semibold text-textmain mb-2">가격 (원)</label>
                <input
                type="number"
                className="w-full bg-background p-3 rounded-lg border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="500000"
                value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})}
                required
                />
            </div>
            <div className="flex-1">
                <label className="block text-sm font-semibold text-textmain mb-2">📷 제품 사진</label>
                <input
                type="file"
                accept="image/*"
                className="w-full bg-background p-2 rounded-lg border border-gray-200 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all"
                onChange={e=>setImageFile(e.target.files[0])}
                />
            </div>
          </div>

          <div>
             <label className="block text-sm font-semibold text-textmain mb-2">📄 공식 매뉴얼 / 보증서 (PDF/DOC)</label>
             <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-textmuted">구매자를 위해 매뉴얼이나 보증서를 첨부하세요 (선택)</span>
                <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="text-sm file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary/10 file:text-secondary hover:file:bg-secondary/20 transition-all"
                onChange={e=>setManualFile(e.target.files[0])}
                />
             </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-textmain mb-2">상세 설명</label>
            <textarea
              rows="6"
              className="w-full bg-background p-3 rounded-lg border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="제품의 상태, 스펙, 사용 기간 등을 자세히 적어주세요..."
              value={formData.content} onChange={e=>setFormData({...formData, content: e.target.value})}
              required
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
             <button type="button" onClick={() => navigate('/')} className="px-6 py-3 rounded-lg font-bold text-textmuted hover:bg-gray-100 transition-all">취소</button>
             <button type="submit" className="px-8 py-3 bg-primary hover:bg-primaryhover text-white font-bold rounded-lg shadow-lg shadow-primary/30 transition-all transform hover:-translate-y-0.5">등록하기</button>
          </div>
        </form>
      </div>
    </div>
  );
}
