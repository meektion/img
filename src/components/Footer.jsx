import { useState, useEffect } from 'react';
import Link from 'next/link';
export default function Footer() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full  h-1/12 text-center  bg-slate-200  flex flex-col justify-center items-center">
      <div >
        <p className="text-xs text-gray-500">
          © 2025-{year} Designed and developed by{' '}
          <a
            href="https://134688.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            Shan Sheng
          </a>
        </p>
      </div>
    </footer>
  );
}
