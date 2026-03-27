/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, ChangeEvent, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  CheckCircle2,
  Package,
  ShieldCheck,
  Wifi,
  Wind,
  Lock,
  Sun,
  DoorOpen,
  Home,
  Lightbulb,
  X,
  Eye,
  History,
  Save as SaveIcon,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Settings,
  LogIn,
  Search,
  Layers,
  RefreshCw,
  User,
  Users,
  LogOut,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, ImageRun, PageBreak, PageOrientation } from 'docx';
import ChatBot from './components/ChatBot';
import AdminDashboard from './components/AdminDashboard';
import PersonalDashboard from './components/PersonalDashboard';
import Logo from './components/Logo';

interface QuoteItem {
  id: string;
  code: string;
  brand: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
  discount: number;
  note: string;
  image?: string;
  floor?: string;
  room?: string;
  shape?: string;
  color?: string;
  glassType?: string;
  borderType?: string;
  description?: string;
}

interface Module {
  id: string;
  name: string;
  icon: any;
  enabled: boolean;
  items: QuoteItem[];
  laborCostPercent?: number;
  auxMaterialPercent?: number;
}

interface ProjectInfo {
  name: string;
  customer: string;
  phone: string;
  address: string;
  date: string;
  staff: string;
}

const INITIAL_MODULES: Module[] = [
  { id: 'smarthome', name: 'Smart Home', icon: Home, enabled: false, items: [], laborCostPercent: 10, auxMaterialPercent: 5 },
  { id: 'smartlighting', name: 'Smart lighting', icon: Lightbulb, enabled: false, items: [], laborCostPercent: 10, auxMaterialPercent: 5 },
  { id: 'security', name: 'Hệ thống camera an ninh', icon: ShieldCheck, enabled: false, items: [], laborCostPercent: 10, auxMaterialPercent: 5 },
  { id: 'network', name: 'Hệ thống mạng nội bộ', icon: Wifi, enabled: false, items: [], laborCostPercent: 10, auxMaterialPercent: 5 },
  { id: 'curtain', name: 'Hệ thống rèm tự động', icon: Wind, enabled: false, items: [], laborCostPercent: 10, auxMaterialPercent: 5 },
  { id: 'lock', name: 'Hệ thống khóa thông minh', icon: Lock, enabled: false, items: [], laborCostPercent: 10, auxMaterialPercent: 5 },
  { id: 'solar', name: 'Hệ thống điện mặt trời', icon: Sun, enabled: false, items: [], laborCostPercent: 10, auxMaterialPercent: 5 },
  { id: 'gate', name: 'Hệ thống cổng tự động', icon: DoorOpen, enabled: false, items: [], laborCostPercent: 10, auxMaterialPercent: 5 }
];

