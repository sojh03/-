import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, UPLOADS_BASE } from '../api';

export default function ChatList() {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.get('/chat/rooms', { headers: { Authorization: `Bearer ${token}` } });
      setRooms(res.data);
    } catch (err) { console.error(err); }
  };

  if (rooms.length === 0) return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold text-textmain mb-6">💬 채팅</h1>
      <div className="text-center py-20 text-textmuted glass rounded-2xl">
        <p className="text-xl mb-2">채팅 내역이 없습니다.</p>
        <Link to="/" className="text-primary hover:underline">상품을 둘러보세요</Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold text-textmain mb-6">💬 채팅</h1>
      <div className="flex flex-col gap-2">
        {rooms.map(room => {
          const other = room.buyer?.userId === currentUserId ? room.seller : room.buyer;
          const hasUnread = room.unreadCount > 0;
          return (
            <Link to={`/chat/${room._id}`} key={room._id}
              className={`bg-white rounded-xl border transition-all p-4 flex items-center gap-4 ${
                hasUnread ? 'border-primary/30 shadow-sm shadow-primary/10' : 'border-gray-100 hover:shadow-md hover:border-primary/20'
              }`}>
              {/* 썸네일 */}
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden relative">
                {room.post?.imagePath ? (
                  <img src={`${UPLOADS_BASE}/${room.post.imagePath}`} alt="" className="w-full h-full object-cover"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">없음</div>
                )}
              </div>
              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-bold ${hasUnread ? 'text-textmain' : 'text-textmain'}`}>{other?.userId}</span>
                  <span className="text-xs text-gray-400">· {room.post?.title}</span>
                </div>
                <p className={`text-sm truncate ${hasUnread ? 'text-textmain font-semibold' : 'text-textmuted'}`}>
                  {room.lastMessage || '대화를 시작해보세요'}
                </p>
              </div>
              {/* 시간 + 뱃지 */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="text-xs text-gray-400">
                  {new Date(room.updatedAt).toLocaleDateString()}
                </span>
                {hasUnread && (
                  <span className="min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5">
                    {room.unreadCount > 99 ? '99+' : room.unreadCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
