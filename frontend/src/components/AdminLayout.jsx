import React from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopBar from './AdminTopBar';

function AdminLayout({ children }) {
  return (
    <div className="admin-layout-container" style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* 1. FIXED LEFT VERTICAL SIDEBAR */}
      <AdminSidebar />

      {/* 2. MAIN WORKSPACE CONTENT AREA */}
      <div className="admin-main-wrapper" style={{ marginLeft: '250px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Sticky Top Header Bar */}
        <AdminTopBar />

        {/* Page Main Content Body */}
        <main className="admin-content-area" style={{ flex: 1, padding: '28px', backgroundColor: '#F8FAFC' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
