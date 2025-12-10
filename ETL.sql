-- ==========================================================
-- 0. 初始化：清理舊資料 (確保腳本可重複執行)
-- ==========================================================
DROP TABLE IF EXISTS AnnualSRB CASCADE;
DROP TABLE IF EXISTS Countries CASCADE;
DROP TABLE IF EXISTS IntermediateRegions CASCADE;
DROP TABLE IF EXISTS SubRegions CASCADE;
DROP TABLE IF EXISTS Regions CASCADE;
DROP TABLE IF EXISTS Staging_Regions CASCADE;
DROP TABLE IF EXISTS Staging_SRB CASCADE;

-- ==========================================================
-- 1. 建立暫存表 (Staging) - 全部用 TEXT 以避免匯入錯誤
-- ==========================================================
CREATE TABLE Staging_Regions (
    name TEXT, 
    alpha2 TEXT, 
    alpha3 TEXT, 
    country_code TEXT,
    iso_3166_2 TEXT, 
    region TEXT, 
    sub_region TEXT, 
    intermediate_region TEXT,
    region_code TEXT, 
    sub_region_code TEXT, 
    intermediate_region_code TEXT
);

CREATE TABLE Staging_SRB (
    Entity TEXT, 
    Code TEXT, 
    Year TEXT, 
    SRB TEXT, 
    OWID TEXT
);

-- ==========================================================
-- 2. 匯入 CSV (請確認檔案路徑是否正確)
-- ==========================================================
-- 注意：如果是 Windows 路徑，斜線可能需要調整；如果是 Docker，請用 Docker 內路徑
COPY Staging_Regions FROM '/data/data2.csv' DELIMITER ',' CSV HEADER;
COPY Staging_SRB FROM '/data/data1.csv' DELIMITER ',' CSV HEADER;

-- ==========================================================
-- 3. 建立正式表格 (3NF Design)
-- ==========================================================

-- Entity 1: Regions (大洲)
CREATE TABLE Regions (
    RegionCode INT PRIMARY KEY,
    RegionName VARCHAR(100) NOT NULL
);

-- Entity 2: SubRegions (子區域)
CREATE TABLE SubRegions (
    SubRegionCode INT PRIMARY KEY,
    SubRegionName VARCHAR(100) NOT NULL,
    RegionCode INT NOT NULL,
    FOREIGN KEY (RegionCode) REFERENCES Regions(RegionCode)
);

-- Entity 3: IntermediateRegions (中間區域 - 選填)
CREATE TABLE IntermediateRegions (
    IntermediateRegionCode INT PRIMARY KEY,
    IntermediateRegionName VARCHAR(100) NOT NULL,
    SubRegionCode INT NOT NULL,
    FOREIGN KEY (SubRegionCode) REFERENCES SubRegions(SubRegionCode)
);

-- Entity 4: Countries (國家)
CREATE TABLE Countries (
    CountryCode CHAR(3) PRIMARY KEY, -- 使用 ISO Alpha-3
    CountryName VARCHAR(100) NOT NULL,
    Alpha2Code CHAR(2),
    NumericCode INT,
    ISO3166_2 VARCHAR(20),
    SubRegionCode INT,            -- 必須有
    IntermediateRegionCode INT,   -- 可為 NULL (有些國家沒有中間區域分類)
    FOREIGN KEY (SubRegionCode) REFERENCES SubRegions(SubRegionCode),
    FOREIGN KEY (IntermediateRegionCode) REFERENCES IntermediateRegions(IntermediateRegionCode)
);

-- Entity 5: AnnualSRB (性別比數據)
CREATE TABLE AnnualSRB (
    ID SERIAL PRIMARY KEY,
    CountryCode CHAR(3) NOT NULL,
    Year INT NOT NULL,
    SRB_Value DECIMAL(10, 5) NOT NULL, -- 改名為 Value 避免混淆，使用 DECIMAL 確保精度
    FOREIGN KEY (CountryCode) REFERENCES Countries(CountryCode),
    UNIQUE (CountryCode, Year) -- 確保資料唯一性
);

-- ==========================================================
-- 4. ETL: 資料清洗與轉移 (Extract, Transform, Load)
-- ==========================================================

-- 4.1 Regions
INSERT INTO Regions (RegionCode, RegionName)
SELECT DISTINCT 
    CAST(region_code AS INT), 
    region 
FROM Staging_Regions 
WHERE region_code IS NOT NULL AND region_code != '';

-- 4.2 SubRegions
INSERT INTO SubRegions (SubRegionCode, SubRegionName, RegionCode)
SELECT DISTINCT 
    CAST(sub_region_code AS INT), 
    sub_region, 
    CAST(region_code AS INT)
FROM Staging_Regions 
WHERE sub_region_code IS NOT NULL AND sub_region_code != '';

-- 4.3 IntermediateRegions
INSERT INTO IntermediateRegions (IntermediateRegionCode, IntermediateRegionName, SubRegionCode)
SELECT DISTINCT 
    CAST(intermediate_region_code AS INT), 
    intermediate_region, 
    CAST(sub_region_code AS INT)
FROM Staging_Regions 
WHERE intermediate_region_code IS NOT NULL AND intermediate_region_code != '';

-- 4.4 Countries
-- 這裡要小心處理 IntermediateRegionCode 為空的情況
INSERT INTO Countries (CountryCode, CountryName, Alpha2Code, NumericCode, ISO3166_2, SubRegionCode, IntermediateRegionCode)
SELECT DISTINCT 
    alpha3, 
    name, 
    alpha2, 
    CAST(NULLIF(country_code, '') AS INT), 
    iso_3166_2, 
    CAST(sub_region_code AS INT), 
    CAST(NULLIF(intermediate_region_code, '') AS INT) -- 如果是空字串則轉為 NULL
FROM Staging_Regions 
WHERE alpha3 IS NOT NULL AND sub_region_code IS NOT NULL;

-- 4.5 SRB Data
-- 使用 INNER JOIN 自動過濾掉那些「有數據但不在我們國家表內」的歷史實體 (如 OWID_USS)
INSERT INTO AnnualSRB (CountryCode, Year, SRB_Value)
SELECT 
    s.Code, 
    CAST(s.Year AS INT), 
    CAST(s.SRB AS DECIMAL(10, 5))
FROM Staging_SRB s
JOIN Countries c ON s.Code = c.CountryCode
WHERE s.SRB IS NOT NULL AND s.SRB != '';

-- ==========================================================
-- 5. 清除暫存表 (可選，保留可以用來檢查)
-- ==========================================================
DROP TABLE Staging_Regions;
DROP TABLE Staging_SRB;

-- 驗證查詢
SELECT * FROM Countries LIMIT 5;
SELECT * FROM AnnualSRB LIMIT 5;