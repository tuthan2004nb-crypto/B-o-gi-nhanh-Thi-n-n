import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import Papa from "papaparse";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = process.cwd();

const DATA_DIR = path.join(root, "data");
const CATALOG_FILE = path.join(DATA_DIR, "catalog.json");
const VERSIONS_FILE = path.join(DATA_DIR, "versions.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const LINKS_FILE = path.join(DATA_DIR, "links.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }
}

const DEFAULT_USERS = [
  { id: 'admin', username: 'Admin', password: '123', name: 'Quản trị viên', role: 'admin' }
];

if (!fs.existsSync(USERS_FILE)) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2));
  } catch (err) {
    console.error("Failed to write default users:", err);
  }
}

if (!fs.existsSync(ORDERS_FILE)) {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
  } catch (err) {
    console.error("Failed to write default orders:", err);
  }
}

if (!fs.existsSync(LINKS_FILE)) {
  try {
    const DEFAULT_LINKS = [
      { id: '1', category: 'Smart Home', url: 'https://docs.google.com/spreadsheets/d/1iTmJJ8luFgWmFmFDSvftV84SY9cLg1DmfeE3o0ve7XU/edit', description: 'Bảng giá Smart Home' },
      { id: '2', category: 'Smart Lighting', url: 'https://docs.google.com/spreadsheets/d/1iTmJJ8luFgWmFmFDSvftV84SY9cLg1DmfeE3o0ve7XU/edit', description: 'Bảng giá Smart Lighting' }
    ];
    fs.writeFileSync(LINKS_FILE, JSON.stringify(DEFAULT_LINKS, null, 2));
  } catch (err) {
    console.error("Failed to write default links:", err);
  }
}

