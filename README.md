# Software Engineering in Construction Information Systems 2025 - Final Exam

## Student Information
- **ID:** M11405105
- **Name:** LEE SHING RONG
- **Department:** NTUST CT

## Project Overview
This project is a 3-tier web application for analyzing **Sex Ratio at Birth (SRB)** data globally. It demonstrates database normalization (3NF), ETL processes, and containerized deployment.

## 1. ER Diagram (Database Design)
The database is designed to conform to the **3rd Normal Form (3NF)** with 4 entities:

```mermaid
erDiagram
    Regions ||--|{ SubRegions : contains
    SubRegions ||--|{ Countries : contains
    Countries ||--|{ AnnualSRB : has_data

    Regions {
        int RegionCode PK "ISO Region Code"
        string RegionName
    }

    SubRegions {
        int SubRegionCode PK "ISO Sub-Region Code"
        string SubRegionName
        int RegionCode FK
    }

    Countries {
        char(3) CountryCode PK "ISO Alpha-3 Code"
        string CountryName
        int SubRegionCode FK
    }

    AnnualSRB {
        int ID PK
        char(3) CountryCode FK
        int Year
        decimal SRB "Sex Ratio at Birth"
    }