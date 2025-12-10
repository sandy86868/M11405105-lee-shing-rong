const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const port = 3000;

// 1. 設定資料庫連線
// 這裡的環境變數會由 Docker Compose 自動填入
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// 2. 設定靜態檔案 (HTML/CSS)
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. 首頁
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// API 區域 (負責跟資料庫講話)
// ==========================================

// [API] 取得所有國家清單 (給下拉選單用)
app.get('/api/countries', async (req, res) => {
    try {
        const result = await pool.query('SELECT CountryCode, CountryName FROM Countries ORDER BY CountryName');
        
        let options = '<option value="">-- Select a Country --</option>';
        result.rows.forEach(row => {
            options += `<option value="${row.countrycode}">${row.countryname}</option>`;
        });
        res.send(options);
    } catch (err) {
        console.error(err);
        res.status(500).send('<option>Error loading countries</option>');
    }
});

// [Feature 1] 根據國家代碼查詢 SRB (回傳 HTML 表格)
app.get('/api/srb', async (req, res) => {
    const { countryCode } = req.query; // 從前端拿到使用者選的代碼
    
    if (!countryCode) {
        return res.send(''); // 沒選就不顯示
    }

    try {
        const result = await pool.query(
            'SELECT Year, SRB FROM AnnualSRB WHERE CountryCode = $1 ORDER BY Year DESC', 
            [countryCode]
        );

        if (result.rows.length === 0) {
            return res.send('<p>No data found for this country.</p>');
        }

        // 產生表格 HTML 回傳給前端 (Server-Side Rendering)
        let html = `
            <h3>Data for Country Code: ${countryCode}</h3>
            <table>
                <thead><tr><th>Year</th><th>Sex Ratio at Birth (SRB)</th></tr></thead>
                <tbody>
        `;
        result.rows.forEach(row => {
            html += `<tr><td>${row.year}</td><td>${row.srb}</td></tr>`;
        });
        html += '</tbody></table>';
        
        res.send(html);

    } catch (err) {
        console.error(err);
        res.status(500).send('<p style="color:red">Database Error</p>');
    }
});

// 啟動伺服器
app.listen(port, () => {
    console.log(`App running on port ${port}`);
});