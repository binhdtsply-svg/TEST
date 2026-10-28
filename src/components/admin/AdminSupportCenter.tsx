/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ShieldCheck,
  Key,
  Lock,
  Unlock,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Send,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Layers,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';
import { supportService } from '../../services/SupportService';
import { auditService } from '../../services/AuditService';
import {
  SupportTicket,
  SupportTicketStatus,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportFeedbackStats
} from '../../types';

export const AdminSupportCenter: React.FC = () => {
  const [subTab, setSubTab] = useState<'tickets' | 'accounts'>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<SupportFeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filters for Tickets
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Ticket Detail & Modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminResponseText, setAdminResponseText] = useState('');
  const [adminNotesText, setAdminNotesText] = useState('');
  const [nextTicketStatus, setNextTicketStatus] = useState<SupportTicketStatus>('PROCESSING');
  const [isUpdatingTicket, setIsUpdatingTicket] = useState(false);

  // Account Support Desk State
  const [accountQuery, setAccountQuery] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState('ALL');
  const [accountStatusFilter, setAccountStatusFilter] = useState('ALL');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const unsub = supportService.subscribe(() => {
      loadData();
    });
    return unsub;
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedTickets, fetchedStats] = await Promise.all([
        supportService.fetchAllTickets(),
        supportService.fetchStats()
      ]);
      setTickets(fetchedTickets);
      setStats(fetchedStats);
    } catch (err) {
      console.error('Error loading admin support data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterTickets = async () => {
    setIsLoading(true);
    const filtered = await supportService.fetchAllTickets({
      status: statusFilter,
      category: categoryFilter,
      priority: priorityFilter,
      search: searchQuery
    });
    setTickets(filtered);
    setIsLoading(false);
  };

  const handleOpenTicketDetail = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAdminResponseText(ticket.adminResponse || '');
    setAdminNotesText(ticket.adminNotes || '');
    setNextTicketStatus(ticket.status === 'NEW' ? 'PROCESSING' : ticket.status);
    
    // Fetch full detail including history
    const detail = await supportService.fetchTicketDetails(ticket.id);
    if (detail) {
      setSelectedTicket(detail);
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setIsUpdatingTicket(true);
    const res = await supportService.updateTicketStatus({
      ticketId: selectedTicket.id,
      status: nextTicketStatus,
      adminResponse: adminResponseText.trim() || undefined,
      adminNotes: adminNotesText.trim() || undefined
    });

    setIsUpdatingTicket(false);
    if (res.success && res.ticket) {
      setSelectedTicket(res.ticket);
      showActionMsg(`Đã cập nhật yêu cầu #${res.ticket.ticketCode} sang trạng thái ${nextTicketStatus}!`);
      loadData();
    } else {
      alert(res.message || 'Lỗi cập nhật ticket');
    }
  };

  // Account Desk Functions
  const handleSearchAccounts = async () => {
    setIsLoadingAccounts(true);
    const res = await supportService.searchAccounts({
      query: accountQuery,
      role: accountRoleFilter,
      status: accountStatusFilter
    });
    setAccounts(res);
    setIsLoadingAccounts(false);
  };

  const handleResetPassword = async (acc: any) => {
    if (!confirm(`Xác nhận đặt lại mật khẩu cho tài khoản "${acc.displayName}" (${acc.lookupIdentifier})?\n\nNgười dùng sẽ dùng mã truy cập ban đầu để đăng nhập và thiết lập lại mật khẩu mới.`)) {
      return;
    }

    const res = await supportService.resetAccountPassword(acc.tenantId, acc.ownerId, acc.type);
    if (res.success) {
      showActionMsg(`Đã đặt lại mật khẩu thành công cho ${acc.displayName}.`);
      handleSearchAccounts();
    } else {
      alert(res.message);
    }
  };

  const showActionMsg = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Mới tiếp nhận</span>;
      case 'PROCESSING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Đang xử lý</span>;
      case 'RESPONDED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">Đã phản hồi</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Đã giải quyết</span>;
      case 'CLOSED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">Đã đóng</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const renderPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white animate-pulse">KHẨN CẤP</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white">CAO</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">BÌNH THƯỜNG</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">THẤP</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold animate-slide-up">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase block">Tổng số yêu cầu</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats?.tickets.total ?? tickets.length}</span>
            <span className="text-xs text-slate-400">Tickets</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-blue-200 shadow-xs bg-blue-50/30">
          <span className="text-xs font-bold text-blue-700 uppercase block">Yêu cầu mới</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700">{stats?.tickets.new ?? tickets.filter(t => t.status === 'NEW').length}</span>
            <span className="text-xs font-bold text-blue-500">Cần tiếp nhận</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-xs bg-amber-50/30">
          <span className="text-xs font-bold text-amber-700 uppercase block">Đang xử lý</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{stats?.tickets.processing ?? tickets.filter(t => t.status === 'PROCESSING').length}</span>
            <span className="text-xs font-bold text-amber-600">Tiến trình</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/30">
          <span className="text-xs font-bold text-emerald-700 uppercase block">Đã giải quyết</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{stats?.tickets.resolved ?? tickets.filter(t => t.status === 'RESOLVED').length}</span>
            <span className="text-xs font-bold text-emerald-600">Hoàn tất</span>
          </div>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSubTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
            subTab === 'tickets'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-sky-400" />
          Hộp Thư Yêu Cầu Hỗ Trợ ({tickets.length})
        </button>
        <button
          onClick={() => { setSubTab('accounts'); handleSearchAccounts(); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
            subTab === 'accounts'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Key className="w-4 h-4 text-amber-400" />
          Bàn Hỗ Trợ Tài Khoản & Reset Mật Khẩu
        </button>
      </div>

      {/* SUB-TAB 1: SUPPORT TICKETS INBOX */}
      {subTab === 'tickets' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm mã ticket, tiêu đề, người gửi, email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFilterTickets()}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:bg-white"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="NEW">Mới tiếp nhận</option>
              <option value="PROCESSING">Đang xử lý</option>
              <option value="RESPONDED">Đã phản hồi</option>
              <option value="RESOLVED">Đã giải quyết</option>
              <option value="CLOSED">Đã đóng</option>
            </select>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:bg-white"
            >
              <option value="ALL">Tất cả phân loại</option>
              <option value="ACCOUNT">Tài khoản & Quyền</option>
              <option value="LOGIN">Đăng nhập / Mật khẩu</option>
              <option value="DATA">Lỗi dữ liệu</option>
              <option value="FEATURE">Lỗi tính năng</option>
              <option value="USABILITY">Khó sử dụng</option>
              <option value="UI">Giao diện</option>
              <option value="OTHER">Vấn đề khác</option>
            </select>

            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:bg-white"
            >
              <option value="ALL">Tất cả ưu tiên</option>
              <option value="URGENT">Khẩn cấp</option>
              <option value="HIGH">Cao</option>
              <option value="MEDIUM">Bình thường</option>
              <option value="LOW">Thấp</option>
            </select>

            <button
              onClick={handleFilterTickets}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" /> Lọc
            </button>

            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Tickets Table / List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Đang tải danh sách ticket...
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Chưa có yêu cầu hỗ trợ nào phù hợp với bộ lọc</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Các yêu cầu gửi từ GVCN, Học viên, Phụ huynh sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <th className="p-3.5">Mã Ticket</th>
                      <th className="p-3.5">Tiêu đề & Module</th>
                      <th className="p-3.5">Người gửi & Vai trò</th>
                      <th className="p-3.5">Phân loại</th>
                      <th className="p-3.5">Ưu tiên</th>
                      <th className="p-3.5">Trạng thái</th>
                      <th className="p-3.5">Thời gian</th>
                      <th className="p-3.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tickets.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-blue-600">
                          {t.ticketCode}
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <p className="font-bold text-slate-900 truncate">{t.title}</p>
                          <p className="text-[11px] text-slate-500 truncate">{t.relatedModule || 'Chung'} • {t.description}</p>
                        </td>
                        <td className="p-3.5">
                          <p className="font-semibold text-slate-800">{t.userName}</p>
                          <p className="text-[11px] text-slate-500">
                            <span className="font-bold text-indigo-600">{t.userRole}</span>
                            {t.userPhone && ` • ${t.userPhone}`}
                          </p>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                            {t.category}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {renderPriorityBadge(t.priority)}
                        </td>
                        <td className="p-3.5">
                          {renderStatusBadge(t.status)}
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px]">
                          {new Date(t.createdAt).toLocaleDateString('vi-VN')} {new Date(t.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleOpenTicketDetail(t)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[11px]"
                          >
                            <Eye className="w-3.5 h-3.5" /> Chi tiết & Xử lý
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ACCOUNT SUPPORT DESK */}
      {subTab === 'accounts' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm mã truy cập, tên học sinh/GV, mã học sinh, email..."
                value={accountQuery}
                onChange={e => setAccountQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchAccounts()}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={accountRoleFilter}
              onChange={e => setAccountRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:bg-white"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="TEACHER">Giáo viên chủ nhiệm (TEACHER)</option>
              <option value="STUDENT">Học sinh (STUDENT)</option>
              <option value="PARENT">Phụ huynh (PARENT)</option>
            </select>

            <select
              value={accountStatusFilter}
              onChange={e => setAccountStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:bg-white"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động (ACTIVE)</option>
              <option value="LOCKED">Tạm khóa (LOCKED)</option>
              <option value="REVOKED">Đã thu hồi (REVOKED)</option>
            </select>

            <button
              onClick={handleSearchAccounts}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" /> Tìm kiếm
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Danh sách Tài khoản & Mã truy cập tìm thấy ({accounts.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Admin Tổng hỗ trợ đặt lại mật khẩu (reset password) khi người dùng quên mật khẩu mà không làm thay đổi ID hay danh sách lớp.
                </p>
              </div>
            </div>

            {isLoadingAccounts ? (
              <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Đang tìm kiếm tài khoản...
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Không tìm thấy tài khoản nào khớp với từ khóa tìm kiếm.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <th className="p-3.5">Mã Truy Cập</th>
                      <th className="p-3.5">Họ tên & Vai trò</th>
                      <th className="p-3.5">Không gian / Lớp</th>
                      <th className="p-3.5">Mật khẩu cá nhân</th>
                      <th className="p-3.5">Trạng thái</th>
                      <th className="p-3.5">Đăng nhập gần nhất</th>
                      <th className="p-3.5 text-right">Hỗ trợ kỹ thuật</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map(acc => (
                      <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-indigo-700">
                          {acc.lookupIdentifier}
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-slate-900">{acc.displayName}</p>
                          <span className={`inline-block px-1.5 py-0.2 text-[10px] font-bold rounded-sm ${
                            acc.type === 'TEACHER' ? 'bg-indigo-100 text-indigo-800' :
                            acc.type === 'STUDENT' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {acc.type}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 text-[11px]">
                          {acc.subText || acc.tenantId}
                        </td>
                        <td className="p-3.5">
                          {acc.hasPassword ? (
                            acc.mustChangePassword ? (
                              <span className="text-amber-600 font-semibold text-[11px]">Yêu cầu đổi MK</span>
                            ) : (
                              <span className="text-emerald-700 font-semibold text-[11px]">Đã tạo MK riêng</span>
                            )
                          ) : (
                            <span className="text-slate-400 text-[11px]">Chưa đặt MK (dùng mã gốc)</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            acc.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                            acc.status === 'LOCKED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {acc.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px]">
                          {acc.lastLoginAt ? new Date(acc.lastLoginAt).toLocaleDateString('vi-VN') : 'Chưa đăng nhập'}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleResetPassword(acc)}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[11px]"
                            title="Xóa mật khẩu cá nhân để người dùng đăng nhập lại bằng mã gốc và tạo mật khẩu mới"
                          >
                            <Key className="w-3.5 h-3.5" /> Reset Mật khẩu
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: TICKET DETAIL & RESOLUTION */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    Xử lý Yêu cầu #{selectedTicket.ticketCode}
                    {renderPriorityBadge(selectedTicket.priority)}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Người gửi: <span className="text-white font-bold">{selectedTicket.userName}</span> ({selectedTicket.userRole})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Ticket Info Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">{selectedTicket.title}</h4>
                  {renderStatusBadge(selectedTicket.status)}
                </div>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                
                <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-600 text-[11px]">
                  <div>Phân loại: <b className="text-slate-800">{selectedTicket.category}</b></div>
                  <div>Module: <b className="text-slate-800">{selectedTicket.relatedModule || 'Chung'}</b></div>
                  <div>Thời gian: <b className="text-slate-800">{new Date(selectedTicket.createdAt).toLocaleString('vi-VN')}</b></div>
                  {selectedTicket.userPhone && (
                    <div>SĐT: <b className="text-blue-700">{selectedTicket.userPhone}</b></div>
                  )}
                  {selectedTicket.userEmail && (
                    <div>Email: <b className="text-blue-700">{selectedTicket.userEmail}</b></div>
                  )}
                </div>
              </div>

              {/* Resolution Form */}
              <form onSubmit={handleUpdateTicket} className="space-y-4 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Cập nhật Trạng thái Ticket *
                  </label>
                  <select
                    value={nextTicketStatus}
                    onChange={e => setNextTicketStatus(e.target.value as SupportTicketStatus)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NEW">MỚI TIẾP NHẬN (NEW)</option>
                    <option value="PROCESSING">ĐANG XỬ LÝ (PROCESSING)</option>
                    <option value="RESPONDED">ĐÃ PHẢN HỒI (RESPONDED)</option>
                    <option value="RESOLVED">ĐÃ GIẢI QUYẾT (RESOLVED)</option>
                    <option value="CLOSED">ĐÓNG YÊU CẦU (CLOSED)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nội dung phản hồi chính thức gửi cho Người dùng
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Nhập nội dung giải đáp hoặc hướng dẫn xử lý gửi đến người dùng (người dùng sẽ nhìn thấy phản hồi này)..."
                    value={adminResponseText}
                    onChange={e => setAdminResponseText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Ghi chú nội bộ Admin (Chỉ Admin xem)
                  </label>
                  <input
                    type="text"
                    placeholder="Ghi chú kỹ thuật, nguyên nhân sự cố hoặc phân công xử lý..."
                    value={adminNotesText}
                    onChange={e => setAdminNotesText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Ticket Timeline History */}
                {selectedTicket.history && selectedTicket.history.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase block mb-1.5">Lịch sử tiến trình ticket</span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedTicket.history.map(h => (
                        <div key={h.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px] flex items-start justify-between">
                          <div>
                            <span className="font-bold text-slate-800">{h.actorName}</span> ({h.actorRole}) - <span className="font-semibold text-blue-600">{h.action}</span>
                            {h.message && <p className="text-slate-600 mt-0.5">{h.message}</p>}
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">{new Date(h.createdAt).toLocaleTimeString('vi-VN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingTicket}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingTicket ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" /> Cập nhật & Phản hồi
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
