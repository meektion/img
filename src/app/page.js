"use client";
import { useState, useRef, useCallback } from "react";
import { signOut } from "next-auth/react"
import Image from "next/image";
import { faImages, faTrashAlt, faUpload, faSearchPlus, faLock } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import { useEffect } from 'react';
import Footer from '@/components/Footer'
import Link from "next/link";
import LoadingOverlay from "@/components/LoadingOverlay";

const LoginButton = ({ onClick, href, children }) => (
  <button
    onClick={onClick}
    className="px-4 py-2 mx-2 w-28 sm:w-28 md:w-20 lg:w-16 xl:w-16 2xl:w-20 bg-blue-500 text-white rounded"
  >
    {children}
  </button>
);

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedFilesNum, setUploadedFilesNum] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');
  const [uploading, setUploading] = useState(false);
  const [IP, setIP] = useState('');
  const [Total, setTotal] = useState('?');
  const [selectedOption, setSelectedOption] = useState('tgchannel');
  const [isAuthapi, setisAuthapi] = useState(false);
  const [Loginuser, setLoginuser] = useState('');
  const [boxType, setBoxtype] = useState("img");
  const [password, setPassword] = useState('');
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const parentRef = useRef(null);

  let headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
  };

  useEffect(() => {
    ip();
    getTotal();
    isAuth();
  }, []);

  const ip = async () => {
    try {
      const res = await fetch(`/api/ip`, {
        method: "GET",
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setIP(data.ip);
    } catch (error) {
      console.error('请求出错:', error);
    }
  };

  const isAuth = async () => {
    try {
      const res = await fetch(`/api/enableauthapi/isauth`, {
        method: "GET",
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        setisAuthapi(true);
        setLoginuser(data.role);
        setIsPasswordVerified(true); // 如果已经认证，自动通过密码验证
      }
    } catch (error) {
      console.error('请求出错:', error);
    }
  };

  const getTotal = async () => {
    try {
      const res = await fetch(`/api/total`, {
        method: "GET",
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setTotal(data.total);
    } catch (error) {
      console.error('请求出错:', error);
    }
  };

  // 密码验证函数
  const verifyPassword = async () => {
    if (!password.trim()) {
      toast.error('请输入密码');
      return;
    }

    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsPasswordVerified(true);
          setShowPasswordInput(false);
          toast.success('密码验证成功');
          // 设置一个有效期（例如24小时）
          localStorage.setItem('passwordVerified', 'true');
          localStorage.setItem('passwordExpiry', Date.now() + 24 * 60 * 60 * 1000);
        } else {
          toast.error('密码错误');
        }
      } else {
        toast.error('验证失败，请重试');
      }
    } catch (error) {
      console.error('密码验证出错:', error);
      toast.error('网络错误，请重试');
    }
  };

  // 检查密码是否还在有效期内
  useEffect(() => {
    const verified = localStorage.getItem('passwordVerified');
    const expiry = localStorage.getItem('passwordExpiry');
    
    if (verified === 'true' && expiry && Date.now() < parseInt(expiry)) {
      setIsPasswordVerified(true);
    }
  }, []);

  const handleFileChange = (event) => {
    if (!isPasswordVerified) {
      setShowPasswordInput(true);
      toast.error('请先验证密码才能上传文件');
      return;
    }
    
    const newFiles = event.target.files;
    const filteredFiles = Array.from(newFiles).filter(file =>
      !selectedFiles.find(selFile => selFile.name === file.name));
    const uniqueFiles = filteredFiles.filter(file =>
      !uploadedImages.find(upImg => upImg.name === file.name)
    );

    setSelectedFiles([...selectedFiles, ...uniqueFiles]);
  };

  const handleClear = () => {
    setSelectedFiles([]);
  };

  const getTotalSizeInMB = (files) => {
    const totalSizeInBytes = Array.from(files).reduce((acc, file) => acc + file.size, 0);
    return (totalSizeInBytes / (1024 * 1024)).toFixed(2);
  };

  const handleUpload = async (file = null) => {
    if (!isPasswordVerified) {
      setShowPasswordInput(true);
      toast.error('请先验证密码才能上传文件');
      return;
    }

    setUploading(true);
    const filesToUpload = file ? [file] : selectedFiles;

    if (filesToUpload.length === 0) {
      toast.error('请选择要上传的文件');
      setUploading(false);
      return;
    }

    let successCount = 0;

    try {
      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append("file", file);

        try {
          const targetUrl = `/api/enableauthapi/${selectedOption}`;
          const response = await fetch(targetUrl, {
            method: 'POST',
            body: formData,
            headers: headers
          });

          if (response.ok) {
            const result = await response.json();
            file.url = result.url;
            file.fileType = result.type || getFileType(file);
            
            // 更新 uploadedImages 和 selectedFiles
            setUploadedImages((prevImages) => [...prevImages, file]);
            setSelectedFiles((prevFiles) => prevFiles.filter(f => f !== file));
            successCount++;
          } else {
            let errorMsg;
            try {
              const errorData = await response.json();
              errorMsg = errorData.message || `上传 ${file.name} 时出错`;
            } catch (jsonError) {
              errorMsg = `上传 ${file.name} 时发生未知错误`;
            }

            switch (response.status) {
              case 400:
                toast.error(`请求无效: ${errorMsg}`);
                break;
              case 403:
                toast.error(`无权限访问资源: ${errorMsg}`);
                break;
              case 404:
                toast.error(`资源未找到: ${errorMsg}`);
                break;
              case 500:
                toast.error(`服务器错误: ${errorMsg}`);
                break;
              case 401:
                toast.error(`未授权: ${errorMsg}`);
                break;
              default:
                toast.error(`上传 ${file.name} 时出错: ${errorMsg}`);
            }
          }
        } catch (error) {
          toast.error(`上传 ${file.name} 时出错`);
        }
      }

      setUploadedFilesNum(uploadedFilesNum + successCount);
      toast.success(`已成功上传 ${successCount} 个文件`);

    } catch (error) {
      console.error('上传过程中出现错误:', error);
      toast.error('上传错误');
    } finally {
      setUploading(false);
    }
  };

  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    return 'other';
  };

  // 生成不同文件类型的展示代码
  const generateDisplayCode = (file) => {
    const fileType = file.fileType || getFileType(file);
    
    switch (fileType) {
      case 'image':
        return {
          markdown: `![${file.name}](${file.url})`,
          html: `<img src="${file.url}" alt="${file.name}" />`,
          bbcode: `[img]${file.url}[/img]`,
          direct: file.url,
          preview: `![${file.name}](${file.url})`
        };
      case 'audio':
        return {
          markdown: `[${file.name}](${file.url})`,
          html: `<audio controls><source src="${file.url}" type="${file.type}">您的浏览器不支持音频播放</audio>`,
          bbcode: `[audio]${file.url}[/audio]`,
          direct: file.url,
          preview: `<audio controls><source src="${file.url}" type="${file.type}">您的浏览器不支持音频播放</audio>`
        };
      case 'video':
        return {
          markdown: `[${file.name}](${file.url})`,
          html: `<video controls width="100%"><source src="${file.url}" type="${file.type}">您的浏览器不支持视频播放</video>`,
          bbcode: `[video]${file.url}[/video]`,
          direct: file.url,
          preview: `<video controls width="100%"><source src="${file.url}" type="${file.type}">您的浏览器不支持视频播放</video>`
        };
      default:
        return {
          markdown: `[${file.name}](${file.url})`,
          html: `<a href="${file.url}" target="_blank" download>下载 ${file.name}</a>`,
          bbcode: `[url=${file.url}]${file.name}[/url]`,
          direct: file.url,
          preview: `文件: ${file.name}`
        };
    }
  };

  const handlePaste = (event) => {
    if (!isPasswordVerified) {
      setShowPasswordInput(true);
      toast.error('请先验证密码才能上传文件');
      return;
    }
    
    const clipboardItems = event.clipboardData.items;
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        setSelectedFiles([...selectedFiles, file]);
        break;
      }
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    
    if (!isPasswordVerified) {
      setShowPasswordInput(true);
      toast.error('请先验证密码才能上传文件');
      return;
    }
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const filteredFiles = Array.from(files).filter(file => !selectedFiles.find(selFile => selFile.name === file.name));
      setSelectedFiles([...selectedFiles, ...filteredFiles]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const calculateMinHeight = () => {
    const rows = Math.ceil(selectedFiles.length / 4);
    return `${rows * 100}px`;
  };

  const handleImageClick = (index) => {
    const file = selectedFiles[index];
    if (file.type.startsWith('image/')) {
      setBoxtype("img");
    } else if (file.type.startsWith('video/')) {
      setBoxtype("video");
    } else if (file.type.startsWith('audio/')) {
      setBoxtype("audio");
    } else {
      setBoxtype("other");
    }
    setSelectedImage(URL.createObjectURL(file));
  };

  const handleCloseImage = () => {
    setSelectedImage(null);
  };

  const handleRemoveImage = (index) => {
    const updatedFiles = selectedFiles.filter((_, idx) => idx !== index);
    setSelectedFiles(updatedFiles);
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`链接复制成功`);
    } catch (err) {
      toast.error("链接复制失败")
    }
  };

  const handleCopyCode = async () => {
    const codeElements = parentRef.current?.querySelectorAll('code');
    if (!codeElements) return;
    
    const values = Array.from(codeElements).map(code => code.textContent);
    try {
      await navigator.clipboard.writeText(values.join("\n"));
      toast.success(`链接复制成功`);
    } catch (error) {
      toast.error(`链接复制失败\n${error}`)
    }
  };

  const handlerenderImageClick = (imageUrl, type) => {
    setBoxtype(type);
    setSelectedImage(imageUrl);
  };

  const renderFile = (data, index) => {
    const fileUrl = data.url;
    const fileType = data.fileType || getFileType(data);
    
    if (fileType === 'image') {
      return (
        <img
          key={`image-${index}`}
          src={data.url}
          alt={`Uploaded ${index}`}
          className="object-cover w-36 h-40 m-2"
          onClick={() => handlerenderImageClick(fileUrl, "img")}
        />
      );
    } else if (fileType === 'video') {
      return (
        <video
          key={`video-${index}`}
          src={data.url}
          className="object-cover w-36 h-40 m-2"
          controls
          onClick={() => handlerenderImageClick(fileUrl, "video")}
        >
          您的浏览器不支持视频播放
        </video>
      );
    } else if (fileType === 'audio') {
      return (
        <div
          key={`audio-${index}`}
          className="object-cover w-36 h-40 m-2 flex items-center justify-center bg-gray-100"
          onClick={() => handlerenderImageClick(fileUrl, "audio")}
        >
          <span className="text-lg">🎵 {data.name}</span>
        </div>
      );
    } else {
      return (
        <div
          key={`file-${index}`}
          className="object-cover w-36 h-40 m-2 flex items-center justify-center bg-gray-100"
          onClick={() => handlerenderImageClick(fileUrl, "other")}
        >
          <span className="text-sm text-center">📄 {data.name}</span>
        </div>
      );
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'preview':
        return (
          <div className="flex flex-col">
            {uploadedImages.map((data, index) => {
              const code = generateDisplayCode(data);
              return (
                <div key={index} className="m-2 rounded-2xl ring-offset-2 ring-2 ring-slate-100 flex flex-row">
                  {renderFile(data, index)}
                  <div className="flex flex-col justify-center w-4/5">
                    {[
                      { text: code.direct, onClick: () => handleCopy(code.direct), label: "直链" },
                      { text: code.markdown, onClick: () => handleCopy(code.markdown), label: "Markdown" },
                      { text: code.html, onClick: () => handleCopy(code.html), label: "HTML" },
                      { text: code.bbcode, onClick: () => handleCopy(code.bbcode), label: "BBCode" },
                    ].map((item, i) => (
                      <div key={`input-${i}`} className="flex items-center my-1">
                        <span className="text-xs text-gray-500 w-20 mr-2">{item.label}:</span>
                        <input
                          readOnly
                          value={item.text}
                          onClick={item.onClick}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 focus:outline-none placeholder-gray-400 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      case 'markdownLinks':
        return (
          <div ref={parentRef} className="p-4 bg-slate-100" onClick={handleCopyCode}>
            {uploadedImages.map((data, index) => (
              <div key={index} className="mb-2">
                <code className="w-2 break-all">{generateDisplayCode(data).markdown}</code>
              </div>
            ))}
          </div>
        );
      case 'htmlLinks':
        return (
          <div ref={parentRef} className="p-4 bg-slate-100" onClick={handleCopyCode}>
            {uploadedImages.map((data, index) => (
              <div key={index} className="mb-2">
                <code className="w-2 break-all">{generateDisplayCode(data).html}</code>
              </div>
            ))}
          </div>
        );
      case 'bbcodeLinks':
        return (
          <div ref={parentRef} className="p-4 bg-slate-100" onClick={handleCopyCode}>
            {uploadedImages.map((data, index) => (
              <div key={index} className="mb-2">
                <code className="w-2 break-all">{generateDisplayCode(data).bbcode}</code>
              </div>
            ))}
          </div>
        );
      case 'directLinks':
        return (
          <div ref={parentRef} className="p-4 bg-slate-100" onClick={handleCopyCode}>
            {uploadedImages.map((data, index) => (
              <div key={index} className="mb-2">
                <code className="w-2 break-all">{generateDisplayCode(data).direct}</code>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const handleSelectChange = (e) => {
    setSelectedOption(e.target.value);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
    setIsPasswordVerified(false);
    localStorage.removeItem('passwordVerified');
    localStorage.removeItem('passwordExpiry');
  };

  const renderButton = () => {
    if (!isAuthapi) {
      return (
        <Link href="/login">
          <LoginButton>登录</LoginButton>
        </Link>
      );
    }
    switch (Loginuser) {
      case 'user':
        return <LoginButton onClick={handleSignOut}>登出</LoginButton>;
      case 'admin':
        return (
          <Link href="/admin">
            <LoginButton>管理</LoginButton>
          </Link>
        );
      default:
        return (
          <Link href="/login">
            <LoginButton>登录</LoginButton>
          </Link>
        );
    }
  };

  return (
    <main className="overflow-auto h-full flex w-full min-h-screen flex-col items-center justify-between">
      <header className="fixed top-0 h-[50px] left-0 w-full border-b bg-white flex z-50 justify-center items-center">
        <nav className="flex justify-between items-center w-full max-w-4xl px-4">
          图床
          {!isPasswordVerified && (
            <button
              onClick={() => setShowPasswordInput(!showPasswordInput)}
              className="ml-4 px-3 py-1 bg-yellow-500 text-white rounded text-sm"
            >
              <FontAwesomeIcon icon={faLock} className="mr-1" />
              验证密码
            </button>
          )}
        </nav>
        {renderButton()}
      </header>

      {/* 密码输入框 */}
      {showPasswordInput && !isPasswordVerified && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-white p-6 rounded-lg shadow-lg border">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              请输入上传密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="输入密码..."
              onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={verifyPassword}
              className="flex-1 bg-blue-500 text-white py-2 rounded-md"
            >
              验证
            </button>
            <button
              onClick={() => setShowPasswordInput(false)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="mt-[60px] w-9/10 sm:w-9/10 md:w-9/10 lg:w-9/10 xl:w-3/5 2xl:w-2/3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div className="flex flex-col">
            <div className="text-gray-800 text-lg">文件上传</div>
            <div className="mb-4 text-sm text-gray-500">
              上传文件最大 5 MB; 本站已托管 <span className="text-cyan-600">{Total}</span> 个文件; 你的IP: <span className="text-cyan-600">{IP}</span>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-lg sm:text-sm md:text-sm lg:text-xl xl:text-xl 2xl:text-xl mr-2">上传接口：</span>
            <select
              value={selectedOption}
              onChange={handleSelectChange}
              className="text-lg p-2 border rounded text-center w-36"
            >
              <option value="tgchannel">TG Channel</option>
              <option value="r2">Cloudflare R2</option>
            </select>
          </div>
        </div>

        {!isPasswordVerified ? (
          <div className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center">
            <FontAwesomeIcon icon={faLock} className="text-4xl text-gray-400 mb-4" />
            <p className="text-gray-600">请先验证密码才能上传文件</p>
            <button
              onClick={() => setShowPasswordInput(true)}
              className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-md"
            >
              点击验证密码
            </button>
          </div>
        ) : (
          <>
            <div
              className="border-2 border-dashed border-slate-400 rounded-md relative"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onPaste={handlePaste}
              style={{ minHeight: calculateMinHeight() }}
            >
              <div className="flex flex-wrap gap-3 min-h-[240px]">
                <LoadingOverlay loading={uploading} />
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative rounded-2xl w-44 h-48 ring-offset-2 ring-2 mx-3 my-3 flex flex-col items-center">
                    <div className="relative w-36 h-36" onClick={() => handleImageClick(index)}>
                      {file.type.startsWith('image/') && (
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${file.name}`}
                          fill={true}
                          className="object-cover"
                        />
                      )}
                      {file.type.startsWith('video/') && (
                        <video
                          src={URL.createObjectURL(file)}
                          controls
                          className="w-full h-full object-cover"
                        />
                      )}
                      {file.type.startsWith('audio/') && (
                        <div className="flex items-center justify-center w-full h-full bg-blue-50">
                          <span className="text-2xl">🎵</span>
                        </div>
                      )}
                      {!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/') && (
                        <div className="flex items-center justify-center w-full h-full bg-gray-100">
                          <span className="text-sm text-center">📄 {file.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-row items-center justify-center w-full mt-3">
                      <button
                        className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer mx-2"
                        onClick={() => handleImageClick(index)}
                      >
                        <FontAwesomeIcon icon={faSearchPlus} />
                      </button>
                      <button
                        className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer mx-2"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                      <button
                        className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer mx-2"
                        onClick={() => handleUpload(file)}
                      >
                        <FontAwesomeIcon icon={faUpload} />
                      </button>
                    </div>
                  </div>
                ))}

                {selectedFiles.length === 0 && (
                  <div className="absolute -z-10 left-0 top-0 w-full h-full flex items-center justify-center">
                    <div className="text-gray-500 text-center">
                      拖拽文件到这里或将屏幕截图复制并粘贴到此处上传
                      <div className="mt-2 text-sm">
                        支持：图片、音频、视频等文件
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full rounded-md shadow-sm overflow-hidden mt-4 grid grid-cols-8">
              <div className="md:col-span-1 col-span-8">
                <label
                  htmlFor="file-upload"
                  className="w-full h-10 bg-blue-500 cursor-pointer flex items-center justify-center text-white"
                >
                  <FontAwesomeIcon icon={faImages} style={{ width: '20px', height: '20px' }} className="mr-2" />
                  选择文件
                </label>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  multiple
                />
              </div>
              <div className="md:col-span-5 col-span-8">
                <div className="w-full h-10 bg-slate-200 leading-10 px-4 text-center md:text-left">
                  已选择 {selectedFiles.length} 个，共 {getTotalSizeInMB(selectedFiles)} MB
                </div>
              </div>
              <div className="md:col-span-1 col-span-3">
                <div
                  className="w-full bg-red-500 cursor-pointer h-10 flex items-center justify-center text-white"
                  onClick={handleClear}
                >
                  <FontAwesomeIcon icon={faTrashAlt} style={{ width: '20px', height: '20px' }} className="mr-2" />
                  清除
                </div>
              </div>
              <div className="md:col-span-1 col-span-5">
                <div
                  className={`w-full bg-green-500 cursor-pointer h-10 flex items-center justify-center text-white ${uploading ? 'pointer-events-none opacity-50' : ''}`}
                  onClick={() => handleUpload()}
                >
                  <FontAwesomeIcon icon={faUpload} style={{ width: '20px', height: '20px' }} className="mr-2" />
                  上传
                </div>
              </div>
            </div>
          </>
        )}

        <ToastContainer />
        
        {uploadedImages.length > 0 && (
          <div className="w-full mt-4 min-h-[200px] mb-[60px]">
            <div className="flex flex-wrap gap-3 mb-4 border-b border-gray-300">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 ${activeTab === 'preview' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                预览
              </button>
              <button
                onClick={() => setActiveTab('markdownLinks')}
                className={`px-4 py-2 ${activeTab === 'markdownLinks' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                Markdown
              </button>
              <button
                onClick={() => setActiveTab('htmlLinks')}
                className={`px-4 py-2 ${activeTab === 'htmlLinks' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                HTML
              </button>
              <button
                onClick={() => setActiveTab('bbcodeLinks')}
                className={`px-4 py-2 ${activeTab === 'bbcodeLinks' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                BBCode
              </button>
              <button
                onClick={() => setActiveTab('directLinks')}
                className={`px-4 py-2 ${activeTab === 'directLinks' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                直链
              </button>
            </div>
            {renderTabContent()}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseImage}>
          <div className="relative flex flex-col items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center z-10"
              onClick={handleCloseImage}
            >
              &times;
            </button>

            {boxType === "img" ? (
              <img
                src={selectedImage}
                alt="Selected"
                width={500}
                height={500}
                className="object-cover w-9/10 h-auto rounded-lg"
              />
            ) : boxType === "video" ? (
              <video
                src={selectedImage}
                width={500}
                height={500}
                className="object-cover w-9/10 h-auto rounded-lg"
                controls
                autoPlay
              />
            ) : boxType === "audio" ? (
              <div className="bg-white p-8 rounded-lg">
                <audio src={selectedImage} controls autoPlay className="w-96" />
              </div>
            ) : (
              <div className="p-8 bg-white rounded-lg">
                <p className="text-lg mb-4">文件预览不可用</p>
                <a
                  href={selectedImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                >
                  点击下载文件
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 h-[50px] bg-slate-200 w-full flex z-50 justify-center items-center">
        <Footer />
      </div>
    </main>
  );
}
