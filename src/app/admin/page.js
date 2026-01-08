'use client'
import { signOut } from "next-auth/react"
import Table from "@/components/Table"
import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from "react-toastify";
import Link from 'next/link'

export default function Admin() {
  const [listData, setListData] = useState([])
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(1); // 最少 1 页，避免除零或分页异常
  const [inputPage, setInputPage] = useState(1);
  const [view, setView] = useState('list'); // 'list' 或 'log'
  const [searchQuery, setSearchQuery] = useState('');

  const getListdata = useCallback(async (page) => {
    try {
      const res = await fetch(`/api/admin/${view}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page: (page - 1),
          query: searchQuery,
        })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `请求失败: ${res.status}`);
      }

      const res_data = await res.json();

      if (!res_data?.success) {
        toast.error(res_data?.message || '获取数据失败');
      } else {
        setListData(res_data.data || []);
        const totalPages = Math.ceil((res_data.total || 0) / 10) || 0;
        setSearchTotal(Math.max(1, totalPages)); // 根据业务可改为允许 0 页
      }
    } catch (error) {
      toast.error(error?.message || '请求出错');
    }
  }, [view, searchQuery]);

  useEffect(() => {
    getListdata(currentPage);
  }, [currentPage, view, getListdata]);

  const handleNextPage = () => {
    const nextPage = currentPage + 1;
    if (nextPage > searchTotal) {
      toast.error('当前已为最后一页！')
      return;
    }
    setCurrentPage(nextPage);
    setInputPage(nextPage);
  };

  const handlePrevPage = () => {
    const prevPage = currentPage - 1;
    if (prevPage < 1) return;
    setCurrentPage(prevPage);
    setInputPage(prevPage);
  };

  const handleJumpPage = () => {
    const page = parseInt(inputPage, 10);
    if (!isNaN(page) && page >= 1 && page <= searchTotal) {
      setCurrentPage(page);
    } else {
      toast.error('请输入有效的页码！');
    }
  };

  const handleViewToggle = () => {
    setView(prev => prev === 'list' ? 'log' : 'list');
    setCurrentPage(1);
    setInputPage(1);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setInputPage(1);
    getListdata(1);
  };

  return (
    <>
      <div className="overflow-auto h-full flex w-full min-h-screen flex-col items-center justify-between">
        <header className="fixed top-0 h-[50px] left-0 w-full border-b bg-white flex z-50 justify-center items-center">
          <div className="flex justify-between items-center w-full max-w-4xl px-4">
            <button
              className='text-white px-4 py-2 transition ease-in-out delay-150 bg-blue-500 hover:scale-110 hover:bg-indigo-500 duration-300 rounded'
              onClick={handleViewToggle}
              aria-label="切换视图"
            >
              切换到 {view === 'list' ? '日志页' : '数据页'}
            </button>

            <form onSubmit={handleSearch} className="hidden sm:flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border rounded p-2 w-40 mr-2"
                placeholder="搜索"
                aria-label="搜索"
              />
              <button type="submit" className="text-white px-4 py-2 transition ease-in-out delay-150 bg-blue-500 hover:scale-110 hover:bg-indigo-500 duration-300 rounded">
                搜索
              </button>
            </form>
          </div>

          <Link href="/" className="hidden sm:flex px-4 py-2 mx-2 w-28 bg-blue-500 text-white rounded justify-center items-center">
            主页
          </Link>

          <button onClick={() => signOut({ callbackUrl: "/" })} className="px-4 py-2 mx-2 w-28 bg-blue-500 text-white rounded">
            登出
          </button>
        </header>

        <main className="my-[60px] w-9/10 sm:w-9/10 md:w-9/10 lg:w-9/10 xl:w-3/5 2xl:w-full">
          <Table data={listData} />
        </main>

        <div className="fixed inset-x-0 bottom-0 h-[50px] w-full flex z-50 justify-center items-center bg-white">
          <div className="pagination mt-5 mb-5 flex justify-center items-center">
            <button
              className='text-xs sm:text-sm transition ease-in-out delay-150 bg-blue-500 hover:scale-110 hover:bg-indigo-500 duration-300 p-2 rounded mr-5 disabled:opacity-50'
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              aria-label="上一页"
            >
              上一页
            </button>

            <span className="text-xs sm:text-sm">第 {`${currentPage}/${searchTotal}`} 页</span>

            <button
              className='text-xs sm:text-sm transition ease-in-out delay-150 bg-blue-500 hover:scale-110 hover:bg-indigo-500 duration-300 p-2 rounded ml-5 disabled:opacity-50'
              onClick={handleNextPage}
              disabled={currentPage >= searchTotal}
              aria-label="下一页"
            >
              下一页
            </button>

            <div className="ml-5 flex items-center">
              <input
                type="number"
                value={inputPage}
                onChange={(e) => setInputPage(Number(e.target.value))}
                className="border rounded p-2 w-20"
                placeholder="页码"
                aria-label="页码输入"
                min={1}
                max={searchTotal}
              />
              <button
                className='text-xs sm:text-sm transition ease-in-out delay-150 bg-blue-500 hover:scale-110 hover:bg-indigo-500 duration-300 p-2 rounded ml-2'
                onClick={handleJumpPage}
                aria-label="跳转到指定页"
              >
                跳转
              </button>
            </div>
          </div>
        </div>

        <ToastContainer />
      </div>
    </>
  )
}
