# Software Engineering in Construction Information Systems 2025 - Final Exam

## Student Information
- **ID:** M11405105
- **Name:** Lee Shing Rong
- **Department:** NTUST CT

## Task 1: GitHub Repository
This repository contains the complete source code, database scripts, and documentation for the final exam project.

## Task 2: Database Design & Normalization (ER Model)
The database is designed based on the provided `data1.csv` and `data2.csv` files. It follows the **3rd Normal Form (3NF)** logic by separating the geographical hierarchy found in `data2.csv` into distinct entities (`Regions`, `SubRegions`, `IntermediateRegions`) to eliminate data redundancy.

### ER Diagram (Mermaid Syntax)
```mermaid
erDiagram
    %% Entity 1: Regions (Source: data2.csv columns 'region', 'region-code')
    Regions {
        int RegionCode PK "From column: region-code"
        string RegionName "From column: region"
    }

    %% Entity 2: SubRegions (Source: data2.csv columns 'sub-region', 'sub-region-code')
    SubRegions {
        int SubRegionCode PK "From column: sub-region-code"
        string SubRegionName "From column: sub-region"
        int RegionCode FK "Links to Regions"
    }

    %% Entity 3: IntermediateRegions (Source: data2.csv columns 'intermediate-region', 'intermediate-region-code')
    %% Note: This handles the optional hierarchy level present in the CSV.
    IntermediateRegions {
        int IntermediateRegionCode PK "From column: intermediate-region-code"
        string IntermediateRegionName "From column: intermediate-region"
        int SubRegionCode FK "Links to SubRegions"
    }

    %% Entity 4: Countries (Source: data2.csv country identifiers)
    Countries {
        string CountryCode PK "From column: alpha-3 (e.g., AFG)"
        string Alpha2Code "From column: alpha-2"
        int NumericCode "From column: country-code"
        string CountryName "From column: name"
        string ISO3166_2 "From column: iso_3166-2"
        int SubRegionCode FK "Links to SubRegions"
        int IntermediateRegionCode FK "Links to IntermediateRegions (Nullable)"
    }

    %% Entity 5: AnnualSRB (Source: data1.csv)
    AnnualSRB {
        int ID PK "Auto-increment key"
        string CountryCode FK "From column: Code (Matches alpha-3)"
        int Year "From column: Year"
        decimal SRB "From column: SRB"
    }

    %% Relationships
    Regions ||--|{ SubRegions : contains
    SubRegions ||--o{ IntermediateRegions : contains
    SubRegions ||--|{ Countries : classifies
    IntermediateRegions |