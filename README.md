# Software Engineering in Construction Information Systems 2025 - Final Exam

## Student Information
- **ID:** M11405105
- **Name:** Lee Shing Rong
- **Department:** NTUST CT

## Task 1: GitHub Repository
This repository contains the complete source code, database scripts, and documentation for the final exam project.

## Task 2: Database Design & Normalization (ER Model)
The database is designed to conform to the **3rd Normal Form (3NF)**. It consists of **4 entities** to ensure data integrity and eliminate redundancy.

### ER Diagram (Mermaid Syntax)
```mermaid
erDiagram
    %% Entity 1: Regions (Highest level)
    Regions {
        int RegionCode PK "Unique ID from OWID data"
        string RegionName "e.g., Asia, Europe"
    }

    %% Entity 2: SubRegions (Belongs to Regions)
    SubRegions {
        int SubRegionCode PK "Unique ID from OWID data"
        string SubRegionName "e.g., Southern Asia"
        int RegionCode FK "Links to Regions"
    }

    %% Entity 3: Countries (Belongs to SubRegions)
    Countries {
        string CountryCode PK "ISO Alpha-3 Code (e.g., AFG)"
        string CountryName "Official Name"
        int SubRegionCode FK "Links to SubRegions"
    }

    %% Entity 4: Annual SRB Data (The Facts)
    AnnualSRB {
        int ID PK "Auto-increment key"
        string CountryCode FK "Links to Countries"
        int Year "Data Year"
        decimal SRB "Sex Ratio at Birth Value"
    }

    %% Relationships
    Regions ||--|{ SubRegions : contains
    SubRegions ||--|{ Countries : contains
    Countries ||--|{ AnnualSRB : has_records