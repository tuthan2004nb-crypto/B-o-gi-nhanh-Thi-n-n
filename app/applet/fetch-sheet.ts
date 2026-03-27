async function fetchSheet() {
  const url = 'https://docs.google.com/spreadsheets/d/1iTmJJ8luFgWmFmFDSvftV84SY9cLg1DmfeE3o0ve7XU/edit?usp=sharing';
  const res = await fetch(url);
  const text = await res.text();
  const matches = text.match(/"Data",\d+/g) || text.match(/Data.*?gid=(\d+)/g) || text.match(/\["Data",\d+/g);
  console.log(matches);
  
  // Let's just print a bit of the text where "Data" is mentioned
  const idx = text.indexOf('"Data"');
  if (idx !== -1) {
    console.log(text.substring(idx - 50, idx + 100));
  }
}

fetchSheet();
