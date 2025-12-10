const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const app = express();
const port = 3000;

// 連線設定 (讀取環境變數)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// 設定靜態檔案路徑 (讓 public 資料夾內的檔案可以被讀取)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 首頁路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==========================================
// 功能 1 & 2: 國家列表與搜尋 (List & Search)
// ==========================================
app.get('/api/countries', async (req, res) => {
    const { keyword } = req.query; // 取得前端傳來的搜尋關鍵字
    
    // 基本查詢語法
    let query = 'SELECT CountryCode, CountryName FROM Countries';
    let params = [];

    // 如果有關鍵字，就加上 WHERE 條件 (使用 ILIKE 做不分大小寫搜尋)
    if (keyword) {
        query += " WHERE CountryName ILIKE $1 OR CountryCode ILIKE $1";
        params.push(`%${keyword}%`);
    }
    
    // 加上排序
    query += ' ORDER BY CountryName';

    try {
        const result = await pool.query(query, params);
        
        // 如果沒有找到任何資料
        if (result.rows.length === 0) {
            return res.send('<tr><td colspan="3" class="text-center text-muted">No countries found.</td></tr>');
        }

        // 產生 HTML 表格列 (Table Rows) 回傳給前端 HTMX
        let html = '';
        result.rows.forEach(row => {
            html += `
            <tr>
                <td>${row.countrycode}</td>
                <td>${row.countryname}</td>
                <td>
                    <button class="btn btn-sm btn-primary" 
                            hx-get="/api/srb?code=${row.countrycode}" 
                            hx-target="#srb-results">
                        View Data
                    </button>
                </td>
            </tr>`;
        });
        res.send(html);
    } catch (err) {
        console.error(err);
        res.send('<tr><td colspan="3" class="text-danger">Error loading countries</td></tr>');
    }
});

// ==========================================
// 功能 3: 查看性別比數據 (View Details)
// ==========================================
app.get('/api/srb', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.send(''); // 如果沒有代碼就不回傳
    
    try {
        // 查詢該國家的年度數據
        const result = await pool.query('SELECT Year, SRB_Value FROM AnnualSRB WHERE CountryCode = $1 ORDER BY Year DESC', [code]);
        
        // 如果該國家沒有數據
        if (result.rows.length === 0) {
            return res.send(`<div class="alert alert-warning">No SRB data found for country code: ${code}</div>`);
        }

        // 產生詳細資料的 HTML 表格
        let html = `
            <h4 class="mb-3">SRB Data for <strong>${code}</strong></h4>
            <div style="max-height: 400px; overflow-y: auto;">
                <table class="table table-bordered table-sm">
                    <thead class="table-light sticky-top">
                        <tr><th>Year</th><th>SRB Value</th></tr>
                    </thead>
                    <tbody>`;
        
        result.rows.forEach(row => {
            html += `<tr><td>${row.year}</td><td>${row.srb_value}</td></tr>`;
        });
        
        html += '</tbody></table></div>';
        res.send(html);
    } catch (err) {
        console.error(err);
        res.send('<div class="alert alert-danger">Database Error</div>');
    }
});

// 啟動伺服器
app.listen(port, () => console.log(`App running on port ${port}`));