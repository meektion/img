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
          © {year} Designed and developed by Jiang Sheng
        </p>
      </div>
    </footer>
  );
}