const DEFAULT_PRODUCT_IMAGE = 'https://picsum.photos/seed/product/200/200';
const getPlaceholderImage = (seed?: string) => {
  const text = encodeURIComponent((seed || 'No Image').substring(0, 10));
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3E${text}%3C/text%3E%3C/svg%3E`;
};

const normalizeSearchText = (text: string) => {
  if (!text) return '';
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[\s\-\/]/g, '');
};

export default function App() {
  const [project, setProject] = useState<ProjectInfo>({
    name: '',
    customer: '',
    phone: '',
    address: '',
    date: new Date().toLocaleDateString('vi-VN'),
    staff: ''
  });

  const [modules, setModules] = useState<Module[]>(INITIAL_MODULES);
  const [activeTab, setActiveTab] = useState<string>('smarthome');
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [enlargedItem, setEnlargedItem] = useState<QuoteItem | null>(null);

  // Admin State
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'catalog' | 'versions' | 'users'>('catalog');
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showPersonalDashboard, setShowPersonalDashboard] = useState(false);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [currentFloor, setCurrentFloor] = useState('Tầng 1');
  const [currentRoom, setCurrentRoom] = useState('Phòng khách');
  const [versions, setVersions] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{message: string, onConfirm: () => void} | null>(null);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load versions from server
  useEffect(() => {
    const fetchVersions = async (retries = 5) => {
      try {
        const res = await fetch('/api/versions');
        if (res.ok) {
          const data = await res.json();
          setVersions(data);
        } else {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
      } catch (e) {
        console.error('Failed to fetch versions', e);
        if (retries > 0) {
          console.log(`Retrying versions... (${retries} attempts left)`);
          setTimeout(() => fetchVersions(retries - 1), 2000);
        }
      }
    };
    fetchVersions();
  }, []);

  const handleSaveVersion = async () => {
    const newVersion = {
      id: Date.now(),
      name: project.name || 'Báo giá không tên',
      customer: project.customer || 'Khách hàng mới',
      date: new Date().toLocaleString('vi-VN'),
      data: { project, modules, grandTotal }
    };
    
    try {
      const res = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVersion)
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions);
        showToast('Đã lưu phiên bản báo giá hiện tại lên hệ thống!');
      } else {
        showToast('Lỗi khi lưu phiên bản báo giá!', 'error');
      }
    } catch (error) {
      console.error('Save version error:', error);
      showToast('Không thể kết nối tới máy chủ!', 'error');
    }
  };

  const handleRestoreVersion = (version: any) => {
    if (!version || !version.data) {
      showToast('Dữ liệu phiên bản không hợp lệ!', 'error');
      return;
    }

    setConfirmDialog({
      message: `Bạn có chắc muốn khôi phục phiên bản "${version.name}"? Dữ liệu hiện tại sẽ bị thay thế.`,
      onConfirm: () => {
        if (version.data.project) setProject(version.data.project);
        if (version.data.modules) {
          const restored = version.data.modules.map((mod: any) => {
            const original = INITIAL_MODULES.find(m => m.id === mod.id);
            return {
              ...mod,
              icon: original ? original.icon : Home
            };
          });
          setModules(restored);
        }
        setConfirmDialog(null);
        showToast('Đã khôi phục phiên bản thành công!');
      }
    });
  };

  const handleDeleteVersion = async (id: number) => {
    try {
      const res = await fetch(`/api/versions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions);
        showToast('Đã xóa phiên bản báo giá!');
      } else {
        showToast('Lỗi khi xóa phiên bản!', 'error');
      }
    } catch (error) {
      console.error('Delete version error:', error);
      showToast('Không thể kết nối tới máy chủ!', 'error');
    }
  };

  const calculateTotalsByLocation = () => {
    const floorTotals: { [key: string]: { total: number; qty: number; rooms: { [key: string]: { total: number; qty: number } } } } = {};
    
    modules.filter(m => m.enabled).forEach(mod => {
      mod.items.forEach(item => {
        const f = item.floor || 'Tầng 1';
        const r = item.room || 'Phòng khách';
        const subtotal = calculateItemSubtotal(item);
        
        if (!floorTotals[f]) {
          floorTotals[f] = { total: 0, qty: 0, rooms: {} };
        }
        if (!floorTotals[f].rooms[r]) {
          floorTotals[f].rooms[r] = { total: 0, qty: 0 };
        }
        
        floorTotals[f].total += subtotal;
        floorTotals[f].qty += item.qty;
        floorTotals[f].rooms[r].total += subtotal;
        floorTotals[f].rooms[r].qty += item.qty;
      });
    });
    
    return floorTotals;
  };

  const getGroupedItems = (items: QuoteItem[]) => {
    const groups: { floor: string; rooms: { room: string; items: QuoteItem[] }[] }[] = [];
    items.forEach(item => {
      const f = item.floor || 'Tầng 1';
      const r = item.room || 'Phòng khách';
      
      let floorGroup = groups.find(g => g.floor === f);
      if (!floorGroup) {
        floorGroup = { floor: f, rooms: [] };
        groups.push(floorGroup);
      }
      
      let roomGroup = floorGroup.rooms.find(rg => rg.room === r);
      if (!roomGroup) {
        roomGroup = { room: r, items: [] };
        floorGroup.rooms.push(roomGroup);
      }
      
      roomGroup.items.push(item);
    });
    return groups;
  };

  type RowType = 
    | { type: 'floor'; floor: string; total: number; qty: number }
    | { type: 'room'; room: string; total: number; qty: number }
    | { type: 'item'; item: QuoteItem; globalIdx: number };

  const paginateModuleItems = (items: QuoteItem[], rowsPerPage: number = 12) => {
    const grouped = getGroupedItems(items);
    const pages: RowType[][] = [];
    let currentPage: RowType[] = [];
    let globalIdx = 0;

    grouped.forEach(floorGroup => {
      const floorTotal = floorGroup.rooms.reduce((sum, rg) => 
        sum + rg.items.reduce((s, i) => s + calculateItemSubtotal(i), 0), 0
      );
      const floorQty = floorGroup.rooms.reduce((sum, rg) => 
        sum + rg.items.reduce((s, i) => s + i.qty, 0), 0
      );

      floorGroup.rooms.forEach(roomGroup => {
        const roomTotal = roomGroup.items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
        const roomQty = roomGroup.items.reduce((sum, item) => sum + item.qty, 0);

        roomGroup.items.forEach(item => {
          globalIdx++;
          
          // If page is full OR we need to start a new page for a new room/floor
          // we check if we need to add headers
          if (currentPage.length >= rowsPerPage) {
            pages.push(currentPage);
            currentPage = [];
          }

          // If it's a new page, optionally repeat headers
          if (currentPage.length === 0) {
            currentPage.push({ type: 'floor', floor: floorGroup.floor, total: floorTotal, qty: floorQty });
            currentPage.push({ type: 'room', room: roomGroup.room, total: roomTotal, qty: roomQty });
          } else {
            // If it's not a new page but it's the first item of a room/floor, add headers
            const lastRow = currentPage[currentPage.length - 1];
            const isNewFloor = !currentPage.some(r => r.type === 'floor' && r.floor === floorGroup.floor);
            const isNewRoom = !currentPage.some(r => r.type === 'room' && r.room === roomGroup.room);

            if (isNewFloor) {
              if (currentPage.length >= rowsPerPage - 1) {
                pages.push(currentPage);
                currentPage = [{ type: 'floor', floor: floorGroup.floor, total: floorTotal, qty: floorQty }];
              } else {
                currentPage.push({ type: 'floor', floor: floorGroup.floor, total: floorTotal, qty: floorQty });
              }
            }
            if (isNewRoom) {
              if (currentPage.length >= rowsPerPage - 1) {
                pages.push(currentPage);
                currentPage = [
                  { type: 'floor', floor: floorGroup.floor, total: floorTotal, qty: floorQty },
                  { type: 'room', room: roomGroup.room, total: roomTotal, qty: roomQty }
                ];
              } else {
                currentPage.push({ type: 'room', room: roomGroup.room, total: roomTotal, qty: roomQty });
              }
            }
          }

          currentPage.push({ type: 'item', item, globalIdx });
        });
      });
    });

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  };

  type ImageRowType = 
    | { type: 'module'; mod: Module }
    | { type: 'items'; items: QuoteItem[] };

  const paginateImages = (modules: Module[], itemsPerRow: number = 4, rowsPerPage: number = 4) => {
    const pages: ImageRowType[][] = [];
    let currentPage: ImageRowType[] = [];
    let currentRowCount = 0;

    modules.filter(m => m.enabled && m.items.length > 0).forEach(mod => {
      const uniqueItems: QuoteItem[] = [];
      const seenCodes = new Set();
      mod.items.forEach(item => {
        const key = item.code || item.name;
        if (!seenCodes.has(key)) {
          seenCodes.add(key);
          uniqueItems.push(item);
        }
      });

      if (uniqueItems.length === 0) return;

      if (currentRowCount + 1 > rowsPerPage) {
        pages.push(currentPage);
        currentPage = [];
        currentRowCount = 0;
      }
      currentPage.push({ type: 'module', mod });
      currentRowCount++;

      for (let i = 0; i < uniqueItems.length; i += itemsPerRow) {
        if (currentRowCount + 1 > rowsPerPage) {
          pages.push(currentPage);
          currentPage = [];
          currentRowCount = 0;
          // Repeat module header on new page
          currentPage.push({ type: 'module', mod });
          currentRowCount++;
        }
        currentPage.push({ type: 'items', items: uniqueItems.slice(i, i + itemsPerRow) });
        currentRowCount++;
      }
    });

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  };

  const handleExportVersion = async (version: any, type: 'pdf' | 'excel' | 'word') => {
    if (!version || !version.data) {
      showToast('Dữ liệu phiên bản không hợp lệ!', 'error');
      return;
    }

    // Backup current state
    const backupProject = { ...project };
    const backupModules = [...modules];
    
    // Set state to version data with re-attached icons
    if (version.data.project) setProject(version.data.project);
    if (version.data.modules) {
      const restored = version.data.modules.map((mod: any) => {
        const original = INITIAL_MODULES.find(m => m.id === mod.id);
        return {
          ...mod,
          icon: original ? original.icon : Home
        };
      });
      setModules(restored);
    }
    
    // Wait for state update and render
    setTimeout(async () => {
      try {
        if (type === 'pdf') await handleExportPDF();
        else if (type === 'excel') handleExportExcel();
        else if (type === 'word') await handleExportWord();
      } finally {
        // Restore state
        setProject(backupProject);
        setModules(backupModules);
      }
    }, 500);
  };

  const isSyncingRef = useRef(false);

  const performFullSync = async (silent = false) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    if (!silent) showToast('Đang bắt đầu đồng bộ toàn bộ dữ liệu...');
    
    try {
      // 1. Đồng bộ sheet
      const syncRes = await fetch('/api/catalog/sync', { method: 'POST' });
      if (!syncRes.ok) throw new Error('Lỗi khi đồng bộ sheet');
      const syncData = await syncRes.json();
      let currentCatalog = syncData.catalog;
      if (!silent) showToast('Đã đồng bộ xong từ Google Sheets, đang phân loại...');
      
      // 2. Phân loại Lumi
      currentCatalog = currentCatalog.map((p: any) => {
        const isLumi = p.brand?.toLowerCase() === 'lumi' || 
                       p.name?.toLowerCase().includes('lumi') || 
                       p.code?.toLowerCase().startsWith('lm-');

        if (isLumi) {
          const description = (p.description || (p as any).desc || '');
          const name = p.name || '';
          const code = p.code || '';
          const fullDesc = (description + ' ' + name).toLowerCase();
          const lowerCode = code.toLowerCase();
          const isMechanical = fullDesc.includes('công tắc cơ') || fullDesc.includes('ct cơ') || lowerCode.includes('mc');
          
          let shape = p.shape || '';
          let color = p.color || '';
          let glassType = p.glassType || '';
          let borderType = p.borderType || '';

          if (!shape) {
            if (fullDesc.includes('chữ nhật') || fullDesc.includes('ngang') || lowerCode.endsWith('n') || lowerCode.includes('rect')) shape = 'Chữ nhật';
            else if (fullDesc.includes('vuông') || lowerCode.endsWith('v') || lowerCode.includes('sq')) shape = 'Vuông';
          }
          
          if (!color) {
            if (isMechanical) {
              if (fullDesc.includes('champagne') || fullDesc.includes('vàng be')) color = 'Champagne';
              else if (fullDesc.includes('dark grey') || fullDesc.includes('xám tối') || fullDesc.includes('xám đậm')) color = 'Dark Grey';
            } else {
              if (fullDesc.includes('trắng')) color = 'Trắng';
              else if (fullDesc.includes('đen')) color = 'Đen';
            }
          }
          
          if (!glassType) {
            if (fullDesc.includes('phẳng')) glassType = 'Kính phẳng';
            else if (fullDesc.includes('lõm')) glassType = 'Kính lõm';
          }
          
          if (!borderType) {
            if (fullDesc.includes('bo cong champagne') || fullDesc.includes('viền bo champagne')) borderType = 'Viền bo champagne';
            else if (fullDesc.includes('bo cong vàng') || fullDesc.includes('viền bo vàng')) borderType = 'Viền bo vàng';
            else if (fullDesc.includes('phẳng') || fullDesc.includes('viền thẳng') || fullDesc.includes('không viền')) borderType = 'Phẳng';
          }

          return { ...p, shape, color, glassType, borderType };
        }
        return p;
      });
      if (!silent) showToast('Đã phân loại xong, đang cập nhật ảnh từ Drive...');

      // 3. Cập nhật ảnh từ Google Drive
      const driveRes = await fetch('/api/catalog/drive-files');
      if (driveRes.ok) {
        const files = await driveRes.json();
        const imageFiles = files.filter((f: any) => f.mimeType.startsWith('image/'));
        
        if (imageFiles.length > 0) {
          for (const file of imageFiles) {
            const fileName = file.name;
            const lastDotIndex = fileName.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
            const searchName = baseName.toLowerCase().trim();
            const normalizedSearch = searchName.replace(/[\-\/\_]/g, ' ').replace(/\s+/g, ' ').trim();
            
            const driveUrl = `https://lh3.googleusercontent.com/d/${file.id}`;
            
            for (let j = 0; j < currentCatalog.length; j++) {
              const p = currentCatalog[j];
              const code = p.code ? p.code.toLowerCase().trim() : '';
              const name = p.name ? p.name.toLowerCase().trim() : '';
              
              const normalizedCode = code.replace(/[\-\/\_]/g, ' ').replace(/\s+/g, ' ').trim();
              const normalizedName = name.replace(/[\-\/\_]/g, ' ').replace(/\s+/g, ' ').trim();
              
              let isMatch = false;
              if (normalizedCode && normalizedSearch === normalizedCode) isMatch = true;
              else if (normalizedName && normalizedSearch === normalizedName) isMatch = true;
              else if (normalizedCode && (normalizedSearch.startsWith(normalizedCode + ' ') || normalizedSearch.startsWith(normalizedCode + '('))) isMatch = true;
              else if (normalizedName && (normalizedSearch.startsWith(normalizedName + ' ') || normalizedSearch.startsWith(normalizedName + '('))) isMatch = true;
              
              if (!isMatch) {
                if (code && searchName === code) isMatch = true;
                else if (name && searchName === name) isMatch = true;
              }
              
              if (isMatch) {
                currentCatalog[j] = { ...currentCatalog[j], image: driveUrl };
              }
            }
          }
        }
      }
      if (!silent) showToast('Đã cập nhật ảnh xong, đang lưu thay đổi...');

      // 4. Lưu thay đổi
      const saveRes = await fetch('/api/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentCatalog)
      });
      
      if (saveRes.ok) {
        setCatalog(currentCatalog);
        showToast('Đã đồng bộ dữ liệu hệ thống tự động');
      } else {
        throw new Error('Lỗi khi lưu dữ liệu cuối cùng');
      }
    } catch (error: any) {
      console.error('Full sync error:', error);
      if (!silent) showToast(error.message || 'Lỗi trong quá trình đồng bộ dữ liệu', 'error');
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    const fetchCatalog = async (retries = 5) => {
      try {
        const res = await fetch('/api/catalog');
        if (res.ok) {
          const data = await res.json();
          setCatalog(data);
          // Tự động đồng bộ khi mở app
          performFullSync(true);
        } else {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
      } catch (error) {
        console.error('Failed to fetch catalog:', error);
        if (retries > 0) {
          console.log(`Retrying... (${retries} attempts left)`);
          setTimeout(() => fetchCatalog(retries - 1), 2000);
        }
      }
    };
    fetchCatalog();
  }, []);

  const handleSyncData = async () => {
    setConfirmDialog({
      message: 'Hệ thống sẽ thực hiện: Đồng bộ sheet -> Phân loại Lumi -> Cập nhật ảnh Drive -> Lưu thay đổi. Bạn có muốn tiếp tục?',
      onConfirm: async () => {
        setConfirmDialog(null);
        await performFullSync(false);
      }
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const users = await res.json();
        const user = users.find((u: any) => u.username === loginForm.user && u.password === loginForm.pass);
        
        if (user) {
          setCurrentUser(user);
          setProject(prev => ({ ...prev, staff: user.name }));
          setShowLogin(false);
          setLoginForm({ user: '', pass: '' });
          
          if (user.role === 'admin') {
            setIsAdminOpen(true);
          } else {
            showToast(`Đăng nhập thành công! Xin chào ${user.name}`);
          }
        } else if (loginForm.user === 'Admin' && loginForm.pass === 'Thienan@1234') {
          // Fallback admin
          const adminUser = { id: 'admin', username: 'Admin', name: 'Quản trị viên', role: 'admin' };
          setCurrentUser(adminUser);
          setProject(prev => ({ ...prev, staff: adminUser.name }));
          setShowLogin(false);
          setIsAdminOpen(true);
          setLoginForm({ user: '', pass: '' });
        } else {
          showToast('Tài khoản hoặc mật khẩu không chính xác!', 'error');
        }
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Login error:', error);
      // Fallback if API fails
      if (loginForm.user === 'Admin' && loginForm.pass === 'Thienan@1234') {
        const adminUser = { id: 'admin', username: 'Admin', name: 'Quản trị viên', role: 'admin' };
        setCurrentUser(adminUser);
        setProject(prev => ({ ...prev, staff: adminUser.name }));
        setShowLogin(false);
        setIsAdminOpen(true);
        setLoginForm({ user: '', pass: '' });
      } else {
        showToast('Lỗi kết nối máy chủ!', 'error');
      }
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount));
  };

  const calculateItemSubtotal = (item: QuoteItem) => {
    const priceAfterCK = item.price * (1 - item.discount / 100);
    return item.qty * priceAfterCK;
  };

  const calculateModuleEquipmentTotal = (mod: Module) => {
    return mod.items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
  };

  const calculateModuleLaborCost = (mod: Module) => {
    const equipTotal = calculateModuleEquipmentTotal(mod);
    return equipTotal * (mod.laborCostPercent ?? 10) / 100;
  };

  const calculateModuleAuxMaterialCost = (mod: Module) => {
    const equipTotal = calculateModuleEquipmentTotal(mod);
    return equipTotal * (mod.auxMaterialPercent ?? 5) / 100;
  };

  const calculateModuleTotal = (mod: Module) => {
    return calculateModuleEquipmentTotal(mod) + calculateModuleLaborCost(mod) + calculateModuleAuxMaterialCost(mod);
  };

  const grandTotal = useMemo(() => {
    return modules.reduce((sum, mod) => mod.enabled ? sum + calculateModuleTotal(mod) : sum, 0);
  }, [modules]);

  const numberToVietnameseWords = (number: number): string => {
    if (number === 0) return 'Không đồng';
    
    const units = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];
    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    
    const readThreeDigits = (n: number, isFirstGroup: boolean): string => {
      let res = '';
      const h = Math.floor(n / 100);
      const t = Math.floor((n % 100) / 10);
      const u = n % 10;
      
      if (h > 0 || !isFirstGroup) {
        res += digits[h] + ' trăm ';
      }
      
      if (t > 0) {
        if (t === 1) res += 'mười ';
        else res += digits[t] + ' mươi ';
      } else if (h > 0 && u > 0) {
        res += 'lẻ ';
      }
      
      if (t > 0 && u === 1 && t > 1) res += 'mốt';
      else if (t > 0 && u === 5) res += 'lăm';
      else if (u > 0) res += digits[u];
      
      return res.trim();
    };

    let res = '';
    let i = 0;
    let temp = Math.round(number);
    
    if (temp < 0) {
      res = 'Âm ';
      temp = Math.abs(temp);
    }

    const groups: number[] = [];
    while (temp > 0) {
      groups.push(temp % 1000);
      temp = Math.floor(temp / 1000);
    }

    for (let j = groups.length - 1; j >= 0; j--) {
      const groupRead = readThreeDigits(groups[j], j === groups.length - 1);
      if (groupRead !== '') {
        res += (res === '' || res === 'Âm ' ? '' : ' ') + groupRead + units[j];
      }
    }

    const finalResult = res.trim();
    return finalResult.charAt(0).toUpperCase() + finalResult.slice(1) + ' đồng';
  };

  const handleUpdateItem = (modId: string, itemId: string, field: keyof QuoteItem, value: any) => {
    setModules(prev => prev.map(mod => {
      if (mod.id !== modId) return mod;
      return {
        ...mod,
        items: mod.items.map(item => {
          if (item.id !== itemId) return item;
          return { ...item, [field]: value };
        })
      };
    }));
  };

  const handleAddItem = (modId: string, product?: any) => {
    setModules(prev => prev.map(mod => {
      if (mod.id !== modId) return mod;
      
      // Try to extract code from name if it's in format [CODE] NAME
      let code = product?.code || '';
      let name = product?.name || '';
      
      if (!code && name.startsWith('[') && name.includes(']')) {
        const match = name.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
          code = match[1];
          name = match[2];
        }
      }

      return {
        ...mod,
        enabled: true,
        items: [...mod.items, {
          id: Math.random().toString(36).substr(2, 9),
          code: code,
          brand: product?.brand || '',
          name: name,
          description: product?.description || '',
          unit: product?.unit || 'Cái',
          qty: 1,
          price: product?.price || 0,
          discount: 0,
          note: '',
          image: product?.image || 'https://picsum.photos/seed/product/200/200',
          floor: currentFloor,
          room: currentRoom,
          shape: product?.shape || '',
          color: product?.color || '',
          glassType: product?.glassType || '',
          borderType: product?.borderType || ''
        }]
      };
    }));
    if (product) {
      setSearchQuery('');
      setSelectedProduct(null);
      showToast(`Đã thêm ${product.name} vào báo giá`);
    }
  };

  const handleDeleteItem = (modId: string, itemId: string) => {
    setModules(prev => prev.map(mod => {
      if (mod.id !== modId) return mod;
      const newItems = mod.items.filter(item => item.id !== itemId);
      return {
        ...mod,
        enabled: newItems.length > 0,
        items: newItems
      };
    }));
  };

  const handleToggleModule = (modId: string) => {
    setModules(prev => prev.map(mod => {
      if (mod.id !== modId) return mod;
      return { ...mod, enabled: !mod.enabled };
    }));
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      
      const wsData: any[][] = [];
      
      // Header
      wsData.push(["CÔNG TY TNHH NHÀ THÔNG MINH THIÊN ÂN"]);
      wsData.push(["Địa chỉ: 480A Trần Hưng Đạo, phường Hoa Lư, tỉnh Ninh Bình"]);
      wsData.push(["Hotline: 0972.342.807 - 0944.495.535"]);
      wsData.push(["Website: thienansmarthome.vn"]);
      wsData.push([]);
      wsData.push(["BÁO GIÁ DỰ ÁN", project.name]);
      wsData.push(["Khách hàng:", project.customer, "SĐT:", project.phone]);
      wsData.push(["Địa chỉ:", project.address]);
      wsData.push(["Ngày lập:", project.date]);
      wsData.push(["Người lập:", project.staff]);
      wsData.push([]);
      
      // Table Header
      wsData.push(["STT", "Mã thiết bị", "Tên thiết bị", "Hình dạng", "Màu sắc", "Loại kính", "Loại viền", "Thương hiệu", "ĐVT", "Số lượng", "Đơn giá (VNĐ)", "Chiết khấu (%)", "Thành tiền (VNĐ)", "Ghi chú"]);
      
      let totalAmount = 0;
      let totalDiscount = 0;
      
      modules.filter(m => m.enabled).forEach((mod, mIdx) => {
        // Module Header Row
        wsData.push([
          `${mIdx + 1}`, 
          mod.name.toUpperCase(), 
          "", "", "", "", "", "", "", "", "", "", "", "", "", ""
        ]);
        
        mod.items.forEach((item, iIdx) => {
          const amount = item.price * item.qty;
          const discountAmount = amount * (item.discount / 100);
          const finalAmount = amount - discountAmount;
          
          totalAmount += amount;
          totalDiscount += discountAmount;
          
          wsData.push([
            `${mIdx + 1}.${iIdx + 1}`,
            item.code || "",
            item.name,
            item.shape || "",
            item.color || "",
            item.glassType || "",
            item.borderType || "",
            item.brand,
            item.unit,
            item.qty,
            item.price,
            item.discount,
            finalAmount,
            item.note
          ]);
        });
      });
      
      wsData.push([]);
      wsData.push(["", "", "", "", "", "", "", "", "", "", "", "", "Tổng cộng:", totalAmount]);
      wsData.push(["", "", "", "", "", "", "", "", "", "", "", "", "Tổng chiết khấu:", totalDiscount]);
      wsData.push(["", "", "", "", "", "", "", "", "", "", "", "", "THÀNH TIỀN:", totalAmount - totalDiscount]);
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Add some basic column widths
      ws['!cols'] = [
        { wch: 5 },  // STT
        { wch: 15 }, // Mã thiết bị
        { wch: 40 }, // Tên thiết bị
        { wch: 15 }, // Hình dạng
        { wch: 15 }, // Màu sắc
        { wch: 15 }, // Loại kính
        { wch: 15 }, // Loại viền
        { wch: 10 }, // Tầng
        { wch: 15 }, // Phòng
        { wch: 15 }, // Thương hiệu
        { wch: 10 }, // ĐVT
        { wch: 10 }, // Số lượng
        { wch: 15 }, // Đơn giá
        { wch: 12 }, // Chiết khấu
        { wch: 15 }, // Thành tiền
        { wch: 20 }  // Ghi chú
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, "Báo Giá");
      
      XLSX.writeFile(wb, `BaoGia_${project.customer.replace(/\s/g, '_')}.xlsx`);
    } catch (error) {
      console.error('Excel Export Error:', error);
      showToast('Có lỗi xảy ra khi tạo file Excel. Vui lòng thử lại.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWord = async () => {
    const element = document.getElementById('print-area');
    if (!element) return;

    setIsExporting(true);
    try {
      // Wait for all images to load
      await waitForImages(element);
      // Extra small delay for layout stabilization
      await new Promise(resolve => setTimeout(resolve, 300));

      const sections = element.querySelectorAll('.pdf-section');
      const docSections: any[] = [];

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;
        
        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: section.offsetWidth,
          height: section.offsetHeight,
          x: 0,
          y: 0,
          onclone: (clonedDoc) => {
            const elements = clonedDoc.getElementsByTagName('*');
            for (let j = 0; j < elements.length; j++) {
              const el = elements[j] as HTMLElement;
              if (el.style.color && el.style.color.includes('oklch')) el.style.color = '#333333';
              if (el.style.backgroundColor && el.style.backgroundColor.includes('oklch')) el.style.backgroundColor = '#ffffff';
              if (el.style.borderColor && el.style.borderColor.includes('oklch')) el.style.borderColor = '#dddddd';
            }
          }
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        const raw = window.atob(imgData.split(',')[1]);
        const uInt8Array = new Uint8Array(raw.length);
        for (let j = 0; j < raw.length; ++j) {
            uInt8Array[j] = raw.charCodeAt(j);
        }

        // A4 width in pixels at 96 DPI is ~794px (Portrait) or ~1123px (Landscape)
        const targetWidth = i === 0 ? 794 : 1123;
        const targetHeight = (canvas.height / canvas.width) * targetWidth;

        const paragraph = new Paragraph({
          children: [
            new ImageRun({
              data: uInt8Array,
              type: "jpg",
              transformation: {
                width: targetWidth,
                height: targetHeight,
              },
            }),
          ],
        });

        docSections.push({
          properties: {
            page: {
              size: {
                orientation: i === 0 ? PageOrientation.PORTRAIT : PageOrientation.LANDSCAPE,
              },
              margin: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              },
            },
          },
          children: [paragraph],
        });
      }

      const doc = new Document({
        sections: docSections,
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BaoGia_${project.customer.replace(/\s/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Word Export Error:', error);
      showToast('Có lỗi xảy ra khi tạo file Word. Vui lòng thử lại.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const waitForImages = async (element: HTMLElement) => {
    const images = element.getElementsByTagName('img');
    const promises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });
    await Promise.all(promises);
  };

  const renderQuotationPages = (isPreview: boolean = false) => {
    const allPages: React.ReactNode[] = [];
    
    // Page 1: Summary (Portrait)
    allPages.push(
      <div 
        key="page-summary" 
        className={`pdf-section p-[15mm] w-[210mm] h-[297mm] overflow-hidden flex flex-col bg-white ${isPreview ? 'mx-auto shadow-2xl mb-8 rounded-sm' : ''}`}
      >
        <div className="flex items-center justify-between border-b-4 border-[#0F4C81] pb-4 mb-6 w-full gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl border border-gray-100 flex-shrink-0">
              <Logo className="h-16 w-auto" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black text-[#0F4C81] uppercase leading-tight">
                CÔNG TY TNHH NHÀ THÔNG MINH <br /> THIÊN ÂN
              </h1>
              <div className="text-[10px] text-gray-600 mt-2 space-y-0.5">
                <p><span className="font-bold">Địa chỉ:</span> 480A Trần Hưng Đạo, phường Hoa Lư, tỉnh Ninh Bình</p>
                <p><span className="font-bold">Hotline:</span> 0972.342.807 - 0944.495.535</p>
                <p><span className="font-bold">Website:</span> thienansmarthome.vn</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-[#1BA1E2] uppercase tracking-widest">BÁO GIÁ DỰ ÁN</h2>
        </div>

        <div className="mb-8 bg-[#f9fafb] p-6 rounded-2xl border border-gray-100">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <p className="flex items-center"><span className="font-bold text-[#0F4C81] w-32">Dự án:</span> <span className="font-semibold">{project.name}</span></p>
            <p className="flex items-center"><span className="font-bold text-[#0F4C81] w-32">Khách hàng:</span> <span className="font-semibold text-[#1BA1E2]">{project.customer}</span></p>
            <p className="flex items-center"><span className="font-bold text-[#0F4C81] w-32">Ngày lập:</span> <span>{project.date}</span></p>
            <p className="flex items-center"><span className="font-bold text-[#0F4C81] w-32">Số điện thoại:</span> <span>{project.phone}</span></p>
            <p className="flex items-center"><span className="font-bold text-[#0F4C81] w-32">Địa chỉ:</span> <span className="truncate">{project.address}</span></p>
            <p className="flex items-center"><span className="font-bold text-[#0F4C81] w-32">Người lập:</span> <span className="font-bold text-[#1BA1E2]">{project.staff}</span></p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-[#0F4C81] mb-4 uppercase border-b-2 pb-2">TỔNG HỢP CHI PHÍ CÁC HẠNG MỤC</h2>
        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="bg-[#0F4C81] text-white">
              <th className="p-3 text-left border border-[#0F4C81]">STT</th>
              <th className="p-3 text-left border border-[#0F4C81]">Hạng mục hệ thống</th>
              <th className="p-3 text-right border border-[#0F4C81]">Thành tiền (đ)</th>
            </tr>
          </thead>
          <tbody>
            {modules.filter(m => m.enabled).map((mod, idx) => (
              <tr key={mod.id} className="border-b">
                <td className="p-3 border text-center">{idx + 1}</td>
                <td className="p-3 border font-semibold text-[#374151]">{mod.name}</td>
                <td className="p-3 border text-right font-bold text-[#0F4C81]">{formatMoney(calculateModuleTotal(mod))}</td>
              </tr>
            ))}
            <tr className="bg-[#f3f4f6]">
              <td colSpan={2} className="p-4 text-right font-black uppercase text-[#4b5563]">Tổng cộng dự toán (Chưa bao gồm VAT)</td>
              <td className="p-4 text-right text-2xl font-black text-[#1BA1E2]">{formatMoney(grandTotal)}</td>
            </tr>
            <tr>
              <td colSpan={3} className="p-4 text-center text-[#4b5563] border-t">
                <p className="italic text-sm"><span className="font-bold">Bằng chữ: </span>{numberToVietnameseWords(grandTotal)}</p>
                <p className="text-xs mt-2 font-medium text-[#ef4444]">( Báo giá có hiệu lực 07 ngày kể từ ngày báo giá)</p>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-auto grid grid-cols-2 gap-12 text-center pb-8">
          <div>
            <p className="font-bold mb-24 uppercase text-sm tracking-widest">Đại diện khách hàng</p>
            <div className="w-48 h-px bg-[#d1d5db] mx-auto mb-2"></div>
            <p className="text-[#9ca3af] italic text-[10px]"> (Ký và ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-bold mb-24 uppercase text-sm tracking-widest">Người lập báo giá</p>
            <p className="font-bold text-xl text-[#0F4C81]">{project.staff}</p>
            <p className="text-xs text-[#6b7280] mt-2">Thiên Ân Smarthome</p>
          </div>
        </div>
      </div>
    );

    // Detailed Pages (Landscape)
    const allItems = modules.filter(m => m.enabled).flatMap(m => m.items);
    const paginatedItems = paginateModuleItems(allItems);
    
    paginatedItems.forEach((pageRows, pIdx) => {
      allPages.push(
        <div 
          key={`page-detail-${pIdx}`} 
          className={`pdf-section p-[15mm] w-[297mm] h-[210mm] overflow-hidden flex flex-col bg-white ${isPreview ? 'mx-auto shadow-2xl mb-8 rounded-sm' : ''}`}
        >
          <div className="flex justify-between items-start border-b-2 border-gray-200 pb-2 mb-4 gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Logo className="h-10 w-auto flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#0F4C81] uppercase whitespace-nowrap">Công ty TNHH Nhà Thông Minh Thiên Ân</p>
                <p className="text-[8px] text-gray-500 whitespace-nowrap">Hotline: 0972.342.807 - 0944.495.535 | thienansmarthome.vn</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Dự án: {project.name}</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Trang: {pIdx + 2}</p>
            </div>
          </div>

          <div className="flex justify-between items-end border-b-4 border-[#1BA1E2] pb-2 mb-4">
            <div>
              <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1">Chi tiết hạng mục</p>
              <h2 className="text-xl font-black text-[#0F4C81] uppercase">BẢNG KÊ CHI TIẾT THIẾT BỊ</h2>
            </div>
          </div>

          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-[#f3f4f6]">
                <th className="p-1.5 border font-bold text-[#4b5563]">STT</th>
                <th className="p-1.5 border font-bold text-[#4b5563]">Hình ảnh</th>
                <th className="p-1.5 border font-bold text-[#4b5563]">Tên thiết bị</th>
                <th className="p-1.5 border font-bold text-[#4b5563]">Hãng</th>
                <th className="p-1.5 border font-bold text-[#4b5563]">Mã thiết bị</th>
                <th className="p-1.5 border font-bold text-[#4b5563]">Thông số</th>
                <th className="p-1.5 border font-bold text-[#4b5563]">ĐVT</th>
                <th className="p-1.5 border font-bold text-[#4b5563]">SL</th>
                <th className="p-1.5 border font-bold text-[#4b5563]">Đơn giá (đ)</th>
                <th className="p-1.5 border font-bold text-[#4b5563]">% CK</th>
                <th className="p-1.5 border font-bold text-[#4b5563] text-right">Thành tiền (đ)</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, rIdx) => {
                if (row.type === 'floor') {
                  return (
                    <tr key={`floor-${rIdx}`} className="bg-gray-100">
                      <td colSpan={11} className="p-1 font-black text-[#0F4C81] uppercase text-[9px] tracking-widest text-center border">
                        {row.floor} - Tổng: {formatMoney(row.total)} ({row.qty} thiết bị)
                      </td>
                    </tr>
                  );
                }
                if (row.type === 'room') {
                  return (
                    <tr key={`room-${rIdx}`} className="bg-blue-50">
                      <td colSpan={11} className="p-1 font-bold text-gray-600 italic text-[9px] text-center border">
                        {row.room} - Tổng: {formatMoney(row.total)} ({row.qty} thiết bị)
                      </td>
                    </tr>
                  );
                }
                if (row.type === 'item') {
                  const item = row.item;
                  const specs = [item.shape, item.color, item.glassType, item.borderType].filter(Boolean).join(', ');
                  return (
                    <tr key={item.id} className="hover:bg-[#f9fafb]">
                      <td className="p-1.5 border text-center text-[#6b7280]">{row.globalIdx}</td>
                      <td className="p-1 border text-center w-12">
                        <img 
                          src={item.image || getPlaceholderImage(item.code || item.id)} 
                          alt="" 
                          className="w-8 h-8 object-contain bg-white rounded mx-auto border border-gray-100" 
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getPlaceholderImage(item.code || item.id);
                          }}
                        />
                      </td>
                      <td className="p-1.5 border">{item.name}</td>
                      <td className="p-1.5 border font-medium">{item.brand}</td>
                      <td className="p-1.5 border font-mono text-[8px]">{item.code}</td>
                      <td className="p-1.5 border text-center text-[8px] leading-tight">{specs}</td>
                      <td className="p-1.5 border text-center">{item.unit}</td>
                      <td className="p-1.5 border text-center font-bold">{item.qty}</td>
                      <td className="p-1.5 border text-right">{formatMoney(item.price)}</td>
                      <td className="p-1.5 border text-center text-[#2563eb] font-semibold">{item.discount}%</td>
                      <td className="p-1.5 border text-right font-bold text-[#0F4C81]">{formatMoney(calculateItemSubtotal(item))}</td>
                    </tr>
                  );
                }
                return null;
              })}
            </tbody>
          </table>
          <div className="mt-auto pt-4 border-t flex justify-between items-center">
            <p className="text-[8px] text-gray-400 italic">* Ghi chú: Giá trên chưa bao gồm thuế VAT 10%</p>
            <p className="text-[8px] font-bold text-[#0F4C81]">THIÊN ÂN SMARTHOME - GIẢI PHÁP NHÀ THÔNG MINH TOÀN DIỆN</p>
          </div>
        </div>
      );
    });

    // Image Pages (Landscape)
    const paginatedImages = paginateImages(modules);
    paginatedImages.forEach((pageImages, pIdx) => {
      allPages.push(
        <div 
          key={`page-images-${pIdx}`} 
          className={`pdf-section p-[15mm] w-[297mm] h-[210mm] overflow-hidden flex flex-col bg-white ${isPreview ? 'mx-auto shadow-2xl mb-8 rounded-sm' : ''}`}
        >
          <div className="flex justify-between items-start border-b-2 border-gray-200 pb-2 mb-4 gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Logo className="h-10 w-auto flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#0F4C81] uppercase whitespace-nowrap">Công ty TNHH Nhà Thông Minh Thiên Ân</p>
                <p className="text-[8px] text-gray-500 whitespace-nowrap">Hotline: 0972.342.807 - 0944.495.535 | thienansmarthome.vn</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Dự án: {project.name}</p>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Trang: {paginatedItems.length + pIdx + 2}</p>
            </div>
          </div>

          <div className="flex justify-between items-end border-b-4 border-[#1BA1E2] pb-2 mb-6">
            <div>
              <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1">Hình ảnh minh họa</p>
              <h2 className="text-xl font-black text-[#0F4C81] uppercase">DANH MỤC HÌNH ẢNH THIẾT BỊ</h2>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-4 gap-4 h-full">
              {pageImages.map((row, rIdx) => {
                if (row.type === 'module') {
                  return (
                    <div key={`mod-header-${rIdx}`} className="col-span-4 bg-[#0F4C81] text-white p-1.5 rounded-lg flex items-center gap-2">
                      <row.mod.icon size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">{row.mod.name}</span>
                    </div>
                  );
                }
                return row.items.map((item) => (
                  <div key={item.id} className="border rounded-xl p-2 flex flex-col items-center bg-white shadow-sm">
                    <div className="w-full aspect-square mb-2 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                      <img 
                        src={item.image || getPlaceholderImage(item.code || item.id)} 
                        alt={item.name} 
                        className="max-w-full max-h-full object-contain"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getPlaceholderImage(item.code || item.id);
                        }}
                      />
                    </div>
                    <p className="text-[9px] font-bold text-[#0F4C81] text-center line-clamp-1">{item.name}</p>
                    <p className="text-[8px] text-gray-400 font-mono mt-0.5">{item.code}</p>
                    <p className="text-[8px] text-[#1BA1E2] font-bold mt-1">{item.brand}</p>
                  </div>
                ));
              })}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t flex justify-between items-center">
            <p className="text-[8px] text-gray-400 italic">* Hình ảnh chỉ mang tính chất minh họa cho sản phẩm</p>
            <p className="text-[8px] font-bold text-[#0F4C81]">THIÊN ÂN SMARTHOME - GIẢI PHÁP NHÀ THÔNG MINH TOÀN DIỆN</p>
          </div>
        </div>
      );
    });

    return allPages;
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('print-area');
    if (!element) return;

    setIsExporting(true);
    try {
      await waitForImages(element);
      await new Promise(resolve => setTimeout(resolve, 500));

      const pdf = new jsPDF('p', 'mm', 'a4');
      const sections = element.querySelectorAll('.pdf-section');

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;
        const isLandscape = section.classList.contains('w-[297mm]');
        const orientation = isLandscape ? 'l' : 'p';
        
        if (i > 0) {
          pdf.addPage('a4', orientation);
        } else if (isLandscape) {
          // If first page is landscape (unlikely but possible)
          pdf.setPage(1);
          pdf.addPage('a4', 'l');
          pdf.deletePage(1);
        }

        const canvas = await html2canvas(section, { 
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: isLandscape ? 1122 : 794,
          windowHeight: isLandscape ? 794 : 1122,
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`BaoGia_${project.customer.replace(/\s/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      showToast('Có lỗi xảy ra khi tạo file PDF. Vui lòng thử lại.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const hasPermission = (featureId: string, type: 'full' | 'view' | 'edit') => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    const perms = currentUser.permissions?.[featureId];
    if (!perms) return false;
    if (perms.full) return true;
    return perms[type];
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#00000099] backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-7xl max-h-full rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 md:p-6 border-b flex flex-col md:flex-row justify-between items-center bg-gray-50 gap-4">
                <div className="text-center md:text-left">
                  <h3 className="text-lg md:text-xl font-bold text-[#0F4C81]">Xem trước báo giá</h3>
                  <p className="text-xs md:text-sm text-gray-500">Kiểm tra lại thông tin trước khi tải xuống</p>
                </div>
                <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3">
                  <button 
                    onClick={handleExportWord}
                    disabled={isExporting}
                    className={`btn-secondary py-2 px-3 md:px-4 shadow-md bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 rounded-xl transition-colors text-xs md:text-sm ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <FileText size={16} className="md:w-[18px]" />
                        <span className="hidden sm:inline">Tải xuống Word</span>
                        <span className="sm:hidden">Word</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className={`btn-secondary py-2 px-3 md:px-4 shadow-md bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 rounded-xl transition-colors text-xs md:text-sm ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <FileSpreadsheet size={16} className="md:w-[18px]" />
                        <span className="hidden sm:inline">Tải xuống Excel</span>
                        <span className="sm:hidden">Excel</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className={`btn-primary py-2 px-4 md:px-6 shadow-md text-xs md:text-sm ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Download size={16} className="md:w-[18px]" />
                        <span className="hidden sm:inline">Tải xuống PDF</span>
                        <span className="sm:hidden">PDF</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setShowPreview(false)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Modal Content (The actual quotation) */}
              <div className="flex-1 overflow-y-auto p-2 md:p-12 bg-gray-200">
                <div className="bg-white shadow-xl mx-auto w-full md:max-w-[297mm] min-h-screen md:min-h-[210mm] p-4 md:p-[15mm] text-[#333]">
                  <div className="flex flex-col items-center justify-center border-b-4 border-[#0F4C81] pb-6 mb-6 gap-4 w-full">
                    <div className="flex flex-col items-center gap-4 flex-1 text-center">
                      <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex-shrink-0">
                        <Logo className="h-16 md:h-20 w-auto" />
                      </div>
                      <div className="min-w-0">
                        <h1 className="text-xl md:text-5xl font-black text-[#0F4C81] uppercase leading-tight text-center">
                          CÔNG TY TNHH NHÀ THÔNG MINH <br /> THIÊN ÂN
                        </h1>
                        <div className="text-[10px] md:text-xs text-gray-600 mt-4 space-y-0.5 text-center">
                          <p><span className="font-bold">Địa chỉ:</span> 480A Trần Hưng Đạo, phường Hoa Lư, tỉnh Ninh Bình</p>
                          <p><span className="font-bold">Hotline:</span> 0972.342.807 - 0944.495.535</p>
                          <p><span className="font-bold">Website:</span> thienansmarthome.vn</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mb-8">
                    <h2 className="text-lg md:text-3xl font-black text-[#1BA1E2] uppercase tracking-widest">BÁO GIÁ DỰ ÁN</h2>
                  </div>

                  <div className="mb-8 bg-[#f9fafb] p-4 md:p-6 rounded-2xl border border-gray-100">
                    <div className="space-y-2 text-xs md:text-sm">
                      <p className="flex flex-col md:flex-row md:items-center"><span className="font-bold text-[#0F4C81] md:w-32">Thông tin dự án:</span> <span className="font-semibold">{project.name}</span></p>
                      <p className="flex flex-col md:flex-row md:items-center"><span className="font-bold text-[#0F4C81] md:w-32">Khách hàng:</span> <span><span className="font-semibold">{project.customer}</span> <span className="hidden md:inline mx-4 text-gray-300">|</span> <span className="md:hidden block h-1"></span> <span className="font-bold text-[#0F4C81]">SĐT:</span> {project.phone}</span></p>
                      <p className="flex flex-col md:flex-row md:items-center"><span className="font-bold text-[#0F4C81] md:w-32">Địa chỉ:</span> <span>{project.address}</span></p>
                      <p className="flex flex-col md:flex-row md:items-center"><span className="font-bold text-[#0F4C81] md:w-32">Ngày lập:</span> <span>{project.date}</span></p>
                      <p className="flex flex-col md:flex-row md:items-center"><span className="font-bold text-[#0F4C81] md:w-32">Người lập:</span> <span className="font-bold text-[#1BA1E2]">{project.staff}</span></p>
                    </div>
                  </div>

                  <h2 className="text-lg md:text-xl font-bold text-[#0F4C81] mb-6 uppercase border-b-2 pb-2">TỔNG HỢP CHI PHÍ CÁC HẠNG MỤC</h2>
                  <div className="overflow-x-auto -mx-4 md:mx-0">
                    <table className="w-full mb-12 border-collapse min-w-[600px] md:min-w-full">
                      <thead>
                        <tr className="bg-[#0F4C81] text-white">
                          <th className="p-3 md:p-4 text-left border border-[#0F4C81]">STT</th>
                          <th className="p-3 md:p-4 text-left border border-[#0F4C81]">Hạng mục hệ thống</th>
                          <th className="p-3 md:p-4 text-right border border-[#0F4C81]">Thành tiền (đ)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules.filter(m => m.enabled).map((mod, idx) => (
                          <tr key={mod.id} className="border-b">
                            <td className="p-3 md:p-4 border text-center">{idx + 1}</td>
                            <td className="p-3 md:p-4 border font-semibold text-[#374151]">{mod.name}</td>
                            <td className="p-3 md:p-4 border text-right font-bold text-[#0F4C81]">{formatMoney(calculateModuleTotal(mod))}</td>
                          </tr>
                        ))}
                        <tr className="bg-[#f3f4f6]">
                          <td colSpan={2} className="p-4 md:p-5 text-right font-black uppercase text-[#4b5563] text-xs md:text-base">Tổng cộng dự toán (Chưa bao gồm VAT)</td>
                          <td className="p-4 md:p-5 text-right text-lg md:text-2xl font-black text-[#1BA1E2]">{formatMoney(grandTotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-[#4b5563] border-t">
                            <p className="italic text-xs md:text-sm"><span className="font-bold">Bằng chữ: </span>{numberToVietnameseWords(grandTotal)}</p>
                            <p className="text-[10px] md:text-xs mt-2 font-medium text-[#ef4444]">( Báo giá có hiệu lực 07 ngày kể từ ngày báo giá)</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-12 md:mt-20 grid grid-cols-2 gap-6 md:gap-12 text-center">
                    <div>
                      <p className="font-bold mb-16 md:mb-24 uppercase text-[10px] md:text-sm tracking-widest">Đại diện khách hàng</p>
                      <div className="w-32 md:w-48 h-px bg-[#d1d5db] mx-auto mb-2"></div>
                      <p className="text-[#9ca3af] italic text-[10px]"> (Ký và ghi rõ họ tên)</p>
                    </div>
                    <div>
                      <p className="font-bold mb-16 md:mb-24 uppercase text-[10px] md:text-sm tracking-widest">Người lập báo giá</p>
                      <p className="font-bold text-base md:text-xl text-[#0F4C81]">{project.staff}</p>
                      <p className="text-[10px] text-[#6b7280] mt-2">Thiên Ân Smarthome</p>
                    </div>
                  </div>

                  {/* Detailed Sections in Preview */}
                  {modules.filter(m => m.enabled && m.items.length > 0).map((mod) => (
                    <div key={mod.id} className="pt-12 border-t mt-12">
                      <div className="flex justify-between items-start border-b-2 border-gray-200 pb-4 mb-6 gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <Logo className="h-10 w-auto flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#0F4C81] uppercase whitespace-nowrap">Công ty TNHH Nhà Thông Minh Thiên Ân</p>
                            <p className="text-[8px] text-gray-500 whitespace-nowrap">Hotline: 0972.342.807 - 0944.495.535 | thienansmarthome.vn</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Dự án: {project.name}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-end border-b-4 border-[#1BA1E2] pb-4 mb-8">
                        <div>
                          <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1">Chi tiết hạng mục</p>
                          <h2 className="text-2xl font-black text-[#0F4C81] uppercase flex items-center gap-3">
                            <mod.icon size={28} className="text-[#1BA1E2]" />
                            {mod.name}
                          </h2>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-widest mb-1">Thành tiền mục</p>
                          <p className="text-xl font-bold text-[#1BA1E2]">{formatMoney(calculateModuleTotal(mod))}</p>
                        </div>
                      </div>

                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-[#f3f4f6]">
                            <th className="p-3 border font-bold text-[#4b5563]">STT</th>
                            <th className="p-3 border font-bold text-[#4b5563]">Hình ảnh</th>
                            <th className="p-3 border font-bold text-[#4b5563]">Tên thiết bị</th>
                            <th className="p-3 border font-bold text-[#4b5563]">Hãng</th>
                            <th className="p-3 border font-bold text-[#4b5563]">Mã thiết bị</th>
                            <th className="p-3 border font-bold text-[#4b5563]">Thông số</th>
                            <th className="p-3 border font-bold text-[#4b5563]">ĐVT</th>
                            <th className="p-3 border font-bold text-[#4b5563]">SL</th>
                            <th className="p-3 border font-bold text-[#4b5563]">Đơn giá (đ)</th>
                            <th className="p-3 border font-bold text-[#4b5563]">% CK</th>
                            <th className="p-3 border font-bold text-[#4b5563] text-right">Thành tiền (đ)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mod.items.map((item, idx) => {
                            const specs = [item.shape, item.color, item.glassType, item.borderType].filter(Boolean).join(', ');
                            return (
                              <tr key={item.id} className="hover:bg-[#f9fafb]">
                                <td className="p-3 border text-center text-[#6b7280]">{idx + 1}</td>
                                <td className="p-2 border text-center w-20">
                                  <img 
                                    src={item.image || getPlaceholderImage(item.code || item.id)} 
                                    alt="" 
                                    className="w-12 h-12 object-contain bg-white rounded mx-auto border border-gray-100 cursor-zoom-in" 
                                    referrerPolicy="no-referrer"
                                    onClick={() => setEnlargedItem(item)}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = getPlaceholderImage(item.code || item.id);
                                    }}
                                  />
                                </td>
                                <td className="p-3 border">{item.name}</td>
                                <td className="p-3 border font-medium">{item.brand}</td>
                                <td className="p-3 border font-mono text-[10px]">{item.code}</td>
                                <td className="p-3 border text-center text-xs leading-tight">{specs}</td>
                                <td className="p-3 border text-center">{item.unit}</td>
                                <td className="p-3 border text-center font-bold">{item.qty}</td>
                                <td className="p-3 border text-right">{formatMoney(item.price)}</td>
                                <td className="p-3 border text-center text-[#2563eb] font-semibold">{item.discount}%</td>
                                <td className="p-3 border text-right font-bold text-[#0F4C81]">{formatMoney(calculateItemSubtotal(item))}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="mt-4 text-right">
                        <p className="text-sm text-[#6b7280]">
                          Tổng giá trị thiết bị: <span className="font-bold text-[#1f2937]">{formatMoney(calculateModuleEquipmentTotal(mod))}</span>
                        </p>
                        <p className="text-sm text-[#6b7280] mt-1">
                          Nhân công thi công, lắp đặt, cài đặt, chuyển giao công nghệ, bảo hành tại công trình ({mod.laborCostPercent ?? 10}%): <span className="font-bold text-[#1f2937]">{formatMoney(calculateModuleLaborCost(mod))}</span>
                        </p>
                        <p className="text-sm text-[#6b7280] mt-1">
                          Vật tư phụ ({mod.auxMaterialPercent ?? 5}%): <span className="font-bold text-[#1f2937]">{formatMoney(calculateModuleAuxMaterialCost(mod))}</span>
                        </p>
                        <p className="text-base text-[#0F4C81] font-bold mt-2">
                          Tổng cộng hạng mục {mod.name}: <span className="text-[#1BA1E2]">{formatMoney(calculateModuleTotal(mod))}</span>
                        </p>
                        <p className="text-xs text-[#9ca3af] italic mt-1">
                          (Bằng chữ: {numberToVietnameseWords(calculateModuleTotal(mod))})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Layout (Hidden on Screen) */}
      <div id="print-area" className="print-only bg-white">
        {/* Page 1: Summary */}
        <div className="pdf-section p-[15mm] mb-0 w-[210mm] h-[297mm] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b-2 border-[#0F4C81] pb-2 mb-4 w-full gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white p-1 rounded-lg border border-gray-100 flex-shrink-0">
                <Logo className="h-14 w-auto" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-black text-[#0F4C81] uppercase whitespace-nowrap">
                  CÔNG TY TNHH NHÀ THÔNG MINH THIÊN ÂN
                </h1>
                <div className="text-[9px] text-gray-600 mt-0.5 space-y-0">
                  <p><span className="font-bold">Địa chỉ:</span> 480A Trần Hưng Đạo, phường Hoa Lư, tỉnh Ninh Bình</p>
                  <p><span className="font-bold">Hotline:</span> 0972.342.807 - 0944.495.535 | <span className="font-bold">Website:</span> thienansmarthome.vn</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mb-4">
            <h2 className="text-2xl font-black text-[#1BA1E2] uppercase tracking-widest">BÁO GIÁ DỰ ÁN</h2>
          </div>

          <div className="mb-4 bg-[#f9fafb] p-4 rounded-xl border border-gray-100">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
              <p><span className="font-bold text-[#0F4C81] w-24 inline-block">Dự án:</span> <span className="font-semibold">{project.name}</span></p>
              <p><span className="font-bold text-[#0F4C81] w-24 inline-block">Ngày lập:</span> {project.date}</p>
              <p><span className="font-bold text-[#0F4C81] w-24 inline-block">Khách hàng:</span> <span className="font-semibold">{project.customer}</span></p>
              <p><span className="font-bold text-[#0F4C81] w-24 inline-block">SĐT:</span> {project.phone}</p>
              <p className="col-span-2"><span className="font-bold text-[#0F4C81] w-24 inline-block">Địa chỉ:</span> {project.address}</p>
              <p className="col-span-2"><span className="font-bold text-[#0F4C81] w-24 inline-block">Người lập:</span> <span className="font-bold text-[#1BA1E2]">{project.staff}</span></p>
            </div>
          </div>

          <h2 className="text-base font-bold text-[#0F4C81] mb-3 uppercase border-b pb-1">TỔNG HỢP CHI PHÍ DỰ TOÁN</h2>
          <table className="w-full mb-6 border-collapse text-xs">
            <thead>
              <tr className="bg-[#0F4C81] text-white">
                <th className="p-4 text-left border border-[#0F4C81]">STT</th>
                <th className="p-4 text-left border border-[#0F4C81]">Hạng mục hệ thống</th>
                <th className="p-4 text-right border border-[#0F4C81]">Thành tiền (đ)</th>
              </tr>
            </thead>
            <tbody>
              {modules.filter(m => m.enabled).map((mod, idx) => (
                <tr key={mod.id} className="border-b">
                  <td className="p-4 border text-center">{idx + 1}</td>
                  <td className="p-4 border font-semibold text-[#374151]">
                    <div className="flex items-center gap-3">
                      <mod.icon size={18} className="text-[#1BA1E2]" />
                      {mod.name}
                    </div>
                  </td>
                  <td className="p-4 border text-right font-bold text-[#0F4C81]">{formatMoney(calculateModuleTotal(mod))}</td>
                </tr>
              ))}
              
              <tr className="bg-[#f3f4f6]">
                <td colSpan={2} className="p-5 text-right font-black uppercase text-[#4b5563]">Tổng cộng dự toán (Chưa bao gồm VAT)</td>
                <td className="p-5 text-right text-2xl font-black text-[#1BA1E2]">{formatMoney(grandTotal)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="p-4 text-center text-[#4b5563] border-t">
                  <p className="italic"><span className="font-bold">Bằng chữ: </span>{numberToVietnameseWords(grandTotal)}</p>
                  <p className="text-xs mt-2 font-medium text-[#ef4444]">( Báo giá có hiệu lực 07 ngày kể từ ngày báo giá)</p>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-20 grid grid-cols-2 gap-12 text-center">
            <div>
              <p className="font-bold mb-24 uppercase text-sm tracking-widest">Đại diện khách hàng</p>
              <div className="w-48 h-px bg-[#d1d5db] mx-auto mb-2"></div>
              <p className="text-[#9ca3af] italic text-xs">(Ký và ghi rõ họ tên)</p>
            </div>
            <div>
              <p className="font-bold mb-24 uppercase text-sm tracking-widest">Người lập báo giá</p>
              <p className="font-bold text-xl text-[#0F4C81]">{project.staff}</p>
              <p className="text-xs text-[#6b7280] mt-2">Thiên Ân Smarthome</p>
            </div>
          </div>
        </div>

        {/* Detailed Pages */}
        {modules.filter(m => m.enabled && m.items.length > 0).map((mod) => {
          const pages = paginateModuleItems(mod.items, 12); // Increased to 12 rows per page for landscape to ensure it fits with headers
          return pages.map((pageRows, pageIdx) => (
            <div key={`${mod.id}-page-${pageIdx}`} className="pdf-section p-[15mm] w-[297mm] h-[210mm] overflow-hidden flex flex-col">
              <div className="flex justify-between items-start border-b border-gray-200 pb-1 mb-1 gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Logo className="h-6 w-auto flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[#0F4C81] uppercase whitespace-nowrap">Công ty TNHH Nhà Thông Minh Thiên Ân</p>
                    <p className="text-[7px] text-gray-500 whitespace-nowrap">Hotline: 0972.342.807 - 0944.495.535 | thienansmarthome.vn</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Dự án: {project.name}</p>
                </div>
              </div>

              <div className="flex justify-between items-end border-b border-[#1BA1E2] pb-1 mb-2">
                <div>
                  <p className="text-[7px] font-bold text-[#9ca3af] uppercase tracking-widest mb-0">Chi tiết hạng mục {pageIdx > 0 ? `(Trang ${pageIdx + 1})` : ''}</p>
                  <h2 className="text-base font-black text-[#0F4C81] uppercase flex items-center gap-2">
                    <mod.icon size={16} className="text-[#1BA1E2]" />
                    {mod.name}
                  </h2>
                </div>
                {pageIdx === pages.length - 1 && (
                  <div className="text-right">
                    <p className="text-[7px] font-bold text-[#9ca3af] uppercase tracking-widest mb-0">Thành tiền mục</p>
                    <p className="text-sm font-bold text-[#1BA1E2]">{formatMoney(calculateModuleTotal(mod))}</p>
                  </div>
                )}
              </div>

              <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-[#f3f4f6]">
                        <th className="p-1.5 border font-bold text-[#4b5563]">STT</th>
                        <th className="p-1.5 border font-bold text-[#4b5563]">Hình ảnh</th>
                        <th className="p-1.5 border font-bold text-[#4b5563]">Tên thiết bị</th>
                        <th className="p-1.5 border font-bold text-[#4b5563]">Hãng</th>
                        <th className="p-1.5 border font-bold text-[#4b5563]">Mã thiết bị</th>
                        <th className="p-1.5 border font-bold text-[#4b5563]">Thông số</th>
                        <th className="p-1.5 border font-bold text-[#4b5563]">ĐVT</th>
                        <th className="p-1.5 border font-bold text-[#4b5563]">SL</th>
                        <th className="p-1.5 border font-bold text-[#4b5563]">Đơn giá (đ)</th>
                        <th className="p-1.5 border font-bold text-[#4b5563]">% CK</th>
                        <th className="p-1.5 border font-bold text-[#4b5563] text-right">Thành tiền (đ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row, rIdx) => {
                        if (row.type === 'floor') {
                          return (
                            <tr key={`floor-${rIdx}`} className="bg-gray-100">
                              <td colSpan={11} className="p-1 font-black text-[#0F4C81] uppercase text-[9px] tracking-widest text-center border">
                                {row.floor} - Tổng: {formatMoney(row.total)} ({row.qty} thiết bị)
                              </td>
                            </tr>
                          );
                        }
                        if (row.type === 'room') {
                          return (
                            <tr key={`room-${rIdx}`} className="bg-blue-50">
                              <td colSpan={11} className="p-1 font-bold text-gray-600 italic text-[9px] text-center border">
                                {row.room} - Tổng: {formatMoney(row.total)} ({row.qty} thiết bị)
                              </td>
                            </tr>
                          );
                        }
                        if (row.type === 'item') {
                          const item = row.item;
                          const specs = [item.shape, item.color, item.glassType, item.borderType].filter(Boolean).join(', ');
                          return (
                            <tr key={item.id} className="hover:bg-[#f9fafb]">
                              <td className="p-1.5 border text-center text-[#6b7280]">{row.globalIdx}</td>
                              <td className="p-1 border text-center w-12">
                                <img 
                                  src={item.image || getPlaceholderImage(item.code || item.id)} 
                                  alt="" 
                                  className="w-8 h-8 object-contain bg-white rounded mx-auto border border-gray-100" 
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = getPlaceholderImage(item.code || item.id);
                                  }}
                                />
                              </td>
                              <td className="p-1.5 border">{item.name}</td>
                              <td className="p-1.5 border font-medium">{item.brand}</td>
                              <td className="p-1.5 border font-mono text-[8px]">{item.code}</td>
                              <td className="p-1.5 border text-center text-[8px] leading-tight">{specs}</td>
                              <td className="p-1.5 border text-center">{item.unit}</td>
                              <td className="p-1.5 border text-center font-bold">{item.qty}</td>
                              <td className="p-1.5 border text-right">{formatMoney(item.price)}</td>
                              <td className="p-1.5 border text-center text-[#2563eb] font-semibold">{item.discount}%</td>
                              <td className="p-1.5 border text-right font-bold text-[#0F4C81]">{formatMoney(calculateItemSubtotal(item))}</td>
                            </tr>
                          );
                        }
                        return null;
                      })}
                    </tbody>
              </table>
              {pageIdx === pages.length - 1 && (
                <div className="mt-2 text-right">
                  <p className="text-[10px] text-[#6b7280]">
                    Tổng giá trị thiết bị: <span className="font-bold text-[#1f2937]">{formatMoney(calculateModuleEquipmentTotal(mod))}</span>
                  </p>
                  <p className="text-[10px] text-[#6b7280] mt-0.5">
                    Nhân công ({mod.laborCostPercent ?? 10}%): <span className="font-bold text-[#1f2937]">{formatMoney(calculateModuleLaborCost(mod))}</span>
                  </p>
                  <p className="text-[10px] text-[#6b7280] mt-0.5">
                    Vật tư phụ ({mod.auxMaterialPercent ?? 5}%): <span className="font-bold text-[#1f2937]">{formatMoney(calculateModuleAuxMaterialCost(mod))}</span>
                  </p>
                  <p className="text-xs text-[#0F4C81] font-bold mt-1">
                    Tổng cộng hạng mục {mod.name}: <span className="text-[#1BA1E2]">{formatMoney(calculateModuleTotal(mod))}</span>
                  </p>
                  <p className="text-[8px] text-[#9ca3af] italic mt-0.5">
                    (Bằng chữ: {numberToVietnameseWords(calculateModuleTotal(mod))})
                  </p>
                </div>
              )}
            </div>
          ));
        })}

        {/* Page: Product Images */}
        {paginateImages(modules, 4, 4).map((page, pageIdx) => (
          <div key={`image-page-${pageIdx}`} className="pdf-section p-[15mm] w-[210mm] h-[297mm] overflow-hidden flex flex-col">
            <div className="flex justify-between items-start border-b border-gray-200 pb-2 mb-4 gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Logo className="h-10 w-auto flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0F4C81] uppercase whitespace-nowrap">Công ty TNHH Nhà Thông Minh Thiên Ân</p>
                  <p className="text-[8px] text-gray-500 whitespace-nowrap">Hotline: 0972.342.807 - 0944.495.535 | thienansmarthome.vn</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Dự án: {project.name}</p>
              </div>
            </div>

            <div className="border-b-2 border-[#1BA1E2] pb-2 mb-6">
              <h2 className="text-xl font-black text-[#0F4C81] uppercase flex items-center gap-2 justify-center">
                <ImageIcon size={20} className="text-[#1BA1E2]" />
                HÌNH ẢNH SẢN PHẨM CHI TIẾT {pageIdx > 0 ? `(Trang ${pageIdx + 1})` : ''}
              </h2>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <div className="space-y-6">
                {page.map((row, rIdx) => {
                  if (row.type === 'module') {
                    const mod = row.mod;
                    return (
                      <h3 key={`mod-${rIdx}`} className="text-sm font-bold text-[#0F4C81] uppercase border-l-4 border-[#1BA1E2] pl-3 flex items-center gap-2 bg-gray-50 py-1">
                        <mod.icon size={16} className="text-[#1BA1E2]" />
                        {mod.name}
                      </h3>
                    );
                  }
                  if (row.type === 'items') {
                    return (
                      <div key={`items-${rIdx}`} className="grid grid-cols-4 gap-4">
                        {row.items.map(item => (
                          <div key={item.id} className="flex flex-col border border-gray-100 rounded-lg p-2 bg-white shadow-sm h-[180px]">
                            <div className="w-full h-24 mb-2 bg-white rounded flex items-center justify-center overflow-hidden border border-gray-50">
                              <img 
                                src={item.image || getPlaceholderImage(item.code || item.id)} 
                                alt={item.name}
                                className="max-w-full max-h-full object-contain"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getPlaceholderImage(item.code || item.id);
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-bold text-[#0F4C81] line-clamp-2 mb-1 uppercase leading-tight h-6">{item.name}</p>
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-[7px] text-gray-500 uppercase font-semibold">{item.brand}</p>
                                <p className="text-[7px] font-mono text-gray-400">{item.code}</p>
                              </div>
                              <p className="text-[7px] text-gray-400 italic line-clamp-3 leading-relaxed border-t pt-1">
                                {item.description || "Sản phẩm chính hãng, bảo hành theo tiêu chuẩn nhà sản xuất."}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
            
            <div className="mt-4 pt-2 border-t border-gray-100 flex justify-between items-center">
              <p className="text-[7px] text-gray-400 italic">* Hình ảnh mang tính chất minh họa, sản phẩm thực tế có thể thay đổi tùy theo lô hàng.</p>
              <p className="text-[8px] font-bold text-[#0F4C81]">Trang {pageIdx + 1}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-[#0F4C81] text-white p-3 md:p-4 shadow-lg no-print sticky top-0 z-[60]">
        <div className="max-w-7xl mx-auto flex flex-row items-center justify-between gap-2 md:gap-6">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            <div className="bg-white p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-sm flex items-center justify-center">
              <Logo className="h-10 md:h-24 w-auto" />
            </div>
          </div>

          {/* Center: Company Info */}
          <div className="text-center flex-1 min-w-0 px-2 md:px-4 py-1">
            <h1 className="text-sm md:text-2xl lg:text-3xl font-black tracking-tight uppercase leading-tight truncate md:whitespace-nowrap overflow-visible py-0.5 md:py-1">
              Thiên Ân Smarthome
            </h1>
            <div className="hidden md:block text-[10px] md:text-xs opacity-90 mt-1 space-y-1.5">
              <p className="flex items-center justify-center gap-1">
                <span className="font-bold">ĐC:</span> 480A Trần Hưng Đạo, phường Hoa Lư, tỉnh Ninh Bình
              </p>
              <p className="flex items-center justify-center gap-3">
                <span className="font-bold">Hotline:</span> 
                <span className="bg-[#ffffff33] px-2 py-0.5 rounded font-mono">0972.342.807</span>
                <span className="opacity-50">|</span>
                <span className="bg-[#ffffff33] px-2 py-0.5 rounded font-mono">0944.495.535</span>
              </p>
            </div>
            <div className="md:hidden text-[8px] opacity-80 flex items-center justify-center gap-2">
              <span>0972.342.807 - 0944.495.535</span>
              <span className="opacity-50">|</span>
              <span>thienansmarthome.vn</span>
            </div>
          </div>

          {/* Right: Admin Button */}
          <div className="flex-shrink-0 flex items-center gap-2 relative">
            <button 
              onClick={handleSyncData}
              className="flex items-center gap-1.5 bg-[#ffffff1a] text-white px-2.5 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-[#ffffff33] transition-all border border-[#ffffff33] shadow-sm"
              title="Đồng bộ dữ liệu"
            >
              <Zap size={16} className="md:w-[18px] md:h-[18px] text-yellow-300" /> 
              <span className="hidden sm:inline">Đồng bộ</span>
            </button>
            <button 
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              className="flex items-center gap-1.5 bg-[#ffffff1a] text-white px-2.5 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-[#ffffff33] transition-all border border-[#ffffff33] shadow-sm"
              title="Công cụ"
            >
              <Settings size={16} className="md:w-[18px] md:h-[18px]" /> 
              <span className="hidden sm:inline">Công cụ</span>
            </button>
            
            {showSettingsDropdown && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                <div className="py-2">
                  <button 
                    onClick={() => {
                      setAdminInitialTab('versions');
                      if (!currentUser || (!hasPermission('quotation', 'view') && currentUser.role !== 'admin')) {
                        setShowLogin(true);
                      } else {
                        setIsAdminOpen(true);
                      }
                      setShowSettingsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <History size={16} className="text-emerald-500" /> Lịch sử báo giá
                  </button>
                  <button 
                    onClick={() => {
                      setAdminInitialTab('users');
                      if (!currentUser || currentUser.role !== 'admin') {
                        setShowLogin(true);
                      } else {
                        setIsAdminOpen(true);
                      }
                      setShowSettingsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Users size={16} className="text-indigo-500" /> Quản lý nhân sự
                  </button>
                  <button 
                    onClick={() => {
                      setAdminInitialTab('catalog');
                      if (!currentUser || (!hasPermission('catalog', 'view') && currentUser.role !== 'admin')) {
                        setShowLogin(true);
                      } else {
                        setIsAdminOpen(true);
                      }
                      setShowSettingsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <Settings size={16} className="text-purple-500" /> Quản trị hệ thống
                  </button>
                  
                  <div className="h-px bg-gray-100 my-1"></div>
                  
                  {currentUser ? (
                    <>
                      <button 
                        onClick={() => {
                          setShowPersonalDashboard(true);
                          setShowSettingsDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <User size={16} className="text-orange-500" /> Cá nhân ({currentUser.name})
                      </button>
                      <button 
                        onClick={() => {
                          setCurrentUser(null);
                          setProject(prev => ({ ...prev, staff: '' }));
                          setShowSettingsDropdown(false);
                          showToast('Đã đăng xuất');
                        }}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3"
                      >
                        <LogOut size={16} /> Đăng xuất
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => {
                        setShowLogin(true);
                        setShowSettingsDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <LogIn size={16} className="text-gray-500" /> Đăng nhập nhân viên
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Personal Dashboard Modal */}
      <AnimatePresence>
        {showPersonalDashboard && currentUser && (
          <PersonalDashboard 
            user={currentUser} 
            onClose={() => setShowPersonalDashboard(false)} 
            onRestoreVersion={handleRestoreVersion}
          />
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#00000080] backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative"
            >
              <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
              <div className="text-center mb-8">
                <div className="bg-[#0F4C81] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Lock size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Đăng nhập</h2>
                <p className="text-gray-500 text-sm">Vui lòng nhập thông tin để tiếp tục</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tài khoản</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1BA1E2] transition-all"
                    value={loginForm.user}
                    onChange={(e) => setLoginForm({...loginForm, user: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mật khẩu</label>
                  <input 
                    type="password" 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1BA1E2] transition-all"
                    value={loginForm.pass}
                    onChange={(e) => setLoginForm({...loginForm, pass: e.target.value})}
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-[#0F4C81] text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-[0_4px_14px_0_#1e3a8a33] flex items-center justify-center gap-2"
                >
                  <LogIn size={20} /> Đăng nhập
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Dashboard */}
      {isAdminOpen && (
        <AdminDashboard 
          catalog={catalog} 
          setCatalog={setCatalog} 
          onClose={() => setIsAdminOpen(false)} 
          versions={versions}
          onSaveVersion={handleSaveVersion}
          onRestoreVersion={handleRestoreVersion}
          onDeleteVersion={handleDeleteVersion}
          onExportVersion={handleExportVersion}
          onSyncData={handleSyncData}
          initialTab={adminInitialTab}
          currentUser={currentUser}
        />
      )}


      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Project Info Card */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tên dự án</label>
                <input 
                  type="text" 
                  className="input-field font-semibold" 
                  value={project.name} 
                  onChange={e => setProject({...project, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Khách hàng</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={project.customer} 
                    onChange={e => setProject({...project, customer: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Số điện thoại</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={project.phone} 
                    onChange={e => setProject({...project, phone: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Địa chỉ công trình</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={project.address} 
                  onChange={e => setProject({...project, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Ngày báo giá</label>
                  <input type="text" className="input-field bg-gray-50" value={project.date} readOnly />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Người phụ trách</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={project.staff} 
                    onChange={e => setProject({...project, staff: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex overflow-x-auto gap-2 pb-4 no-print scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {modules.map(mod => (
            <button
              key={mod.id}
              onClick={() => setActiveTab(mod.id)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full whitespace-nowrap font-semibold text-xs md:text-sm transition-all ${
                activeTab === mod.id 
                ? 'bg-[#0F4C81] text-white shadow-md' 
                : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              <mod.icon size={14} className="md:w-4 md:h-4" />
              {mod.name}
              {!mod.enabled && <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />}
            </button>
          ))}
        </div>

        {/* Module Content */}
        <AnimatePresence mode="wait">
          {modules.map(mod => mod.id === activeTab && (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 module-section"
            >
              <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 no-print">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={mod.enabled} 
                        onChange={() => handleToggleModule(mod.id)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1BA1E2]"></div>
                    </label>
                  </div>
                  <h2 className="text-lg font-bold text-[#0F4C81] flex items-center gap-2">
                    <mod.icon size={20} />
                    {mod.name}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tổng mục</p>
                  <p className="text-xl font-extrabold text-[#1BA1E2]">{formatMoney(calculateModuleTotal(mod))}</p>
                </div>
              </div>

              {/* Quick Add Section */}
              <div className="mb-8 bg-white p-6 rounded-2xl border-2 border-[#0F4C811a] shadow-sm no-print relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#0F4C81]"></div>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-[#0F4C81] text-white p-1.5 rounded-lg">
                    <Plus size={16} />
                  </div>
                  <h3 className="font-bold text-[#0F4C81]">Thêm thiết bị nhanh</h3>
                </div>

                <div className="space-y-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
                        <Layers size={12} className="text-[#1BA1E2]" /> 1. Chọn Tầng
                      </label>
                      <select 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1BA1E2] focus:bg-white transition-all font-medium"
                        value={currentFloor}
                        onChange={e => setCurrentFloor(e.target.value)}
                      >
                        <option value="Tầng 1">Tầng 1</option>
                        <option value="Tầng 2">Tầng 2</option>
                        <option value="Tầng 3">Tầng 3</option>
                        <option value="Tầng 4">Tầng 4</option>
                        <option value="Tầng 5">Tầng 5</option>
                        <option value="Tầng hầm">Tầng hầm</option>
                        <option value="Sân thượng">Sân thượng</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
                        <Home size={12} className="text-[#1BA1E2]" /> 2. Chọn/Nhập Phòng
                      </label>
                      <input 
                        type="text"
                        list="room-suggestions"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1BA1E2] focus:bg-white transition-all font-medium"
                        value={currentRoom}
                        onChange={e => setCurrentRoom(e.target.value)}
                        placeholder="Chọn hoặc gõ tên phòng..."
                      />
                      <datalist id="room-suggestions">
                        <option value="Phòng khách" />
                        <option value="Phòng ngủ 1" />
                        <option value="Phòng ngủ 2" />
                        <option value="Phòng ngủ 3" />
                        <option value="Phòng ngủ 4" />
                        <option value="Phòng ngủ Master" />
                        <option value="Bếp" />
                        <option value="Phòng ăn" />
                        <option value="Sân Vườn" />
                        <option value="Sảnh" />
                        <option value="Hành lang" />
                        <option value="Ban công" />
                        <option value="Sân Phơi" />
                        <option value="Nhà vệ sinh" />
                        <option value="Phòng SHC" />
                        <option value="Phòng Thể Dục" />
                        <option value="Phòng thờ" />
                        <option value="Gara" />
                      </datalist>
                    </div>
                  </div>

                  <div className="relative">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1.5">
                      <Search size={12} className="text-[#1BA1E2]" /> 3. Tìm & Thêm thiết bị
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          placeholder="Tên thiết bị..."
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1BA1E2] focus:bg-white transition-all pr-10"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSelectedProduct(null);
                          }}
                        />
                        <Search className="absolute right-3 top-3.5 text-gray-400" size={18} />
                        
                        {/* Dropdown Results */}
                        {searchQuery.length > 0 && !selectedProduct && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-[500px] overflow-y-auto p-2 min-w-[300px] md:min-w-[500px]">
                            {catalog
                              .filter(p => {
                                if (!searchQuery) return true;
                                const searchParts = searchQuery.split(/\s+/).filter(Boolean).map(normalizeSearchText);
                                if (searchParts.length === 0) return true;
                                
                                const allFieldsText = [
                                  p.name,
                                  p.brand,
                                  p.code,
                                  p.description,
                                  p.desc,
                                  p.shape,
                                  p.color,
                                  p.glassType,
                                  p.borderType
                                ].map(normalizeSearchText).join(' ');

                                return searchParts.every(part => allFieldsText.includes(part));
                              }).length === 0 ? (
                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                  Không tìm thấy sản phẩm nào
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 gap-1">
                                  {catalog
                                    .filter(p => {
                                      if (!searchQuery) return true;
                                      const searchParts = searchQuery.split(/\s+/).filter(Boolean).map(normalizeSearchText);
                                      if (searchParts.length === 0) return true;
                                      
                                      const allFieldsText = [
                                        p.name,
                                        p.brand,
                                        p.code,
                                        p.description,
                                        p.desc,
                                        p.shape,
                                        p.color,
                                        p.glassType,
                                        p.borderType
                                      ].map(normalizeSearchText).join(' ');

                                      return searchParts.every(part => allFieldsText.includes(part));
                                    })
                                    .map((p, i) => (
                                      <button
                                        key={i}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-xl flex items-center gap-4 transition-colors group"
                                        onClick={() => {
                                          setSelectedProduct(p);
                                          setSearchQuery(p.name);
                                        }}
                                      >
                                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 bg-gray-50">
                                          <img 
                                            src={p.image || getPlaceholderImage(p.code || p.id || 'default')} 
                                            alt="" 
                                            className="w-full h-full object-contain bg-white group-hover:scale-110 transition-transform" 
                                            referrerPolicy="no-referrer"
                                            onError={(e) => {
                                              (e.target as HTMLImageElement).src = getPlaceholderImage(p.code || p.id || 'default');
                                            }}
                                          />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-bold text-gray-800 truncate group-hover:text-[#0F4C81]">
                                            {p.name}
                                            {p.brand === 'Lumi' && (p.shape || p.color || p.glassType || p.borderType) && (
                                              <span className="text-gray-400 font-normal ml-1">
                                                - {[p.shape, p.color, p.glassType, p.borderType].filter(Boolean).join(' - ')}
                                              </span>
                                            )}
                                          </p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{p.brand}</span>
                                            <span className="text-[10px] text-gray-300">•</span>
                                            <span className="text-xs font-bold text-[#1BA1E2]">{formatMoney(p.price)}đ</span>
                                          </div>
                                        </div>
                                        <div className="text-[#1BA1E2] opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Plus size={16} />
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          if (selectedProduct) {
                            handleAddItem(mod.id, selectedProduct);
                          } else {
                            handleAddItem(mod.id);
                          }
                        }}
                        className="bg-[#0F4C81] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1BA1E2] transition-all flex items-center justify-center shadow-md shadow-[0_4px_14px_0_#1e3a8a1a] h-[46px]"
                        title={selectedProduct ? 'Thêm sản phẩm này' : 'Thêm dòng trống'}
                      >
                        <Plus size={24} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden md:block overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-100">
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2">STT</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2">Ảnh</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2">Tên thiết bị</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2">Hãng</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2">Mã thiết bị</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2">Hình dạng</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2">Màu sắc</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2">Loại kính</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2">Loại viền</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2">ĐVT</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2 w-20">SL</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2 w-32">Đơn giá</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2 w-20">% CK</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2">Thành tiền</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest px-2 no-print"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let globalIdx = 0;
                      const grouped = getGroupedItems(mod.items);
                      return grouped.map((floorGroup, fIdx) => (
                        <React.Fragment key={floorGroup.floor}>
                          <tr className="bg-[#f3f4f680]">
                            <td colSpan={15} className="py-2 px-4 font-black text-[#0F4C81] uppercase text-[10px] tracking-widest">
                              {floorGroup.floor}
                            </td>
                          </tr>
                          {floorGroup.rooms.map((roomGroup, rIdx) => (
                            <React.Fragment key={roomGroup.room}>
                              <tr className="bg-[#eff6ff33]">
                                <td colSpan={15} className="py-1.5 px-6 font-bold text-gray-500 italic text-[10px]">
                                  {roomGroup.room}
                                </td>
                              </tr>
                              {roomGroup.items.map((item) => {
                                globalIdx++;
                                return (
                                  <tr key={item.id} className="border-b border-gray-50 hover:bg-[#f9fafb80] transition-colors">
                                    <td className="py-3 px-2 text-gray-400 font-medium">{globalIdx}</td>
                        <td className="py-3 px-2">
                          <div className="relative w-10 h-10 group">
                            <img 
                              src={item.image || 'https://picsum.photos/seed/product/200/200'} 
                              alt="" 
                              className="w-full h-full object-contain bg-white rounded border border-gray-100 cursor-zoom-in"
                              referrerPolicy="no-referrer"
                              onClick={() => setEnlargedItem(item)}
                            />
                            <div className="absolute inset-0 bg-[#00000066] opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 rounded transition-opacity">
                              <button 
                                onClick={() => setEnlargedItem(item)}
                                className="p-1 hover:bg-[#ffffff33] rounded text-white"
                                title="Xem ảnh lớn"
                              >
                                <Search size={14} />
                              </button>
                              <label className="p-1 hover:bg-[#ffffff33] rounded text-white cursor-pointer" title="Thay đổi ảnh">
                                <ImageIcon size={14} />
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*" 
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onload = (evt) => {
                                        handleUpdateItem(mod.id, item.id, 'image', evt.target?.result as string);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }} 
                                />
                              </label>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="relative group/select">
                            <input 
                              type="text" 
                              className="w-full bg-transparent focus:outline-none font-medium" 
                              value={item.name} 
                              onChange={e => handleUpdateItem(mod.id, item.id, 'name', e.target.value)}
                              placeholder="Tên sản phẩm..."
                            />
                            {/* Dropdown for existing items */}
                            <div className="absolute top-full left-0 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-40 hidden group-focus-within/select:block max-h-[500px] overflow-y-auto">
                              {catalog
                                .filter(p => {
                                  const isCorrectModule = p.moduleId === mod.id || mod.id === 'smarthome';
                                  if (!isCorrectModule) return false;
                                  
                                  if (!item.name) return true;
                                  const searchParts = item.name.split(/\s+/).filter(Boolean).map(normalizeSearchText);
                                  if (searchParts.length === 0) return true;
                                  
                                  const allFieldsText = [
                                    p.name,
                                    p.brand,
                                    p.code,
                                    p.description,
                                    p.desc,
                                    p.shape,
                                    p.color,
                                    p.glassType,
                                    p.borderType
                                  ].map(normalizeSearchText).join(' ');

                                  return searchParts.every(part => allFieldsText.includes(part));
                                })
                                .slice(0, 50)
                                .map((p, i) => (
                                  <button
                                    key={i}
                                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
                                    onMouseDown={(e) => {
                                      e.preventDefault(); // Prevent blur
                                      
                                      let code = p.code || '';
                                      let name = p.name || '';
                                      
                                      if (!code && name.startsWith('[') && name.includes(']')) {
                                        const match = name.match(/^\[(.*?)\]\s*(.*)$/);
                                        if (match) {
                                          code = match[1];
                                          name = match[2];
                                        }
                                      }

                                      handleUpdateItem(mod.id, item.id, 'code', code);
                                      handleUpdateItem(mod.id, item.id, 'name', name);
                                      handleUpdateItem(mod.id, item.id, 'brand', p.brand);
                                      handleUpdateItem(mod.id, item.id, 'price', p.price);
                                      handleUpdateItem(mod.id, item.id, 'unit', p.unit);
                                      handleUpdateItem(mod.id, item.id, 'shape', p.shape || '');
                                      handleUpdateItem(mod.id, item.id, 'color', p.color || '');
                                      handleUpdateItem(mod.id, item.id, 'glassType', p.glassType || '');
                                      handleUpdateItem(mod.id, item.id, 'borderType', p.borderType || '');
                                      handleUpdateItem(mod.id, item.id, 'description', p.description || p.desc || '');
                                      handleUpdateItem(mod.id, item.id, 'image', p.image || getPlaceholderImage(p.code || p.id || 'default'));
                                    }}
                                  >
                                    <img 
                                      src={p.image || getPlaceholderImage(p.code || p.id || 'default')} 
                                      alt="" 
                                      className="w-6 h-6 rounded object-contain bg-white flex-shrink-0" 
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = getPlaceholderImage(p.code || p.id || 'default');
                                      }}
                                    />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                                      <p className="text-[9px] text-gray-400 uppercase">{p.brand}</p>
                                    </div>
                                  </button>
                                ))
                              }
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <input 
                            type="text" 
                            className="w-full bg-transparent focus:outline-none" 
                            value={item.brand} 
                            onChange={e => handleUpdateItem(mod.id, item.id, 'brand', e.target.value)}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input 
                            type="text" 
                            className="w-full bg-transparent focus:outline-none font-mono text-[11px]" 
                            value={item.code} 
                            onChange={e => handleUpdateItem(mod.id, item.id, 'code', e.target.value)}
                            placeholder="Mã..."
                          />
                        </td>
                        <td className="py-3 px-2">
                          <select 
                            className="bg-transparent focus:outline-none text-[11px] w-full"
                            value={item.shape || ''}
                            onChange={e => handleUpdateItem(mod.id, item.id, 'shape', e.target.value)}
                          >
                            <option value="">-</option>
                            <option value="Chữ nhật">Chữ nhật</option>
                            <option value="Vuông">Vuông</option>
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          <select 
                            className="bg-transparent focus:outline-none text-[11px] w-full"
                            value={item.color || ''}
                            onChange={e => handleUpdateItem(mod.id, item.id, 'color', e.target.value)}
                          >
                            <option value="">-</option>
                            <option value="Trắng">Trắng</option>
                            <option value="Đen">Đen</option>
                            <option value="Vàng">Vàng</option>
                            <option value="Grey">Grey</option>
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          <select 
                            className="bg-transparent focus:outline-none text-[11px] w-full"
                            value={item.glassType || ''}
                            onChange={e => handleUpdateItem(mod.id, item.id, 'glassType', e.target.value)}
                          >
                            <option value="">-</option>
                            <option value="Kính phẳng">Kính phẳng</option>
                            <option value="Kính lõm">Kính lõm</option>
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          <select 
                            className="bg-transparent focus:outline-none text-[11px] w-full"
                            value={item.borderType || ''}
                            onChange={e => handleUpdateItem(mod.id, item.id, 'borderType', e.target.value)}
                          >
                            <option value="">-</option>
                            <option value="Phẳng">Phẳng</option>
                            <option value="Viền bo champagne">Viền bo champagne</option>
                            <option value="Viền bo vàng">Viền bo vàng</option>
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          <input 
                            type="text" 
                            className="w-full bg-transparent focus:outline-none" 
                            value={item.unit} 
                            onChange={e => handleUpdateItem(mod.id, item.id, 'unit', e.target.value)}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input 
                            type="number" 
                            className="w-full bg-transparent focus:outline-none font-semibold" 
                            value={item.qty} 
                            onChange={e => handleUpdateItem(mod.id, item.id, 'qty', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input 
                            type="number" 
                            className="w-full bg-transparent focus:outline-none" 
                            value={item.price} 
                            onChange={e => handleUpdateItem(mod.id, item.id, 'price', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-3 px-2">
                          <input 
                            type="number" 
                            className="w-full bg-transparent focus:outline-none text-blue-500 font-medium" 
                            value={item.discount} 
                            onChange={e => handleUpdateItem(mod.id, item.id, 'discount', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-3 px-2 font-bold text-[#0F4C81]">
                          {formatMoney(calculateItemSubtotal(item))}
                        </td>
                        <td className="py-3 px-2 text-right no-print">
                          <button 
                            onClick={() => handleDeleteItem(mod.id, item.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      ));
                    })()}
                    {mod.items.length === 0 && (
                      <tr>
                        <td colSpan={16} className="py-12 text-center text-gray-300 italic">
                          Chưa có thiết bị nào trong mục này
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {(() => {
                  let globalIdx = 0;
                  const grouped = getGroupedItems(mod.items);
                  return grouped.map((floorGroup) => (
                    <div key={floorGroup.floor} className="space-y-4">
                      <div className="bg-gray-100 p-2 rounded-lg text-center font-black text-[#0F4C81] uppercase text-[10px] tracking-widest">
                        {floorGroup.floor}
                      </div>
                      {floorGroup.rooms.map((roomGroup) => (
                        <div key={roomGroup.room} className="space-y-3">
                          <div className="text-center font-bold text-gray-400 italic text-[10px]">
                            {roomGroup.room}
                          </div>
                          {roomGroup.items.map((item) => {
                            globalIdx++;
                            return (
                              <div key={item.id} className="mobile-card">
                                <div className="flex gap-4 mb-4">
                                  <div className="w-20 h-20 bg-gray-50 rounded-xl border border-gray-100 flex-shrink-0 relative">
                                    <img 
                                      src={item.image || getPlaceholderImage(item.code || item.id)} 
                                      alt="" 
                                      className="w-full h-full object-contain p-2"
                                      referrerPolicy="no-referrer"
                                      onClick={() => setEnlargedItem(item)}
                                    />
                                    <button 
                                      onClick={() => handleDeleteItem(mod.id, item.id)}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <input 
                                      type="text" 
                                      className="w-full bg-transparent font-bold text-gray-800 text-sm mb-1 focus:outline-none"
                                      value={item.name}
                                      onChange={e => handleUpdateItem(mod.id, item.id, 'name', e.target.value)}
                                    />
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-[#1BA1E2] uppercase">{item.brand}</span>
                                      <span className="text-[10px] text-gray-300">•</span>
                                      <span className="text-[10px] font-mono text-gray-400">{item.code}</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <p className="mobile-label">Số lượng</p>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => handleUpdateItem(mod.id, item.id, 'qty', Math.max(0, item.qty - 1))}
                                        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600"
                                      >
                                        -
                                      </button>
                                      <input 
                                        type="number" 
                                        className="w-12 text-center font-bold text-sm bg-transparent"
                                        value={item.qty}
                                        onChange={e => handleUpdateItem(mod.id, item.id, 'qty', parseFloat(e.target.value) || 0)}
                                      />
                                      <button 
                                        onClick={() => handleUpdateItem(mod.id, item.id, 'qty', item.qty + 1)}
                                        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-gray-600"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="mobile-label">Chiết khấu (%)</p>
                                    <input 
                                      type="number" 
                                      className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 text-sm font-bold text-blue-600"
                                      value={item.discount}
                                      onChange={e => handleUpdateItem(mod.id, item.id, 'discount', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                  <div>
                                    <p className="mobile-label">Đơn giá</p>
                                    <p className="text-sm font-medium text-gray-600">{formatMoney(item.price)}đ</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="mobile-label">Thành tiền</p>
                                    <p className="text-base font-black text-[#0F4C81]">{formatMoney(calculateItemSubtotal(item))}đ</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>

              <div className="mt-6 flex flex-col items-end gap-2 border-t pt-4 no-print">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Tổng giá trị thiết bị:</span>
                  <span className="font-bold text-gray-700">{formatMoney(calculateModuleEquipmentTotal(mod))}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Nhân công (</span>
                  <input 
                    type="number" 
                    className="w-12 px-1 py-0.5 border rounded text-center text-sm"
                    value={mod.laborCostPercent ?? 10}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setModules(modules.map(m => m.id === mod.id ? { ...m, laborCostPercent: val } : m));
                    }}
                  />
                  <span>%):</span>
                  <span className="font-bold text-gray-700">{formatMoney(calculateModuleLaborCost(mod))}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Vật tư phụ (</span>
                  <input 
                    type="number" 
                    className="w-12 px-1 py-0.5 border rounded text-center text-sm"
                    value={mod.auxMaterialPercent ?? 5}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setModules(modules.map(m => m.id === mod.id ? { ...m, auxMaterialPercent: val } : m));
                    }}
                  />
                  <span>%):</span>
                  <span className="font-bold text-gray-700">{formatMoney(calculateModuleAuxMaterialCost(mod))}</span>
                </div>
                <div className="flex items-center gap-4 text-lg mt-2">
                  <span className="font-medium text-gray-600">Tổng cộng hạng mục:</span>
                  <span className="text-2xl font-black text-[#1BA1E2]">{formatMoney(calculateModuleTotal(mod))}</span>
                </div>
              </div>

              <button 
                onClick={() => handleAddItem(mod.id)}
                className="mt-6 flex items-center gap-2 text-sm font-bold text-[#1BA1E2] hover:opacity-80 transition-opacity no-print"
              >
                <Plus size={18} />
                THÊM THIẾT BỊ MỚI
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Sticky Footer Summary */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#ffffffe6] backdrop-blur-md border-t border-gray-100 p-3 md:p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] no-print z-50">
        <div className="max-w-5xl mx-auto flex flex-row justify-between items-center gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:block bg-[#F4F7F9] p-2 md:p-3 rounded-xl md:rounded-2xl">
              <CheckCircle2 size={20} className="text-[#52C41A] md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">TỔNG DỰ TOÁN</p>
              <p className="text-sm md:text-2xl font-black text-[#0F4C81]">{formatMoney(grandTotal)}đ</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={handleSyncData}
              className="flex items-center gap-1.5 bg-[#ffffff1a] text-white px-2.5 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-[#ffffff33] transition-all border border-[#ffffff33] shadow-sm"
              title="Đồng bộ dữ liệu"
            >
              <Zap size={16} className="md:w-[18px] md:h-[18px] text-yellow-300" /> 
              <span className="hidden sm:inline">Đồng bộ</span>
            </button>
            <button 
              onClick={handleSaveVersion}
              disabled={!hasPermission('quotation', 'edit')}
              className={`flex items-center gap-1.5 md:gap-2 bg-emerald-600 text-white px-3 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl text-[10px] md:text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-[0_4px_14px_0_#05966933] ${!hasPermission('quotation', 'edit') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <SaveIcon size={16} className="md:w-5 md:h-5" />
              <span className="hidden sm:inline">LƯU BÁO GIÁ</span>
              <span className="sm:hidden">LƯU</span>
            </button>
            <button 
              onClick={() => setShowPreview(true)}
              disabled={!hasPermission('quotation', 'view')}
              className={`btn-primary py-2.5 md:py-3 px-4 md:px-8 shadow-lg shadow-[0_4px_14px_0_#0F4C8133] flex-1 md:flex-none justify-center text-[10px] md:text-sm ${!hasPermission('quotation', 'view') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Eye size={16} className="md:w-5 md:h-5" />
              <span className="hidden sm:inline">XEM TRƯỚC BÁO GIÁ</span>
              <span className="sm:hidden">XEM TRƯỚC</span>
            </button>
          </div>
        </div>
      </footer>

      {hasPermission('chatbot', 'view') && (
        <ChatBot 
          modules={modules} 
          setModules={setModules} 
          project={project} 
          setProject={setProject}
          catalog={catalog}
          onExport={handleExportPDF}
          onProductClick={(product) => setEnlargedItem(product)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 transition-all transform translate-y-0 opacity-100 ${toastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toastMessage.message}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-[#00000080] z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Xác nhận</h3>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-[#0F4C81] text-white rounded-lg font-medium hover:opacity-90 transition-colors"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Image Modal */}
      <AnimatePresence>
        {enlargedItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEnlargedItem(null)}
            className="fixed inset-0 bg-[#000000cc] z-[100] flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setEnlargedItem(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors bg-[#ffffff1a] p-2 rounded-full backdrop-blur-md"
              >
                <X size={32} />
              </button>
              <div className="flex flex-col md:flex-row gap-6 bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] w-full">
                <div className="md:w-1/2 bg-white p-6 flex items-center justify-center">
                  <img 
                    src={enlargedItem.image || getPlaceholderImage(enlargedItem.code || enlargedItem.id)} 
                    alt={enlargedItem.name} 
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="md:w-1/2 p-8 overflow-y-auto">
                  <div className="mb-6">
                    <p className="text-[10px] font-bold text-[#1BA1E2] uppercase tracking-widest mb-1">{enlargedItem.brand}</p>
                    <h3 className="text-2xl font-black text-[#0F4C81] uppercase leading-tight">{enlargedItem.name}</h3>
                    <p className="text-sm font-mono text-gray-400 mt-1">Mã: {enlargedItem.code || 'N/A'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Hình dạng</p>
                      <p className="text-sm font-medium text-gray-700">{enlargedItem.shape || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Màu sắc</p>
                      <p className="text-sm font-medium text-gray-700">{enlargedItem.color || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Loại kính</p>
                      <p className="text-sm font-medium text-gray-700">{enlargedItem.glassType || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Loại viền</p>
                      <p className="text-sm font-medium text-gray-700">{enlargedItem.borderType || '-'}</p>
                    </div>
                  </div>

                  {enlargedItem.description && (
                    <div className="mb-6">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Thông số kỹ thuật</p>
                      <div className="text-sm text-gray-600 leading-relaxed bg-[#eff6ff4d] p-4 rounded-lg border border-[#dbeafe80]">
                        {enlargedItem.description}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Đơn giá</p>
                      <p className="text-xl font-bold text-[#1BA1E2]">{formatMoney(enlargedItem.price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Đơn vị</p>
                      <p className="text-lg font-medium text-gray-700">{enlargedItem.unit}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
