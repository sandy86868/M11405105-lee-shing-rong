const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const port = 3000;

// 連線設定
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// 設定靜態檔案路徑
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 首頁
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: 取得所有國家
app.get('/api/countries', async (req, res) => {
    try {
        const result = await pool.query('SELECT CountryCode, CountryName FROM Countries ORDER BY CountryName');
        let options = '<option value="">-- Select Country --</option>';
        result.rows.forEach(row => options += `<option value="${row.countrycode}">${row.countryname}</option>`);
        res.send(options);
    } catch (err) {
        console.error(err);
        res.send('<option>Error loading countries</option>');
    }
});

// API: 根據國家代碼取得 SRB 數據
app.get('/api/srb', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.send('');
    try {
        // 注意：這裡查詢的是 SRB_Value
        const result = await pool.query('SELECT Year, SRB_Value FROM AnnualSRB WHERE CountryCode = $1 ORDER BY Year DESC', [code]);
        if (result.rows.length === 0) return res.send('<p>No data found.</p>');
        let html = `<h3>Results for ${code}</h3><table border="1"><tr><th>Year</th><th>SRB</th></tr>`;
        // 注意：Postgres 回傳的欄位名稱會變全小寫，所以是 row.srb_value
        result.rows.forEach(row => html += `<tr><td>${row.year}</td><td>${row.srb_value}</td></tr>`);
        html += '</table>';
        res.send(html);
    } catch (err) {
        console.error(err);
        res.send('Database Error');
    }
});

// API: 取得子區域
app.get('/api/subregions', async (req, res) => {
    try {
        const result = await pool.query('SELECT SubRegionCode, SubRegionName FROM SubRegions ORDER BY SubRegionName');
        let options = '<option value="">-- Select Sub-Region --</option>';
        result.rows.forEach(row => options += `<option value="${row.subregioncode}">${row.subregionname}</option>`);
        res.send(options);
    } catch (err) {
        console.error(err);
        res.send('<option>Error loading subregions</option>');
    }
});

// API: 取得年份
app.get('/api/years', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT Year FROM AnnualSRB ORDER BY Year DESC');
        let options = '<option value="">-- Select Year --</option>';
        result.rows.forEach(row => options += `<option value="${row.year}">${row.year}</option>`);
        res.send(options);
    } catch (err) {
        console.error(err);
        res.send('<option>Error loading years</option>');
    }
});

// API: 根據子區域和年份查詢比較
app.get('/api/srb/subregion', async (req, res) => {
    const { subRegionCode, year } = req.query;
    if (!subRegionCode || !year) return res.send('');
    try {
        const query = `
            SELECT c.CountryName, a.SRB_Value 
            FROM AnnualSRB a
            JOIN Countries c ON a.CountryCode = c.CountryCode
            WHERE c.SubRegionCode = $1 AND a.Year = $2
            ORDER BY a.SRB_Value ASC
        `;
        const result = await pool.query(query, [subRegionCode, year]);
        if (result.rows.length === 0) return res.send('<p>No data found.</p>');
        let html = `<h3>Sub-Region Data (${year})</h3><table border="1" style="width:100%"><tr><th>Country</th><th>SRB</th></tr>`;
        result.rows.forEach(row => {
            html += `<tr><td>${row.countryname}</td><td>${row.srb_value}</td></tr>`;
        });
        html += '</table>';
        res.send(html);
    } catch (err) {
        console.error(err);
        res.send(`Error: ${err.message}`);
    }
});

app.listen(port, () => console.log(`App running on port ${port}`));