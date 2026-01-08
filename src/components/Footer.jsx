import { useState, useEffect } from 'react';
import Link from 'next/link';
export default function Footer() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full h-1/12 text-center flex flex-col justify-center items-center">
      <div>
        <p className="text-sm text-gray-600 font-medium">
          © {year} Designed and developed by <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">Jiang Sheng</span>
        </p>
      </div>
    </footer>
  );
}
