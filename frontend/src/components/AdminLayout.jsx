import React from 'react';
import AdminHeader from './AdminHeader';

function AdminLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Clean White Top Navbar with DYPIU Logo & Navigation */}
      <AdminHeader />

      {/* Main Page Content Body */}
      <main style={{ minHeight: 'calc(100vh - 68px)', paddingBottom: '40px' }}>
        {children}
      </main>
    </div>
  );
}

export default AdminLayout;
