"use client"
import { useState } from "react";

export default function Home() {
  const [ hover, setHover ] = useState(false);
  return (
    <div className = "flex flex-row min-h-screen justify-center items-center">
        <form>
          <button type="button"
          className="rounded-xl text-white font-semibold px-6 py-3 text-lg transition-all"
          style={{
            background: 'linear-gradient(90deg, #00f0ff, #a259ff)',
            boxShadow: hover
              ? '0 0 15px rgba(0, 240, 255, 0.8), 0 0 30px rgba(162, 89, 255, 0.5)'
              : '0 0 10px rgba(0, 240, 255, 0.5), 0 0 20px rgba(162, 89, 255, 0.3)',
            transform: hover ? 'scale(1.03)' : 'scale(1)'
          }}
          onMouseOver={() => setHover(true)}
          onMouseOut={() => setHover(false)}
          >
            Start Call
          </button>
        </form>
    </div>
  );
}
