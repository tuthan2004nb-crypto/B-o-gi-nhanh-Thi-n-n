import Papa from "papaparse";

async function test() {
  const response = await fetch('https://docs.google.com/spreadsheets/d/1iTmJJ8luFgWmFmFDSvftV84SY9cLg1DmfeE3o0ve7XU/gviz/tq?tqx=out:csv&sheet=Data');
  const csvData = await response.text();
  console.log("CSV length:", csvData.length);
  console.log("First 200 chars:", csvData.substring(0, 200));
  
  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  console.log("Parsed rows:", parsed.data.length);
  if (parsed.data.length > 0) {
    console.log("First row keys:", Object.keys(parsed.data[0]));
  }
}

test();
