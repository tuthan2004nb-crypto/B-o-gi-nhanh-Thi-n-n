import Papa from "papaparse";

async function test() {
  const response = await fetch('https://docs.google.com/spreadsheets/d/1iTmJJ8luFgWmFmFDSvftV84SY9cLg1DmfeE3o0ve7XU/gviz/tq?tqx=out:csv&sheet=Data');
  const csvData = await response.text();
  
  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  
  const newProducts: any[] = [];
  parsed.data.forEach((row: any, i) => {
    const keys = Object.keys(row);
    const idKey = keys.find(k => k.includes('Mã sản phẩm'));
    const descKey = keys.find(k => k.includes('Mô tả'));
    const unitKey = keys.find(k => k.includes('Đơn vị'));
    const priceKey = keys.find(k => k.includes('Đơn giá'));
    const imageKey = keys.find(k => k.includes('Hình ảnh'));
    const typeKey = keys.find(k => k.includes('Phân loại'));
    
    if (i < 2) {
      console.log("Row", i);
      console.log("idKey", idKey, "value", row[idKey!]);
      console.log("descKey", descKey, "value", row[descKey!]);
      console.log("priceKey", priceKey, "value", row[priceKey!]);
    }
    
    if (!idKey || !descKey || !priceKey) return;
    
    const id = row[idKey]?.trim();
    const fullDesc = row[descKey]?.trim() || '';
    
    if (fullDesc.includes('NGỪNG KINH DOANH') || fullDesc.includes('CHƯA BÁN')) return;
    
    const desc = fullDesc.split('\n')[0].trim();
    const priceStr = row[priceKey]?.trim().replace(/\./g, '').replace(/,/g, '');
    const price = parseInt(priceStr, 10);
    
    if (i < 2) {
      console.log("Parsed:", { id, desc, price });
    }
    
    if (!id || !desc || isNaN(price)) return;
    
    newProducts.push({ id, desc, price });
  });
  
  console.log("Total valid products:", newProducts.length);
}

test();
