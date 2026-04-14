import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function ChatRoom() {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [postStatus, setPostStatus] = useState(null);
  const [reviewed, setReviewed] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [completing, setCompleting] = useState(false);
  const bottomRef = useRef(null);
  const currentUserId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchMessages();
    fetchRoomInfo();
    markAsRead();
    const interval = setInterval(() => {
      fetchMessages();
      fetchRoomInfo();
      markAsRead();
    }, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const markAsRead = async () => {
    try { await api.post(`/chat/${roomId}/read`, {}, { headers }); } catch { /* ignore */ }
  };

  const fetchRoomInfo = async () => {
    try {
      const res = await api.get('/chat/rooms', { headers });
      const room = res.data.find(r => r._id === roomId);
      if (room) {
        setRoomInfo(room);
        setPostStatus(room.post?.status);
      }
    } catch (err) { console.error(err); }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chat/${roomId}/messages`, { headers });
      setMessages(res.data);
    } catch (err) { console.error(err); }
  };

  const checkReviewed = async () => {
    try {
      const res = await api.get(`/reviews/manner/check/${roomId}`, { headers });
      setReviewed(res.data.reviewed);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (postStatus === 'SoldOut') checkReviewed();
  }, [postStatus]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await api.post(`/chat/${roomId}/messages`, { content: input.trim() }, { headers });
      setInput('');
      fetchMessages();
    } catch { alert('전송 실패'); }
  };

  const handleComplete = async () => {
    if (!window.confirm('판매완료 처리하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    setCompleting(true);
    try {
      await api.post(`/chat/${roomId}/complete`, {}, { headers });
      setPostStatus('SoldOut');
      await fetchRoomInfo();
    } catch (err) {
      alert(err.response?.data?.message || '판매완료 처리 실패');
    } finally {
      setCompleting(false);
    }
  };

  const handleReview = async (recommend) => {
    try {
      await api.post('/reviews/manner', { roomId, recommend }, { headers });
      setReviewed(true);
      setReviewDone(true);
    } catch (err) {
      alert(err.response?.data?.message || '후기 등록 실패');
    }
  };

  const isSeller = roomInfo?.seller?.userId === currentUserId;

  const otherUser = roomInfo
    ? (roomInfo.buyer?.userId === currentUserId ? roomInfo.seller?.userId : roomInfo.buyer?.userId)
    : '...';

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
        <Link to="/chat" className="text-gray-400 hover:text-primary text-xl transition-colors">←</Link>
        <div className="flex-1">
          <div className="font-bold text-textmain">{otherUser}</div>
          {roomInfo?.post && (
            <div className="flex items-center gap-2">
              <Link to={`/post/${roomInfo.post._id}`} className="text-xs text-primary hover:underline">
                {roomInfo.post.title} · {roomInfo.post.price?.toLocaleString()}원
              </Link>
              {postStatus === 'SoldOut' && (
                <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">판매완료</span>
              )}
            </div>
          )}
        </div>
        {/* 판매완료 버튼 - 판매자만, OnSale 상태일 때만 */}
        {isSeller && postStatus === 'OnSale' && (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="px-3 py-1.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap">
            {completing ? '처리중...' : '판매완료'}
          </button>
        )}
      </div>

      {/* 매너 후기 배너 - 판매완료 후 아직 후기 미작성 시 */}
      {postStatus === 'SoldOut' && !reviewed && (
        <div className="mb-3 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-orange-800 mb-2">
            {reviewDone ? '후기가 등록되었습니다! 감사합니다 😊' : `거래가 완료되었습니다! ${otherUser}님은 어떠셨나요?`}
          </p>
          {!reviewDone && (
            <div className="flex gap-2">
              <button
                onClick={() => handleReview(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition-colors">
                👍 추천해요
              </button>
              <button
                onClick={() => handleReview(false)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-bold rounded-lg transition-colors">
                👎 별로예요
              </button>
            </div>
          )}
        </div>
      )}

      {/* 이미 후기 작성한 경우 */}
      {postStatus === 'SoldOut' && reviewed && !reviewDone && (
        <div className="mb-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <p className="text-xs text-textmuted">이미 후기를 작성하셨습니다.</p>
        </div>
      )}

      {reviewDone && (
        <div className="mb-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <p className="text-xs text-green-700 font-medium">후기가 등록되었습니다! 감사합니다 😊</p>
        </div>
      )}

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-16 text-textmuted">
            <p className="text-lg mb-1">대화를 시작해보세요!</p>
            <p className="text-sm">상품에 대해 궁금한 점을 물어보세요</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.sender?.userId === currentUserId;
          return (
            <div key={msg._id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%]`}>
                {!isMine && <div className="text-xs text-gray-400 mb-1 ml-1">{msg.sender?.userId}</div>}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMine ? 'bg-primary text-white rounded-br-md' : 'bg-gray-100 text-textmain rounded-bl-md'
                }`}>{msg.content}</div>
                <div className={`text-[10px] text-gray-400 mt-0.5 ${isMine ? 'text-right mr-1' : 'ml-1'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* 입력 */}
      <form onSubmit={sendMessage} className="flex gap-2 pt-3 border-t border-gray-100">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
          autoFocus/>
        <button type="submit"
          className="px-5 py-3 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm whitespace-nowrap">전송</button>
      </form>
    </div>
  );
}