const DEFAULT_CATALOG = [
  { moduleId: 'smarthome', brand: 'Lumi', name: 'Công tắc 1 nút', unit: 'Cái', price: 945000, image: 'https://picsum.photos/seed/lumi1/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'smarthome', brand: 'Lumi', name: 'Công tắc 2 nút', unit: 'Cái', price: 988000, image: 'https://picsum.photos/seed/lumi2/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'smarthome', brand: 'Lumi', name: 'Công tắc 3 nút', unit: 'Cái', price: 1050000, image: 'https://picsum.photos/seed/lumi3/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'smarthome', brand: 'Lumi', name: 'Công tắc 4 nút', unit: 'Cái', price: 1150000, image: 'https://picsum.photos/seed/lumi4/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'smarthome', brand: 'Lumi', name: 'Cảm biến chuyển động', unit: 'Cái', price: 850000, image: 'https://picsum.photos/seed/lumisensor/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'smarthome', brand: 'Lumi', name: 'Bộ điều khiển trung tâm HC', unit: 'Cái', price: 3500000, image: 'https://picsum.photos/seed/lumihc/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'security', brand: 'Hikvision', name: 'DS-2CD1121G0-I', unit: 'Cái', price: 1300000, image: 'https://picsum.photos/seed/hik1/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'security', brand: 'Hikvision', name: 'DS-2CE16D0T-IRP', unit: 'Cái', price: 450000, image: 'https://picsum.photos/seed/hik2/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'security', brand: 'Ezviz', name: 'Camera C6N 2MP', unit: 'Cái', price: 650000, image: 'https://picsum.photos/seed/ezviz1/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'network', brand: 'Ubiquiti', name: 'UniFi AP AC Lite', unit: 'Cái', price: 2500000, image: 'https://picsum.photos/seed/unifi/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'network', brand: 'Mikrotik', name: 'Router hEX lite', unit: 'Cái', price: 1200000, image: 'https://picsum.photos/seed/mikrotik/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'solar', brand: 'Longi', name: 'Tấm pin 610W', unit: 'Tấm', price: 2166720, image: 'https://picsum.photos/seed/longi/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'solar', brand: 'LuxPower', name: 'Inverter Hybrid 14k', unit: 'Bộ', price: 63000000, image: 'https://picsum.photos/seed/lux/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'solar', brand: 'GigaBox', name: 'Pin lưu trữ 14.3kWh', unit: 'Bộ', price: 54500000, image: 'https://picsum.photos/seed/giga/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'lock', brand: 'Kaadas', name: 'Khóa vân tay K9', unit: 'Bộ', price: 8500000, image: 'https://picsum.photos/seed/lock1/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'lock', brand: 'Philips', name: 'Khóa Philips DDL603E', unit: 'Bộ', price: 5500000, image: 'https://picsum.photos/seed/philipslock/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'gate', brand: 'Roger', name: 'Motor cổng âm sàn R21', unit: 'Bộ', price: 25000000, image: 'https://picsum.photos/seed/gate1/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'gate', brand: 'DEA', name: 'Motor cổng trượt Livi 6N', unit: 'Bộ', price: 12000000, image: 'https://picsum.photos/seed/deagate/200/200', shape: '', color: '', glassType: '', borderType: '' },
  { moduleId: 'curtain', brand: 'Aok', name: 'Động cơ rèm vải AM68', unit: 'Bộ', price: 2800000, image: 'https://picsum.photos/seed/curtain1/200/200', shape: '', color: '', glassType: '', borderType: '' }
];

if (!fs.existsSync(CATALOG_FILE)) {
  try {
    fs.writeFileSync(CATALOG_FILE, JSON.stringify(DEFAULT_CATALOG, null, 2));
  } catch (err) {
    console.error("Failed to write default catalog:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Backup all data
  app.get("/api/backup", (req, res) => {
    try {
      const readJson = (file: string) => {
        if (fs.existsSync(file)) {
          return JSON.parse(fs.readFileSync(file, "utf-8") || "[]");
        }
        return [];
      };

      const backupData = {
        catalog: readJson(CATALOG_FILE),
        versions: readJson(VERSIONS_FILE),
        users: readJson(USERS_FILE),
        orders: readJson(ORDERS_FILE),
        links: readJson(LINKS_FILE),
        timestamp: new Date().toISOString()
      };
      res.json(backupData);
    } catch (error) {
      console.error("Backup failed:", error);
      res.status(500).json({ error: "Backup failed" });
    }
  });

  // Restore all data
  app.post("/api/restore", (req, res) => {
    try {
      const { catalog, versions, users, orders, links } = req.body;
      
      if (catalog) fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2));
      if (versions) fs.writeFileSync(VERSIONS_FILE, JSON.stringify(versions, null, 2));
      if (users) fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      if (orders) fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
      if (links) fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2));
      
      res.json({ status: "ok", message: "Data restored successfully" });
    } catch (error) {
      console.error("Restore failed:", error);
      res.status(500).json({ error: "Restore failed" });
    }
  });

  // API Routes
  app.get("/api/catalog", (req, res) => {
    try {
      if (fs.existsSync(CATALOG_FILE)) {
        const data = fs.readFileSync(CATALOG_FILE, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json(DEFAULT_CATALOG);
      }
    } catch (error) {
      console.error("Read catalog error:", error);
      res.status(500).json({ error: "Failed to read catalog" });
    }
  });

  app.post("/api/catalog", (req, res) => {
    try {
      const catalog = req.body;
      console.log("Saving catalog to:", CATALOG_FILE);
      fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2));
      console.log("Catalog saved successfully");
      res.json({ success: true });
    } catch (error) {
      console.error("Save catalog error:", error);
      res.status(500).json({ error: "Failed to save catalog" });
    }
  });

  app.post("/api/catalog/sync", async (req, res) => {
    try {
      console.log("Syncing catalog from Google Sheets...");
      const sheetUrl = 'https://docs.google.com/spreadsheets/d/1iTmJJ8luFgWmFmFDSvftV84SY9cLg1DmfeE3o0ve7XU/gviz/tq?tqx=out:csv&sheet=Data';
      
      const response = await fetch(sheetUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch catalog from Google Sheets: ${response.statusText}`);
      }
      
      const csvData = await response.text();
      const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
      const newProducts: any[] = [];
      
      parsed.data.forEach((row: any) => {
        const keys = Object.keys(row);
        const idKey = keys.find(k => k.includes('Mã sản phẩm'));
        const descKey = keys.find(k => k.includes('Mô tả'));
        const unitKey = keys.find(k => k.includes('Đơn vị'));
        const priceKey = keys.find(k => k.includes('Đơn giá'));
        const imageKey = keys.find(k => k.includes('Hình ảnh') || k.includes('Ảnh') || k.includes('Image'));
        const typeKey = keys.find(k => k.includes('Phân loại'));
        const shapeKey = keys.find(k => k.includes('Hình dạng'));
        const colorKey = keys.find(k => k.includes('Màu sắc'));
        const glassKey = keys.find(k => k.includes('Loại kính'));
        const borderKey = keys.find(k => k.includes('Loại viền'));
        
        if (!idKey || !descKey || !priceKey) return;
        
        const id = row[idKey]?.trim();
        const fullDesc = row[descKey]?.trim() || '';
        
        if (fullDesc.includes('NGỪNG KINH DOANH') || fullDesc.includes('CHƯA BÁN')) return;
        
        const desc = fullDesc.split('\n')[0].trim();
        const priceStr = row[priceKey]?.trim().replace(/\./g, '').replace(/,/g, '');
        const price = parseInt(priceStr, 10);
        
        if (!id || !desc || isNaN(price)) return;
        
        let moduleId = 'smartlighting';
        const type = row[typeKey]?.toLowerCase() || '';
        const lowerDesc = fullDesc.toLowerCase();
        const lowerName = (row[idKey]?.trim() || '').toLowerCase(); // Usually ID or Name
        
        // Smart Home: công tắc, ổ cắm, cảm biến, màn hình, bộ điều khiển
        if (type.includes('công tắc') || type.includes('ổ cắm') || type.includes('cảm biến') || type.includes('màn hình') || type.includes('bộ điều khiển') || type.includes('module') || type.includes('hub') || lowerDesc.includes('công tắc') || lowerDesc.includes('ổ cắm') || lowerDesc.includes('cảm biến') || lowerDesc.includes('màn hình') || lowerDesc.includes('bộ điều khiển')) {
          moduleId = 'smarthome';
        }
        // Khóa thông minh: các loại khóa
        else if (type.includes('khóa') || lowerDesc.includes('khóa')) {
          moduleId = 'lock';
        }
        // Rèm tự động: motor rèm, ray rèm, phụ kiện rèm
        else if (type.includes('rèm') || lowerDesc.includes('rèm') || lowerDesc.includes('motor') || lowerDesc.includes('ray') || lowerDesc.includes('phụ kiện rèm')) {
          moduleId = 'curtain';
        }
        // Smart Lighting: tất cả các loại đèn
        else if (type.includes('đèn') || type.includes('chiếu sáng') || lowerDesc.includes('đèn') || lowerDesc.includes('chiếu sáng') || lowerDesc.includes('led') || lowerDesc.includes('spotlight') || lowerDesc.includes('downlight')) {
          moduleId = 'smartlighting';
        }
        // Other existing categories
        else if (type.includes('camera') || type.includes('an ninh') || lowerDesc.includes('camera')) {
          moduleId = 'security';
        }
        else if (type.includes('mạng') || type.includes('wifi') || lowerDesc.includes('wifi') || lowerDesc.includes('router') || lowerDesc.includes('switch')) {
          moduleId = 'network';
        }
        else if (type.includes('điện mặt trời') || type.includes('pin') || lowerDesc.includes('solar') || lowerDesc.includes('inverter')) {
          moduleId = 'solar';
        }
        else if (type.includes('cổng') || lowerDesc.includes('cổng')) {
          moduleId = 'gate';
        }

        let shape = row[shapeKey!] || '';
        let color = row[colorKey!] || '';
        let glassType = row[glassKey!] || '';
        let borderType = row[borderKey!] || '';

        const brandKey = keys.find(k => k.includes('Thương hiệu') || k.includes('Brand'));
        const brand = row[brandKey!] || row.brand || 'Lumi';
        
        const isLumi = brand.toLowerCase() === 'lumi' || 
                       desc.toLowerCase().includes('lumi') || 
                       id.toLowerCase().startsWith('lm-');

        if (moduleId === 'smarthome' && isLumi) {
          const lowerDesc = fullDesc.toLowerCase();
          const lowerId = id.toLowerCase();
          const isMechanical = lowerDesc.includes('công tắc cơ') || lowerDesc.includes('ct cơ') || lowerId.includes('mc');
          
          if (!shape) {
            if (lowerDesc.includes('chữ nhật') || lowerDesc.includes('ngang') || lowerId.endsWith('n') || lowerId.includes('rect')) shape = 'Chữ nhật';
            else if (lowerDesc.includes('vuông') || lowerId.endsWith('v') || lowerId.includes('sq')) shape = 'Vuông';
          }
          
          if (!color) {
            if (isMechanical) {
              if (lowerDesc.includes('champagne') || lowerDesc.includes('vàng be')) color = 'Champagne';
              else if (lowerDesc.includes('dark grey') || lowerDesc.includes('xám tối') || lowerDesc.includes('xám đậm')) color = 'Dark Grey';
            } else {
              if (lowerDesc.includes('trắng')) color = 'Trắng';
              else if (lowerDesc.includes('đen')) color = 'Đen';
            }
          }
          
          if (!glassType) {
            if (lowerDesc.includes('phẳng')) glassType = 'Kính phẳng';
            else if (lowerDesc.includes('lõm')) glassType = 'Kính lõm';
          }
          
          if (!borderType) {
            if (lowerDesc.includes('bo cong champagne') || lowerDesc.includes('viền bo champagne')) borderType = 'Viền bo champagne';
            else if (lowerDesc.includes('bo cong vàng') || lowerDesc.includes('viền bo vàng')) borderType = 'Viền bo vàng';
            else if (lowerDesc.includes('phẳng') || lowerDesc.includes('viền thẳng') || lowerDesc.includes('không viền')) borderType = 'Phẳng';
          }
        }
        
        let imageUrl = row[imageKey!] || '';
        
        if (imageUrl.includes('drive.google.com')) {
          const driveIdMatch = imageUrl.match(/\/d\/([^\/]+)/) || imageUrl.match(/id=([^\&]+)/);
          if (driveIdMatch && driveIdMatch[1]) {
            imageUrl = `https://lh3.googleusercontent.com/d/${driveIdMatch[1]}`;
          }
        }

        if (!imageUrl || imageUrl.trim() === '' || imageUrl === 'N/A') {
          let keyword = 'product';
          if (moduleId === 'smarthome') keyword = 'switch,home,automation';
          else if (moduleId === 'security') keyword = 'security,camera,cctv';
          else if (moduleId === 'solar') keyword = 'solar,panel,energy';
          else if (moduleId === 'network') keyword = 'wifi,router,network';
          else if (moduleId === 'lock') keyword = 'smart,lock,door';
          else if (moduleId === 'gate') keyword = 'automatic,gate,motor';
          else if (moduleId === 'curtain') keyword = 'curtain,window';
          
          imageUrl = `https://picsum.photos/seed/${encodeURIComponent(id || desc || keyword)}/400/400`;
        }
        
        newProducts.push({
          moduleId,
          brand,
          code: id,
          name: desc,
          description: fullDesc,
          unit: row[unitKey!] || 'bộ',
          price,
          image: imageUrl,
          shape,
          color,
          glassType,
          borderType
        });
      });
      
      let existingCatalog: any[] = [];
      if (fs.existsSync(CATALOG_FILE)) {
        existingCatalog = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf-8"));
      } else {
        existingCatalog = DEFAULT_CATALOG;
      }
      
      newProducts.forEach(newP => {
        if (newP.image.includes('picsum.photos')) {
          const existingP = existingCatalog.find(p => p.code === newP.code || p.name === newP.name);
          if (existingP && existingP.image && !existingP.image.includes('picsum.photos')) {
            newP.image = existingP.image;
          }
        }
      });
      
      const nonLumiProducts = existingCatalog.filter(p => p.brand !== 'Lumi');
      const updatedCatalog = [...nonLumiProducts, ...newProducts];
      
      fs.writeFileSync(CATALOG_FILE, JSON.stringify(updatedCatalog, null, 2));
      console.log(`Synced ${newProducts.length} products from Google Sheets`);
      res.json({ success: true, catalog: updatedCatalog });
    } catch (error: any) {
      console.error("Sync catalog error:", error);
      res.status(500).json({ error: error.message || "Failed to sync catalog from Google Sheets" });
    }
  });


  app.get("/api/catalog/drive-files", async (req, res) => {
    try {
      const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "GOOGLE_DRIVE_API_KEY is not configured in environment variables." });
      }

      const folderId = '11tAbfQJP-R2TJ3rT-rH3_bhWLkPWL8Vu';
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&pageSize=1000&key=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Google Drive API error:", errorData);
        return res.status(response.status).json({ error: "Failed to fetch files from Google Drive", details: errorData });
      }

      const data = await response.json();
      res.json(data.files || []);
    } catch (error) {
      console.error("Drive files error:", error);
      res.status(500).json({ error: "Failed to list files from Google Drive" });
    }
  });

  app.post("/api/catalog/reset", (req, res) => {
    try {
      console.log("Resetting catalog to default");
      fs.writeFileSync(CATALOG_FILE, JSON.stringify(DEFAULT_CATALOG, null, 2));
      res.json({ success: true, catalog: DEFAULT_CATALOG });
    } catch (error) {
      console.error("Reset catalog error:", error);
      res.status(500).json({ error: "Failed to reset catalog" });
    }
  });

  // Versions API
  app.get("/api/versions", (req, res) => {
    console.log("GET /api/versions requested");
    try {
      if (fs.existsSync(VERSIONS_FILE)) {
        const data = fs.readFileSync(VERSIONS_FILE, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Read versions error:", error);
      res.status(500).json({ error: "Failed to read versions" });
    }
  });

  app.post("/api/versions", (req, res) => {
    try {
      const newVersion = req.body;
      let versions = [];
      if (fs.existsSync(VERSIONS_FILE)) {
        versions = JSON.parse(fs.readFileSync(VERSIONS_FILE, "utf-8"));
      }
      versions = [newVersion, ...versions].slice(0, 50); // Keep last 50
      fs.writeFileSync(VERSIONS_FILE, JSON.stringify(versions, null, 2));
      res.json({ success: true, versions });
    } catch (error) {
      console.error("Save version error:", error);
      res.status(500).json({ error: "Failed to save version" });
    }
  });

  app.delete("/api/versions/:id", (req, res) => {
    try {
      const { id } = req.params;
      if (fs.existsSync(VERSIONS_FILE)) {
        let versions = JSON.parse(fs.readFileSync(VERSIONS_FILE, "utf-8"));
        versions = versions.filter((v: any) => v.id.toString() !== id);
        fs.writeFileSync(VERSIONS_FILE, JSON.stringify(versions, null, 2));
        res.json({ success: true, versions });
      } else {
        res.status(404).json({ error: "Versions file not found" });
      }
    } catch (error) {
      console.error("Delete version error:", error);
      res.status(500).json({ error: "Failed to delete version" });
    }
  });

  // Users API
  app.get("/api/users", (req, res) => {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const data = fs.readFileSync(USERS_FILE, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json(DEFAULT_USERS);
      }
    } catch (error) {
      console.error("Read users error:", error);
      res.status(500).json({ error: "Failed to read users" });
    }
  });

  app.post("/api/users", (req, res) => {
    try {
      const users = req.body;
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      res.json({ success: true });
    } catch (error) {
      console.error("Save users error:", error);
      res.status(500).json({ error: "Failed to save users" });
    }
  });

  // Orders API
  app.get("/api/orders", (req, res) => {
    try {
      if (fs.existsSync(ORDERS_FILE)) {
        const data = fs.readFileSync(ORDERS_FILE, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Read orders error:", error);
      res.status(500).json({ error: "Failed to read orders" });
    }
  });

  app.post("/api/orders", (req, res) => {
    try {
      const newOrder = req.body;
      let orders = [];
      if (fs.existsSync(ORDERS_FILE)) {
        orders = JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
      }
      orders = [newOrder, ...orders];
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
      res.json({ success: true, orders });
    } catch (error) {
      console.error("Save order error:", error);
      res.status(500).json({ error: "Failed to save order" });
    }
  });

  // Links API
  app.get("/api/links", (req, res) => {
    try {
      if (fs.existsSync(LINKS_FILE)) {
        const data = fs.readFileSync(LINKS_FILE, "utf-8");
        res.json(JSON.parse(data));
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Read links error:", error);
      res.status(500).json({ error: "Failed to read links" });
    }
  });

  app.post("/api/links", (req, res) => {
    try {
      const links = req.body;
      fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2));
      res.json({ success: true });
    } catch (error) {
      console.error("Save links error:", error);
      res.status(500).json({ error: "Failed to save links" });
    }
  });

  // Production static files
  const distPath = path.join(root, "dist");
  if (process.env.NODE_ENV === "production" && fs.existsSync(distPath)) {
    console.log("Serving static files from:", distPath);
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      next();
    });
  } else {
    // Vite fallback (Dev mode or missing dist)
    console.log("Initializing Vite middleware fallback...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: root
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
