import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function AdminPanel() {
  const [tab, setTab] = useState('users'); // 'users' | 'reports'
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState(null); // { id, userId }
  const [resetPw, setResetPw] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const myUserId = localStorage.getItem('userId');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (localStorage.getItem('role') !== 'Admin') return navigate('/');
    fetchUsers();
    fetchReports();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/admin/users', { headers });
      setUsers(res.data);
    } catch (err) {
      alert('유저 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (user) => {
    const action = user.isBanned ? '제한 해제' : '로그인 제한';
    if (!window.confirm(`${user.userId} 계정을 ${action}하시겠습니까?`)) return;
    try {
      const res = await api.put(`/auth/admin/users/${user._id}/ban`, {}, { headers });
      alert(res.data.message);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || '처리 실패');
    }
  };

  const handleRoleToggle = async (user) => {
    const newRole = user.role === 'Admin' ? 'User' : 'Admin';
    if (!window.confirm(`${user.userId}의 역할을 ${newRole}로 변경하시겠습니까?`)) return;
    try {
      await api.put(`/auth/admin/users/${user._id}/role`, {}, { headers });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || '처리 실패');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/auth/admin/users/${resetTarget.id}/reset-password`, { newPassword: resetPw }, { headers });
      alert(`${resetTarget.userId}의 비밀번호가 초기화되었습니다`);
      setResetTarget(null);
      setResetPw('');
    } catch (err) {
      alert(err.response?.data?.message || '처리 실패');
    }
  };

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports', { headers });
      setReports(res.data);
    } catch (err) { /* ignore */ }
  };

  const handleResolve = async (reportId) => {
    try {
      await api.put(`/reports/${reportId}/resolve`, {}, { headers });
      setReports(prev => prev.map(r => r._id === reportId ? { ...r, status: 'resolved' } : r));
    } catch (err) {
      alert('처리 실패');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`${user.userId} 계정과 해당 게시글을 영구 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await api.delete(`/auth/admin/users/${user._id}`, { headers });
      alert('삭제되었습니다');
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || '처리 실패');
    }
  };

  const totalUsers   = users.length;
  const totalBanned  = users.filter(u => u.isBanned).length;
  const totalAdmins  = users.filter(u => u.role === 'Admin').length;
  const totalPosts   = users.reduce((s, u) => s + (u.postCount || 0), 0);
  const pendingReports = reports.filter(r => r.status === 'pending').length;

  if (loading) return <div className="text-center py-20 text-textmuted">로딩 중...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold text-textmain mb-2">관리자 패널</h1>
      <p className="text-textmuted mb-6 text-sm">사용자 계정 및 신고 내역을 관리합니다</p>

      {/* 요약 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: '전체 회원', value: totalUsers, color: 'text-primary' },
          { label: '관리자', value: totalAdmins, color: 'text-red-600' },
          { label: '제한 계정', value: totalBanned, color: 'text-orange-500' },
          { label: '전체 게시글', value: totalPosts, color: 'text-green-600' },
          { label: '미처리 신고', value: pendingReports, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-xl p-4 text-center">
            <div className={`text-3xl font-extrabold ${color}`}>{value}</div>
            <div className="text-xs text-textmuted mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-6">
        <button onClick={() => setTab('users')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === 'users' ? 'border-primary text-primary' : 'border-transparent text-textmuted hover:text-textmain'}`}>
          회원 관리
        </button>
        <button onClick={() => setTab('reports')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${tab === 'reports' ? 'border-primary text-primary' : 'border-transparent text-textmuted hover:text-textmain'}`}>
          신고 관리
          {pendingReports > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {pendingReports}
            </span>
          )}
        </button>
      </div>

      {/* 신고 관리 탭 */}
      {tab === 'reports' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-textmain">신고 목록</h2>
            <button onClick={fetchReports} className="text-xs text-primary hover:underline">새로고침</button>
          </div>
          {reports.length === 0 ? (
            <div className="text-center py-16 text-textmuted">신고 내역이 없습니다</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {reports.map(report => (
                <div key={report._id} className={`px-6 py-4 flex items-start justify-between gap-4 ${report.status === 'resolved' ? 'opacity-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${report.targetType === 'post' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                        {report.targetType === 'post' ? '게시글' : '사용자'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${report.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                        {report.status === 'pending' ? '미처리' : '처리완료'}
                      </span>
                      <span className="text-xs text-textmuted">{new Date(report.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <p className="text-sm font-semibold text-textmain truncate">
                      신고 대상: {report.targetName || report.targetId}
                    </p>
                    <p className="text-xs text-textmuted mt-0.5">
                      신고자: <span className="font-medium text-textmain">{report.reporter?.userId || '탈퇴한 사용자'}</span>
                    </p>
                    <p className="text-sm text-textmain mt-1 bg-gray-50 rounded-lg p-2">{report.reason}</p>
                  </div>
                  {report.status === 'pending' && (
                    <button onClick={() => handleResolve(report._id)}
                      className="flex-shrink-0 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg hover:bg-green-100 transition-colors whitespace-nowrap">
                      처리 완료
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 회원 관리 탭 */}
      {tab === 'users' && <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-textmain">회원 목록</h2>
          <button onClick={fetchUsers} className="text-xs text-primary hover:underline">새로고침</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-textmuted uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">아이디</th>
                <th className="px-6 py-3 text-left">역할</th>
                <th className="px-6 py-3 text-left">상태</th>
                <th className="px-6 py-3 text-left">게시글</th>
                <th className="px-6 py-3 text-left">가입일</th>
                <th className="px-6 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(user => {
                const isMe = user.userId === myUserId;
                const isAdmin = user.role === 'Admin';
                return (
                  <tr key={user._id} className={`hover:bg-gray-50 transition-colors ${user.isBanned ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 font-semibold text-textmain">
                      {user.userId}
                      {isMe && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">나</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        isAdmin ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-600'
                      }`}>{isAdmin ? 'Admin' : 'User'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {user.isBanned
                        ? <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-600">제한됨</span>
                        : <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">정상</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-textmuted">{user.postCount || 0}개</td>
                    <td className="px-6 py-4 text-textmuted">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5 justify-end flex-wrap">
                        {/* 밴/언밴 — 관리자·자신 제외 */}
                        {!isAdmin && !isMe && (
                          <button onClick={() => handleBan(user)}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                              user.isBanned
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                            }`}>
                            {user.isBanned ? '제한 해제' : '로그인 제한'}
                          </button>
                        )}
                        {/* 역할 변경 — 자신 제외 */}
                        {!isMe && (
                          <button onClick={() => handleRoleToggle(user)}
                            className="px-2.5 py-1 rounded text-xs font-bold bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors">
                            {isAdmin ? '→ User' : '→ Admin'}
                          </button>
                        )}
                        {/* 비밀번호 초기화 */}
                        <button onClick={() => { setResetTarget({ id: user._id, userId: user.userId }); setResetPw(''); }}
                          className="px-2.5 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                          PW 초기화
                        </button>
                        {/* 삭제 — 관리자·자신 제외 */}
                        {!isAdmin && !isMe && (
                          <button onClick={() => handleDelete(user)}
                            className="px-2.5 py-1 rounded text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                            삭제
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>}

      {/* 비밀번호 초기화 모달 */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setResetTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-[380px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-textmain mb-1">비밀번호 초기화</h3>
            <p className="text-sm text-textmuted mb-6">
              <span className="font-bold text-textmain">{resetTarget.userId}</span> 계정의 새 비밀번호를 설정합니다
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <input
                type="text"
                value={resetPw}
                onChange={e => setResetPw(e.target.value)}
                placeholder="새 비밀번호 입력"
                autoFocus required
                className="w-full p-3 rounded-lg border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setResetTarget(null)}
                  className="px-4 py-2.5 text-textmuted font-medium rounded-lg hover:bg-gray-100">취소</button>
                <button type="submit"
                  className="px-5 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-blue-700">초기화</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
