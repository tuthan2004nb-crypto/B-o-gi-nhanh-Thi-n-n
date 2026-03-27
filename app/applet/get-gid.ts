import https from 'https';

https.get('https://docs.google.com/spreadsheets/d/1iTmJJ8luFgWmFmFDSvftV84SY9cLg1DmfeE3o0ve7XU/edit?usp=sharing', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const matches = data.match(/\["Data",\d+/g) || data.match(/"Data",\d+/g);
    console.log(matches);
  });
});
