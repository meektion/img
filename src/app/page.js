"use client";
import { useState, useCallback, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { faImages, faTrashAlt, faUpload, faSearchPlus, faCloud, faDatabase, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import Footer from '@/components/Footer';
import Link from "next/link";
import LoadingOverlay from "@/components/LoadingOverlay";

const LoginButton = ({ onClick, href, children }) => (
  <button
    onClick={onClick}
    className="px-3 md:px-5 py-1.5 md:py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-md md:rounded-lg shadow-sm md:shadow-md hover:shadow-md md:hover:shadow-lg transition-all text-xs md:text-sm font-medium"
  >
    {children}
  </button>
);

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [IP, setIP] = useState('加载中...');
  const [Total, setTotal] = useState('1000+');
  const [selectedOption, setSelectedOption] = useState('r2');
  const [isAuthapi, setIsAuthapi] = useState(false);
  const [Loginuser, setLoginuser] = useState('');
  const [boxType, setBoxtype] = useState("img");
  const [enableWebP, setEnableWebP] = useState(false);
  const [uploadPin, setUploadPin] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  // 不同接口的文件大小限制
  const FILE_SIZE_LIMITS = {
    'tgchannel': 50 * 1024 * 1024,
    'r2': 100 * 1024 * 1024,
  };

  // 获取当前接口的大小限制
  const getMaxFileSize = () => FILE_SIZE_LIMITS[selectedOption] || 50 * 1024 * 1024;

  // 使用 NextAuth session
  useEffect(() => {
    if (status === 'authenticated' && session) {
      setIsAuthapi(true);
      setLoginuser(session.user?.name || session.user?.email || '用户');
    } else {
      setIsAuthapi(false);
      setLoginuser('');
    }
  }, [session, status]);

  // 获取 IP 和总数
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取 IP
        const ipRes = await fetch('/api/ip');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          setIP(ipData.ip || '127.0.0.1');
        }

        // 获取总数
        const totalRes = await fetch('/api/total');
        if (totalRes.ok) {
          const totalData = await totalRes.json();
          setTotal(totalData.total || '1000+');
        }
      } catch (error) {
        console.error('获取数据失败:', error);
        setIP('127.0.0.1');
        setTotal('1000+');
      }
    };

    fetchData();
  }, []);

  // 验证文件大小
  const isValidFileSize = (file) => {
    const maxSize = getMaxFileSize();
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
      toast.error(`${file.name} 文件过大 (${fileSizeMB} MB)，当前接口最大支持 ${maxSizeMB} MB`);
      return false;
    }
    return true;
  };

  // 处理文件选择
  const handleFileChange = async (event) => {
    const newFiles = event.target.files;
    const allFiles = Array.from(newFiles);

    if (allFiles.length === 0) {
      return;
    }

    event.target.value = '';
    toast.info(`正在处理 ${allFiles.length} 个文件...`, { autoClose: 2000 });

    // 验证文件大小
    const validFiles = allFiles.filter(file => isValidFileSize(file));

    if (validFiles.length === 0) {
      toast.warning('没有可用的文件');
      return;
    }

    // 过滤掉已存在的文件
    const uniqueFiles = validFiles.filter(file =>
      !selectedFiles.find(selFile => selFile.name === file.name && selFile.size === file.size)
    );

    if (uniqueFiles.length === 0) {
      toast.warning('所选文件已存在，未添加新文件');
      return;
    }

    // WebP 转换
    let processedFiles = uniqueFiles;
    if (enableWebP) {
      processedFiles = await Promise.all(
        uniqueFiles.map(async (file) => {
          if (file.type.startsWith('image/') && file.type !== 'image/webp') {
            try {
              return await convertToWebP(file);
            } catch (error) {
              console.error('WebP 转换失败:', error);
              toast.warning(`${file.name} 转换为 WebP 失败，使用原文件`);
              return file;
            }
          }
          return file;
        })
      );
    }

    setSelectedFiles([...selectedFiles, ...processedFiles]);

    // 统计文件类型
    const imageCount = processedFiles.filter(f => f.type.startsWith('image/')).length;
    const videoCount = processedFiles.filter(f => f.type.startsWith('video/')).length;
    const audioCount = processedFiles.filter(f => f.type.startsWith('audio/')).length;
    const otherCount = processedFiles.length - imageCount - videoCount - audioCount;

    let message = `成功添加 ${processedFiles.length} 个文件`;
    const parts = [];
    if (imageCount > 0) parts.push(`${imageCount} 张图片`);
    if (videoCount > 0) parts.push(`${videoCount} 个视频`);
    if (audioCount > 0) parts.push(`${audioCount} 个音频`);
    if (otherCount > 0) parts.push(`${otherCount} 个其他文件`);

    if (parts.length > 0) message = `成功添加 ${parts.join('、')}`;
    if (enableWebP && imageCount > 0) message += '（图片已转换 WebP）';
    toast.success(message);
  };

  // WebP 转换函数
  const convertToWebP = async (file) => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
              if (blob) {
                const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.webp', {
                  type: 'image/webp',
                  lastModified: Date.now()
                });
                resolve(webpFile);
              } else {
                reject(new Error('Canvas 转换失败'));
              }
            }, 'image/webp', 0.8);
          };
          img.onerror = () => reject(new Error('图片加载失败'));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
      } catch (error) {
        reject(error);
      }
    });
  };

  // 清空文件
  const handleClear = () => {
    setSelectedFiles([]);
    setUploadStatus('');
    toast.info('已清空所有文件');
  };

  // 真实上传函数
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.warning('请先选择文件');
      return;
    }

    setUploading(true);
    setUploadStatus('正在上传...');

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('uploadType', selectedOption);
      formData.append('enableWebP', enableWebP.toString());
      if (uploadPin) formData.append('uploadPin', uploadPin);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '上传失败');
      }

      const data = await response.json();
      
      // 添加上传成功的文件到展示列表
      const newUploadedImages = data.files?.map(file => ({
        id: file.id || Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        preview: file.url,
        url: file.url,
        timestamp: new Date().toLocaleString()
      })) || [];

      setUploadedImages(prev => [...prev, ...newUploadedImages]);
      setSelectedFiles([]);
      
      toast.success(`上传成功！共上传 ${newUploadedImages.length} 个文件`);
      setUploadStatus('');
      
    } catch (error) {
      toast.error(`上传失败: ${error.message}`);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  // 删除已上传文件
  const handleDeleteImage = async (id, imageName) => {
    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, filename: imageName }),
      });

      if (response.ok) {
        setUploadedImages(prev => prev.filter(img => img.id !== id));
        toast.success('删除成功');
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 获取文件总大小
  const getTotalSizeInMB = (files) => {
    const totalSizeInBytes = files.reduce((acc, file) => acc + file.size, 0);
    return (totalSizeInBytes / (1024 * 1024)).toFixed(2);
  };

  // 处理登录
  const handleLogin = () => {
    router.push('/auth/signin');
  };

  // 处理登出
  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      toast.success('已退出登录');
      setIsAuthapi(false);
      setLoginuser('');
    } catch (error) {
      toast.error('退出登录失败');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* 导航栏 */}
      <nav className="bg-white dark:bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faCloud} className="text-2xl text-purple-500" />
                <span className="text-xl font-bold text-gray-800 dark:text-white">
                  Cloudflare 图片上传
                </span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <FontAwesomeIcon icon={faUser} />
                <span>IP: {IP}</span>
              </div>
              {isAuthapi ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    欢迎，{Loginuser}
                  </span>
                  <LoginButton onClick={handleLogout}>
                    退出登录
                  </LoginButton>
                </div>
              ) : (
                <LoginButton onClick={handleLogin}>
                  登录管理
                </LoginButton>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 统计信息 */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faDatabase} className="text-2xl text-purple-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">总上传数</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{Total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faImages} className="text-2xl text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">已选择文件</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{selectedFiles.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <FontAwesomeIcon icon={faUpload} className="text-2xl text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">文件总大小</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {selectedFiles.length > 0 ? getTotalSizeInMB(selectedFiles) + ' MB' : '0 MB'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 上传区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-6 p-6">
          <div className="mb-6">
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center">
                <span className="mr-3 text-gray-700 dark:text-gray-300">上传接口:</span>
                <select 
                  value={selectedOption}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="r2">Cloudflare R2 (最大 100MB)</option>
                  <option value="tgchannel">Telegram Channel (最大 50MB)</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={enableWebP}
                      onChange={(e) => setEnableWebP(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`block w-14 h-8 rounded-full ${enableWebP ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${enableWebP ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <div className="ml-3 text-gray-700 dark:text-gray-300">
                    自动转换 WebP (减小图片大小)
                  </div>
                </label>
              </div>
            </div>

            {/* 上传密码输入框 */}
            {!isAuthapi && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  上传密码（登录用户无需密码）
                </label>
                <input
                  type="password"
                  value={uploadPin}
                  onChange={(e) => setUploadPin(e.target.value)}
                  className="w-full md:w-1/3 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="请输入上传密码"
                />
              </div>
            )}

            {/* 文件选择区域 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                选择文件（支持图片、视频、音频等所有格式）
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept="*/*"
                  />
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-800 border-2 border-dashed border-blue-300 dark:border-gray-600 rounded-lg p-8 text-center hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors">
                    <FontAwesomeIcon icon={faUpload} className="text-4xl text-blue-500 mb-4" />
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                      点击选择文件或拖拽到此处
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      最大支持 {selectedOption === 'tgchannel' ? '50MB' : '100MB'} 每个文件
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* 已选择文件列表 */}
            {selectedFiles.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    已选择文件 ({selectedFiles.length})
                  </h3>
                  <button
                    onClick={handleClear}
                    className="flex items-center px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <FontAwesomeIcon icon={faTrashAlt} className="mr-2" />
                    清空所有
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start">
                        {file.type.startsWith('image/') ? (
                          <div className="w-16 h-16 mr-4 flex-shrink-0">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-full h-full object-cover rounded"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 mr-4 flex-shrink-0 bg-blue-100 dark:bg-blue-900/20 rounded flex items-center justify-center">
                            <span className="text-blue-500 dark:text-blue-400 text-sm">
                              {file.type.startsWith('video/') ? '🎬' : 
                               file.type.startsWith('audio/') ? '🎵' : '📄'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {file.type || '未知类型'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClear}
                disabled={selectedFiles.length === 0}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${selectedFiles.length === 0
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
              >
                清空文件
              </button>
              <button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploading}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    上传中...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faUpload} className="mr-2" />
                    上传文件 ({selectedFiles.length})
                  </>
                )}
              </button>
            </div>

            {uploadStatus && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">{uploadStatus}</p>
              </div>
            )}
          </div>
        </div>

        {/* 已上传文件展示 */}
        {uploadedImages.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
              已上传文件 ({uploadedImages.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {uploadedImages.map((img) => (
                <div key={img.id} className="relative group bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                  {img.preview ? (
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={img.preview}
                        alt={img.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onClick={() => setSelectedImage(img)}
                      />
                    </div>
                  ) : (
                    <div className="aspect-square flex items-center justify-center bg-blue-50 dark:bg-blue-900/20">
                      <span className="text-3xl">
                        {img.type?.startsWith('video/') ? '🎬' : 
                         img.type?.startsWith('audio/') ? '🎵' : '📄'}
                      </span>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {img.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{img.size}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{img.timestamp}</span>
                      <button
                        onClick={() => handleDeleteImage(img.id, img.name)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 图片放大预览模态框 */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-4xl max-h-[90vh]">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 text-2xl"
              >
                ✕
              </button>
              {selectedImage.preview ? (
                <img
                  src={selectedImage.preview}
                  alt={selectedImage.name}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
              ) : (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg">
                  <p className="text-lg text-gray-700 dark:text-gray-300">无法预览此文件类型</p>
                </div>
              )}
              <div className="absolute bottom-4 left-0 right-0 text-center text-white">
                <p>{selectedImage.name}</p>
                <p className="text-sm opacity-75">{selectedImage.size} • {selectedImage.timestamp}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {uploading && <LoadingOverlay />}
    </div>
  );
}
