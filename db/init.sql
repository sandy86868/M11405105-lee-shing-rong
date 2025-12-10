-- ==========================================
-- 1. 建立正式表格 (5 Entities, 3NF Design)
-- ==========================================

-- Entity 1: Regions
CREATE TABLE Regions (
    RegionCode INT PRIMARY KEY,
    RegionName VARCHAR(100) NOT NULL
);

-- Entity 2: SubRegions
CREATE TABLE SubRegions (
    SubRegionCode INT PRIMARY KEY,
    SubRegionName VARCHAR(100) NOT NULL,
    RegionCode INT,
    FOREIGN KEY (RegionCode) REFERENCES Regions(RegionCode)
);

-- Entity 3: IntermediateRegions (新增的實體)
CREATE TABLE IntermediateRegions (
    IntermediateRegionCode INT PRIMARY KEY,
    IntermediateRegionName VARCHAR(100) NOT NULL,
    SubRegionCode INT,
    FOREIGN KEY (SubRegionCode) REFERENCES SubRegions(SubRegionCode)
);

-- Entity 4: Countries (增加了 IntermediateRegionCode)
CREATE TABLE Countries (
    CountryCode CHAR(3) PRIMARY KEY,
    CountryName VARCHAR(100) NOT NULL,
    Alpha2Code CHAR(2),
    NumericCode INT,
    ISO3166_2 VARCHAR(20),
    SubRegionCode INT,
    IntermediateRegionCode INT, -- 可為空值 (Nullable)
    FOREIGN KEY (SubRegionCode) REFERENCES SubRegions(SubRegionCode),
    FOREIGN KEY (IntermediateRegionCode) REFERENCES IntermediateRegions(IntermediateRegionCode)
);

-- Entity 5: AnnualSRB
CREATE TABLE AnnualSRB (
    ID SERIAL PRIMARY KEY,
    CountryCode CHAR(3),
    Year INT NOT NULL,
    SRB DECIMAL(10, 5) NOT NULL,
    FOREIGN KEY (CountryCode) REFERENCES Countries(CountryCode),
    UNIQUE (CountryCode, Year)
);

-- ==========================================
-- 2. 建立暫存表 (Staging) 用來讀取 CSV
-- ==========================================
CREATE TABLE Staging_Regions (
    name VARCHAR, alpha2 VARCHAR, alpha3 VARCHAR, country_code INT,
    iso_3166_2 VARCHAR, region VARCHAR, sub_region VARCHAR, intermediate_region VARCHAR,
    region_code FLOAT, sub_region_code FLOAT, intermediate_region_code FLOAT
);

CREATE TABLE Staging_SRB (
    Entity VARCHAR, Code VARCHAR, Year INT, SRB FLOAT, OWID VARCHAR
);

-- ==========================================
-- 3. 匯入 CSV (路徑對應 Docker 內部)
-- ==========================================
COPY Staging_Regions FROM '/data/data2.csv' DELIMITER ',' CSV HEADER;
COPY Staging_SRB FROM '/data/data1.csv' DELIMITER ',' CSV HEADER;

-- ==========================================
-- 4. ETL 資料清洗與轉移
-- ==========================================

-- 4.1 Regions
INSERT INTO Regions (RegionCode, RegionName)
SELECT DISTINCT CAST(region_code AS INT), region 
FROM Staging_Regions WHERE region_code IS NOT NULL;

-- 4.2 SubRegions
INSERT INTO SubRegions (SubRegionCode, SubRegionName, RegionCode)
SELECT DISTINCT CAST(sub_region_code AS INT), sub_region, CAST(region_code AS INT)
FROM Staging_Regions WHERE sub_region_code IS NOT NULL;

-- 4.3 IntermediateRegions (處理新增的層級)
INSERT INTO IntermediateRegions (IntermediateRegionCode, IntermediateRegionName, SubRegionCode)
SELECT DISTINCT CAST(intermediate_region_code AS INT), intermediate_region, CAST(sub_region_code AS INT)
FROM Staging_Regions 
WHERE intermediate_region_code IS NOT NULL;

-- 4.4 Countries (連結 Sub 和 Intermediate)
INSERT INTO Countries (CountryCode, CountryName, Alpha2Code, NumericCode, ISO3166_2, SubRegionCode, IntermediateRegionCode)
SELECT DISTINCT 
    alpha3, 
    name,
    alpha2,
    country_code,
    iso_3166_2,
    CAST(sub_region_code AS INT),
    CAST(intermediate_region_code AS INT) 
FROM Staging_Regions 
WHERE alpha3 IS NOT NULL AND sub_region_code IS NOT NULL;

-- 4.5 SRB Data
INSERT INTO AnnualSRB (CountryCode, Year, SRB)
SELECT s.Code, s.Year, CAST(s.SRB AS DECIMAL(10, 5))
FROM Staging_SRB s
JOIN Countries c ON s.Code = c.CountryCode
WHERE s.SRB IS NOT NULL;

-- 5. 清除暫存
DROP TABLE Staging_Regions;
DROP TABLE Staging_SRB;