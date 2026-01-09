"use client";
import { useState, useRef, useCallback } from "react";
import { signOut } from "next-auth/react"
import Image from "next/image";
import { faImages, faTrashAlt, faUpload, faSearchPlus } from '@fortawesome/free-solid-svg-icons';
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
  const [selectedImage, setSelectedImage] = useState(null); // 添加状态用于跟踪选中的放大图片
  const [activeTab, setActiveTab] = useState('preview'); // Tab标签页状态
  const [uploading, setUploading] = useState(false);
  const [IP, setIP] = useState('');
  const [Total, setTotal] = useState('?');
  const [selectedOption, setSelectedOption] = useState('tgchannel'); // 默认 TG_Channel
  const [isAuthapi, setisAuthapi] = useState(false);
  const [Loginuser, setLoginuser] = useState('');
  const [boxType, setBoxtype] = useState("img");
  const [enableWebP, setEnableWebP] = useState(false); // WebP 转换开关（默认关闭）
  const [uploadPin, setUploadPin] = useState(''); // 上传密码

  const parentRef = useRef(null); // 用于一键复制功能

  // 不同接口的文件大小限制
  const FILE_SIZE_LIMITS = {
    'tgchannel': 50 * 1024 * 1024,   // 50 MB - Telegram Bot API 限制
    'r2': 100 * 1024 * 1024,         // 100 MB - Cloudflare R2 限制
  };

  // 获取当前接口的大小限制
  const getMaxFileSize = () => FILE_SIZE_LIMITS[selectedOption] || 50 * 1024 * 1024;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';






  let headers = {

    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",

  }
  useEffect(() => {
    ip();
    getTotal();
    isAuth();


  }, []);
  const ip = async () => {
    try {

      const res = await fetch(`/api/ip`, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        }

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
        headers: {
          'Content-Type': 'application/json'
        }

      });

      if (res.ok) {
        const data = await res.json();
        setisAuthapi(true)
        setLoginuser(data.role)

      } else {
        setisAuthapi(false)
        // 未登录时默认使用 TG_Channel
      }



    } catch (error) {
      console.error('请求出错:', error);
    }
  };

  const getTotal = async () => {
    try {

      const res = await fetch(`/api/total`, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json'
        }

      });
      const data = await res.json();
      setTotal(data.total);



    } catch (error) {
      console.error('请求出错:', error);
    }
  }

  // 验证文件 - 接受所有类型的文件
  const isValidFile = (file) => {
    // 接受所有文件类型
    return true;
  };

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

  const handleFileChange = async (event) => {
    const newFiles = event.target.files;
    const allFiles = Array.from(newFiles);

    if (allFiles.length === 0) {
      return;
    }

    // 显示处理提示
    toast.info(`正在处理 ${allFiles.length} 个文件...`, { autoClose: 2000 });

    // 过滤出图片和视频文件并验证大小
    const validFiles = allFiles.filter(file => {
      if (!isValidFile(file)) {
        toast.error(`${file.name} 不是支持的文件格式，已跳过`);
        return false;
      }
      if (!isValidFileSize(file)) {
        return false; // 文件过大，已在 isValidFileSize 中提示
      }
      return true;
    });

    if (validFiles.length === 0) {
      toast.warning('没有可用的文件');
      return;
    }

    const filteredFiles = validFiles.filter(file =>
      !selectedFiles.find(selFile => selFile.name === file.name));
    // 过滤掉已经在 uploadedImages 数组中存在的文件
    const uniqueFiles = filteredFiles.filter(file =>
      !uploadedImages.find(upImg => upImg.name === file.name)
    );

    if (uniqueFiles.length === 0 && allFiles.length > 0) {
      toast.warning('所选文件已存在，未添加新文件');
      return;
    }

    // 根据开关决定是否转换 WebP（只对图片转换）
    let processedFiles;
    if (enableWebP) {
      // 只对图片转换为 WebP，视频保持原样
      processedFiles = await Promise.all(
        uniqueFiles.map(async (file) => {
          if (file.type.startsWith('image/')) {
            return await convertToWebP(file);
          }
          return file; // 视频不转换
        })
      );
    } else {
      // 直接使用原文件，不转换
      processedFiles = uniqueFiles;
    }

    setSelectedFiles([...selectedFiles, ...processedFiles]);
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

    if (parts.length > 0) {
      message = `成功添加 ${parts.join('、')}`;
    }
    if (enableWebP && imageCount > 0) {
      message += '（图片已转换 WebP）';
    }
    toast.success(message);
  };

  const handleClear = () => {
    setSelectedFiles([]);
    setUploadedImages([]);
  };

  const getTotalSizeInMB = (files) => {
    const totalSizeInBytes = Array.from(files).reduce((acc, file) => acc + file.size, 0);
    return (totalSizeInBytes / (1024 * 1024)).toFixed(2); // 转换为MB并保留两位小数
  };

  // 将图片转换为 WebP 格式（带超时和降级处理）
  const convertToWebP = async (file) => {
    // 如果不是图片文件，直接返回原文件
    if (!file.type.startsWith('image/')) {
      return file;
    }

    // 如果已经是 WebP 格式，直接返回
    if (file.type === 'image/webp') {
      return file;
    }

    // 检查浏览器是否支持 WebP
    const canvas = document.createElement('canvas');
    const supportsWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;

    if (!supportsWebP) {
      console.warn('浏览器不支持 WebP，使用原文件');
      return file;
    }

    // 设置超时时间（5秒）
    const timeout = 5000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('转换超时')), timeout)
    );

    const convertPromise = new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          try {
            // 创建 canvas
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            // 绘制图片到 canvas
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // 转换为 WebP，质量设置为 0.8 (80%)
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  // 生成新的文件名（保留原文件名，只改扩展名）
                  const originalName = file.name.replace(/\.[^/.]+$/, '');
                  const newFile = new File([blob], `${originalName}.webp`, {
                    type: 'image/webp',
                    lastModified: Date.now()
                  });
                  resolve(newFile);
                } else {
                  // 转换失败，返回原文件
                  console.warn('WebP 转换失败，使用原文件');
                  resolve(file);
                }
              },
              'image/webp',
              0.8 // 质量参数 80%
            );
          } catch (error) {
            console.error('Canvas 操作失败:', error);
            resolve(file); // 失败时返回原文件
          }
        };

        img.onerror = () => {
          console.error('图片加载失败');
          resolve(file); // 失败时返回原文件
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        console.error('文件读取失败');
        resolve(file); // 失败时返回原文件
      };

      reader.readAsDataURL(file);
    });

    try {
      return await Promise.race([convertPromise, timeoutPromise]);
    } catch (error) {
      console.warn('转换超时或失败，使用原文件:', error.message);
      return file; // 超时或失败时返回原文件
    }
  };



  const handleUpload = async (file = null) => {
    setUploading(true);

    const filesToUpload = file ? [file] : selectedFiles;

    if (filesToUpload.length === 0) {
      toast.error('请选择要上传的文件');
      setUploading(false);
      return;
    }

    // 验证密码
    if (!uploadPin || uploadPin.length !== 6) {
      toast.error('请输入6位数字密码');
      setUploading(false);
      return;
    }

    let successCount = 0;

    try {
      for (const file of filesToUpload) {
        const formData = new FormData();

        formData.append('file', file);
        formData.append('pin', uploadPin); // 添加密码到formData

        try {
          // 根据选择的接口上传
          const targetUrl = `/api/enableauthapi/${selectedOption}`;
          const response = await fetch(targetUrl, {
            method: 'POST',
            body: formData,
            headers: headers
          });

          if (response.ok) {
            const result = await response.json();
            // console.log(result);

            file.url = result.url;

            // 更新 uploadedImages 和 selectedFiles
            setUploadedImages((prevImages) => [...prevImages, file]);
            setSelectedFiles((prevFiles) => prevFiles.filter(f => f !== file));
            successCount++;
          } else {
            // 尝试从响应中提取错误信息
            let errorMsg;
            try {
              const errorData = await response.json();
              errorMsg = errorData.message || `上传 ${file.name} 图片时出错`;
            } catch (jsonError) {
              // 如果解析 JSON 失败，使用默认错误信息
              errorMsg = `上传 ${file.name} 图片时发生未知错误`;
            }

            // 细化状态码处理
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
                toast.error(`上传 ${file.name} 图片时出错: ${errorMsg}`);
            }
          }
        } catch (error) {
          toast.error(`上传 ${file.name} 图片时出错`);
        }
      }

      setUploadedFilesNum(uploadedFilesNum + successCount);
      if (successCount === 1) {
        toast.success(`文件上传成功`);
      } else {
        toast.success(`已成功上传 ${successCount} 个文件`);
      }

    } catch (error) {
      console.error('上传过程中出现错误:', error);
      toast.error('上传错误');
    } finally {
      setUploading(false);
    }
  };





  const handlePaste = async (event) => {
    const clipboardItems = event.clipboardData.items;

    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();

        // 验证是否为支持的文件格式
        if (!isValidFile(file)) {
          toast.error('粘贴的文件不是支持的格式');
          return;
        }

        toast.info('正在处理粘贴的文件...', { autoClose: 1000 });

        // 根据开关决定是否转换（只对图片转换）
        let processedFile = file;
        if (enableWebP && file.type.startsWith('image/')) {
          processedFile = await convertToWebP(file);
        }
        setSelectedFiles([...selectedFiles, processedFile]);
        let fileType = '文件';
        if (file.type.startsWith('image/')) {
          fileType = '图片';
        } else if (file.type.startsWith('video/')) {
          fileType = '视频';
        } else if (file.type.startsWith('audio/')) {
          fileType = '音频';
        }
        toast.success(`${fileType}添加成功${enableWebP && file.type.startsWith('image/') ? '（已转换 WebP）' : ''}`);

        break; // 只处理第一个文件
      }
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;

    if (files.length > 0) {
      const allFiles = Array.from(files);

      toast.info(`正在处理 ${allFiles.length} 个文件...`, { autoClose: 2000 });

      // 过滤出支持的文件
      const validFiles = allFiles.filter(file => {
        if (!isValidFile(file)) {
          toast.error(`${file.name} 不是支持的文件格式，已跳过`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) {
        toast.warning('没有可用的文件');
        return;
      }

      const filteredFiles = validFiles.filter(file => !selectedFiles.find(selFile => selFile.name === file.name));

      if (filteredFiles.length === 0) {
        if (allFiles.length > 0) {
          toast.warning('所选文件已存在，未添加新文件');
        }
        return;
      }

      // 根据开关决定是否转换 WebP（只对图片）
      let processedFiles;
      if (enableWebP) {
        processedFiles = await Promise.all(
          filteredFiles.map(async (file) => {
            if (file.type.startsWith('image/')) {
              return await convertToWebP(file);
            }
            return file; // 视频不转换
          })
        );
      } else {
        processedFiles = filteredFiles;
      }

      setSelectedFiles([...selectedFiles, ...processedFiles]);
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

      if (parts.length > 0) {
        message = `成功添加 ${parts.join('、')}`;
      }
      if (enableWebP && imageCount > 0) {
        message += '（图片已转换 WebP）';
      }
      toast.success(message);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // 根据图片数量动态计算容器高度
  const calculateMinHeight = () => {
    const rows = Math.ceil(selectedFiles.length / 4);
    return `${rows * 100}px`;
  };

  // 处理点击图片放大
  const handleImageClick = (index) => {

    if (selectedFiles[index].type.startsWith('image/')) {
      setBoxtype("img");
    } else if (selectedFiles[index].type.startsWith('video/')) {
      setBoxtype("video");
    } else if (selectedFiles[index].type.startsWith('audio/')) {
      setBoxtype("audio");
    } else {
      setBoxtype("other");
    }

    setSelectedImage(URL.createObjectURL(selectedFiles[index]));
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
      // alert('已成功复制到剪贴板');
      toast.success(`链接复制成功`);
    } catch (err) {
      toast.error("链接复制失败")
    }
  };

  const handleCopyAll = async () => {
    try {
      if (uploadedImages.length === 0) {
        toast.warning('没有可复制的文件');
        return;
      }

      // 根据文件类型生成不同的链接格式
      const allLinks = uploadedImages.map(data => {
        let links = [];

        if (data.type.startsWith('image/')) {
          // 图片：Markdown 链接 和 直链
          links.push(`![${data.name}](${data.url})`);
          links.push(data.url);
        } else if (data.type.startsWith('video/')) {
          // 视频：直链 和 GitHub Issues 可播放的 HTML
          links.push(data.url);
          links.push(`<video src="${data.url}" controls style="max-width: 100%; height: auto;"></video>`);
        } else if (data.type.startsWith('audio/')) {
          // 音频：直链 和 GitHub Issues 可播放的 HTML
          links.push(data.url);
          links.push(`<audio src="${data.url}" controls></audio>`);
        } else {
          // 其他类型：可下载的直链
          links.push(data.url);
        }

        return links.join('\n');
      }).join('\n\n');

      await navigator.clipboard.writeText(allLinks);
      toast.success(`已复制 ${uploadedImages.length} 个文件的所有链接`);
    } catch (err) {
      toast.error("复制失败")
    }
  };

  const handlerenderImageClick = (imageUrl, type) => {
    setBoxtype(type);
    setSelectedImage(imageUrl);
  };


  const renderFile = (data, index) => {
    const fileUrl = data.url;
    if (data.type.startsWith('image/')) {
      return (
        <img
          key={`image-${index}`}
          src={data.url}
          alt={`Uploaded ${index}`}
          className="object-cover w-36 h-40 m-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handlerenderImageClick(fileUrl, "img")}
        />
      );

    } else if (data.type.startsWith('video/')) {
      return (
        <video
          key={`video-${index}`}
          src={data.url}
          className="object-cover w-36 h-40 m-2 cursor-pointer"
          controls
          onClick={() => handlerenderImageClick(fileUrl, "video")}
        >
          Your browser does not support the video tag.
        </video>
      );

    } else if (data.type.startsWith('audio/')) {
      return (
        <div
          key={`audio-${index}`}
          className="w-36 h-40 m-2 cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 rounded flex flex-col items-center justify-center"
          onClick={() => handlerenderImageClick(fileUrl, "audio")}
        >
          <svg className="w-16 h-16 text-gray-400 mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
          </svg>
          <p className="text-xs text-gray-600 text-center px-2 truncate w-full">{data.name}</p>
        </div>
      );

    } else {
      // 其他文件类型
      return (
        <div
          key={`file-${index}`}
          className="w-36 h-40 m-2 cursor-pointer hover:opacity-80 transition-opacity bg-gray-100 rounded flex flex-col items-center justify-center"
          onClick={() => handlerenderImageClick(fileUrl, "other")}
        >
          <svg className="w-16 h-16 text-gray-400 mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
          </svg>
          <p className="text-xs text-gray-600 text-center px-2 truncate w-full">{data.name}</p>
        </div>
      );
    }
  };


  // 一键复制所有链接
  const handleCopyCode = async () => {
    if (!parentRef.current) return;

    const codeElements = parentRef.current.querySelectorAll('code');
    const values = Array.from(codeElements).map(code => code.textContent);
    try {
      await navigator.clipboard.writeText(values.join("\n"));
      toast.success(`已复制 ${values.length} 个链接`);
    } catch (error) {
      toast.error(`复制失败: ${error}`)
    }
  };

  // 根据文件类型生成智能链接
  const generateLinks = (data) => {
    const { url, name, type } = data;

    if (type.startsWith('image/')) {
      return {
        direct: url,
        markdown: `![${name}](${url})`,
        html: `<img src="${url}" alt="${name}" />`,
        bbcode: `[img]${url}[/img]`
      };
    } else if (type.startsWith('video/')) {
      return {
        direct: url,
        markdown: url, // Markdown 不直接支持视频，返回直链
        html: `<video src="${url}" controls style="max-width: 100%; height: auto;"></video>`,
        bbcode: url // BBCode 通常不支持视频，返回直链
      };
    } else if (type.startsWith('audio/')) {
      return {
        direct: url,
        markdown: url, // Markdown 不直接支持音频，返回直链
        html: `<audio src="${url}" controls></audio>`,
        bbcode: url // BBCode 通常不支持音频，返回直链
      };
    } else {
      // 其他文件类型只返回直链
      return {
        direct: url,
        markdown: `[${name}](${url})`,
        html: `<a href="${url}">${name}</a>`,
        bbcode: `[url=${url}]${name}[/url]`
      };
    }
  };

  // Tab内容渲染
  const renderTabContent = () => {
    switch (activeTab) {
      case 'preview':
        return (
          <div className="flex flex-col">
            {uploadedImages.map((data, index) => {
              const links = generateLinks(data);
              return (
                <div key={index} className="m-2 rounded-2xl ring-offset-2 ring-2 ring-slate-100 flex flex-row">
                  {renderFile(data, index)}
                  <div className="flex flex-col justify-center w-4/5">
                    {[
                      { text: links.direct, onClick: () => handleCopy(links.direct), label: '直链' },
                      { text: links.markdown, onClick: () => handleCopy(links.markdown), label: 'Markdown' },
                      { text: links.html, onClick: () => handleCopy(links.html), label: 'HTML' },
                      { text: links.bbcode, onClick: () => handleCopy(links.bbcode), label: 'BBCode' },
                    ].map((item, i) => (
                      <input
                        key={`input-${i}`}
                        readOnly
                        value={item.text}
                        onClick={item.onClick}
                        className="px-3 my-1 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 focus:outline-none placeholder-gray-400 cursor-pointer hover:bg-gray-50"
                        title={`点击复制 ${item.label}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      case 'htmlLinks':
        return (
          <div ref={parentRef} className="p-4 bg-slate-100" onClick={handleCopyCode}>
            {uploadedImages.map((data, index) => {
              const links = generateLinks(data);
              return (
                <div key={index} className="mb-2">
                  <code className="w-2 break-all">{links.html}</code>
                </div>
              );
            })}
          </div>
        );
      case 'markdownLinks':
        return (
          <div ref={parentRef} className="p-4 bg-slate-100" onClick={handleCopyCode}>
            {uploadedImages.map((data, index) => {
              const links = generateLinks(data);
              return (
                <div key={index} className="mb-2">
                  <code className="w-2 break-all">{links.markdown}</code>
                </div>
              );
            })}
          </div>
        );
      case 'bbcodeLinks':
        return (
          <div ref={parentRef} className="p-4 bg-slate-100" onClick={handleCopyCode}>
            {uploadedImages.map((data, index) => {
              const links = generateLinks(data);
              return (
                <div key={index} className="mb-2">
                  <code className="w-2 break-all">{links.bbcode}</code>
                </div>
              );
            })}
          </div>
        );
      case 'viewLinks':
        return (
          <div ref={parentRef} className="p-4 bg-slate-100" onClick={handleCopyCode}>
            {uploadedImages.map((data, index) => {
              const links = generateLinks(data);
              return (
                <div key={index} className="mb-2">
                  <code className="w-2 break-all">{links.direct}</code>
                </div>
              );
            })}
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
    <main className=" overflow-auto h-full flex w-full min-h-screen flex-col items-center justify-between">
      <header className="fixed top-0 h-[50px] left-0 w-full border-b bg-white flex z-50 justify-center items-center">
        <nav className="flex justify-between items-center w-full max-w-4xl px-4">图床</nav>
        {renderButton()}
      </header>
      <div className="mt-[60px] w-9/10 sm:w-9/10 md:w-9/10 lg:w-9/10 xl:w-3/5 2xl:w-2/3">

        <div className="flex flex-col gap-3 mb-4">
          {/* 标题和基本信息 */}
          <div className="flex flex-col">
            <div className="text-gray-800 text-lg font-medium">文件上传</div>
            <div className="text-sm text-gray-500">
              已托管 <span className="text-cyan-600">{Total}</span> 张 · IP: <span className="text-cyan-600">{IP}</span>
            </div>
          </div>

          {/* 接口选择和WebP转换 */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">接口:</span>
              <select
                value={selectedOption}
                onChange={handleSelectChange}
                className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="tgchannel">Telegram (50MB)</option>
                <option value="r2">R2 (100MB)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">密码:</span>
              <input
                type="text"
                maxLength="6"
                placeholder="6位数字"
                value={uploadPin}
                onChange={(e) => setUploadPin(e.target.value.replace(/\D/g, ''))}
                className="px-3 py-1.5 border border-gray-300 rounded bg-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableWebP}
                onChange={(e) => setEnableWebP(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="ml-2 text-sm text-gray-700">转换 WebP</span>
            </label>
          </div>
        </div>
        <div
          className="border-2 border-dashed border-slate-400 rounded-md relative"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onPaste={handlePaste}
          style={{ minHeight: calculateMinHeight() }} // 动态设置最小高度
        >
          <div className="flex flex-wrap gap-3 min-h-[240px]">
            <LoadingOverlay loading={uploading} />
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative rounded-2xl w-44 h-48 ring-offset-2 ring-2  mx-3 my-3 flex flex-col items-center">
                <div className="relative w-36 h-36 cursor-pointer" onClick={() => handleImageClick(index)}>
                  {file.type.startsWith('image/') && (
                    <Image
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${file.name}`}
                      fill={true}
                      className="hover:opacity-80 transition-opacity"
                    />
                  )}
                  {file.type.startsWith('video/') && (
                    <video
                      src={URL.createObjectURL(file)}
                      controls
                      className="w-full h-full"
                    />
                  )}
                  {file.type.startsWith('audio/') && (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-100">
                      <svg className="w-16 h-16 text-gray-400 mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                      </svg>
                      <p className="text-xs text-gray-600 text-center px-2 truncate w-full">{file.name}</p>
                    </div>
                  )}
                  {!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/') && (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-gray-100">
                      <svg className="w-16 h-16 text-gray-400 mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
                      </svg>
                      <p className="text-xs text-gray-600 text-center px-2 truncate w-full">{file.name}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-row items-center  justify-center w-full mt-3">
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

                <div className="text-gray-500">

                  拖拽文件到这里或将屏幕截图复制并粘贴到此处上传
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
              accept="*/*"
              className="hidden"
              onChange={handleFileChange}
              multiple
            />
          </div>
          <div className="md:col-span-5 col-span-8">
            <div className="w-full h-10 bg-slate-200 leading-10 px-4 text-center md:text-left">
              已选择 {selectedFiles.length} 个文件，共 {getTotalSizeInMB(selectedFiles)} M
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
              // className={`bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer mx-2 ${uploading ? 'pointer-events-none opacity-50' : ''}`}

              onClick={() => handleUpload()}
            >
              <FontAwesomeIcon icon={faUpload} style={{ width: '20px', height: '20px' }} className="mr-2" />
              上传
            </div>
          </div>
        </div>


        <ToastContainer />
        <div className="w-full mt-4 min-h-[200px] mb-[60px] ">
          {uploadedImages.length > 0 && (
            <>
              <div className="mb-4 border-b border-gray-300 pb-2 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">已上传的文件</h3>
                  <p className="text-sm text-gray-500">点击链接即可复制（图片提供 Markdown 和直链，视频/音频提供直链和 GitHub Issues 播放代码）</p>
                </div>
                <button
                  onClick={handleCopyAll}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  全部复制 ({uploadedImages.length})
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-300 mb-4">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-4 py-2 ${activeTab === 'preview' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                >
                  预览
                </button>
                <button
                  onClick={() => setActiveTab('viewLinks')}
                  className={`px-4 py-2 ${activeTab === 'viewLinks' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                >
                  直链
                </button>
                <button
                  onClick={() => setActiveTab('markdownLinks')}
                  className={`px-4 py-2 ${activeTab === 'markdownLinks' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                >
                  Markdown
                </button>
                <button
                  onClick={() => setActiveTab('htmlLinks')}
                  className={`px-4 py-2 ${activeTab === 'htmlLinks' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                >
                  HTML
                </button>
                <button
                  onClick={() => setActiveTab('bbcodeLinks')}
                  className={`px-4 py-2 ${activeTab === 'bbcodeLinks' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                >
                  BBCode
                </button>
              </div>

              {/* Tab Content */}
              {renderTabContent()}
            </>
          )}
        </div>

      </div>
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseImage}>
          <div className="relative flex flex-col items-center justify-between">
            <button
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center"
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
                className="object-cover w-9/10  h-auto rounded-lg"
              />
            ) : boxType === "video" ? (
              <video
                src={selectedImage}
                width={500}
                height={500}
                className="object-cover w-9/10  h-auto rounded-lg"
                controls
              />
            ) : boxType === "audio" ? (
              <div className="p-8 bg-white rounded-lg">
                <div className="flex flex-col items-center">
                  <svg className="w-24 h-24 text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z"/>
                  </svg>
                  <audio controls className="w-full max-w-md">
                    <source src={selectedImage} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            ) : boxType === "other" ? (
              <div className="p-8 bg-white rounded-lg">
                <div className="flex flex-col items-center">
                  <svg className="w-24 h-24 text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-gray-700">无法预览此文件类型</p>
                </div>
              </div>
            ) : (
              <div>未知类型</div>
            )}
          </div>

        </div>

      )}

      <div className="fixed inset-x-0 bottom-0 h-[50px] bg-slate-200  w-full  flex  z-50 justify-center items-center ">
        <Footer />
      </div>
    </main>
  );
}