import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function ChatRoom() {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
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
      markAsRead();
    }, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const markAsRead = async () => {
    try { await api.post(`/chat/${roomId}/read`, {}, { headers }); } catch (err) { /* ignore */ }
  };

  const fetchRoomInfo = async () => {
    try {
      const res = await api.get('/chat/rooms', { headers });
      const room = res.data.find(r => r._id === roomId);
      if (room) setRoomInfo(room);
    } catch (err) { console.error(err); }
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chat/${roomId}/messages`, { headers });
      setMessages(res.data);
    } catch (err) { console.error(err); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      await api.post(`/chat/${roomId}/messages`, { content: input.trim() }, { headers });
      setInput('');
      fetchMessages();
    } catch (err) { alert('전송 실패'); }
  };

  const otherUser = roomInfo
    ? (roomInfo.buyer?.userId === currentUserId ? roomInfo.seller?.userId : roomInfo.buyer?.userId)
    : '...';

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
        <Link to="/chat" className="text-gray-400 hover:text-primary text-xl transition-colors">←</Link>
        <div className="flex-1">
          <div className="font-bold text-textmain">{otherUser}</div>
          {roomInfo?.post && (
            <Link to={`/post/${roomInfo.post._id}`} className="text-xs text-primary hover:underline">
              {roomInfo.post.title} · {roomInfo.post.price?.toLocaleString()}원
            </Link>
          )}
        </div>
      </div>

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
