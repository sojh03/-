import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api, UPLOADS_BASE } from '../api';

const CATEGORIES = ['전체', '노트북/PC', '스마트폰', '태블릿', '카메라', '오디오', '게임/콘솔', '주변기기', '기타'];

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
  const [category, setCategory] = useState('전체');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('boardViewMode') || 'grid');
  const [scrollMode, setScrollMode] = useState(() => localStorage.getItem('boardScrollMode') || 'scroll');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('none');
  const [myId, setMyId] = useState(null);

  const token = localStorage.getItem('token');

  const ITEMS_GRID = 8;
  const ITEMS_LIST = 6;
  const itemsPerPage = viewMode === 'grid' ? ITEMS_GRID : ITEMS_LIST;

  // 로그인한 사용자 ID 가져오기 (찜 상태 확인용)
  useEffect(() => {
    if (!token) return;
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setMyId(res.data._id))
      .catch(() => {});
  }, [token]);

  const handleLike = async (e, postId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return alert('로그인이 필요합니다');
    try {
      const res = await api.post(`/board/${postId}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setPosts(prev => prev.map(p => {
        if (p._id !== postId) return p;
        const newLikes = res.data.liked
          ? [...(p.likes || []), myId]
          : (p.likes || []).filter(l => String(l) !== String(myId));
        return { ...p, likes: newLikes };
      }));
    } catch (err) { alert('처리 실패'); }
  };

  const isLiked = (post) => myId && post.likes?.some(l => String(l) === String(myId));

  const fetchPosts = useCallback(async (kw = '', cat = '전체', mn = '', mx = '') => {
    try {
      const role = localStorage.getItem('role');
      const params = { adminView: role === 'Admin' };
      if (kw.trim()) params.keyword = kw.trim();
      if (cat !== '전체') params.category = cat;
      if (mn) params.minPrice = mn;
      if (mx) params.maxPrice = mx;
      const res = await api.get('/board', { params });
      setPosts(res.data);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchPosts(keyword, category, minPrice, maxPrice); }, [keyword, category, minPrice, maxPrice, fetchPosts]);

  const sortedPosts = useMemo(() => {
    if (sortOrder === 'none') return posts;
    return [...posts].sort((a, b) => sortOrder === 'asc' ? a.price - b.price : b.price - a.price);
  }, [posts, sortOrder]);

  const totalPages = Math.ceil(sortedPosts.length / itemsPerPage);
  const displayPosts = scrollMode === 'page'
    ? sortedPosts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : sortedPosts;

  const handleSearch = (e) => { e.preventDefault(); setKeyword(inputValue); setCurrentPage(1); };
  const handleClear = () => { setInputValue(''); setKeyword(''); setMinPrice(''); setMaxPrice(''); setCategory('전체'); setCurrentPage(1); };
  const handlePriceFilter = (e) => { e.preventDefault(); setCurrentPage(1); setShowPriceFilter(false); };
  const handleViewMode = (m) => { setViewMode(m); localStorage.setItem('boardViewMode', m); setCurrentPage(1); };
  const handleScrollMode = (m) => { setScrollMode(m); localStorage.setItem('boardScrollMode', m); setCurrentPage(1); };
  const handleSort = (o) => { setSortOrder(p => p === o ? 'none' : o); setCurrentPage(1); };

  const getImageSrc = (post) => {
    if (post.imagePaths?.length > 0) return `${UPLOADS_BASE}/${post.imagePaths[0]}`;
    if (post.imagePath) return `${UPLOADS_BASE}/${post.imagePath}`;
    return null;
  };

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
    const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    return (
      <div className="flex justify-center items-center gap-1.5 mt-5">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm disabled:opacity-30 bg-white border border-gray-200 hover:bg-gray-50 text-textmuted transition-colors">‹</button>
        {start > 1 && <><button onClick={() => setCurrentPage(1)} className="w-8 h-8 rounded-lg text-sm bg-white border border-gray-200 hover:bg-gray-50 text-textmuted">1</button>{start > 2 && <span className="text-gray-300 text-sm px-0.5">…</span>}</>}
        {pages.map(p => (
          <button key={p} onClick={() => setCurrentPage(p)}
            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${p === currentPage ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-white border border-gray-200 hover:bg-gray-50 text-textmuted'}`}>{p}</button>
        ))}
        {end < totalPages && <>{end < totalPages - 1 && <span className="text-gray-300 text-sm px-0.5">…</span>}<button onClick={() => setCurrentPage(totalPages)} className="w-8 h-8 rounded-lg text-sm bg-white border border-gray-200 hover:bg-gray-50 text-textmuted">{totalPages}</button></>}
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm disabled:opacity-30 bg-white border border-gray-200 hover:bg-gray-50 text-textmuted transition-colors">›</button>
      </div>
    );
  };

  const activePriceFilter = minPrice || maxPrice;

  return (
    <div>
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
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

          {/* 가격 필터 */}
          <div className="relative">
            <button onClick={() => setShowPriceFilter(p => !p)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${activePriceFilter ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200 text-textmuted hover:bg-gray-50'}`}>
              💰 가격{activePriceFilter ? ` (${minPrice||0}~${maxPrice||'∞'})` : ''}
            </button>
            {showPriceFilter && (
              <form onSubmit={handlePriceFilter} className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-56 space-y-3">
                <div className="flex gap-2 items-center">
                  <input type="number" placeholder="최소" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-gray-200 outline-none focus:border-primary"/>
                  <span className="text-gray-400 text-xs">~</span>
                  <input type="number" placeholder="최대" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                    className="w-full p-2 text-xs rounded-lg border border-gray-200 outline-none focus:border-primary"/>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setMinPrice(''); setMaxPrice(''); setShowPriceFilter(false); setCurrentPage(1); }}
                    className="flex-1 py-1.5 text-xs text-textmuted border border-gray-200 rounded-lg hover:bg-gray-50">초기화</button>
                  <button type="submit" className="flex-1 py-1.5 text-xs text-white bg-primary rounded-lg hover:bg-blue-700">적용</button>
                </div>
              </form>
            )}
          </div>

          {/* 가격 정렬 */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            <button onClick={() => handleSort('asc')} title="가격 낮은순"
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${sortOrder === 'asc' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}>가격↑</button>
            <button onClick={() => handleSort('desc')} title="가격 높은순"
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${sortOrder === 'desc' ? 'bg-white shadow text-primary' : 'text-gray-400 hover:text-gray-600'}`}>가격↓</button>
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

      {/* 카테고리 탭 */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => { setCategory(cat); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              category === cat ? 'bg-primary text-white shadow-sm' : 'bg-white border border-gray-200 text-textmuted hover:border-primary/40 hover:text-primary'
            }`}>{cat}</button>
        ))}
      </div>

      {/* 검색 결과 안내 */}
      {(keyword || category !== '전체' || activePriceFilter) && (
        <div className="mb-4 text-sm text-textmuted flex items-center gap-3">
          <span>
            {keyword && <><span className="font-bold text-textmain">"{keyword}"</span> 검색 · </>}
            {category !== '전체' && <span className="font-bold text-primary">{category} </span>}
            {activePriceFilter && <span>{minPrice||0}원 ~ {maxPrice||'∞'}원 </span>}
            결과 <span className="font-bold text-textmain">{posts.length}개</span>
          </span>
          <button onClick={handleClear} className="text-primary hover:underline text-xs">전체 보기</button>
        </div>
      )}

      {/* 빈 상태 */}
      {posts.length === 0 ? (
        <div className="text-center py-20 text-textmuted glass rounded-2xl">
          <p className="text-xl">검색 결과가 없습니다.</p>
          <button onClick={handleClear} className="text-primary hover:underline mt-2 inline-block">전체 상품 보기</button>
        </div>
      ) : (
        <>
          <div className={scrollMode === 'page' ? 'min-h-[42rem]' : ''}>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayPosts.map(post => {
                  const imgSrc = getImageSrc(post);
                  return (
                    <Link to={`/post/${post._id}`} key={post._id}
                      className="group glass rounded-xl overflow-hidden hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 transform hover:-translate-y-1 bg-white relative">
                      <div className="w-full h-36 lg:h-48 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                        {imgSrc
                          ? <img src={imgSrc} alt={post.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"/>
                          : <div className="flex flex-col items-center gap-1 text-gray-300"><span className="text-3xl">📷</span><span className="text-xs">사진 없음</span></div>
                        }
                        {post.imagePaths?.length > 1 && <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">+{post.imagePaths.length}</span>}
                        {post.status === 'Hidden' && <div className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">숨김</div>}
                        {post.status === 'SoldOut' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-bold text-lg rotate-12 border-2 border-white px-2 py-1 rounded">판매 완료</span>
                          </div>
                        )}
                        {/* 찜 버튼 — 자기 글 제외 */}
                        {token && post.author?.userId !== localStorage.getItem('userId') && (
                          <button onClick={(e) => handleLike(e, post._id)}
                            className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all text-base
                              ${isLiked(post) ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100'}`}>
                            {isLiked(post) ? '♥' : '♡'}
                          </button>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-medium">{post.category || '기타'}</span>
                          {post.condition && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{post.condition}</span>}
                        </div>
                        <h3 className="text-sm font-bold text-textmain mb-0.5 truncate">{post.title}</h3>
                        <p className="text-xs text-textmuted mb-2 truncate">{post.content}</p>
                        <div className="flex justify-between items-baseline">
                          <span className="text-base font-extrabold text-primary">{post.price.toLocaleString()}원</span>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400">
                            <span>👁 {post.views || 0}</span>
                            <span className={isLiked(post) ? 'text-red-400 font-bold' : ''}>♥ {post.likes?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {displayPosts.map(post => {
                  const imgSrc = getImageSrc(post);
                  return (
                    <Link to={`/post/${post._id}`} key={post._id}
                      className="group bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-200 flex items-center gap-4 p-3">
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden relative">
                        {imgSrc
                          ? <img src={imgSrc} alt={post.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"/>
                          : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">📷</div>
                        }
                        {post.status === 'SoldOut' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-bold text-[10px]">완료</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {statusBadge(post.status)}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-medium">{post.category || '기타'}</span>
                          <h3 className="text-sm font-bold text-textmain truncate">{post.title}</h3>
                        </div>
                        <p className="text-xs text-textmuted truncate">{post.content}</p>
                        <div className="mt-1 text-xs text-gray-400 flex items-center gap-2">
                          <span className="font-medium text-textmuted">{post.author?.userId}</span>
                          <span>·</span><span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          <span>·</span><span>👁 {post.views || 0}</span>
                          <span className={isLiked(post) ? 'text-red-400 font-bold' : ''}>♥ {post.likes?.length || 0}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        <div className="text-base font-extrabold text-primary">{post.price.toLocaleString()}원</div>
                        <div className="text-[10px] text-gray-400">{post.tradeType || ''}</div>
                        {token && post.author?.userId !== localStorage.getItem('userId') && (
                          <button onClick={(e) => handleLike(e, post._id)}
                            className={`text-base px-2 py-0.5 rounded-full transition-all ${isLiked(post) ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}>
                            {isLiked(post) ? '♥' : '♡'}
                          </button>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );
}
