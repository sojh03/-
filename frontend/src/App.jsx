import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import BoardList from './pages/BoardList';
import BoardDetail from './pages/BoardDetail';
import BoardCreate from './pages/BoardCreate';
import Login from './pages/Login';
import Register from './pages/Register';
import FindPassword from './pages/FindPassword';
import CreateAdmin from './pages/CreateAdmin';
import ChatList from './pages/ChatList';
import ChatRoom from './pages/ChatRoom';
import MyPage from './pages/MyPage';

function App() {
  return (
    <div className="min-h-screen bg-background text-textmain font-sans selection:bg-primary/20">
      <Navbar />
      <div className="pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<BoardList />} />
          <Route path="/post/:id" element={<BoardDetail />} />
          <Route path="/create" element={<BoardCreate />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin-create" element={<CreateAdmin />} />
          <Route path="/find-password" element={<FindPassword />} />
          <Route path="/chat" element={<ChatList />} />
          <Route path="/chat/:roomId" element={<ChatRoom />} />
          <Route path="/mypage" element={<MyPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
