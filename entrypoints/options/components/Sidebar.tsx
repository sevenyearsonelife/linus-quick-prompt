import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { t } from '../../../utils/i18n';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测屏幕尺寸
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      // 在桌面端默认展开，移动端默认收起
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const menuItems = [
    {
      path: "/",
      name: t('promptManagement'),
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
      description: t('promptManagementDescription'),
    },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* 简化的汉堡菜单按钮 - 保持固定位置 */}
      {isMobile && !isOpen && (
        <button
          onClick={toggleSidebar}
          className="flex fixed top-2 left-4 z-50 justify-center items-center w-12 h-12 bg-white rounded-xl border border-gray-200 shadow-lg transition-all duration-200 ease-in-out  dark:bg-gray-800 dark:border-gray-600 hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 md:hidden"
          aria-label={t('openMenu')}
        >
          <svg
            className="w-6 h-6 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}

      {/* 遮罩层 - 只在移动端且打开时显示 */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 backdrop-blur-sm md:hidden animate-fadeIn"
          onClick={closeSidebar}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
          transition-all duration-300 ease-in-out
          ${isMobile ? "fixed" : "relative"} 
          ${isMobile ? "z-40" : "z-0"}
          ${isMobile ? "h-full" : "h-auto"}
          ${isMobile && !isOpen ? "-translate-x-full" : "translate-x-0"}
          ${isMobile ? "shadow-2xl" : "shadow-none"}
          ${isMobile && isOpen ? "sidebar-enter" : ""}
          ${className}
        `}
        style={{
          width: isMobile ? "280px" : "256px",
        }}
      >
        <div className="flex flex-col h-full">
          {/* 头部区域 */}
          <div className="flex-shrink-0 p-6">
            {/* 移动端关闭按钮 */}
            {isMobile && isOpen && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={closeSidebar}
                  className="flex justify-center items-center w-10 h-10 text-gray-500 rounded-lg transition-all duration-200  dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label={t('closeMenu')}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Navigation */}
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-cyan-50 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 border-r-2 border-cyan-700 dark:border-cyan-400 shadow-sm"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 hover:shadow-sm"
                    }`
                  }
                >
                  <span className="flex-shrink-0 mr-3">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </NavLink>
              ))}
            </nav>
          </div>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;
