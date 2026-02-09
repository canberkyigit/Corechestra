import React from "react";
import { FaBell, FaCog, FaUserCircle } from "react-icons/fa";

const sidebarItems = [
  { name: "Board", icon: "📋" },
  { name: "Tasks", icon: "✅" },
  { name: "Messages", icon: "💬" },
  { name: "Calendar", icon: "📅" },
  { name: "HR/Contracts", icon: "📄" },
  { name: "Mail", icon: "✉️" },
];

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white text-gray-900 flex flex-col py-6 px-3 border-r-2 border-gray-300 shadow-sm">
        <div className="text-2xl font-bold mb-8 tracking-tight text-blue-600">Corechestra</div>
        <nav className="flex-1 flex flex-col gap-2">
          {sidebarItems.map((item) => (
            <button
              key={item.name}
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-50 transition-colors text-left"
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto text-xs text-gray-400">v0.1.0</div>
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <header className="h-20 bg-white border-b-2 border-gray-300 flex items-center px-6 shadow-sm justify-center relative">
          <input
            type="text"
            placeholder="Search..."
            className="rounded-md px-4 py-2 bg-white text-base text-gray-800 placeholder-gray-400 border-2 border-blue-400 shadow focus:outline-none focus:ring-2 focus:ring-blue-400 w-[32rem] max-w-full transition-all"
            style={{ minWidth: '320px' }}
          />
          <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-5">
            <button className="text-gray-500 hover:text-blue-500 text-xl focus:outline-none">
              <FaBell />
            </button>
            <button className="text-gray-500 hover:text-blue-500 text-xl focus:outline-none">
              <FaCog />
            </button>
            <button className="text-gray-500 hover:text-blue-500 text-2xl focus:outline-none">
              <FaUserCircle />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
} 