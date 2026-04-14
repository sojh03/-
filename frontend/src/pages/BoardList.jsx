import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api, UPLOADS_BASE } from '../api';

// 아이콘
const GridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const ListIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
  </svg>
);
const ScrollIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M12 5v14M5 12l7 7 7-7"/>
  </svg>
);
const PageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="15" x2="21" y2="15"/>
  </svg>
);

export default function BoardList() {
  const [posts, setPosts] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('boardViewMode') || 'grid');
  const [scrollMode, setScrollMode] = useState(() => localStorage.getItem('boardScrollMode') || 'scroll');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('none'); // 'none' | 'asc' | 'desc'

  const ITEMS_GRID = 8;
  const ITEMS_LIST = 6;
  const itemsPerPage = viewMode === 'grid' ? ITEMS_GRID : ITEMS_LIST;

  const fetchPosts = useCallback(async (searchKeyword = '') => {
    try {
      const role = localStorage.getItem('role');
      const params = { adminView: role === 'Admin' };
      if (searchKeyword.trim()) params.keyword = searchKeyword.trim();
      const res = await api.get('/board', { params });
      setPosts(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchPosts(keyword); }, [keyword, fetchPosts]);

  // 정렬된 목록
  const sortedPosts = useMemo(() => {
    if (sortOrder === 'none') return posts;
    return [...posts].sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price);
  }, [posts, sortOrder]);

  // 페이지네이션
  const totalPages = Math.ceil(sortedPosts.length / itemsPerPage);
  const displayPosts = scrollMode === 'page'
    ? sortedPosts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : sortedPosts;

  const handleSearch = (e) => { e.preventDefault(); setKeyword(inputValue); setCurrentPage(1); };
  const handleClear = () => { setInputValue(''); setKeyword(''); setCurrentPage(1); };
  const handleViewMode = (mode) => { setViewMode(mode); localStorage.setItem('boardViewMode', mode); setCurrentPage(1); };
  const handleScrollMode = (mode) => { setScrollMode(mode); localStorage.setItem('boardScrollMode', mode); setCurrentPage(1); };
  const handleSort = (order) => { setSortOrder(prev => prev === order ? 'none' : order); setCurrentPage(1); };

  const statusBadge = (status) => {
    if (status === 'SoldOut') return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">판매완료</span>;
    if (status === 'Hidden')  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">숨김</span>;
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">판매중</span>;
  };

  const renderPagination = () => {
    if (scrollMode !== 'page' || totalPages <= 1) return null;
    const maxBtn = 5;
    let start = Math.max(1, currentPage - Math.floor(maxBtn / 2));
    let end = Math.min(totalPages, start + maxBtn - 1);
    if (end - start + 1 < maxBtn) start = Math.max(1, end - maxBtn + 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return (
      <div className="flex justify-center items-center gap-1.5 mt-5">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm disabled:opacity-30 bg-white border border-gray-200 hover:bg-gray-50 text-textmuted transition-colors">‹</button>
        {start > 1 && <>
          <button onClick={() => setCurrentPage(1)} className="w-8 h-8 rounded-lg text-sm bg-white border border-gray-200 hover:bg-gray-50 text-textmuted">1</button>
          {start > 2 && <span className="text-gray-300 text-sm px-0.5">…</span>}
        </>}
        {pages.map(p => (
          <button key={p} onClick={() => setCurrentPage(p)}
            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${p === currentPage ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-white border border-gray-200 hover:bg-gray-50 text-textmuted'}`}>{p}</button>
        ))}
        {end < totalPages && <>
          {end < totalPages - 1 && <span className="text-gray-300 text-sm px-0.5">…</span>}
          <button onClick={() => setCurrentPage(totalPages)} className="w-8 h-8 rounded-lg text-sm bg-white border border-gray-200 hover:bg-gray-50 text-textmuted">{totalPages}</button>
        </>}
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm disabled:opacity-30 bg-white border border-gray-200 hover:bg-gray-50 text-textmuted transition-colors">›</button>
      </div>
    );
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
        <div>
          <h1 className="text-4xl font-extrabold text-textmain">인기 중고 기기</h1>
          <div className="text-textmuted mt-1">총 {posts.length}개의 상품</div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* 검색 */}
          <form onSubmit={handleSearch} className="flex items-center gap-1.5 flex-1 sm:w-56">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-base select-none">🔍</span>
              <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)}
                placeholder="검색..." className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm text-textmain"/>
              {inputValue && <button type="button" onClick={handleClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>}
            </div>
            <button type="submit" className="px-3 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors">검색</button>
          </form>

          {/* 가격 정렬 */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button onClick={() => handleSort('asc')} title="가격 낮은순"
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${sortOrder === 'asc' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
              가격↑
            </button>
            <button onClick={() => handleSort('desc')} title="가격 높은순"
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${sortOrder === 'desc' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}>
              가격↓
            </button>
          </div>

          {/* 뷰 */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button onClick={() => handleViewMode('grid')} title="그리드"
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}><GridIcon/></button>
            <button onClick={() => handleViewMode('list')} title="목록"
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}><ListIcon/></button>
          </div>

          {/* 스크롤/페이지 */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button onClick={() => handleScrollMode('scroll')} title="스크롤"
              className={`p-1.5 rounded-lg transition-all ${scrollMode === 'scroll' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}><ScrollIcon/></button>
            <button onClick={() => handleScrollMode('page')} title="페이지"
              className={`p-1.5 rounded-lg transition-all ${scrollMode === 'page' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}><PageIcon/></button>
          </div>
        </div>
      </div>

      {/* 검색 결과 */}
      {keyword && (
        <div className="mb-4 text-sm text-textmuted">
          "<span className="font-bold text-textmain">{keyword}</span>" 검색 결과 {posts.length}개
          <button onClick={handleClear} className="ml-3 text-primary hover:underline">전체 보기</button>
        </div>
      )}

      {/* 빈 상태 */}
      {posts.length === 0 ? (
        <div className="text-center py-20 text-textmuted glass rounded-2xl">
          {keyword ? (
            <><p className="text-xl">검색 결과가 없습니다.</p><button onClick={handleClear} className="text-primary hover:underline mt-2 inline-block">전체 상품 보기</button></>
          ) : (
            <><p className="text-xl">등록된 상품이 없습니다.</p><Link to="/create" className="text-primary hover:underline mt-2 inline-block">첫 번째 판매자가 되어보세요!</Link></>
          )}
        </div>
      ) : (
        <>
          <div className={scrollMode === 'page' ? 'min-h-[42rem]' : ''}>
            {viewMode === 'grid' ? (
              /* ─── 그리드 ─── */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayPosts.map(post => (
                  <Link to={`/post/${post._id}`} key={post._id}
                    className="group glass rounded-xl overflow-hidden hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 transform hover:-translate-y-1 bg-white">
                    <div className="w-full h-36 lg:h-48 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                      {post.imagePath ? (
                        <img src={`${UPLOADS_BASE}/${post.imagePath}`} alt={post.title}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"/>
                      ) : <span className="text-gray-400 text-sm">이미지 없음</span>}
                      {post.status === 'Hidden' && <div className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">숨김</div>}
                      {post.status === 'SoldOut' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-bold text-lg rotate-12 border-2 border-white px-2 py-1 rounded">판매 완료</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-bold text-textmain mb-0.5 truncate">{post.title}</h3>
                      <p className="text-xs text-textmuted mb-2 truncate">{post.content}</p>
                      <div className="flex justify-between items-baseline">
                        <span className="text-base font-extrabold text-primary">{post.price.toLocaleString()}원</span>
                        <span className="text-[10px] text-gray-500">{post.author?.userId}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              /* ─── 목록 ─── */
              <div className="flex flex-col gap-2.5">
                {displayPosts.map(post => (
                  <Link to={`/post/${post._id}`} key={post._id}
                    className="group bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-200 flex items-center gap-4 p-3">
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden relative">
                      {post.imagePath ? (
                        <img src={`${UPLOADS_BASE}/${post.imagePath}`} alt={post.title}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"/>
                      ) : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">없음</div>}
                      {post.status === 'SoldOut' && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-bold text-[10px]">완료</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {statusBadge(post.status)}
                        <h3 className="text-sm font-bold text-textmain truncate">{post.title}</h3>
                      </div>
                      <p className="text-xs text-textmuted truncate">{post.content}</p>
                      <div className="mt-1 text-xs text-gray-400">
                        <span className="font-medium text-textmuted">{post.author?.userId}</span>
                        <span className="mx-1.5">·</span>{new Date(post.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-base font-extrabold text-primary">{post.price.toLocaleString()}원</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 group-hover:text-primary transition-colors">자세히 →</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );
}
