import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const CATEGORIES = ['노트북/PC', '스마트폰', '태블릿', '카메라', '오디오', '게임/콘솔', '주변기기', '기타'];
const CONDITIONS = ['미개봉', '중고'];
const TRADE_TYPES = ['직거래', '택배', '상관없음'];

export default function BoardCreate() {
  const [formData, setFormData] = useState({
    title: '', content: '', price: '',
    category: '기타', condition: '중고', tradeType: '상관없음'
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [manualFile, setManualFile] = useState(null);
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImageFiles(files);
    setImagePreviews(files.map(f => URL.createObjectURL(f)));
  };

  const removeImage = (idx) => {
    setImageFiles(p => p.filter((_, i) => i !== idx));
    setImagePreviews(p => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) { alert('로그인이 필요합니다'); return navigate('/login'); }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('content', formData.content);
    data.append('price', formData.price);
    data.append('category', formData.category);
    data.append('condition', formData.condition);
    data.append('tradeType', formData.tradeType);
    imageFiles.forEach(f => data.append('images', f));
    if (manualFile) data.append('manual', manualFile);

    try {
      await api.post('/board', data, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      alert('게시글이 등록되었습니다!');
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || '등록 실패');
    }
  };

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  return (
    <div className="max-w-3xl mx-auto mt-4">
      <div className="glass p-10 rounded-2xl bg-white shadow-sm">
        <h2 className="text-3xl font-extrabold mb-8 text-textmain">상품 등록하기</h2>
        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label className="block text-sm font-semibold text-textmain mb-2">상품명</label>
            <input className="w-full bg-background p-3 rounded-lg border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="예: 맥북 프로 M2" value={formData.title}
              onChange={e => set('title', e.target.value)} required />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[['카테고리', 'category', CATEGORIES], ['상품 상태', 'condition', CONDITIONS], ['거래 방식', 'tradeType', TRADE_TYPES]].map(([label, key, opts]) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-textmain mb-2">{label}</label>
                <select className="w-full bg-background p-3 rounded-lg border border-gray-200 outline-none focus:border-primary text-sm"
                  value={formData[key]} onChange={e => set(key, e.target.value)}>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold text-textmain mb-2">가격 (원)</label>
            <input type="number" className="w-full bg-background p-3 rounded-lg border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="500000" value={formData.price}
              onChange={e => set('price', e.target.value)} required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-textmain mb-2">
              📷 제품 사진 <span className="text-xs text-textmuted font-normal">(최대 5장)</span>
            </label>
            <input type="file" accept="image/*" multiple
              className="w-full bg-background p-2 rounded-lg border border-gray-200 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all"
              onChange={handleImageChange} />
            {imagePreviews.length > 0 && (
              <div className="flex gap-3 mt-3 flex-wrap">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    {i === 0 && <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-primary/80 text-white rounded-b-lg py-0.5">대표</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-textmain mb-2">📄 공식 매뉴얼 / 보증서 (PDF/DOC)</label>
            <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 flex items-center justify-between">
              <span className="text-sm text-textmuted">구매자를 위해 매뉴얼이나 보증서를 첨부하세요 (선택)</span>
              <input type="file" accept=".pdf,.doc,.docx"
                className="text-sm file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary/10 file:text-secondary hover:file:bg-secondary/20 transition-all"
                onChange={e => setManualFile(e.target.files[0])} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-textmain mb-2">상세 설명</label>
            <textarea rows="6"
              className="w-full bg-background p-3 rounded-lg border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="제품의 상태, 스펙, 사용 기간 등을 자세히 적어주세요..."
              value={formData.content} onChange={e => set('content', e.target.value)} required />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => navigate('/')}
              className="px-6 py-3 rounded-lg font-bold text-textmuted hover:bg-gray-100 transition-all">취소</button>
            <button type="submit"
              className="px-8 py-3 bg-primary hover:bg-primaryhover text-white font-bold rounded-lg shadow-lg shadow-primary/30 transition-all transform hover:-translate-y-0.5">등록하기</button>
          </div>
        </form>
      </div>
    </div>
  );
}
