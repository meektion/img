import { useState, useEffect } from 'react';
import Link from 'next/link';
export default function Footer() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full h-full text-center flex flex-col justify-center items-center">
      <div>
        <p className="text-sm text-gray-600">
          © {year} Designed by{' '}
          <Link
            href="https://134688.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Jiang Sheng
          </Link>
        </p>
      </div>
    </footer>
  );
}
