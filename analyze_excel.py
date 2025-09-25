#!/usr/bin/env python3

import pandas as pd
import sys

def analyze_excel_file(filename):
    try:
        # Try reading with openpyxl engine first
        try:
            df = pd.read_excel(filename, engine='openpyxl')
        except:
            # Fall back to xlrd engine for older Excel files
            df = pd.read_excel(filename, engine='xlrd')
        
        print("=== EXCEL FILE ANALYSIS ===")
        print(f"File: {filename}")
        print(f"Shape: {df.shape} (rows x columns)")
        print(f"Columns: {len(df.columns)}")
        print()
        
        print("=== COLUMN NAMES ===")
        for i, col in enumerate(df.columns, 1):
            print(f"{i:2d}. {col}")
        print()
        
        print("=== COLUMN INFO & DATA TYPES ===")
        print(df.info())
        print()
        
        print("=== FIRST 5 ROWS ===")
        pd.set_option('display.max_columns', None)
        pd.set_option('display.width', None)
        pd.set_option('display.max_colwidth', 50)
        print(df.head())
        print()
        
        print("=== SAMPLE DATA FOR KEY COLUMNS ===")
        # Show unique values for potential categorical columns
        for col in df.columns:
            unique_count = df[col].nunique()
            if unique_count <= 20 and unique_count > 1:  # Likely categorical
                print(f"\n{col} (unique values: {unique_count}):")
                print(df[col].value_counts().head(10))
        
        print("\n=== MISSING DATA SUMMARY ===")
        missing = df.isnull().sum()
        if missing.sum() > 0:
            print(missing[missing > 0])
        else:
            print("No missing data found.")
        
        # Save as CSV for easier import
        csv_filename = filename.replace('.xls', '.csv').replace('.xlsx', '.csv')
        df.to_csv(csv_filename, index=False)
        print(f"\n=== CSV CONVERSION ===")
        print(f"Converted to: {csv_filename}")
        
    except Exception as e:
        print(f"Error analyzing file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    analyze_excel_file("kwikr_sample.xls")