const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const port = 3000;

// 建立資料庫連線池
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// --- 修正重點 1: 使用絕對路徑設定靜態資料夾 ---
// 這樣無論你在哪裡執行 node 指令，都能準確找到 public 資料夾
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 首頁路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Feature 1: Country Dropdown ---
app.get('/api/countries', async (req, res) => {
    try {
        const result = await pool.query('SELECT CountryCode, CountryName FROM Countries ORDER BY CountryName');
        let options = '<option value="">-- Select Country --</option>';
        result.rows.forEach(row => options += `<option value="${row.countrycode}">${row.countryname}</option>`);
        res.send(options);
    } catch (err) {
        console.error('Error fetching countries:', err); // 修正重點 2: 顯示詳細錯誤
        res.send('<option>Error loading countries</option>'); 
    }
});

app.get('/api/srb', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.send('');
    try {
        const result = await pool.query('SELECT Year, SRB FROM AnnualSRB WHERE CountryCode = $1 ORDER BY Year DESC', [code]);
        if (result.rows.length === 0) return res.send('<p>No data found.</p>');
        let html = `<h3>Results for ${code}</h3><table border="1"><tr><th>Year</th><th>SRB</th></tr>`;
        result.rows.forEach(row => html += `<tr><td>${row.year}</td><td>${row.srb}</td></tr>`);
        html += '</table>';
        res.send(html);
    } catch (err) {
        console.error('Error fetching SRB:', err); // 顯示詳細錯誤
        res.send('Database Error'); 
    }
});

// --- Feature 2: Sub-Region & Year ---
// 1. 取得子地區清單
app.get('/api/subregions', async (req, res) => {
    try {
        const result = await pool.query('SELECT SubRegionCode, SubRegionName FROM SubRegions ORDER BY SubRegionName');
        let options = '<option value="">-- Select Sub-Region --</option>';
        result.rows.forEach(row => options += `<option value="${row.subregioncode}">${row.subregionname}</option>`);
        res.send(options);
    } catch (err) {
        console.error('Error fetching subregions:', err); // 顯示詳細錯誤
        res.send('<option>Error loading subregions</option>'); 
    }
});

// 2. 取得年份清單
app.get('/api/years', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT Year FROM AnnualSRB ORDER BY Year DESC');
        let options = '<option value="">-- Select Year --</option>';
        result.rows.forEach(row => options += `<option value="${row.year}">${row.year}</option>`);
        res.send(options);
    } catch (err) {
        console.error('Error fetching years:', err); // 顯示詳細錯誤
        res.send('<option>Error loading years</option>'); 
    }
});

// 3. 查詢子地區數據
app.get('/api/srb/subregion', async (req, res) => {
    const { subRegionCode, year } = req.query;
    if (!subRegionCode || !year) return res.send('');

    try {
        // 核心 SQL: 連結 SRB 和 Country 表，篩選子地區和年份，並排序
        const query = `
            SELECT c.CountryName, a.SRB 
            FROM AnnualSRB a
            JOIN Countries c ON a.CountryCode = c.CountryCode
            WHERE c.SubRegionCode = $1 AND a.Year = $2
            ORDER BY a.SRB ASC
        `;
        const result = await pool.query(query, [subRegionCode, year]);

        if (result.rows.length === 0) return res.send('<p>No data found.</p>');

        let html = `<h3>Sub-Region Data (${year})</h3>
                    <table border="1" style="width:100%">
                    <tr><th>Country</th><th>SRB</th></tr>`;
        result.rows.forEach(row => {
            html += `<tr><td>${row.countryname}</td><td>${row.srb}</td></tr>`;
        });
        html += '</table>';
        res.send(html);
    } catch (err) {
        console.error('Error fetching subregion data:', err); // 顯示詳細錯誤
        res.send(`Error: ${err.message}`); 
    }
});

app.listen(port, () => console.log(`App running on port ${port}`));